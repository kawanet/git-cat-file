/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {promises as fs} from "fs";

import {shortCache} from "./cache";
import {Loose} from "./loose";
import {Pack} from "./pack";
import {Ref} from "./ref";

/**
 * https://github.com/kawanet/git-cat-file
 */

const isObjectId = (oid: string) => (oid && /^[0-9a-f]{40}$/i.test(oid));

export class ObjStore {
    private readonly loose: Loose;
    private readonly pack: { [name: string]: Pack } = {};
    private readonly ref: Ref;

    constructor(private readonly root: string) {
        this.loose = new Loose(root);
        this.ref = new Ref(root);
    }

    /**
     * get object with the exact objectId
     */
    getObject = shortCache(async (object_id: string): Promise<GCF.IObject> => {
        if (!isObjectId(object_id)) {
            throw new Error(`Invalid object_id: ${object_id}`);
        }

        // packed object
        const list = await this.getPackList() || [];
        for (const pack of list) {
            const obj = await pack.getObject(object_id, this);
            if (obj) return obj;
        }

        // loose object
        return this.loose.getObject(object_id);
    });

    /**
     * get objectId with a loose objectId
     */
    findObjectId = shortCache(async (object_id: string): Promise<string> => {
        const index: { [oid: string]: 1 } = {};

        // packed object
        {
            const packs = await this.getPackList() || [];
            for (const pack of packs) {
                const items = await pack.findAll(object_id);
                if (!items) continue;
                for (const oid of items) {
                    index[oid] = 1;
                }
            }
            const matched = Object.keys(index);
            // console.warn(`matched: ${matched.length} packed object`);
            if (matched.length > 1) return;
        }

        // loose object
        {
            const items = await this.loose.findAll(object_id) || [];
            // console.warn(`matched: ${items.length} loose object`);
            for (const oid of items) {
                index[oid] = 1;
            }
        }

        const matched = Object.keys(index);
        if (matched.length === 1) return matched[0];
    });

    findCommitId = shortCache((commit_id: string): Promise<string> => this.ref.findCommitId(commit_id, this));

    protected getPackList = shortCache(async (): Promise<Pack[]> => {
        const base = `${this.root}/objects/pack/`;

        // console.warn(`readdir: ${base}`);
        let names: string[] = await fs.readdir(base).catch(_ => null);
        if (!names) return;

        names = names.filter(name => /^pack-.*\.pack$/.test(name));
        // console.warn(`found: ${names.length} packs`);

        return names.map(name => (this.pack[name] || (this.pack[name] = new Pack(base + name))));
    });
}
