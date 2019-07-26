import { Component, OnInit, ElementRef, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Title }    from '@angular/platform-browser';

import { MenuItem } from 'primeng/api';

import { AppConfig } from '../config/config';
import { MetadataService } from '../nerdm/nerdm.service';
import { NerdmRes } from '../nerdm/nerdm';

/**
 * A component providing the complete display of landing page content associated with 
 * a resource identifier.  This content is handle in various sub-components.
 * 
 * Features include:
 * * an "identity" section, providing title, names, identifiers, and who is repsonsible
 * * description section, providing thd prose description/abstract, keywords, terms, ...
 * * a data access section, including a file listing (if files are availabe) and other links
 * * a references section
 * * tools and navigation section.
 */
@Component({
    selector: 'landing-page',
    templateUrl: './landingPage.component.html',
    styleUrls: ['./landingPage.component.css'],
    providers: [
        Title
    ]
})
export class LandingPageComponent implements OnInit {
    layoutCompact: boolean = true;
    layoutMode: string = 'horizontal';
    profileMode: string = 'inline';
    md : NerdmRes = null;
    reqId : string;              // the ID that was used to request this page
    inBrowser : boolean = false;

    /**
     * create the component.
     * @param route   the requested URL path to be fulfilled with this view
     * @param router  the router to use to reroute output, if necessary
     * @param titleSv the Title service (used to set the browser's title bar)
     * @param cfg     the app configuration data
     * @param mdserv  the MetadataService for gaining access to the NERDm metadata.
     * @param res     a CurrentResource object for sharing the metadata and requested 
     *                 ID with child components.
     */
    constructor(private route : ActivatedRoute, private router : Router, 
                @Inject(PLATFORM_ID) private platformId: Object, public titleSv : Title, 
                private cfg : AppConfig, private mdserv : MetadataService)
    {
        this.reqId = this.route.snapshot.paramMap.get('id');
        this.inBrowser = isPlatformBrowser(platformId);
    }

    /**
     * initialize the component.  This is called early in the lifecycle of the component by 
     * the Angular rendering infrastructure.
     */
    ngOnInit() {
        console.log("initializing LandingPageComponent around id="+this.reqId);
        this.mdserv.getMetadata(this.reqId).subscribe(
            (data) => {
                // successful metadata request
                this.md = data;
                if (! this.md) {
                    // id not found; reroute
                    console.error("Metadata record not found for id="+this.reqId);
                    this.router.navigateByUrl("/not-found/"+this.reqId,
                                              { skipLocationChange: true });
                }
                else
                    // proceed with rendering of the component
                    this.useMetadata();
            },
            (err)  => {
                console.error("Failed to retrieve metadata: "+err.message);
                this.router.navigateByUrl("/int-error/"+this.reqId, { skipLocationChange: true });
            }
        );
    }

    /**
     * make use of the metadata to initialize this component.  This is called asynchronously
     * from ngOnInit after the metadata has been successfully retrieved (and saved to this.md).
     * 
     * This method will:
     *  * set the page's title (as displayed in the browser title bar).
     */
    useMetadata() : void {
        // set the document title
        this.setDocumentTitle();
        
    }

    /**
     * set the document's title.  
     */
    setDocumentTitle() : void {
        let title = "PDR: ";
        if (this.md['abbrev']) title += this.md['abbrev'] + " - ";
        if (this.md['title'])
            title += this.md['title']
        else
            title += this.md['@id']
        this.titleSv.setTitle(title);
    }

    /**
     * return the current document title
     */
    getDocumentTitle() : string { return this.titleSv.getTitle(); }
}
