/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {promises as fs} from "fs";

import {readPackIndex} from "./pack-idx";
import {readPackedObject} from "./pack-obj";
import {longCache} from "./cache";

export class Pack {
    constructor(protected readonly path: string) {
        //
    }

    private getIndex = longCache(() => readPackIndex(this.path));

    private getList = longCache(() => this.getIndex().then(index => Object.keys(index).sort()));

    async findAll(object_id: string): Promise<string[]> {
        const list = await this.getList();
        const index: { [oid: string]: 1 } = {};
        const {length} = object_id;

        for (const oid of await list) {
            if (oid.slice(0, length) === object_id) {
                index[oid] = 1;
            }
        }

        return Object.keys(index);
    }

    async getObject(object_id: string, repo: GCF.Repo): Promise<GCF.IObject> {
        const index = await this.getIndex();
        const offset = index[object_id];
        if (!offset) return;

        // console.warn(`open: ${this.path}`);
        const fh = await fs.open(this.path, "r");
        const obj = await readPackedObject(fh, offset, repo);
        await fh.close();
        return obj;
    }
}
