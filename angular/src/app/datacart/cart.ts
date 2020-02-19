/**
 * Non-GUI classes and interfaces for managing the contents of a data cart.  This does *not* include 
 * downloading functionality.
 */
import { TreeNode } from 'primeng/api';

import { Observable, BehaviorSubject } from 'rxjs';

/**
 * convert the TreeNode[] data to a string appropriate for saving to local storage
 */
export function stringifyCart(data: TreeNode[]) : string { return JSON.stringify(data); }

/**
 * parse a string pulled from local storage into TreeNode[] data 
 */
export function parseCart(datastr: string) : TreeNode[] { return <TreeNode[]>JSON.parse(datastr); }

/**
 * find an file entry with a given ID in the given hierarchical list of files
 * 
 * For performance purposes, this implementation assumes a file's ID is a /-delimted string where 
 * fields between the delimiters represent a file's position in the hierarchy, with the first field 
 * identifies the top, resource-level collection.  
 * 
 * @param cartId     the ID assigned to the desired file
 * @param files      the file hierarch to search
 * @return TreeNode -- the file description with the given ID or null if it could not be found
 */
export function findFileIn(cartId: string, inFiles: TreeNode[]) {
    for (let file of inFiles) {
        if (file.data['cartId'] == cartId)
            return file;
        if (! file.children)
            continue;

        let collid = file.data['cartId'];
        if (!collid.endsWith("/")) collid += "/";
        if (cartId.startsWith(collid)) 
            return findFileIn(cartId, file.children);
    }
    return null;
}

/**
 * a container for the contents of a data cart.  This manages persisting the content data to the 
 * user's (via the browser) local disk.  It uses the TreeNode data structure as defined by the PrimeNG
 * TreeTable component to store the data cart contents.
 */
export class DataCart {

    contents: TreeNode[] = [];          // the hierarchical list of files in this cart
    storeId: string = null;             // the ID that this object is persisted to local disk under
    private _storage: Storage = null;   // the persistant storage

    // Caution: in the current application, this Observerable is not likely to work.  
    // Different listeners--namely a landing page and a data cart window--are not expected to execute
    // in the same runtime space; thus, they can't share their updates to a cart in real time via a Subject
    // 
    private _statusUpdated = new BehaviorSubject<boolean>(false);   // for alerts about changes to the cart

    /**
     * initialize this cart.  This is not intended to be called directly by users; the static functions
     * should be used instead.
     */
    constructor(id: string, data?: TreeNode[], store: Storage = localStorage) {
        this.storeId = id;
        if (data) this.contents = data;
        this._storage = store;
    }

    /**
     * return true if there is a persisted cart with the given id
     */
    public static exists(id: string, store: Storage = localStorage) : boolean {
        return (store && store.getItem(id) !== null);
    }

    /**
     * return the DataCart from persistent storage or null if it does not exist
     */
    public static openCart(id: string, store: Storage = localStorage) : DataCart {
        if (! store) return null;
        let data: TreeNode[] = parseCart(store.getItem(id));
        if (! data) return null;
        return new DataCart(id, data, store);
    }

    /**
     * create a new empty DataCart with the given ID and register it into persistent storage.  If 
     * a DataCart already exists with that ID, it will be discarded.
     */
    public static createCart(id: string, store: Storage = localStorage) : DataCart {
        let out: DataCart = new DataCart(id, <TreeNode[]>[], store);
        out.save();
        return out;
    }

    /**
     * save the contents of this cart to its persistent storage
     */
    public save() : void {
        this._storage.setItem(this.storeId, stringifyCart(this.contents));
    }

    /**
     * delete the contents of this cart from persistent storage
     */
    public forget() : void {
        this._storage.removeItem(this.storeId);
    }

    /**
     * restore the content of this cart from the last save to persistent storage.  Clients should call 
     * this if they want to ensure they have the latest changes to the cart.  
     */
    public restore() : void {
        this.contents = parseCart(this._storage.getItem(this.storeId));
    }

    /**
     * count and return the total number of files in this cart
     */
    public countFiles() : number {
        return this._countIn(this.contents)['fileCount'];
    }

    /**
     * count and return the total number of files currently marked as downloaded
     */
    public countFilesDownloaded() : number {
        return this._countIn(this.contents)['downloadedCount'];
    }

    /**
     * mark the file or list of files as having been downloaded.
     * @param itemIds     an array of IDs for files that have been downloaded.  IDs for files that
     *                    are not in this cart will be ignored.
     * @param downloaded  if false, the listed files will be marked as not downloaded; otherwise 
     *                    (the default), they are marked as downloaded.  
     */
    public markAsDownloaded(itemIds: string[], downloaded: boolean = true) {
        this.restore();
        
        let file: TreeNode = null;
        let status = (downloaded) ? "downloaded" : "";
        for(let id of itemIds) {
            file = this.findFile(id);
            if (file)
                file.data.downloadStatus = status;
        }

        this.save();
        this._statusUpdated.next(true);
    }

    /**
     * update the cart status of the given selection of files to match those of the files in this 
     * cart.  The status update includes whether it is in the cart and whether it has been downloaded. 
     * Given files that are not in this cart are ignored.
     *
     * This implementation assumes that a file's "cartId" data property contains an ID for the file
     * in the cart according to the requirements noted by findFile().  
     */
    public updateDownloadStatusOf(files: TreeNode[]) : void {
        let mine = null
        for (let file of files) {
            if (file.children) 
                this.updateDownloadStatusOf(file.children);
            else {
                mine = this.findFile(file.data.cartId);
                if (mine) {
                    if (typeof mine.data['downloadStatus'] == 'string')
                        file.data['downloadStatus'] = mine.data['downloadStatus'];
                    file.data['inCart'] = true;
                }
                else
                    file.data['inCart'] = false;
            }
        }
    }

    /**
     * find the file entry in the contents of this cart with the given file ID or null if the 
     * ID does not exist. 
     * 
     * For performance purposes, this implementation assumes a file's ID is a /-delimted string where 
     * fields between the delimiters represent a file's position in the hierarchy, with the first field 
     * identifies the top, resource-level collection.  
     *
     * @param cartId    the ID of the file within this cart
     * @param inFiles   the hierarchical set of files to search within; if not given, the full 
     *                  contents of this cart is searched.
     */
    public findFile(cartId: string) {
        return findFileIn(cartId, this.contents);
    }

    /**
     * add a file or a collection to this cart.  The given TreeNode must be a leaf node when representing 
     * a single file.  If it is a collection, the TreeNode must not be a leaf node (i.e. it must have
     * children), and it must be a complete collection.  In either case, it must have the data property 
     * 'cartId' that provides a "/"-delimited ID in accordance with the constraints described for findFile().
     *
     * Note that this function cannot be synchronized with a different instance of this cart running in 
     * another runtime.  Thus if this function is called nearly simulatenously in two different runtimes, it 
     * is possible that one will get overridden.  It is not likely, however, that the cart will get corrupted
     * as a result.  
     * 
     * @param file   a TreeNode description of the file or collection with a cartId data property
     */
    public addFile(file: TreeNode) : void {
        this.restore();
        
        if (! file.data)
            throw new Error("Unable to add file to cart: wrong type (not a TreeNode)");
        file = JSON.parse(JSON.stringify(file));
        this._addFileToColl(file, this.contents, "", file.data['cartId']);

        this.save();
        this._statusUpdated.next(true);
    }

    /* split off the first field in a /-delimited path */
    private _splitRootFromPath(path: string) : string[] {
        return path.split(/\/(.*)$/).concat('').slice(0, 2);
    }

    /**
     * recursive function to find location to insert a new file into a tree
     * @param file      the file TreeNode to insert; this node is to be inserted into the given collection,
     *                    either as a sibling or a descendent.
     * @param coll      the array of nodes representing members in a collection
     * @param parentid  the ID for the collection node that contains coll
     * @param targetid  the id of file relative to parentid; i.e. with the parentid prefix removed
     * @return TreeNode  the element added to coll 
     */
    private _addFileToColl(file: TreeNode, coll: TreeNode[], parentid: string, targetid: string) : TreeNode {
        if (file.children && (! file.data['fileCount'] || ! file.data['downloadedCount']))
            Object.assign(file.data, this._countIn(file.children));

        let nextsplit: string[] = this._splitRootFromPath(targetid);
        let lookfor: string = parentid;
        if (parentid.length > 0) lookfor += "/";
        lookfor +=  nextsplit[0];

        for (let i=0; i < coll.length; i++) {
            if (coll[i].data['cartId'] == lookfor) {
                // file goes in this one
                if (! coll[i].children) {
                    // we're adding a collection; this will replace any partial collection
                    // (assuming that file is a complete collection)
                    if (file.children)
                        // shouldn't happen
                        console.warn("Collection added to cart is clobbering previously added file");
                    file = this._createTreeFor(file, lookfor);
                    coll[i] = file;
                    return file;
                }

                let out = this._addFileToColl(file, coll[i].children, lookfor, nextsplit[1]);
                if (out)
                    Object.assign(coll[i].data, this._countIn(coll[i].children));  // update the cached counts
                return out
            }
        }

        // need to add a new parent collection
        file = this._createTreeFor(file, parentid);
        coll.push(file);
        return file;
    }

    private _createTreeFor(file: TreeNode, parentid: string) {
        if (parentid.length > 0 && ! parentid.endsWith("/")) parentid += "/";
        if (! file.data['cartId'].startsWith(parentid)) {
            console.error("Problem adding file to cart: file id does not start with parent: "
                          +file.data['cartId']+" vs. "+parentid)
            return file;
        }

        // if file's cartId is a/b/c/d and parentid is a/b, then need is ['c', 'd']
        let need = file.data['cartId'].substring(parentid.length).split("/").slice(0, -1);
        parentid = parentid.substring(0, parentid.length-1);
        
        while (need.length > 0) {
            parentid += "/" + need.pop();
            file = {
                data: {
                    cartId: parentid,
                    fileCount: (file.data['fileCount']) ? file.data['fileCount'] : 1,
                    downloadedCount: (file.data['downloadStatus'] == "downloaded")
                        ?  1 : ((file.data['downloadedCount']) ? file.data['downloadedCount'] : 0)
                },
                children: [ file ]
            }
        }
        return file;
    }

    _countIn(coll: TreeNode[]) {
        let out = { fileCount: 0, downloadedCount: 0 };
        for(let node of coll) {
            if (! node.children) {
                // this is a leaf (file) node
                out['fileCount']++;
                if (node.data['downloadStatus'] == "downloaded")
                    out['downloadedCount']++;
                continue;
            }

            // this is a collection (branch) node; make sure we have a rolled up count for its contents
            if (! node.data['fileCount'] || ! node.data['downloadedCount'])
                Object.assign(node.data, this._countIn(node.children));

            out['fileCount'] += node.data['fileCount'];
            out['downloadedCount'] += node.data['downloadedCount'];
        }
        return out;
    }

    /**
     * register to get alerts when files have been downloaded
     */
    public watchForChanges(subscriber): void {
        this._statusUpdated.subscribe(subscriber);
    }
}
