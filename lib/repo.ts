/**
 * https://github.com/kawanet/git-cat-file
 */

import {promises as fs} from "fs";
import type {GCF} from "..";
import {Pack} from "./pack";
import {Commit} from "./commit";
import {Tree} from "./tree";
import {shortCache} from "./cache";
import {Loose} from "./loose";
import {Ref} from "./ref";

const isObjectId = (oid: string) => (oid && /^[0-9a-f]+$/.test(oid));

export class Repo implements GCF.Repo {
    private readonly root: string;
    private readonly pack: { [name: string]: Pack } = {};
    private readonly loose: Loose;
    private readonly ref: Ref;

    constructor(path: string) {
        this.root = path = path.replace(/\/$/, "");
        this.loose = new Loose(path);
        this.ref = new Ref(path);
    }

    async getType(object_id: string): Promise<GCF.ObjType> {
        const obj = await this.getObjItem(object_id);
        if (obj) return obj.type;
    }

    async getObject(object_id: string): Promise<Buffer> {
        const obj = await this.getObjItem(object_id);
        if (obj) return obj.data;
    }

    private getObjItem = shortCache(async (object_id: string): Promise<GCF.ObjItem> => {
        if (!isObjectId(object_id)) {
            throw new Error(`Invalid object_id: ${object_id}`);
        }

        // packed object
        const packs = await this.readAllPacks();
        for (const pack of packs) {
            const obj = await pack.getObjItem(object_id, this);
            if (obj) return obj;
        }

        // loose object
        return this.loose.getObjItem(object_id);
    });

    findObjectId = shortCache(async (object_id: string): Promise<string> => {
        const index: { [oid: string]: 1 } = {};
        // console.warn(`findObjectId: ${object_id}`);

        // packed object
        {
            const packs = await this.readAllPacks();
            for (const pack of packs) {
                const list = await pack.find(object_id);
                if (!list) continue;
                for (const oid of list) {
                    index[oid] = 1;
                }
            }
            const matched = Object.keys(index);
            // console.warn(`matched: ${matched.length} packed object`);
            if (matched.length > 1) return;
        }

        // loose object
        {
            const list = await this.loose.find(object_id) || [];
            // console.warn(`matched: ${list.length} loose object`);
            for (const oid of list) {
                index[oid] = 1;
            }
        }

        const matched = Object.keys(index);
        if (matched.length === 1) return matched[0];
    });

    findCommitId = shortCache((ref: string): Promise<string> => this.ref.resolve(ref, this));

    getCommit(commit_id: string): GCF.Commit {
        return new Commit(this, commit_id);
    }

    getTree(object_id: string): GCF.Tree {
        return new Tree(this, object_id);
    }

    private readAllPacks = shortCache(async (): Promise<Pack[]> => {
        const base = `${this.root}/.git/objects/pack/`;

        // console.warn(`readdir: ${base}`);
        let names: string[] = await fs.readdir(base).catch(_ => null);
        if (!names) return;

        names = names.filter(name => /^pack-.*\.pack$/.test(name));
        // console.warn(`found: ${names.length} packs`);

        return names.map(name => (this.pack[name] || (this.pack[name] = new Pack(base + name))));
    });
}
