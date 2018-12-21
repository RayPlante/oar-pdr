import { Component, Input,ChangeDetectorRef } from '@angular/core';
import { TreeNode} from 'primeng/api';
import { CartService} from '../../datacart/cart.service';
import { Data} from '../../datacart/data';
import { OverlayPanel} from 'primeng/overlaypanel';
import { stringify } from '@angular/compiler/src/util';
import { DownloadService } from '../../shared/download-service/download-service.service';
import { SelectItem, DropdownModule, ConfirmationService,Message } from 'primeng/primeng';
import { DownloadData } from '../../datacart/downloadData';
import { ZipData } from '../../shared/download-service/zipData';
import { CommonVarService } from '../../shared/common-var';
import { environment } from '../../../environments/environment';
import { HttpClientModule, HttpClient, HttpHeaders, HttpRequest, HttpEventType, HttpResponse, HttpEvent } from '@angular/common/http'; 
import { TestBed } from '@angular/core/testing';


declare var saveAs: any;

@Component({
  moduleId: module.id,
  styleUrls: ['../landing.component.css'],
  selector: 'description-resources',
  templateUrl: `description.component.html`,
  providers: [ConfirmationService]
})

export class DescriptionComponent {

    @Input() record: any[];
    @Input() files: TreeNode[];
    @Input() distdownload: string;
    @Input() editContent: boolean;
    @Input() filescount: number;
    @Input() metadata: boolean;

    addAllFileSpinner:boolean = false;
    fileDetails:string = '';
    isFileDetails: boolean = false;
    isReference: boolean = false;
    selectedFile: TreeNode;
    isAccessPage : boolean = false;
    accessPages: Map <string, string> = new Map();
    accessUrls : string[] =[];
    accessTitles : string[] =[];
    isReferencedBy : boolean = false;
    isDocumentedBy : boolean = false;
    selectedNodes: TreeNode[];
    addFileStatus:boolean = false;
    selectedNode : TreeNode;
    cols: any[];
    fileNode: TreeNode;
    displayDownloadFiles: boolean = false;
    cartMap: any[];
    allSelected: boolean = false;
    allDownloaded: boolean = false;
    ediid:any;
    downloadStatus: any = null;
    totalFiles: any;
    downloadData: DownloadData[];
    zipData: ZipData[] = [];
    isExpanded: boolean = true;
    visible: boolean = true;
    cancelAllDownload: boolean = false;
    cartLength : number;
    treeRoot = [];
    showZipFiles: boolean = false;
    subscriptions: any = [];
    allProcessed: boolean = false;

    private distApi : string = environment.DISTAPI;

    /* Function to Return Keys object properties */
    keys() : Array<string> {
        return Object.keys(this.fileDetails);
    }

    constructor(private cartService: CartService,
        private cdr: ChangeDetectorRef,
        private downloadService: DownloadService,
        private commonVarService:CommonVarService,
        private http: HttpClient,
        private confirmationService: ConfirmationService) {
            this.cartService.watchAddAllFilesCart().subscribe(value => {
            this.addAllFileSpinner = value;
            });
            this.cartService.watchStorage().subscribe(value => {
                this.cartLength = value;
            });
    }

    myLog(name:any, variable: any){
        console.log(name);
        console.log(variable);
    }

    ngOnInit(){
        // this.cartService.clearTheCart();
        // this.cdr.detectChanges();

        if(this.files.length != 0)
            this.files  =<TreeNode[]>this.files[0].data;
        this.cols = [
            { field: 'name', header: 'Name', width: '60%' },
            { field: 'mediatype', header: 'MediaType', width: '15%' },
            { field: 'size', header: 'Size', width: '12%' },
            { field: 'download', header: 'Download', width: '10%' }];
    
        this.fileNode = {"data":{ "name":"", "size":"", "mediatype":"", "description":"", "filetype":"" }};

        this.cartMap = this.cartService.getCart();

        const newPart = {
            data : {
                cartId: "/",
                name : "files",
                mediatype: "",
                size: null,
                downloadURL: null,
                description: null,
                filetype: null,
                resId: "files",
                fullPath: "/",
                downloadProgress: 0,
                downloadInstance: null,
                isSelected: false,
                zipFile: null
            },children: []
          };
          newPart.children = this.files;
          this.treeRoot.push(newPart);

          this.updateStatusFromCart();

          // this.updateCartStatus(this.files);
          this.updateAllSelectStatus(this.files);
          this.updateDownloadStatus(this.files);
          this.ediid = this.commonVarService.getEdiid();
  
          this.totalFiles = 0;
          this.getTotalFiles(this.files);
  
          this.expandToLevel(this.files, true, 1);

          this.downloadService.watchDownloadProcessStatus().subscribe(
            value => {
                this.allProcessed = value;
                this.updateDownloadStatus(this.files);
            }
        );
          console.log(this.files);
    }

    expandToLevel(dataFiles: any, option: boolean, targetLevel: any){
        this.expandAll(dataFiles, option, 0, targetLevel)
    }

    expandAll(dataFiles: any, option: boolean, level: any, targetLevel: any){
        let currentLevel = level + 1;
        for ( let i=0; i < dataFiles.length; i++ ) {
            dataFiles[i].expanded = option;
            if(targetLevel != null){
                if(dataFiles[i].children.length > 0 && currentLevel < targetLevel){
                    this.expandAll(dataFiles[i].children, option, currentLevel, targetLevel);
                }
            }else{
                if(dataFiles[i].children.length > 0){
                    this.expandAll(dataFiles[i].children, option, currentLevel, targetLevel);
                }
            }
        }
        this.isExpanded = option;
        this.visible = false;
        setTimeout(() => {
            this.visible = true;
        },0);
    }

    /**
     * Function to sync the download status from data cart.
     */
    updateStatusFromCart(){
        for (let key in this.cartMap) {
            let value = this.cartMap[key];
            if(value.data.downloadStatus != undefined){
                this.setFilesDownloadStatus(this.files, value.data.cartId, value.data.downloadStatus);
            }
            if(value.data.cartId != undefined){           
                let treeNode = this.searchTree(this.treeRoot[0], value.data.cartId);
                if(treeNode != null){
                    treeNode.data.isSelected = true;
                }
            }
        }
    }

    /**
     * Function to get total number of files.
     */
    getTotalFiles(files){
        for (let comp of files) {
            if(comp.children.length > 0){
                this.getTotalFiles(comp.children);
            }else{
                this.totalFiles = this.totalFiles + 1;
            }
        }        
    }

    /**
     * Function to set files download status.
     */
    setFilesDownloadStatus(files, cartId, downloadStatus){
        for (let comp of files) {
            if(comp.children.length > 0){
                this.setFilesDownloadStatus(comp.children, cartId, downloadStatus);
            }else{
                if(comp.data.cartId == cartId){
                    comp.data.downloadStatus = downloadStatus;
                }
            }
        }
    }

    /**
     * Function to Check whether given record has references in it.
     */
    checkReferences(){
        if(Array.isArray(this.record['references']) ){
            for(let ref of this.record['references'] ){
                if(ref.refType === 'IsDocumentedBy') this.isDocumentedBy = true;
                if(ref.refType === 'IsReferencedBy') this.isReferencedBy = true;
            }
            if(this.isDocumentedBy || this.isReferencedBy)
            return true;
        }
    }

    /**
     * Function to Check whether record has keyword
     */
    checkKeywords(){
        if(Array.isArray(this.record['keyword']) ){
            if(this.record['keyword'].length > 0)
                return true;
            else 
                return false;    
        }
        else {
            return false;
        }
    }
    
    /**
     * Function to Check record has topics
     */
    checkTopics(){
        if(Array.isArray(this.record['topic']) ){
            if(this.record['topic'].length > 0)
                return true;
            else 
                return false;    
            }
        else {
            return false;
        }
    }

    /**
     * Function to Check if there are accesspages in the record inventory and components
     */
    checkAccesspages(){
        if(Array.isArray(this.record['inventory']) ){
            if(this.record['inventory'][0].forCollection == "") {
                for(let inv of this.record['inventory'][0].byType ){
                    if(inv.forType == "nrdp:AccessPage") 
                        this.isAccessPage = true;
                    }
                }
        }
        if(this.isAccessPage){
            this.accessPages = new Map();
            for(let comp of this.record['components']){
                if(comp['@type'].includes("nrdp:AccessPage"))
                { 
                    if(comp["title"] !== "" && comp["title"] !== undefined)
                        this.accessPages.set(comp["title"], comp["accessURL"]);
                    else   
                        this.accessPages.set(comp["accessURL"], comp["accessURL"]);
                }
            }
        }
        this.accessTitles = Array.from(this.accessPages.keys());
        this.accessUrls = Array.from(this.accessPages.values());
    }

    /**
    * Function to display bytes in appropriate format.
    **/ 
    formatBytes(bytes, numAfterDecimal) {
        if (0==bytes) return"0 Bytes" ;
        if (1 ==bytes) return"1 Byte" ;
        var base = 1000,
            e=["Bytes","kB","MB","GB","TB","PB","EB","ZB","YB"],
            d = numAfterDecimal||1,
            f = Math.floor(Math.log(bytes)/Math.log(base));
        
        var v = bytes/Math.pow(base,f);
        if (f == 0) // less than 1 kiloByte
            d = 0;
        else if (numAfterDecimal == null && v < 10.0)
            d = 2;
        return v.toFixed(d)+" "+e[f];
    }
 
    isNodeSelected: boolean = false;
    openDetails(event,fileNode: TreeNode, overlaypanel: OverlayPanel) {
        this.isNodeSelected = true;
        this.fileNode = fileNode;
        overlaypanel.hide();
        setTimeout(() => {
            overlaypanel.show(event);
        },100);
    }
 
    ngOnChanges(){
       this.checkAccesspages();
    }

    // updateCartStatus(files: any){
    //     for (let comp of files) {
    //         if(comp.children.length > 0){
    //             this.updateCartStatus(comp.children);
    //         }else{
    //             comp.data.isSelected = this.isInDataCart(comp.data.cartId);
    //         }
    //     }   
    //     this.updateAllSelectStatus(this.files);     
    // }

    addSubFilesToCart(rowData: any) {
        let data: Data;
        let compValue: any;
        // this.cartService.updateAllFilesSpinnerStatus(true);

        if(!this.isFile(rowData)){
            let subFiles: any = null;
            for (let comp of this.files) {
                subFiles = this.searchTree(comp, rowData.cartId);
                if(subFiles != null){
                    break;
                }
            }
            if(subFiles != null){
                this.addFilesToCart(subFiles.children);
                rowData.isSelected = true;
            }
        }else{
            this.addtoCart(rowData);
        }

        this.allSelected = true;
        this.updateAllSelectStatus(this.files);

        // setTimeout(() => {
        //     this.cartService.updateAllFilesSpinnerStatus(false);
        // }, 3000);
        // setTimeout(() => {
        //     this.addFileStatus = true;
        // }, 3000);
    }

    searchTree(element, cartId){
        if(element.data.cartId == cartId){
             return element;
        }else if (element.children.length > 0){
             var i;
             var result = null;
             for(i=0; result == null && i < element.children.length; i++){
                  result = this.searchTree(element.children[i], cartId);
             }
             return result;
        }
        return null;
   }

   addAllFilesToCart(){
       this.addFilesToCart(this.files);
       this.allSelected = true;
       this.updateAllSelectStatus(this.files);
   }

//     //Datacart related code
    addFilesToCart(files: any) {
        let data: Data;
        let compValue: any;
        // this.cartService.updateAllFilesSpinnerStatus(true);

        // for (let comp of this.record["components"]) {
        //     if (typeof comp["downloadURL"] != "undefined") {
                // data = {
                //     'resId': comp["@resId"].replace(/^.*[\\\/]/, ''),
                //     'resTitle': this.record["title"],
                //     'id': this.record["title"],
                //     'fileName': comp["title"],
                //     'filePath': comp["filepath"],
                //     'fileSize': comp["size"],
                //     'downloadURL': comp["downloadURL"],
                //     'fileFormat': comp["mediaType"],
                //     'downloadStatus': null,
                //     'resFilePath': ''
                // };
                // this.cartService.addDataToCart(data);
                // data = null;
        //     }
        // }

        for (let comp of files) {
            if(comp.children.length > 0){
                this.addFilesToCart(comp.children);
            }else{
                this.addtoCart(comp.data);
            }
        }

        // setTimeout(() => {
        //     this.cartService.updateAllFilesSpinnerStatus(false);
        // }, 3000);
        // setTimeout(() => {
        //     this.addFileStatus = true;
        // }, 3000);
    }

    removeFromNode(rowData:any){
        this.removeCart(rowData);
        this.allSelected = false;
        this.updateAllSelectStatus(this.files);
    }

    removeCart(rowData:any){
        if(!this.isFile(rowData)){
            let subFiles: any = null;
            for (let comp of this.files) {
                subFiles = this.searchTree(comp, rowData.cartId);
                if(subFiles != null){
                    break;
                }
            }
            if(subFiles != null){
                this.removeFilesFromCart(subFiles.children);
                rowData.isSelected = false; 
            }
        }else{
            this.cartService.removeCartId(rowData.cartId);
            rowData.isSelected = false;        
        }
    }

    removeFilesFromCart(files: any){
        this.removeFromCart(files);
        this.allSelected = true;
        this.updateAllSelectStatus(this.files);
    }

    removeFromCart(files: any){
        for (let comp of files) {
            if(comp.children.length > 0){
                comp.data.isSelected = false;
                this.removeFromCart(comp.children);
            }else{
                this.cartService.removeCartId(comp.data.cartId);
                comp.data.isSelected = false;
            }
        }
        
    }

    addtoCart(rowData:any){
        // this.cartService.updateFileSpinnerStatus(true);
        let data : Data;
        data = {'cartId':rowData.cartId,
                'resId':rowData.resId,
                'resTitle':this.record['title'],
                'resFilePath':rowData.fullPath,
                'id':rowData.name,
                'fileName':rowData.name,
                'filePath':rowData.fullPath,
                'fileSize':rowData.size,
                'downloadURL':rowData.downloadURL,
                'fileFormat':rowData.mediatype,
                'downloadStatus': null };

        this.cartService.addDataToCart(data);
        rowData.isSelected = this.isInDataCart(rowData.cartId);

        // setTimeout(()=> {
        //     this.cartService.updateFileSpinnerStatus(false);
        // }, 3000);
    }

    updateAllSelectStatus(files: any){
        var allSelected = true;
        for (let comp of files) {
            if(comp.children.length > 0){
                comp.data.isSelected = this.updateAllSelectStatus(comp.children);
                allSelected = allSelected && comp.data.isSelected;
            }else{
                if(!comp.data.isSelected){
                    this.allSelected = false;
                    allSelected = false;
                }
            }
        }   

        return allSelected;
    }

    updateDownloadStatus(files: any){
        var allDownloaded = true;
        for (let comp of files) {
            if(comp.children.length > 0){
                var status = this.updateDownloadStatus(comp.children);
                if(status){
                    comp.data.downloadStatus = 'downloaded';
                    this.cartService.updateCartItemDownloadStatus(comp.data.cartId,'downloaded');
                }
                allDownloaded = allDownloaded && status;
            }else{
                if(comp.data.downloadStatus != 'downloaded'){
                    allDownloaded = false;
                }
            }
        }   

        return allDownloaded;
    }

    /**
    * Function to check if cartId is in the data cart.
    **/ 
    isInDataCart(cartId:string){
        this.cartMap = this.cartService.getCart();

        for (let key in this.cartMap) {
            let value = this.cartMap[key];
            if (value.data.cartId == cartId) {
                return true;
            }
        }
        return false;
    }

    /**
    * Function to remove a cartId from the data cart.
    **/ 
    // removeCart(rowData:any, cartId: string){
    //     this.cartService.updateFileSpinnerStatus(true);
    //     this.cartService.removeCartId(cartId);
    //     rowData.isSelected = this.isInDataCart(cartId);
    //     this.checkIfAllSelected(this.files);

    //     setTimeout(()=> {
    //         this.cartService.updateFileSpinnerStatus(false);
    //     }, 3000);
    // }

    downloadById(id: any){
        let subFiles: any = null;
        for (let comp of this.files) {
            subFiles = this.searchTree(comp, id);
            if(subFiles != null){
                break;
            }
        }
        if(subFiles != null){
            this.downloadAllFilesFromAPI(subFiles);
            // subFiles.isSelected = true;
        }
    }

    downloadOneFile(rowData: any){
        let filename = decodeURI(rowData.downloadURL).replace(/^.*[\\\/]/, '');
        rowData.downloadStatus = 'downloading';
        rowData.downloadProgress = 0;

        const req = new HttpRequest('GET', rowData.downloadURL, {
            reportProgress: true, responseType: 'blob'
        });

        rowData.downloadInstance = this.http.request(req).subscribe(event => {
            switch (event.type) {
                case HttpEventType.Response:
                    this.downloadService.saveToFileSystem(event.body, filename);
                    rowData.downloadStatus = 'downloaded';
                    this.cartService.updateCartItemDownloadStatus(rowData.cartId,'downloaded');
                    this.updateDownloadStatus(this.files);
                    break;
                case HttpEventType.DownloadProgress:
                    rowData.downloadProgress = Math.round(100*event.loaded / event.total);
                    break;
            }
        })
    }
    /**
    * Function to download a single file based on download url.
    **/ 
    downloadFile(rowData:any){
        if(!this.isFile(rowData)){
            this.downloadById(rowData.cartId);
        }else{
            this.downloadOneFile(rowData);
        };

        rowData.downloadStatus = 'downloaded';
        // this.cartService.updateFileSpinnerStatus(true);

        // this.downloadService.getFile(rowData.downloadURL, '').subscribe(blob => {
        //     this.downloadService.saveToFileSystem(blob, filename);
        //     rowData.downloadStatus = 'downloaded';
        //     this.cartService.updateCartItemDownloadStatus(rowData.cartId,'downloaded');
        //     this.cartService.updateFileSpinnerStatus(false);
        //     this.updateDownloadStatus(this.files);
        //     },
        //     error => console.log('Error downloading the file.')
        // )
    }

    /**
    * Function to cancel current download.
    **/ 
    cancelDownload(rowData:any){
        if(!this.isFile(rowData)){
            this.cancelDownloadAll();
            rowData.downloadProgress = 0;
            rowData.downloadStatus = null;
        }else{
            rowData.downloadInstance.unsubscribe();
            rowData.downloadInstance = null;
            rowData.downloadProgress = 0;
            rowData.downloadStatus = null;
        }
    }

    /**
    * Function to download all files based on download url.
    **/ 
    downloadAllFilesFromUrl(files:any){
        for (let comp of files) {
            if(comp.children.length > 0){
                this.downloadAllFilesFromUrl(comp.children);
            }else{
                if(comp.data.downloadURL){
                    this.downloadOneFile(comp.data);
                }
            }
        }   
    }

    /**
    * Function to confirm download all.
    **/ 
    downloadAllConfirm(header:string, massage:string, key:string) {
        this.confirmationService.confirm({
            message: massage,
            header: header,
            key: key,
            accept: () => {
                this.cancelAllDownload = false;
                this.downloadFromRoot();
            },
            reject: () => {
            }
        });
    }

    downloadFromRoot(){
        this.downloadAllFilesFromAPI(this.treeRoot[0]);
    }

    getDownloadData(files: any){
        let existItem: any;
        for (let comp of files) {
            if(comp.children.length > 0){
                this.getDownloadData(comp.children);
            }else{
                if (comp.data['fullPath'] != null && comp.data['fullPath'] != undefined) {
                    if (comp.data['fullPath'].split(".").length > 1) {
                        existItem = this.downloadData.filter(item => item.filePath === this.ediid+comp.data['fullPath'] 
                            && item.downloadURL === comp.data['downloadURL']);
        
                        if (existItem.length == 0) {
                            this.downloadData.push({"filePath":this.ediid+comp.data['fullPath'], 'downloadURL':comp.data['downloadURL']});
                        }
                    }
                }
            }
        }        
    }


    /**
    * Function to download all files from API call.
    **/ 
    downloadAllFilesFromAPI(files: any){
        let existItem: any;
        let postMessage: any[] = [];
        this.downloadData = [];
        this.zipData = [];
        this.displayDownloadFiles = true;
        this.cancelAllDownload = false;
        this.downloadStatus = 'downloading';
        this.downloadService.setDownloadProcessStatus(false);

        // Sending data to _bundle_plan and get back the plan
        this.getDownloadData(files.children);

        var randomnumber = Math.floor(Math.random() * (this.commonVarService.getRandomMaximum() - this.commonVarService.getRandomMinimum() + 1)) + this.commonVarService.getRandomMinimum();

        var zipFileName = "download" + randomnumber;
        files.data.downloadFileName = zipFileName + ".zip"
        files.data.downloadStatus = 'downloading';

        postMessage.push({"bundleName":files.data.downloadFileName, "includeFiles":this.downloadData});

        // console.log("postMessage:");
        // console.log(postMessage);

        // now use postMessage to request a bundle plan

        // this.downloadService.postFile(this.distApi + "_bundle", JSON.stringify(postMessage)).subscribe(blob => {
        //     this.downloadService.saveToFileSystem(blob, this.downloadFileName);
        //     console.log('All downloaded.');
        //     this.downloadStatus = 'downloaded';
        //     this.setAllDownloaded(this.files);
        //     this.allDownloaded = true;
        // });

        // Once get bundle plan back, put it into a zipData array and send post request one by one
        // sample return data:

        let bundlePlan: any[] = [];
        let tempData: any[] = [];

        tempData.push(this.downloadData[0]);
        tempData.push(this.downloadData[1]);
        bundlePlan.push({"bundleName":zipFileName + "01.zip","includeFiles":tempData});
        tempData = [];
        tempData.push(this.downloadData[2]);
        tempData.push(this.downloadData[3]);
        bundlePlan.push({"bundleName":zipFileName + "02.zip","includeFiles":tempData});
        tempData = [];
        tempData.push(this.downloadData[4]);
        tempData.push(this.downloadData[5]);
        bundlePlan.push({"bundleName":zipFileName + "03.zip","includeFiles":tempData});
        tempData = [];
        tempData.push(this.downloadData[6]);
        tempData.push(this.downloadData[7]);
        bundlePlan.push({"bundleName":zipFileName + "04.zip","includeFiles":tempData});

        let tempUrl: any[] = ["https://s3.amazonaws.com/nist-midas/1858/20170213_PowderPlate2_Pad.zip", "https://s3.amazonaws.com/nist-midas/1858/RawCameraData.zip","https://s3.amazonaws.com/nist-midas/1858/RawCameraData.zip","https://s3.amazonaws.com/nist-midas/1858/20170213_PowderPlate2_Pad.zip", "https://s3.amazonaws.com/nist-midas/1858/RawCameraData.zip","https://s3.amazonaws.com/nist-midas/1858/RawCameraData.zip","https://s3.amazonaws.com/nist-midas/1858/20170213_PowderPlate2_Pad.zip"];
        var i = 0;

        for(let bundle of bundlePlan){
            this.zipData.push({"fileName":bundle.bundleName, "downloadProgress": 0, "downloadStatus":null, "downloadInstance": null, "bundle": bundle, "downloadUrl": tempUrl[i], "downloadErrorMessage":""});
            i++;
        }

        // console.log("this.zipData:");
        // console.log(this.zipData);

        // Associate zipData with files
        for(let zip of this.zipData){
            for(let includeFile of zip.bundle.includeFiles){
                let fullPath = includeFile.filePath.substring(includeFile.filePath.indexOf('/'));
                let treeNode = this.downloadService.searchTreeByFullPath(this.treeRoot[0], fullPath);
                if(treeNode != null){
                    treeNode.data.zipFile = zip.fileName;
                }
            }
        }

        this.downloadService.downloadNextZip(this.zipData, this.treeRoot[0]);

        // Start downloading the first one, this will set the downloaded zip file to 1
        this.subscriptions.push(this.downloadService.watchDownloadingNumber().subscribe(
            value => {
                if(!this.cancelAllDownload){
                    this.downloadService.downloadNextZip(this.zipData, this.treeRoot[0]);
                    files.data.downloadProgress = Math.round(100*this.getDownloadedNumber() / this.zipData.length);
                    // if(this.downloadService.allDownloadFinished(this.zipData)){
                    //     files.data.downloadStatus = 'downloaded';
                    //     this.downloadStatus = 'downloaded';
                    // }
                }

                this.updateDownloadStatus(this.files);
            }
        ));
    }

    getDownloadedNumber(){
        let totalDownloadedZip: number = 0;
        for (let zip of this.zipData) {
            if(zip.downloadStatus == 'downloaded'){
                totalDownloadedZip += 1;
            }
        }
        return totalDownloadedZip;
    }

    cancelDownloadZip(zip: any){
        zip.downloadInstance.unsubscribe();
        zip.downloadInstance = null;
        zip.downloadProgress = 0;
        zip.downloadStatus = null;
    }

    cancelDownloadAll(){
        for (let zip of this.zipData) {
            if(zip.downloadInstance != null){
                zip.downloadInstance.unsubscribe();
            }
            zip.downloadInstance = null;
            zip.downloadProgress = 0;
            zip.downloadStatus = null;
        }

        for(let sub of this.subscriptions){
            sub.unsubscribe();
        }

        this.downloadService.setDownloadingNumber(0);
        this.zipData = [];
        this.downloadStatus = null;
        this.cancelAllDownload = true;
        this.displayDownloadFiles = false;
        this.resetZipName(this.treeRoot[0]);
    }


    resetZipName(element){
        if(element.data != undefined){
            element.data.zipFile = null;
        }
        if (element.children.length > 0){
            for(let i=0; i < element.children.length; i++){
                this.resetZipName(element.children[i]);
            }
        } 
    }

    /**
    * Function to set the download status of all files to downloaded.
    **/ 
    setAllDownloaded(files:any){
        for (let comp of files) {
            if(comp.children.length > 0){
                this.setAllDownloaded(comp.children);
            }else{
                comp.data.downloadStatus = 'downloaded';
                this.cartService.updateCartItemDownloadStatus(comp.data.cartId,'downloaded');
                // this.cartService.updateFileSpinnerStatus(false);
            }
        }   
    }

    /**
    * Function to reset the download status of a file.
    **/ 
    resetDownloadStatus(rowData){
        rowData.downloadStatus = null;
        rowData.downloadProgress = 0;
        this.cartService.updateCartItemDownloadStatus(rowData.cartId,null);
        this.allDownloaded = false;
    }

    /**
    * Function to check if a node if leaf.
    **/ 
    isFile(rowData: any){
        return rowData.name.match(/\./g) == null? false : true; 
    }
}
