/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {Commit} from "./commit";
import {Tree} from "./tree";
import {shortCache} from "./cache";
import {ObjStore} from "./obj-store";
import {Ref} from "./ref";

export class Repo implements GCF.Repo {
    private readonly ref: Ref;
    private readonly store: ObjStore;

    constructor(path: string) {
        path = path.replace(/\/$/, "");
        this.ref = new Ref(path);
        this.store = new ObjStore(path);
    }

    findObjectId = shortCache((object_id: string): Promise<string> => this.store.findObjectId(object_id));

    findCommitId = shortCache((ref: string): Promise<string> => this.ref.findCommitId(ref, this));

    getObject = shortCache((object_id: string): Promise<GCF.IObject> => this.store.getObject(object_id, this));

    getCommit = shortCache(async (commit_id: string): Promise<GCF.Commit> => new Commit(this, commit_id));

    getTree = shortCache(async (object_id: string): Promise<GCF.Tree> => new Tree(this, object_id));
}
