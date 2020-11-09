/** 
 * Support for MetadataTransfer on the server side
 *
 * This implementation is based on the angular ServerTransferStateModule (provided
 * via the open license at https://angular.io/license). 
 */
import { NgModule, InjectionToken } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server';

import { MetadataTransfer } from './nerdm';
import { NERDResource } from '../nerdm/nerdm';

const escapeHTMLchars = function(text : string, doc : Document) : string {
    let div = doc.createElement('div');
    div.appendChild(doc.createTextNode(text));
    return div.innerHTML.replace(/"/g,'&quot;').replace(/'/g,"&apos;");
}

/**
 * Create JSON-LD object based on input Nerdm record string
 * @param textContent Nerdm record string
 */
const convertNerdmSchema = function(textContent: string) : string{
    let NerdmObject = JSON.parse(textContent);
    let returnSchemaObject: any = {};
    let publisher: any = {};
    let accountablePerson: any = {};
    let author: any = {};
    let copyrightHolder: any = {};

    // accountablePerson
    accountablePerson["@type"] = "Person";
    if(NerdmObject['hasEmail']){
        accountablePerson["email"] = NerdmObject['hasEmail'].substring(NerdmObject['hasEmail'].indexOf(':')<0 ? 0 : NerdmObject['hasEmail'].indexOf(':') + 1);
    }

    if(NerdmObject['contactPoint']){
        accountablePerson["name"] = NerdmObject['contactPoint'].fn;
    }

    // Author
    author["@type"] = "Person";
    if(NerdmObject['authors']){
        let i = 0;
        NerdmObject['authors'].forEach(item => {
            author["name"] += item.fn;
            i++;
            if(i < NerdmObject['authors'].length-1)
            author["name"] += ",";
        });
    }

    // copyrightHolder
    copyrightHolder = {
        "@type": "Organization",
        "name": "National Institute of Standards and Technology",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Gaithersburg, MD",
            "postalCode": "20899",
            "streetAddress": "100 Bureau Drive"
        },
    }

    //publisher
    publisher = copyrightHolder;
     
    // DigitalDocument
    returnSchemaObject = {
        '@context': "https://schema.org",
        '@type': "DigitalDocument",
        'name': NerdmObject['title'],
        'author': author,
        "hasDigitalDocumentPermission": [
            {
              "@type": "DigitalDocumentPermission",
              "permissionType": "https://schema.org/ReadPermission",
              "grantee": {
                "@type": "Audience",
                "audienceType": "public"
              }
            }
        ],
        'about': "The NIST Public Data Repository (PDR) is a key part of NIST research data infrastructure supporting public search and access to a multi-disciplinary growing collection of NIST public data. The repository fosters FAIR reproducibility, interoperability and discovery of scientific, engineering and technical information in service of the NIST mission.",
        'accessMode': 'textual',
        'accessModeSufficient': 'textual',
        'accountablePerson':accountablePerson,
        'acquireLicensePage': NerdmObject['license'],
        'audience': {
            "@type": "Audience",
            "audienceType": "public"
        },
        'citation': (new NERDResource(NerdmObject)).getCitation(),
        'conditionsOfAccess': NerdmObject["accessLevel"],
        'copyrightHolder': copyrightHolder,
        'dateCreated': new Date(),
        'dateModified': NerdmObject['modified'],
        'inLanguage': NerdmObject['language'],
        'isAccessibleForFree': true,
        'keywords': NerdmObject['keyword']? NerdmObject['keyword'].toString() : "",
        'license': NerdmObject['license']? NerdmObject['license'].toString() : "",
        'publisher': publisher,
        'schemaVersion': 'http://schema.org/version/10.0/', // This needs be configurable
        'description': NerdmObject['description']? NerdmObject['description'] : "",
        'text': NerdmObject['description']? NerdmObject['description'] : "",
        'identifier': NerdmObject['ediid']? NerdmObject['ediid'] : "",
        'url': NerdmObject['ediid']? "https://data.nist.org/od/id/" + NerdmObject['ediid'] : "",
        'usageInfo': 'https://data.nist.gov/pdr/about',
        'mentions': NerdmObject['references']? NerdmObject['references'][0].location : "",
        'mainEntityOfPage': NerdmObject['landingPage']? NerdmObject['landingPage'] : "",
        'thumbnailUrl': '../assets/images/nist_logo_reverse.png'
    }

    return JSON.stringify(returnSchemaObject, null, 2);
}

/**
 * the factory function for inserting metadata into script elements in the 
 * document DOM.  
 *
 * Each metadata record stored in the MetadataTransfer will be serialized into 
 * its own script element and inserted into the document DOM.  The id for the 
 * element will be set to the metadata's label.  The type attribute will be some
 * form of "application/json", depending on the content:  if the record contains
 * a "@context" property, it will be set to "application/ld+json".  
 * 
 * This implementation inserts the script elements as the first children of 
 * the body element. 
 *
 * @param doc    the document DOM to insert the metadata into
 * @param mdtrx  the MetadataTransfer containing the metadata to serialize into 
 *                 the document.
 * @return function -- a no-arg function that will actually write out the data 
 *                 synchronously.
 */
export function serializeMetadataTransferFactory(doc : Document, mdtrx : MetadataTransfer) {
    return () => {
        let className = 'structured-data';
        let jsonLDScript;
        jsonLDScript = doc.createElement('script');

        let insertPoint = doc.body.firstElementChild;
        mdtrx.labels().forEach((label) => {
            let data = mdtrx.get(label);
            if (data == null)
                data = null;

            // Creating the script for Nerdm data transfer
            let script = doc.createElement('script');
            script.id = escapeHTMLchars(label, doc);
            console.log("Embedding metadata with id='"+script.id+"'");
            let type = "application/json";

            script.setAttribute("type", type);
            script.textContent = mdtrx.serialize(label);
            doc.body.insertBefore(script, insertPoint)

            // Creating the script for Schema.org
            jsonLDScript.setAttribute('class', className);
            jsonLDScript.type = "application/ld+json";
            jsonLDScript.text = convertNerdmSchema(mdtrx.serialize(label));
            doc.head.appendChild(jsonLDScript);
        });
    };
}

/**
 * a module for serializing the contents of an app's MetadataTransfer singleton
 *
 * This is modeled after the ServerTransferStateModule
 */
@NgModule({
    providers: [
        MetadataTransfer,
        {
            provide: BEFORE_APP_SERIALIZED,
            useFactory: serializeMetadataTransferFactory,
            deps: [DOCUMENT, MetadataTransfer],
            multi: true
        }
    ]
})
export class ServerMetadataTransferModule { }

export { MetadataTransfer };
