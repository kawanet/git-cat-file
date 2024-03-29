/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {Commit} from "./commit";
import {Tree} from "./tree";
import {ObjStore} from "./obj-store";
import {Tag} from "./tag";

const isObjectId = (oid: string) => (oid && /^[0-9a-f]{40}$/i.test(oid));
const isLooseId = (oid: string) => (oid && /^[0-9a-f]{4,40}$/i.test(oid));

export class Repo implements GCF.Repo {
    private readonly store: ObjStore;

    constructor(path: string) {
        path = path.replace(/\/+$/, "");
        this.store = new ObjStore(path);
    }

    async getObject(object_id: string): Promise<GCF.IObject> {
        if (isObjectId(object_id)) {
            const obj = await this.store.getObject(object_id);
            if (obj) return obj;
        }

        if (isLooseId(object_id)) {
            const oid = await this.store.findObjectId(object_id);
            if (oid) return this.store.getObject(oid);
        }

        const commit_id = await this.store.findCommitId(object_id);
        if (commit_id) return this.store.getObject(commit_id);
    }

    async getCommit(commit_id: string): Promise<GCF.Commit> {
        let obj = await this.getObject(commit_id);
        if (!obj) return;

        if (obj.type === "tag") {
            const tag = new Tag(obj, this.store);
            commit_id = tag.getMeta("object");
            obj = await this.getObject(commit_id);
        }

        return new Commit(obj, this.store);
    }

    async getTree(object_id: string): Promise<GCF.Tree> {
        const obj = await this.getObject(object_id);
        if (!obj) return;
        return new Tree(obj, this.store);
    }
}
