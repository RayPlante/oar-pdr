/**
 * Non-GUI classes and interfaces for managing the contents of a data cart.  This does *not* include 
 * downloading functionality.
 */
import { TreeNode } from 'primeng/api';

import { Observable, BehaviorSubject } from 'rxjs';

import { NerdmComp } from '../nerdm/nerdm';

/**
 * convert the TreeNode[] data to a string appropriate for saving to local storage
 */
export function stringifyCart(data: DataCartLookup) : string { return JSON.stringify(data); }

/**
 * parse a string pulled from local storage into TreeNode[] data 
 */
export function parseCart(datastr: string) : DataCartLookup {
    return <DataCartLookup>((datastr) ? JSON.parse(datastr) : {});
}

/**
 * a data structure describing a file in the cart.  A CartEntryData object, in effect, is a NerdmComp 
 * that *must* have the filepath property and is expected to have some additional 
 * data cart-specific properties.  
 */
export interface DataCartItem {

    /**
     * a local identifier for resource.  This must not start with an underscore as this is reserved.  
     */
    resId? : string;

    /**
     * the path to the file within its resource file hierarchy.  
     */
    filepath : string;

    /**
     * the URL from where the file can be downloaded
     */
    downloadURL? : string;

    /**
     * a label indicating whether the file has been downloaded yet.  If downloading of this file can 
     * be considered complete, the value will be "downloaded"
     */
    downloadStatus? : string;

    /**
     * a flag indicating if the item has been added to the user's global cart
     */
    isIncart? : boolean;

    /**
     * other parameters are expected
     */
    [propName: string]: any;
}

/**
 * a mapping of DataCartItems by their identifiers
 */
export interface DataCartLookup {
    /**
     * property names are data cart item (slash-delimited) identifiers
     */
    [propName: string]: DataCartItem;
}

/**
 * a container for the contents of a data cart.  This manages persisting the content data to the 
 * user's (via the browser) local disk.  
 */
export class DataCart {

    contents: DataCartLookup = {};      // the list of files in this cart
    cartName: string = null             // the name for this data cart; this is the name it is persisted under
    _storage: Storage = null;           // the persistant storage; if null, this cart is in-memory only

    // Caution: in the current application, this Observerable is not likely to work.  
    // Different listeners--namely a landing page and a data cart window--are not expected to execute
    // in the same runtime space; thus, they can't share their updates to a cart in real time via a Subject
    // 
    private _statusUpdated = new BehaviorSubject<boolean>(false);   // for alerts about changes to the cart

    /**
     * initialize this cart.  This is not intended to be called directly by users; the static functions
     * should be used instead.
     */
    constructor(name: string, data?: DataCartLookup, store: Storage|null = localStorage) {
        this.cartName = name;
        if (data) this.contents = data;
        this._storage = store;  // if null; cart is in-memory only
    }

    /**
     * return the DataCart from persistent storage.  If it does not exist, create an empty one.
     */
    public static openCart(id: string, store: Storage = localStorage) : DataCart {
        let data: DataCartLookup = <DataCartLookup>{};
        if (store) {
            data = parseCart(store.getItem(id));
            if (! data)
                return DataCart.createCart(id, store);
        }
        return new DataCart(id, data, store);
    }

    /**
     * create a new empty DataCart with the given ID and register it into persistent storage.  If 
     * a DataCart already exists with that ID, it will be discarded.
     */
    public static createCart(id: string, store: Storage = localStorage) : DataCart {
        let out: DataCart = new DataCart(id, <DataCartLookup>{}, store);
        out.save();
        return out;
    }

    /**
     * save the contents of this cart to its persistent storage
     */
    public save() : void {
        if (this._storage)
            this._storage.setItem(this.cartName, stringifyCart(this.contents));
    }

    /**
     * delete the contents of this cart from persistent storage
     */
    public forget() : void {
        if (this._storage)
            this._storage.removeItem(this.cartName);
    }

    /**
     * restore the content of this cart from the last save to persistent storage.  Clients should call 
     * this if they want to ensure they have the latest changes to the cart.  
     */
    public restore() : void {
        if (this._storage)
            this.contents = parseCart(this._storage.getItem(this.cartName));
    }

    /**
     * count and return the total number of files in this cart
     */
    public size() : number {
        return Object.keys(this.contents).length;
    }

    /**
     * count and return the total number of files currently marked as downloaded
     */
    public countFilesDownloaded() : number {
        return Object.values(this.contents).filter((c,i?,a?) => {
            return c['downloadStatus'] == "downloaded";
        }).length;
    }

    /**
     * find the file entry in the contents of this cart with the given file ID or null if the 
     * ID does not exist. 
     * @param cartId    the ID of the file within this cart
     * @return DataCartItem  -- the matching file item
     */
    findFileById(cartId: string) : DataCartItem {
        return this.contents[cartId];
    }

    /**
     * find the file entry in the contents of this cart with the given file ID or null if the 
     * ID does not exist. 
     * @param resId     the local identifier for the resource that the file is from
     * @param filepath  the path to the file within the resource collection.
     */
    public findFile(resId: string, filepath: string) : DataCartItem {
        return this.findFileById(this._idFor(resId, filepath));
    }

    public findItem(item: DataCartItem) {
        return this.findFileById(this._idFor(item['resId'], item['filepath']));
    }

    private _idFor(resId: string, filepath: string) { return resId+"/"+filepath; }
    private _idForItem(item: DataCartItem) {
        return this._idFor(item['resId'], item['filepath']);
    }

    /**
     * add a DataCartItem to the cart
     */
    addItem(item: DataCartItem) : void {
        this.restore();
        this.contents[this._idForItem(item)] = item;
        this.save();
        this._statusUpdated.next(true);
    }

    /**
     * add a file NerdmComp to this data cart.  The item must have filepath and a downloadURL properties
     * @param resid   a repository-local identifier for the resource that the file is from
     * @param file    the DataCartItem or NerdmComp that describes the file being added.
     */
    addFile(resid: string, file: DataCartItem|NerdmComp) : void {
        let fail = function(msg: string) : void {
            console.error("Unable to load file NERDm component: "+msg+": "+JSON.stringify(file));
        }
        if (! resid) return fail("Missing resid argument");
        if (! file['filepath']) return fail("missing component property, filepath");
        if (! file['downloadURL']) return fail("missing component property, downloadURL");

        let item = JSON.parse(JSON.stringify(file));
        item['resId'] = resid;
        if (item['downloadStatus'] === undefined)
            item['downloadStatus'] = "";
        this.addItem(item);
    }
                      
    /**
     * mark a file as having been downloaded.
     * @param resId     the local identifier for the resource that the file is from
     * @param filepath  the path to the file within the resource collection.
     * @param downloaded  if false, the listed files will be marked as not downloaded; otherwise 
     *                    (the default), they are marked as downloaded.  
     * @return boolean -- true if the identified file was found in this cart and its status updated; 
     *                    false, otherwise.
     */
    public markAsDownloaded(resid: string, filepath: string, downloaded: boolean = true) : boolean {
        this.restore();
        
        let status = (downloaded) ? "downloaded" : "";
        let item: DataCartItem = this.findFile(resid, filepath);
        if (! item)
            return false;

        item.downloadStatus = status;
        this.save();
        this._statusUpdated.next(true);

        return true;
    }

    /**
     * update the status of the files in a given cart to match those of the same files in this 
     * cart.  The status update includes whether the file has been downloaded,
     * and, if markInCart=true (default), whether it is in this cart.  
     * Files in the given cart that are not in this cart are ignored.  
     *
     * @return number -- the total number of files in the given cart that are now marked as downloaded;
     *                   if this number equals cart.size(), then all files are marked as downloaded. 
     */
    public updateFileStatusOf(cart: DataCart, markInCart: boolean=true) : number {
        let mine : DataCartItem = null
        let file : DataCartItem = null
        let dlcount = 0;
        for (let key in cart.contents) {
            file = cart.contents[key];
            mine = this.findFile(file['resId'], file['filepath']);
            if (mine) {
                if (typeof mine['downloadStatus'] == 'string')
                    file['downloadStatus'] = mine['downloadStatus'];
                if (markInCart) file['inCart'] = true;
            }
            else if (markInCart) 
                file['inCart'] = false;
            
            if (file['downloadStatus'] == 'downloaded') dlcount++;
        }

        return dlcount;
    }

    /**
     * return a list of the files in the cart
     */
    public getFiles() { return self.contents.values(); }

    /**
     * register to get alerts when files have been downloaded
     */
    public watchForChanges(subscriber): void {
        this._statusUpdated.subscribe(subscriber);
    }
}
