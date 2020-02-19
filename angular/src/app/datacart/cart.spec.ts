import { TreeNode } from 'primeng/api';

import { DataCart, stringifyCart, parseCart, findFileIn } from './cart';
import { testdata } from '../../environments/environment';

let emptycoll: TreeNode[] = [{ data: { cartId: "gurn" }, children: [] }];

describe('functions', () => {
    let sample = emptycoll;

    it("stringify-parse", () => {
        expect(stringifyCart(sample)).toEqual('[{"data":{"cartId":"gurn"},"children":[]}]');
        expect(parseCart(stringifyCart(sample))).toEqual(sample);
    });

    it("findFileIn", () => {
        let tree: TreeNode[] = parseCart('[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');

        let file = findFileIn("gary/foo/bar", tree);
        expect(file).not.toBeNull();
        expect(file.data['cartId']).toEqual("gary/foo/bar");
        expect(file.data['count']).toEqual(1);

        file = findFileIn("goober", tree);
        expect(file).toBeNull();

        file = findFileIn("gurn", tree);
        expect(file).not.toBeNull();
        expect(file.data['cartId']).toEqual("gurn");

        file = findFileIn("gary/foo", tree[1].children);
        expect(file).not.toBeNull();
        expect(file.data['cartId']).toEqual("gary/foo");
    });
});

describe('DataCart', () => {

    let sample: TreeNode[] = null;

    beforeEach(() => {
        sample = <TreeNode[]>JSON.parse(JSON.stringify(emptycoll));
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('constructor', () => {
        let dc = new DataCart("cart", sample);
        expect(dc.contents).toBe(sample);
        expect(dc.storeId).toEqual("cart");
        // expect(dc._storage).toBe(localStorage);
    
        dc = new DataCart("all", sample, sessionStorage);
        expect(dc.contents).toBe(sample);
        expect(dc.storeId).toEqual("all");
        // expect(dc._storage).toBe(sessionStorage);
    });

    it('openCart()', () => {
        let dc = DataCart.openCart("cart");
        expect(dc).toBeNull();

        localStorage.setItem("cart", stringifyCart(sample));
        dc = DataCart.openCart("cart");
        expect(dc).not.toBeNull();
        expect(dc.storeId).toEqual("cart");
        expect(dc.contents).toEqual(sample);
        
        dc = DataCart.openCart("cart", sessionStorage);
        expect(dc).toBeNull();
    });

    it('createCart()', () => {
        let dc = DataCart.createCart("goob");
        expect(dc).not.toBeNull();
        expect(dc.contents).toEqual([]);
        expect(dc.storeId).toEqual("goob");
        expect(localStorage.getItem("goob")).toEqual("[]");

        expect(sessionStorage.getItem("goob")).toBeNull();
        localStorage.clear();
        dc = DataCart.createCart("goob", sessionStorage)
        expect(sessionStorage.getItem("goob")).toEqual("[]");
        expect(localStorage.getItem("goob")).toBeNull();
    });

    it('save()', () => {
        let dc = new DataCart("cart", <TreeNode[]>[]);
        expect(localStorage.getItem("cart")).toBeNull();
        dc.save();
        expect(localStorage.getItem("cart")).toEqual("[]");
        
        dc = new DataCart("cart", sample, sessionStorage);
        expect(sessionStorage.getItem("cart")).toBeNull();
        dc.save();
        expect(sessionStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn"},"children":[]}]');
        expect(localStorage.getItem("cart")).toEqual("[]");
    });

    it('forget()', () => {
        let dc = DataCart.createCart("cart");
        expect(localStorage.getItem("cart")).toEqual("[]");
        dc.forget();
        expect(localStorage.getItem("cart")).toBeNull();
        dc.save();
        expect(localStorage.getItem("cart")).toEqual("[]");

        localStorage.setItem("cart", stringifyCart(sample));
        dc = DataCart.openCart("cart");
        expect(dc.contents).toEqual(sample);
        dc.forget();
        expect(localStorage.getItem("cart")).toBeNull();
        dc.save();
        expect(localStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn"},"children":[]}]');
    });

    it('restore()', () => {
        let dc = DataCart.createCart("cart");
        expect(localStorage.getItem("cart")).toEqual("[]");
        localStorage.setItem("cart", stringifyCart(sample));
        expect(dc.contents).toEqual([]);
        dc.restore();
        expect(dc.contents).toEqual(sample);
    });

    it('addFile()', () => {
        let dc = DataCart.createCart("cart");
        dc.addFile(sample[0]);
        expect(dc.contents).toEqual([{"data":{"cartId":"gurn","fileCount":0,"downloadedCount":0},"children":[]}])
        expect(localStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn","fileCount":0,"downloadedCount":0},"children":[]}]');

        dc.addFile({data: {cartId: "gurn/goober"}});
        expect(localStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn","fileCount":1,"downloadedCount":0},"children":[{"data":{"cartId":"gurn/goober"}}]}]');

        dc.addFile({data: {cartId: "gary"}, children:[]});
        expect(localStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn","fileCount":1,"downloadedCount":0},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary","fileCount":0,"downloadedCount":0},"children":[]}]');

        dc.addFile({data: {cartId: "gary/foo/bar", count: 1}});
        expect(localStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn","fileCount":1,"downloadedCount":0},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary","fileCount":1,"downloadedCount":0},"children":[{"data":{"cartId":"gary/foo","fileCount":1,"downloadedCount":0},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');

        dc.addFile({data: {cartId: "gary/foo/bum", count: 2}});
        expect(localStorage.getItem("cart")).toEqual('[{"data":{"cartId":"gurn","fileCount":1,"downloadedCount":0},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary","fileCount":2,"downloadedCount":0},"children":[{"data":{"cartId":"gary/foo","fileCount":2,"downloadedCount":0},"children":[{"data":{"cartId":"gary/foo/bar","count":1}},{"data":{"cartId":"gary/foo/bum","count":2}}]}]}]');
    });

    it('findFile()', () => {
        localStorage.setItem('hank', '[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');
        let dc = DataCart.openCart("hank");

        let file = dc.findFile("gary/foo/bar");
        expect(file).not.toBeNull();
        expect(file.data['cartId']).toEqual("gary/foo/bar");
        expect(file.data['count']).toEqual(1);

        file = dc.findFile("goober");
        expect(file).toBeNull();

        file = dc.findFile("gurn");
        expect(file).not.toBeNull();
        expect(file.data['cartId']).toEqual("gurn");

        file = dc.findFile("gary/foo");
        expect(file).not.toBeNull();
        expect(file.data['cartId']).toEqual("gary/foo");
    });

    it('markAsDownloaded()', () => {
        localStorage.setItem('hank', '[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');
        let dc = DataCart.openCart("hank");

        dc.markAsDownloaded(["gurn/goober"]);
        expect(localStorage.getItem('hank')).toEqual('[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober","downloadStatus":"downloaded"}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');
        expect(dc.findFile("gurn/goober").data['downloadStatus']).toEqual("downloaded");
        expect(dc.findFile("gary").data['downloadStatus']).not.toBeDefined();

        dc.markAsDownloaded(["gurn/goober"], false);
        expect(localStorage.getItem('hank')).toEqual('[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober","downloadStatus":""}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');
        expect(dc.findFile("gurn/goober").data['downloadStatus']).toEqual("");
        expect(dc.findFile("gary").data['downloadStatus']).not.toBeDefined();

        dc.markAsDownloaded(["gary/foo/bar", "gurn/goober"]);
        expect(localStorage.getItem('hank')).toEqual('[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober","downloadStatus":"downloaded"}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1,"downloadStatus":"downloaded"}}]}]}]');
        expect(dc.findFile("gurn/goober").data['downloadStatus']).toEqual("downloaded");
        expect(dc.findFile("gary/foo/bar").data['downloadStatus']).toEqual("downloaded");
        expect(dc.findFile("gary").data['downloadStatus']).not.toBeDefined();
    });

    it('updateDownloadStatusOf()', () => {
        localStorage.setItem('hank', '[{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober"}}]},{"data":{"cartId":"gary"},"children":[{"data":{"cartId":"gary/foo"},"children":[{"data":{"cartId":"gary/foo/bar","count":1}}]}]}]');
        let dc = DataCart.openCart("hank");
        dc.markAsDownloaded(["gary/foo/bar", "gurn/goober"]);
        expect(dc.findFile("gurn/goober").data['downloadStatus']).toEqual("downloaded");
        expect(dc.findFile("gary/foo/bar").data['downloadStatus']).toEqual("downloaded");

        let mine = [{"data":{"cartId":"gurn"},"children":[{"data":{"cartId":"gurn/goober"}},{"data":{"cartId":"gurn/gary"}}]}];
        dc.updateDownloadStatusOf(mine);
        expect(findFileIn("gurn/goober", mine).data['downloadStatus']).toEqual("downloaded");
        expect(findFileIn("gurn/gary", mine).data['downloadStatus']).not.toBeDefined();
        expect(findFileIn("gary/foo/bar", mine)).toBeNull();
    });

    it('_countIn()', () => {
        let dc = new DataCart("cart", sample);
        dc.save();
        expect(dc._countIn(sample)).toEqual({fileCount: 0, downloadedCount: 0});

        dc.addFile({data: {cartId: "gurn/goober", downloadStatus: "downloaded"}});
        expect(dc._countIn(dc.contents[0].children)).toEqual({fileCount: 1, downloadedCount: 1});
        expect(dc._countIn(dc.contents)).toEqual({fileCount: 1, downloadedCount: 1});
       
        dc.addFile({data: {cartId: "gary"}, children:[]});
        dc.addFile({data: {cartId: "gary/foo/bar", count: 1, downloadStatus: "downloaded"}});
        dc.addFile({data: {cartId: "gary/foo/bum", count: 2}});
        expect(dc._countIn(dc.contents[0].children)).toEqual({fileCount: 1, downloadedCount: 1});
        expect(dc._countIn(dc.contents[1].children)).toEqual({fileCount: 2, downloadedCount: 1});
        expect(dc._countIn(dc.contents[1].children[0].children)).toEqual({fileCount: 2, downloadedCount: 1});
        expect(dc._countIn(dc.contents)).toEqual({fileCount: 3, downloadedCount: 2});
    });

    it('countFiles()', () => {
        let dc = new DataCart("cart", sample);
        dc.save();
        expect(dc.countFiles()).toEqual(0);

        dc.addFile({data: {cartId: "gurn/goober", downloadStatus: "downloaded"}});
        expect(dc.countFiles()).toEqual(1);
       
        dc.addFile({data: {cartId: "gary"}, children:[]});
        dc.addFile({data: {cartId: "gary/foo/bar", count: 1, downloadStatus: "downloaded"}});
        dc.addFile({data: {cartId: "gary/foo/bum", count: 2}});
        expect(dc.countFiles()).toEqual(3);
    });

    it('countFilesDownloaded()', () => {
        let dc = new DataCart("cart", sample);
        dc.save();
        expect(dc.countFilesDownloaded()).toEqual(0);

        dc.addFile({data: {cartId: "gurn/goober", downloadStatus: "downloaded"}});
        expect(dc.countFilesDownloaded()).toEqual(1);
       
        dc.addFile({data: {cartId: "gary"}, children:[]});
        dc.addFile({data: {cartId: "gary/foo/bar", count: 1, downloadStatus: "downloaded"}});
        dc.addFile({data: {cartId: "gary/foo/bum", count: 2}});
        expect(dc.countFilesDownloaded()).toEqual(2);
    });
})

