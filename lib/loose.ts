/**
 * https://github.com/kawanet/git-cat-file
 */

import {promises as fs} from "fs";
import {inflateSync} from "zlib";
import type {GCF} from "..";

import {shortCache} from "./cache";

export class Loose {
    constructor(protected readonly root: string) {
        //
    }

    private getList = shortCache((first: string) => readdir(`${this.root}/.git/objects/${first}`));

    async find(oid: string): Promise<string[]> {
        const first = oid.slice(0, 2);
        const rest = oid.slice(2);
        const {length} = rest;
        const files: string[] = await this.getList(first).catch(_ => null);
        if (!files) return;
        return files.filter(name => name.slice(0, length) === rest).map(name => (first + name));
    }

    async getObjItem(oid: string): Promise<GCF.ObjItem> {
        const first = oid.slice(0, 2);
        const rest = oid.slice(2);
        const data = await fs.readFile(`${this.root}/.git/objects/${first}/${rest}`);
        // console.warn(`loaded: ${data.length} bytes`);
        const raw = inflateSync(data);
        // console.warn(`inflated: ${raw.length} bytes`);
        return parseLooseObject(raw);
    }
}

function readdir(path: string): Promise<string[]> {
    // console.warn(`readdir: ${path}`);
    return fs.readdir(path);
}

function parseLooseObject(buf: Buffer): GCF.ObjItem {
    const offset = findZero(buf);
    const head = buf.slice(0, offset - 2).toString();
    const type = head.split(/\s+/).shift() as GCF.ObjType;
    // console.warn(`header: ${head}`);
    const data = buf.slice(offset);
    return {type, data};
}

function findZero(buf: Buffer, offset?: number): number {
    offset |= 0;
    while (buf[offset++]) {
        // nop
    }
    return offset;
}
