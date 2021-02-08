import { Component, Input, NgZone } from '@angular/core';

import { TreeNode } from 'primeng/api';

import { NerdmComp, NerdmRes, formatBytes } from '../../nerdm.module';
import { GoogleAnalyticsService } from '../../shared/ga-service/google-analytics.service';

import { Component, Input, Output, ChangeDetectorRef, NgZone, EventEmitter } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { CartService } from '../../datacart/cart.service';
import { Data } from '../../datacart/data';
import { OverlayPanel } from 'primeng/overlaypanel';
import { DownloadService } from '../../shared/download-service/download-service.service';
import { ConfirmationService } from 'primeng/primeng';
import { ZipData } from '../../shared/download-service/zipData';
import { HttpClient, HttpRequest, HttpEventType } from '@angular/common/http';
import { AppConfig } from '../../config/config';
import { FileSaverService } from 'ngx-filesaver';
import { Router } from '@angular/router';
import { CommonFunctionService } from '../../shared/common-function/common-function.service';
import { GoogleAnalyticsService } from '../../shared/ga-service/google-analytics.service';
import { NotificationService } from '../../shared/notification-service/notification.service';
import { EditStatusService } from '../editcontrol/editstatus.service';
import { NerdmComp } from '../../nerdm/nerdm';

declare var _initAutoTracker: Function;

formatForContentType = {
    "application/vnd.ms.excel": "Excel Spreadsheet",
    "application/csv": "Tabular data",
    "text/csv": "Tabular data",
    "application/tsv": "Tabular data",
    "text/tvs": "Tabular data",
    "application/pdf":  "PDF document",
    "text/plain":  "Plain text",
    "text/json": "JSON data",
    "application/json": "JSON data",
    "application/tar": "TAR archive file", 
    "application/zip": "ZIP archive file"
};

function deepcopy(obj) { return JSON.parse(JSON.stringify(obj)); }

@Component({
    moduleId: module.id,
    styleUrls: ['../landing.component.css'],
    selector: 'pdr-data-files',
    templateUrl: `data-files.component.html`,
    providers: [ConfirmationService]
})
export class DataFilesComponent {

    @Input() record: NerdmRes = null;
    @Input() inBrowser: boolean = false;   // false if running server-side
    @Input() editEnabled: boolean = false; // disable all download functionality if edit is enabled

    cols: any[];
    toplist: TreeNode[];
    cols = [
        { field: 'name', header: 'Name', width: '60%' },
        { field: 'format', header: 'Media Type', width: 'auto' },
        { field: 'size', header: 'Size', width: 'auto' },
        { field: 'downloadStatus', header: 'Status', width: 'auto' }
    ];
    fileCount: number = 0;
    cartFileCount: number = 0;          // number of files currently in the cart
    fontSize: string = "14px";          // used for column data; adjustable for window size
    isAllExpanded : boolean = false;    // true if user clicked on "Expand All"
    showZipFileNames : boolean = false; // if true, show for each file, which zipfile it was downloaded in
    allSelected: boolean = false;       // true if user added all files to the data cart

    constructor(private cfg: AppConfig,
                private cartService: CartService,
                private downloadService: DownloadService,
                private gaService: GoogleAnalyticsService,
                ngZone: NgZone)
    {
        if (typeof (window) !== 'undefined') {
            this.setWidth(window.innerWidth);

            window.onresize = (e) => {
                ngZone.run(() => {
                    this.setColWidthForWindow(window.innerWidth);
                });
            };
        }

        this.cartService.watchStorage().subscribe(size => {
            this.cartFileCount = size;
        });
    }

    /**
     * create the hierachical listing of the files.  This will reset this.fileCount
     */
    buildTree() : void {
        let chilbypar = { "": [] };
        let parent = "";
        let node = null;
        let c = 0;
        for(let cmp of this.records) {
            if (! cmp['filepath'] || NERDResource.objectMatchesType(cmp, "Hidden")) 
                continue;
            parent = this.parentcoll(cmp['filepath']);
            if (! chilbypar[parent]) 
                childbypar[parent] = [];

            node = this.toTreeNode(cmp);
            if (chilbypar[cmp['filepath']])
                node['children'] = chilbypar[cmp['filepath']];
            childbypar[parent].push(node);
            c++;
        }

        this.toplist = chilbypar[""];
        this.fileCount = c;
    }

    /**
     * remove the last file path field to return the parent collection path.  If the input 
     * path has no parent (i.e. has no "/" character) return an empty string.
     */
    parentcoll(path : string) : string {
        let pos = path.lastIndexOf("/");
        if (pos < 0)
            return "";
        return path.substring(0, pos);
    }

    /**
     * convert the given NERDm component into a TreeNode.  The data property will contain a copy of all 
     * of the corresponding component metadata, plus the following flags:
     *  * cartId: string -- an ID for identifying it in the cart
     *  * isIncart: boolean -- true if the component is currently added into the cart
     *  * downloadStatus: string -- a string indicating its download status: "downloading", "downloaded", ...
     *  * zipFile: 
     */
    toTreeNode(comp : NerdComp) : TreeNode {
        let out : TreeNode = {
            data: deepcopy(comp);
        };
        Object.assign(out.data, {
            isIncart: false,
            downloadStatus = null,
            zipFile: null
        });

        // set the id to use to identify it within the cart; we need the resource ID to be part
        // of it since the cart can contain files from different resource collections.  
        out.data['cartId'] = this.record['@id'];
        if (! comp['@id'].startsWith('#'))
            out.data['cartId'] += "/"
        out.data['cartId'] += comp['@id'] || comp['filepath'];

        if (comp.filepath) {
            // set a name that is the base of the filepath
            let pos = comp.filepath.lastIndexOf("/");
            out.data['name'] = (pos >= 0) ? comp.filepath.substring(pos+1) : comp.filepath;
        }

        if (NERDResource.objectMatchesType(comp, "Subcollection"))
            out['children'] = [];
        else {
            out['leaf'] = true;
            if (! comp.format) {
                // set a human readable format string
                if (NERDResource.objectMatchesType(comp, "Checksum"))
                    out.data['format'] = "checksum hash (plain text)";
                else if (comp['contentType']) {
                    let fmt = formatForContentType(comp['contentType']);
                    if (fmt)
                        out.data['format'] = fmt;
                }
                else
                    out.data['format'] = comp['contentType'];
            }
        }

        return out;
    }

    /**
     * adjust the relative widths and fonts for the table columns based on the available width from the 
     * window.  This accounts for mobile and tablet devices.
     */
    setColWidthForWindow(winWidth: number) {
        if (winWidth > 1340) {
            // desktop screen with wide (or full-screen) window 
            this.cols[0].width = '60%';
            this.cols[1].width = '20%';
            this.cols[2].width = '15%';
            this.cols[3].width = '100px';
            this.fontSize = '16px';
        } else if (winWidth > 780) {
            // tablet screen or destop screen with moderate width window
            this.cols[0].width = '60%';
            this.cols[1].width = '170px';
            this.cols[2].width = '100px';
            this.cols[3].width = '100px';
            this.fontSize = '14px';
        }
        else {
            // mobile screen
            this.cols[0].width = '50%';
            this.cols[1].width = '20%';
            this.cols[2].width = '20%';
            this.cols[3].width = '10%';
            this.fontSize = '12px';
        }
    }

    ngOnChanges() {
        this.useMetadata();
    }

    /**
     * initial this component's internal data used to drive the display based on the 
     * input resource metadata
     */
    useMetadata(): void {
        this.buildTree()
    }

    /**
     * expand or collapse the full file hierarchy 
     * @param expand   if true, all file subcollections are opened; if false, all are closed
     */
    setAllExpanded(expand: boolean) {
        this.setCollectionExpandedToLevel(toplist, expand, -1);
    }

    /**
     * expand or collapse the file hierarchy from the top down to a certain level
     * @param coll     the TreeNode for the collection; it must have a children property.
     * @param expand   if true, all file subcollections are opened; if false, all are closed
     * @param level    an integer indicating the number of levels down to adjust; a value of 1 means
     *                 expand only the given TreeNode (coll); a value of 0 means do nothing; a 
     *                 negative value means apply the change all the way to the bottom of the hierarchy.
     */
    setCollectionExpandedToLevel(coll: TreeNode, expand: boolean, level: number) {
        if (! coll.children || level == 0)
            return;

        coll.expanded = expand;
        if (level == 1)
            return;

        for (let i=0; i < coll.children.length; i++) {
            if (coll.children[i].children)
                this.setCollectionExpandedToLevel(coll.children[i], expand, level-1);
        }
    }
    
    /**
     * format a file size appropriately for display
     **/
    formatBytes(bytes, numAfterDecimal) {
        // use global function imported from nerdm.ts
        return formatBytes(bytes, numAfterDecimal);
    }

    /** style to use for cells under the file Name column */
    titleStyle() {
        return { 'width': this.cols[0].width, 'font-size': this.fontSize };
    }

    /** style to use for cells under the Media Type column */
    typeStyle() {
        return { 'width': this.cols[1].width, 'font-size': this.fontSize };
    }

    /** style to use for cells under the file Size column */
    sizeStyle() {
        return { 'width': this.cols[2].width, 'font-size': this.fontSize };
    }

    /** style to use for cells under the Status column */
    statusStyle() {
        return { 'width': this.cols[3].width, 'font-size': this.fontSize };
    }

    /**
     * set a file's download status in response to clicking the download link
    **/
    setFileDownloaded(rowData: any) {
        rowData.downloadStatus = 'downloaded';
        this.cartService.updateCartItemDownloadStatus(rowData.cartId, 'downloaded');
        this.downloadStatus = this.updateDownloadStatus(this.files) ? "downloaded" : null;
        if (rowData.isIncart) {
            this.downloadService.setFileDownloadedFlag(true);
        }
    }

    /**
     * Return "download all" button color based on download status
     **/
    getDownloadAllBtnColor() {
        if (this.downloadStatus == null)
            return '#1E6BA1';
        else if (this.downloadStatus == 'downloaded')
            return 'green';
    }

    /**
    * Return "download" button color based on download status
    **/
    getDownloadBtnColor(rowData: any) {
        if (rowData.downloadStatus == 'downloaded')
            return 'green';

        return '#1E6BA1';
    }

    /**
     * Return "add all to datacart" button color based on select status
     **/
    getAddAllToDataCartBtnColor() {
        if (this.allSelected)
            return 'green';
        else
            return '#1E6BA1';
    }

    /**
     * Return tooltip text based on select status
     **/
    getCartProcessTooltip() {
        if (this.allSelected)
            return 'Remove all from cart';
        else
            return 'Add all to cart';
    }

    /**
     * Function to confirm download all.
     **/
    downloadAllConfirm(header: string, massage: string, key: string) {
        this.confirmationService.confirm({
            message: massage,
            header: header,
            key: key,
            accept: () => {
                // Google Analytics tracking code
                // this.gaService.gaTrackEvent('download', undefined, 'all files', 'title');

                setTimeout(() => {
                    let popupWidth: number = this.mobWidth * 0.8;
                    let left: number = this.mobWidth * 0.1;
                    let screenSize = 'height=880,width=' + popupWidth.toString() + ',top=100,left=' + left.toString();
                    window.open('/datacart/popup', 'DownloadManager', screenSize);
                    this.downloadAllViaCart();
                }, 0);
            },
            reject: () => {
            }
        });
    }

    /**
     * Function to download all.
     **/
    downloadAllViaCart() {
        this.cartService.setCurrentCart('landing_popup');
        setTimeout(() => {
            this.cartService.clearTheCart();
            this.addAllFilesToCart(this.files, true, 'popup').then(function (result) {
                this.cartService.setCurrentCart('cart');
                this.updateStatusFromCart().then(function (result: any) {
                    this.forceDataFileTreeInit();
                }.bind(this), function (err) {
                    alert("something went wrong while adding file to data cart.");
                });
            }.bind(this), function (err) {
                alert("something went wrong while adding all files to cart");
            });
        }, 0);
    }

    private updateDownloadStatus() {
        this.cartMap = this.cartService.getCart();
        this.allSelected = this.updateAllSelectStatus(this.files);
        this.cartFileSize = this.cartService.getCartSize();
    }


    

    /* ************************************** */

    displayDownloadFiles: boolean = false;
    cartMap: any[];
    allSelected: boolean = false;
    allDownloaded: boolean = false;
    downloadStatus: any = null;
    totalFiles: any;
    zipData: ZipData[] = [];
    isExpanded: boolean = false;
    visible: boolean = true;
    cancelAllDownload: boolean = false;
    cartLength: number;
    treeRoot = [];
    showZipFiles: boolean = true;
    allProcessed: boolean = false;
    noFileDownloaded: boolean; // will be true if any item in data cart is downloaded
    isLocalProcessing: boolean;
    showDownloadProgress: boolean = false;
    mobWidth: number = 800;   // default value used in server context
    mobHeight: number = 900;  // default value used in server context
    fontSize: string;

    /* Function to Return Keys object properties */
    //   keys(): Array<string> {
    //     return Object.keys(this.fileDetails);
    //   }

    constructor(private cartService: CartService,
        private cdr: ChangeDetectorRef,
        private downloadService: DownloadService,
        private http: HttpClient,
        private cfg: AppConfig,
        private _FileSaverService: FileSaverService,
        private confirmationService: ConfirmationService,
        private commonFunctionService: CommonFunctionService,
        private gaService: GoogleAnalyticsService,
        public router: Router,
        private notificationService: NotificationService,
        private edstatsvc: EditStatusService,
        ngZone: NgZone) {
        this.cols = [
            { field: 'name', header: 'Name', width: '60%' },
            { field: 'mediatype', header: 'Media Type', width: 'auto' },
            { field: 'size', header: 'Size', width: 'auto' },
            { field: 'download', header: 'Status', width: 'auto' }];

        if (typeof (window) !== 'undefined') {
            this.mobHeight = (window.innerHeight);
            this.mobWidth = (window.innerWidth);
            this.setWidth(this.mobWidth);

            window.onresize = (e) => {
                ngZone.run(() => {
                    this.mobWidth = window.innerWidth;
                    this.mobHeight = window.innerHeight;
                    this.setWidth(this.mobWidth);
                });
            };
        }

        this.cartService.watchStorage().subscribe(value => {
            this.cartLength = value;
        });

        this.edstatsvc._watchForceDataFileTreeInit((start) => {
            if (start) {
                this.cartMap = this.cartService.getCart();
                this.allSelected = this.updateAllSelectStatus(this.files);
                this.cartLength = this.cartService.getCartSize();
            }
        });
    }

    ngOnInit() {
        this.cartMap = this.cartService.getCart();

        this.downloadService.watchDownloadProcessStatus("landingPage").subscribe(
            value => {
                this.allProcessed = value;
                if (this.allProcessed) {
                    this.downloadStatus = "downloaded";
                }
                this.downloadStatus = this.updateDownloadStatus(this.files) ? "downloaded" : null;
            }
        );
        this.downloadService.watchAnyFileDownloaded().subscribe(
            value => {
                this.noFileDownloaded = !value;
            }
        );
    }


    ngOnChanges() {
        this.buildTree();
    }

    buildTree() {
        // if (this.files.length != 0)
        //   this.files = <TreeNode[]>this.files[0].data;
        this.fileNode = { "data": { "name": "", "size": "", "mediatype": "", "description": "", "filetype": "" } };

        const newPart = {
            data: {
                cartId: "/",
                ediid: this.record['ediid'],
                name: "files",
                mediatype: "",
                size: null,
                downloadUrl: null,
                description: null,
                filetype: null,
                resId: "/",
                filePath: "/",
                downloadProgress: 0,
                downloadInstance: null,
                isIncart: false,
                zipFile: null,
                message: ''
            }, children: []
        };
        newPart.children = this.files;
        this.treeRoot.push(newPart);
        this.updateStatusFromCart();
        this.allSelected = this.updateAllSelectStatus(this.files);
        this.downloadStatus = this.updateDownloadStatus(this.files) ? "downloaded" : null;
        this.totalFiles = 0;
        this.getTotalFiles(this.files);

    }

    /*
    *   Init object - edit buttons for animation purpose
    */
    editingObjectInit() {
        var editingObject = {
            "originalValue": '',
            "detailEditmode": false,
            "buttonOpacity": 0,
            "borderStyle": "0px solid lightgrey",
            "currentState": 'initial'
        }

        return editingObject;
    }

    /**
     * Function to expand tree display to certain level
     */
    expandToLevel(dataFiles: any, option: boolean, targetLevel: any) {
        this.expandAll(dataFiles, option, 0, targetLevel)
    }

    /**
     * Function to expand tree display to certain level - used by expandToLevel()
     */
    expandAll(dataFiles: any, option: boolean, level: any, targetLevel: any) {
        let currentLevel = level + 1;
        for (let i = 0; i < dataFiles.length; i++) {
            dataFiles[i].expanded = option;
            if (targetLevel != null) {
                if (dataFiles[i].children.length > 0 && currentLevel < targetLevel) {
                    this.expandAll(dataFiles[i].children, option, currentLevel, targetLevel);
                }
            } else {
                if (dataFiles[i].children.length > 0) {
                    this.expandAll(dataFiles[i].children, option, currentLevel, targetLevel);
                }
            }
        }
        this.isExpanded = option;
        this.visible = false;
        setTimeout(() => {
            this.visible = true;
        }, 0);
    }

    /**
     * Function to reset the download status and incart status.
     */
    resetStatus(files: any) {
        for (let comp of files) {
            if (comp.children.length > 0) {
                this.resetStatus(comp.children);
            } else {
                comp.data.isIncart = false;
                // comp.data.downloadStatus = null;
            }
        }
        return Promise.resolve(files);
    }

    /**
     * Function to sync the download status from data cart.
     */
    updateStatusFromCart() {
        this.resetStatus(this.files);

        for (let key in this.cartMap) {
            let value = this.cartMap[key];
            if (value.data.downloadStatus != undefined) {
                this.setFilesDownloadStatus(this.files, value.data.cartId, value.data.downloadStatus);
            }
            if (value.data.cartId != undefined) {
                let treeNode = this.searchTree(this.treeRoot[0], value.data.cartId);
                if (treeNode != null) {
                    treeNode.data.isIncart = true;
                }
            }
        }
        return Promise.resolve(this.files);
    }

    /**
     * Function to get total number of files.
     */
    getTotalFiles(files) {
        for (let comp of files) {
            if (comp.children.length > 0) {
                this.getTotalFiles(comp.children);
            } else {
                this.totalFiles = this.totalFiles + 1;
            }
        }
    }

    /**
     * Function to set files download status.
     */
    setFilesDownloadStatus(files, cartId, downloadStatus) {
        for (let comp of files) {
            if (comp.children.length > 0) {
                this.setFilesDownloadStatus(comp.children, cartId, downloadStatus);
            } else {
                if (comp.data.cartId == cartId) {
                    comp.data.downloadStatus = downloadStatus;
                }
            }
        }
    }

    isNodeSelected: boolean = false;
    openDetails(event, fileNode: TreeNode, overlaypanel: OverlayPanel) {
        this.isNodeSelected = true;
        this.fileNode = fileNode;
        overlaypanel.hide();
        setTimeout(() => {
            overlaypanel.show(event);
        }, 100);
    }

    /**
    * Function to add whole subfolder files to data cart then update status
    **/
    addSubFilesToCartAndUpdate(rowData: any, isSelected: boolean) {
        this.addSubFilesToCart(rowData, isSelected).then(function (result: any) {
            this.allSelected = this.updateAllSelectStatus(this.files);
        }.bind(this), function (err) {
            alert("something went wrong while adding file to data cart.");
        });
    }

    /**
    * Function to add whole subfolder files to data cart
    **/
    addSubFilesToCart(rowData: any, isSelected: boolean) {
        if (!rowData.isLeaf) {
            let subFiles: any = null;
            for (let comp of this.files) {
                subFiles = this.searchTree(comp, rowData.cartId);
                if (subFiles != null) {
                    break;
                }
            }
            if (subFiles != null) {
                this.addFilesToCart(subFiles.children, isSelected, '');
                rowData.isIncart = true;
            }
        } else {
            this.addtoCart(rowData, isSelected, '');
        }

        return Promise.resolve(rowData);
    }

    /**
    * Function to search the file tree for a given cartid.
    **/
    searchTree(element, cartId) {
        if (element.data.cartId == cartId) {
            return element;
        } else if (element.children.length > 0) {
            var i;
            var result = null;
            for (i = 0; result == null && i < element.children.length; i++) {
                result = this.searchTree(element.children[i], cartId);
            }
            return result;
        }
        return null;
    }

    /**
    * Function to add/remove all files to/from data cart.
    **/
    cartProcess(files: any) {
        this.isLocalProcessing = true;

        setTimeout(() => {
            if (this.allSelected) {
                this.removeFilesFromCart(files).then(function (result1: any) {
                    this.isLocalProcessing = false;
                }.bind(this), function (err) {
                    alert("something went wrong while removing file from data cart.");
                });
            }
            else {
                this.addAllFilesToCart(files, false, '').then(function (result1: any) {
                    this.updateStatusFromCart();
                    this.allSelected = this.updateAllSelectStatus(this.files);
                    this.downloadStatus = this.updateDownloadStatus(this.files) ? "downloaded" : null;
                    this.isLocalProcessing = false;
                }.bind(this), function (err) {
                    alert("something went wrong while adding file to data cart.");
                });
            }
        }, 0);

        setTimeout(() => {
            this.isLocalProcessing = false;
        }, 10000);
    }

    /**
    * Function to add all files to data cart.
    **/
    addAllFilesToCart(files: any, isSelected: boolean, mode: string) {
        this.cartService.deselectAll().then(function (result1: any) {
            this.addFilesToCart(files, isSelected, mode).then(function (result2: any) {
                this.cartService.setForceDatacartReload(true);
                this.allSelected = this.updateAllSelectStatus(this.files);
                if (mode == 'popup') {
                    this.allSelected = true;
                }
            }.bind(this), function (err) {
                alert("something went wrong while adding one file to data cart.");
            });
        }.bind(this), function (err) {
            alert("something went wrong while cleaning up data cart select flag.");
        });
        return Promise.resolve(files);
    }

    /**
    * Function to add given file tree to data cart.
    **/
    addFilesToCart(files: any, isSelected: boolean, mode: string) {
        let data: Data;
        let compValue: any;
        for (let comp of files) {
            if (comp.children.length > 0) {
                compValue += this.addFilesToCart(comp.children, isSelected, mode);
            } else {
                this.addtoCart(comp.data, isSelected, mode).then(function (result) {
                    compValue = 1;
                }.bind(this), function (err) {
                    alert("something went wrong while adding one file to data cart.");
                });
            }
        }
        return Promise.resolve(compValue);
    }

    /**
    * Function to add one file to data cart with pre-select option.
    **/
    addtoCart(rowData: any, isSelected: boolean, mode: string) {
        let cartMap: any;
        let data: Data;
        data = {
            'cartId': rowData.cartId,
            'ediid': this.record['ediid'],
            'resId': rowData.resId,
            'resTitle': this.record['title'],
            'resFilePath': rowData.filePath,
            'id': rowData.name,
            'fileName': rowData.name,
            'filePath': rowData.filePath,
            'fileSize': rowData.size,
            'filetype': rowData.filetype,
            'downloadUrl': rowData.downloadUrl,
            'mediatype': rowData.mediatype,
            'downloadStatus': rowData.downloadStatus,
            'description': rowData.description,
            'isSelected': isSelected,
            'message': rowData.message
        };

        this.cartService.addDataToCart(data).then(function (result) {
            if (mode != 'popup')
                rowData.isIncart = true;
            cartMap = result;
        }.bind(this), function (err) {
            alert("something went wrong while fetching the products");
        });
        return Promise.resolve(cartMap);
    }

    /**
    * Remove one node from cart and set flag
    **/
    removeFromNode(rowData: any) {
        this.removeCart(rowData);
        this.allSelected = this.updateAllSelectStatus(this.files);
    }

    /**
    * Remove one node from cart - can be a file or sub-tree
    **/
    removeCart(rowData: any) {
        if (!rowData.isLeaf) {
            let subFiles: any = null;
            for (let comp of this.files) {
                subFiles = this.searchTree(comp, rowData.cartId);
                if (subFiles != null) {
                    break;
                }
            }
            if (subFiles != null) {
                this.removeFilesFromCart(subFiles.children);
                rowData.isIncart = false;
            }
        } else {
            this.cartService.removeCartId(rowData.cartId);
            rowData.isIncart = false;
        }
    }

    /**
    * Remove all files from cart and set flags
    **/
    removeFilesFromCart(files: any) {
        this.removeFromCart(files);
        this.allSelected = this.updateAllSelectStatus(this.files);
        return Promise.resolve(files);
    }

    /**
    * Remove all files from cart - used by removeFilesFromCart()
    **/
    removeFromCart(files: any) {
        for (let comp of files) {
            if (comp.children.length > 0) {
                comp.data.isIncart = false;
                this.removeFromCart(comp.children);
            } else {
                this.cartService.removeCartId(comp.data.cartId);
                comp.data.isIncart = false;
            }
        }

    }

    /**
    * Check if all chirldren nodes were all selected
    **/
    updateAllSelectStatus(files: any) {
        var allSelected = true;
        for (let comp of files) {
            if (comp.children.length > 0) {
                comp.data.isIncart = this.updateAllSelectStatus(comp.children);
                allSelected = allSelected && comp.data.isIncart;
            } else {
                if (!comp.data.isIncart) {
                    this.allSelected = false;
                    allSelected = false;
                }
            }
        }
        return allSelected;
    }

    /**
    * Once a file was downloaded, we need to update it's parent's status as well
    **/
    updateDownloadStatus(files: any) {
        var allDownloaded = true;
        var noFileDownloadedFlag = true;
        for (let comp of files) {
            if (comp.children != undefined && comp.children.length > 0) {
                var status = this.updateDownloadStatus(comp.children);
                if (status) {
                    comp.data.downloadStatus = 'downloaded';
                    this.cartService.updateCartItemDownloadStatus(comp.data.cartId, 'downloaded');
                }
                allDownloaded = allDownloaded && status;
            } else {
                if (comp.data.downloadStatus != 'downloaded') {
                    allDownloaded = false;
                }
                if (comp.data.downloadStatus == 'downloaded' && comp.data.isIncart) {
                    noFileDownloadedFlag = true;
                }
            }
        }

        this.downloadService.setFileDownloadedFlag(!noFileDownloadedFlag);
        return allDownloaded;
    }

    /**
    * Downloaded one file
    **/
    downloadOneFile(rowData: any) {
        let filename = decodeURI(rowData.downloadUrl).replace(/^.*[\\\/]/, '');
        rowData.downloadStatus = 'downloading';
        this.showDownloadProgress = true;
        rowData.downloadProgress = 0;
        let url = rowData.downloadUrl.replace('http:', 'https:');

        const req = new HttpRequest('GET', url, {
            reportProgress: true, responseType: 'blob'
        });

        rowData.downloadInstance = this.http.request(req).subscribe(event => {
            switch (event.type) {
                case HttpEventType.Response:
                    this._FileSaverService.save(<any>event.body, filename);
                    this.showDownloadProgress = false;
                    this.setFileDownloaded(rowData);
                    break;
                case HttpEventType.DownloadProgress:
                    rowData.downloadProgress = Math.round(100 * event.loaded / event.total);
                    break;
            }
        })
    }

    /**
    * Function to download all files based on download url.
    **/
    downloadAllFilesFromUrl(files: any) {
        for (let comp of files) {
            if (comp.children.length > 0) {
                this.downloadAllFilesFromUrl(comp.children);
            } else {
                if (comp.data.downloadUrl) {
                    this.downloadOneFile(comp.data);
                }
            }
        }
    }

    /**
    * Function to set the download status of all files to downloaded.
    **/
    setAllDownloaded(files: any) {
        for (let comp of files) {
            if (comp.children.length > 0) {
                this.setAllDownloaded(comp.children);
            } else {
                comp.data.downloadStatus = 'downloaded';
                this.cartService.updateCartItemDownloadStatus(comp.data.cartId, 'downloaded');
            }
        }
    }

    /**
    * Function to reset the download status of a file.
    **/
    resetDownloadStatus(rowData) {
        rowData.downloadStatus = null;
        rowData.downloadProgress = 0;
        this.cartService.updateCartItemDownloadStatus(rowData.cartId, null);
        this.allDownloaded = false;
    }

    /*
  * Following functions set tree table style
  */
    titleStyleHeader() {
        return { 'background-color': '#1E6BA1', 'width': this.cols[0].width, 'color': 'white', 'font-size': this.fontSize };
    }

    typeStyleHeader() {
        return { 'background-color': '#1E6BA1', 'width': this.cols[1].width, 'color': 'white', 'font-size': this.fontSize };
    }

    sizeStyleHeader() {
        return { 'background-color': '#1E6BA1', 'width': this.cols[2].width, 'color': 'white', 'font-size': this.fontSize };
    }

    statusStyleHeader() {
        return { 'background-color': '#1E6BA1', 'width': this.cols[3].width, 'color': 'white', 'font-size': this.fontSize, 'white-space': 'nowrap' };
    }

    setWidth(mobWidth: number) {
        if (mobWidth > 1340) {
            this.cols[0].width = '60%';
            this.cols[1].width = '20%';
            this.cols[2].width = '15%';
            this.cols[3].width = '100px';
            this.fontSize = '16px';
        } else if (mobWidth > 780 && this.mobWidth <= 1340) {
            this.cols[0].width = '60%';
            this.cols[1].width = '170px';
            this.cols[2].width = '100px';
            this.cols[3].width = '100px';
            this.fontSize = '14px';
        }
        else {
            this.cols[0].width = '50%';
            this.cols[1].width = '20%';
            this.cols[2].width = '20%';
            this.cols[3].width = '10%';
            this.fontSize = '12px';
        }
    }

    /*
    * Make sure the width of popup dialog is less than 500px or 80% of the window width
    */
    getDialogWidth() {
        var w = window.innerWidth > 500 ? 500 : window.innerWidth;
        return w + 'px';
    }
}
