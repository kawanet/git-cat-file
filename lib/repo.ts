/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {Commit} from "./commit";
import {Tree} from "./tree";
import {ObjStore} from "./obj-store";

const isObjectId = (oid: string) => (oid && /^[0-9a-f]{40}$/.test(oid));

export class Repo implements GCF.Repo {
    private readonly store: ObjStore;

    constructor(path: string) {
        path = path.replace(/\/$/, "");
        this.store = new ObjStore(path);
    }

    async getObject(object_id: string): Promise<GCF.IObject> {
        if (isObjectId(object_id)) {
            const obj = await this.store.getObject(object_id);
            if (obj) return obj;
        }

        const commit_id = await this.store.findCommitId(object_id);
        const obj = this.store.getObject(commit_id || object_id);
        if (!obj) throw new Error(`Object not found: ${commit_id}`);
        return obj;
    }

    async getCommit(commit_id: string): Promise<GCF.Commit> {
        const obj = await this.getObject(commit_id);
        if (obj?.type !== "commit") throw new TypeError(`Invalid type: ${commit_id} (${obj.type})`)
        return new Commit(obj.oid, this.store);
    }

    async getTree(object_id: string): Promise<GCF.Tree> {
        const obj = await this.store.getObject(object_id);
        if (obj?.type !== "tree") throw new TypeError(`Invalid type: ${object_id} (${obj.type})`)
        return new Tree(obj.oid, this.store);
    }
}
