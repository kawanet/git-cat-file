/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {Tree} from "./tree";
import type {ObjStore} from "./obj-store";
import {ObjItem} from "./obj-item";

export class Commit extends ObjItem<GCF.CommitMeta> implements GCF.Commit {
    constructor(obj: GCF.IObject, store: ObjStore) {
        super(obj, store);

        if (obj.type !== "commit" && obj.type !== "tag") {
            throw new TypeError(`Invalid commit object: ${obj.oid} (${obj.type})`)
        }
    }

    getDate(): Date {
        const author = this.getMeta("author") || this.getMeta("committer");
        const match = author?.match(/\s+(\d+)(\s+[+\-]\d+)?$/);
        if (match) return new Date(+match[1] * 1000);
    }

    async getTree(): Promise<GCF.Tree> {
        const oid = this.getMeta("tree");
        const obj = await this.store.getObject(oid);
        return new Tree(obj, this.store);
    }

    async getFile(path: string): Promise<GCF.File> {
        const tree = await this.getTree();
        const entry = await tree.getEntry(path);
        if (!entry) return;

        const {oid, mode} = entry;
        const obj = await this.store.getObject(oid);
        if (obj.type !== "blob") return;

        const {data} = obj;
        return {oid, mode, data};
    }

    async getParents(): Promise<GCF.Commit[]> {
        const parent = this.getMetaArray("parent");
        if (!parent) return;

        const array: GCF.Commit[] = [];
        for (const oid of parent) {
            const obj = await this.store.getObject(oid);
            if (obj) array.push(new Commit(obj, this.store));
        }
        return array;
    }
}
