import * as convert from './nerdmconversion.service';
import { config, testdata } from '../../environments/environment';
import { NerdmRes } from './nerdm';
import { AppConfig } from '../config/config';
import { async } from '@angular/core/testing';

describe('convert functions', function() {

    it('nerdm2schemaorg', () => {
        let so = convert.nerdm2schemaorg(testdata['test1']);
        expect(Object.keys(so).length).toBeGreaterThan(5);
        expect(so['@context']).toEqual("https://schema.org");
        expect(so['@type']).toEqual("Dataset");
        expect(so.about).toEqual(testdata['test1']['@id']);
        expect(so.name).toEqual(testdata['test1']['title']);
        expect(so.publisher).toBeTruthy();
        expect(so.citation).toBeTruthy();
        expect(so.mainEntityOfPage).toEqual(testdata['test1']['landingPage']);
        expect(so.url).toEqual("https://data.nist.gov/od/id/test1");
    });
});

describe('convert functions', function() {

    let svc: convert.NerdmConversionService = null;

    beforeEach(() => {
        let cfg = JSON.parse(JSON.stringify(config));
        cfg['embedMetadata'] = [convert.SchemaLabel.SCHEMA_ORG_DATASET];
        let appcfg = new AppConfig(cfg);
        svc = new convert.NerdmConversionService(appcfg);
    });

    it('constructor', () => {
        expect(svc.supportedFormats()).toEqual([convert.SchemaLabel.SCHEMA_ORG_DATASET]);
        expect(svc.supportsFormat(convert.SchemaLabel.SCHEMA_ORG_DATASET)).toBeTruthy();
        expect(svc.supportsFormat("scare")).toBeFalsy();
        expect(svc.formatsToEmbed()).toEqual([convert.SchemaLabel.SCHEMA_ORG_DATASET]);

        svc = new convert.NerdmConversionService(new AppConfig(config));  // embedMetadata not included
        expect(svc.formatsToEmbed()).toEqual([]);
    });

    it('supportConversion', () => {
        svc.supportConversion("scare", (md: NerdmRes): string => { return "boo!"; }, "text/plain");
        expect(svc.supportsFormat(convert.SchemaLabel.SCHEMA_ORG_DATASET)).toBeTruthy();
        expect(svc.supportsFormat("scare")).toBeTruthy();
        expect(svc.supportsFormat("goob")).toBeFalsy();
    });

    it('convertTo()', () => {
        let so = svc.convertTo(testdata['test1'], convert.SchemaLabel.SCHEMA_ORG_DATASET);
        expect(so.contentType).toEqual("application/ld+json");
        expect(so.label).toEqual(convert.SchemaLabel.SCHEMA_ORG_DATASET);

        expect(Object.keys(so.md).length).toBeGreaterThan(5);
        expect(so.md['@context']).toEqual("https://schema.org");
        expect(so.md['@type']).toEqual("Dataset");
        expect(so.md['about']).toEqual(testdata['test1']['@id']);
        expect(so.md['name']).toEqual(testdata['test1']['title']);
        expect(so.md['publisher']).toBeTruthy();
        expect(so.md['citation']).toBeTruthy();
        expect(so.md['mainEntityOfPage']).toEqual(testdata['test1']['landingPage']);
        expect(so.md['url']).toEqual("https://data.nist.gov/od/id/test1");

        expect(svc.convertTo(testdata['test1'], "scare")).toBeNull();

        svc.supportConversion("scare", (md: NerdmRes): string => { return "boo!"; }, "text/plain");
        so = svc.convertTo(testdata['test1'], "scare");
        expect(so.contentType).toEqual("text/plain");
        expect(so.label).toEqual("scare");
        expect(so.md).toEqual("boo!");
    });

    it('convertToEmbedFormats()', async(() => {
        svc.convertToEmbedFormats(testdata['test1']).subscribe({
            next(so) {
                expect(so.contentType).toEqual("application/ld+json");
                expect(so.label).toEqual(convert.SchemaLabel.SCHEMA_ORG_DATASET);
                expect(Object.keys(so.md).length).toBeGreaterThan(5);
                expect(so.md['@context']).toEqual("https://schema.org");
                expect(so.md['@type']).toEqual("Dataset");
                expect(so.md['about']).toEqual(testdata['test1']['@id']);
            },
            error(e) { fail("schema.org conversion failed: "+e); }
        });

        svc.supportConversion("scare", (md: NerdmRes): string => { return "boo!"; }, "text/plain");
        svc.convertToEmbedFormats(testdata['test1']).subscribe({
            next(so) {
                if (typeof so.md === 'string') {
                    expect(so.contentType).toEqual("text/plain");
                    expect(so.label).toEqual("scare");
                    expect(so.md).toEqual("boo!");
                }
                else {
                    expect(so.contentType).toEqual("application/ld+json");
                    expect(so.label).toEqual(convert.SchemaLabel.SCHEMA_ORG_DATASET);
                    expect(Object.keys(so.md).length).toBeGreaterThan(5);
                    expect(so.md['@context']).toEqual("https://schema.org");
                    expect(so.md['@type']).toEqual("Dataset");
                    expect(so.md['about']).toEqual(testdata['test1']['@id']);
                }
            },
            error(e) { fail("conversion failed: "+e); }
        });
    }));
});