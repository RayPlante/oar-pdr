import { Injectable } from '@angular/core';
import { Http, Response,URLSearchParams,RequestOptions, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import * as _ from 'lodash';
// import { Config } from '../';
//import { environment } from '../../environment';

/**
 * This class provides the Search service with methods to search for records from tha rmm.
 */
@Injectable()
export class SearchService {
  //private RestAPIURL: string = Config.API;
  private rmmApi : string = "http://localhost:8082/rmm/"; // environment.RMMAPI;
  private metaApi : string = "";// environment.METAPI;
  private landingBackend : string = "http://localhost:8082/rmm/";// environment.LANDING;
  private serviceApi : string;
  /**
   * Creates a new SearchService with the injected Http.
   * @param {Http} http - The injected Http.
   * @constructor
   */
  constructor(private http: Http) {
  }
  /**
   * Returns an Observable for the HTTP GET request for the JSON resource.
   * @return {string[]} The Observable for the HTTP request.
   */
  searchByIdOld(searchValue:string): Observable<string[]> {

    searchValue = '@id=' + searchValue;
    return this.http.get(this.rmmApi+'records?' + searchValue)
      .map((res: Response) => res.json().ResultData)
      .catch((error: any) => Observable.throw(error.json()));
  }

  searchSample(){
    return  [
      {"_id":{"timestamp":1508225827,"machineIdentifier":8777488,"processIdentifier":291,"counter":16692557,"time":1508225827000,"date":1508225827000,"timeSecond":1508225827},"_schema":"https://www.nist.gov/od/dm/nerdm-schema/v0.1#","topic":[{"scheme":"https://www.nist.gov/od/dm/nist-themes/v1.0","tag":"Physics: Optical physics","@type":"Concept"}],"references":[{"refType":"IsReferencedBy","_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/v0.1#/definitions/DCiteDocumentReference"],"@id":"#ref:10.1364/OE.24.014100","@type":"deo:BibliographicReference","location":"https://dx.doi.org/10.1364/OE.24.014100"}],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/PublicDataResource"],"landingPage":"https://www.nist.gov/nvl/project-index-optical-method-sorting-nanoparticles-size","dataHierarchy":[{"filepath":"1491_optSortSphEvaluated20160701.cdf"},{"filepath":"1491_optSortSphEvaluated20160701.cdf.sha256"},{"filepath":"1491_optSortSphEvaluated20160701.nb"},{"filepath":"1491_optSortSph20160701.m"},{"filepath":"1491_optSortSphEvaluated20160701.nb.sha256"},{"filepath":"1491_optSortSph20160701.m.sha256"}],"title":"OptSortSph: Sorting Spherical Dielectric Particles in a Standing-Wave Interference Field","theme":["Optical physics"],"inventory":[{"forCollection":"","descCount":7,"childCollections":[],"childCount":7,"byType":[{"descCount":7,"forType":"dcat:Distribution","childCount":7},{"descCount":1,"forType":"nrd:Hidden","childCount":1},{"descCount":6,"forType":"nrdp:DataFile","childCount":6}]}],"programCode":["006:045"],"@context":["https://www.nist.gov/od/dm/nerdm-pub-context.jsonld",{"@base":"ark:/88434/mds00hw91v"}],"description":["Software to predict the optical sorting of particles in a standing-wave laser interference field"],"language":["en"],"bureauCode":["006:55"],"contactPoint":{"hasEmail":"mailto:zachary.levine@nist.gov","fn":"Zachary Levine"},"accessLevel":"public","@id":"ark:/88434/mds00hw91v","publisher":{"@type":"org:Organization","name":"National Institute of Standards and Technology"},"doi":"doi:10.18434/T4SW26","keyword":["optical sorting","laser interference field","nanoparticles","convection of fluid"],"license":"https://www.nist.gov/open/license","modified":"2016-07-01","ediid":"3A1EE2F169DD3B8CE0531A570681DB5D1491","components":[{"description":"A .cdf version of the Mathematica notebook. A reader for this file is available at: http://www.wolfram.com/cdf/","filepath":"1491_optSortSphEvaluated20160701.cdf","title":"CDF version of the Mathematica notebook","mediaType":"application/vnd.wolfram.player","downloadURL":"https://s3.amazonaws.com/nist-midas/1491_optSortSphEvaluated20160701.cdf","@id":"cmps/1491_optSortSphEvaluated20160701.cdf","@type":["nrdp:DataFile","dcat:Distribution"],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile"]},{"filepath":"1491_optSortSphEvaluated20160701.cdf.sha256","title":"SHA-256 file for the CDF version of the Mathematica notebook","mediaType":"text/plain","downloadURL":"https://s3.amazonaws.com/nist-midas/1491_optSortSphEvaluated20160701.cdf.sha256","@id":"cmps/1491_optSortSphEvaluated20160701.cdf.sha256","@type":["nrdp:DataFile","dcat:Distribution"],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile"]},{"accessURL":"https://doi.org/10.18434/T4SW26","description":"Software to predict the optical sorting of particles in a standing-wave laser interference field","format":"Digital Object Identifier, a persistent identifier","title":"DOI access for OptSortSph: Sorting Spherical Dielectric Particles in a Standing-Wave Interference Field","mediaType":"application/zip","@id":"#doi:10.18434/T4SW26","@type":["nrd:Hidden","dcat:Distribution"]},{"filepath":"1491_optSortSphEvaluated20160701.nb","title":"Download for the Mathematica notebook","mediaType":"application/mathematica","downloadURL":"https://s3.amazonaws.com/nist-midas/1491_optSortSphEvaluated20160701.nb","@id":"cmps/1491_optSortSphEvaluated20160701.nb","@type":["nrdp:DataFile","dcat:Distribution"],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile"]},{"filepath":"1491_optSortSph20160701.m","title":"ASCII version of the code (without documentation)","mediaType":"text/plain","downloadURL":"https://s3.amazonaws.com/nist-midas/1491_optSortSph20160701.m","@id":"cmps/1491_optSortSph20160701.m","@type":["nrdp:DataFile","dcat:Distribution"],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile"]},{"filepath":"1491_optSortSphEvaluated20160701.nb.sha256","title":"SHA-256 file for Mathematica download file","mediaType":"text/plain","downloadURL":"https://s3.amazonaws.com/nist-midas/1491_optSortSphEvaluated20160701.nb.sha256","@id":"cmps/1491_optSortSphEvaluated20160701.nb.sha256","@type":["nrdp:DataFile","dcat:Distribution"],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile"]},{"filepath":"1491_optSortSph20160701.m.sha256","title":"SHA-256 file for ASCII version of the code","mediaType":"text/plain","downloadURL":"https://s3.amazonaws.com/nist-midas/1491_optSortSph20160701.m.sha256","@id":"cmps/1491_optSortSph20160701.m.sha256","@type":["nrdp:DataFile","dcat:Distribution"],"_extensionSchemas":["https://www.nist.gov/od/dm/nerdm-schema/pub/v0.1#/definitions/DataFile"]}],"@type":["nrdp:PublicDataResource"]}];
  }

  searchById(searchValue:string): Observable<string[]> {
    
    if (_.includes(this.landingBackend,'rmm') && _.includes(searchValue,'ark'))
      this.landingBackend = this.landingBackend+'records?@id=';
    else if(_.includes(this.landingBackend,'rmm'))
      this.landingBackend = this.landingBackend+'records/'; 

      //console.log(this.landingBackend+ searchValue);
      // let myHeaders = new Headers();
      // myHeaders.append("Access-Control-Allow-Origin", '*');   

  //     this.http.get("http://localhost:8082/rmm/records/3A1EE2F169DD3B8CE0531A570681DB5D1491")
  //   .map(res => res.json())
  //   .subscribe(data => {
  //     console.log("Test here::");
  //     console.log(JSON.stringify(data));
  // }, error =>{console.log("This subscribe method error:"+error) });

  //     this.http.get("http://localhost:8082/rmm/records/3A1EE2F169DD3B8CE0531A570681DB5D1491")
  //     .toPromise()
  //     .then(data => {
  //       console.log( "TEST  data :: "+data);
  //     }).catch(( error ) => {
  //       console.log("Error reading data :"+error);
  //     }); 

    return this.http.get(this.landingBackend+ searchValue)
      .map((res: Response)  => res.json())
      .catch((error: any) => Observable.throw(error.json()));
  }

  /**
   * Returns the results from RMMAPI for any acceptable request params
   * @param searchValue request params
   */
  searchRMMAny(searchValue:string): Observable<string[]> {
    
    return this.http.get(this.rmmApi+'records?' + searchValue)
      .map((res: Response) => res.json().ResultData)
      .catch((error: any) => Observable.throw(error.json()));
  }
}

