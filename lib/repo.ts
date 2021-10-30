/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {Commit} from "./commit";
import {Tree} from "./tree";
import {ObjStore} from "./obj-store";
import {Ref} from "./ref";

const isObjectId = (oid: string) => (oid && /^[0-9a-f]{40}$/.test(oid));

export class Repo implements GCF.Repo {
    private readonly ref: Ref;
    private readonly store: ObjStore;

    constructor(path: string) {
        path = path.replace(/\/$/, "");
        this.ref = new Ref(path);
        this.store = new ObjStore(path);
    }

    async getObject(object_id: string): Promise<GCF.IObject> {
        if (isObjectId(object_id)) {
            const obj = await this.store.getObject(object_id);
            if (obj) return obj;
        }

        const commit_id = await this.ref.findCommitId(object_id, this.store);
        object_id = await this.store.findObjectId(commit_id || object_id);

        if (object_id) {
            return this.store.getObject(object_id);
        }
    }

    async getCommit(commit_id: string): Promise<GCF.Commit> {
        commit_id = await this.ref.findCommitId(commit_id, this.store);
        const obj = await this.store.getObject(commit_id);
        if (obj.type === "commit") {
            return new Commit(commit_id, this.store);
        }
    }

    async getTree(object_id: string): Promise<GCF.Tree> {
        return new Tree(object_id, this.store);
    }
}
