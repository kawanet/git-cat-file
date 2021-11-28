/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {getFileMode} from "./file-mode";
import type {ObjStore} from "./obj-store";

export class Tree implements GCF.Tree {

    constructor(private readonly obj: GCF.IObject, protected readonly store: ObjStore) {
        if (obj.type !== "tree") {
            throw new TypeError(`Invalid tree object: ${obj.oid} (${obj.type})`)
        }
    }

    async getEntries(): Promise<GCF.Entry[]> {
        return parseTree(this.obj.data);
    }

    async getEntry(path: string): Promise<GCF.Entry> {
        let tree: GCF.Tree = this;

        if (/\//.test(path)) {
            const names = path.split("/");
            path = names.pop();
            tree = await this.getTree(names.join("/"));
        }

        const list = await tree.getEntries();
        return list.filter(item => item.name === path).shift();
    }

    async getTree(path: string): Promise<GCF.Tree> {
        let tree: Tree = this;

        for (const name of path.split("/")) {
            if (!name) continue;
            const {oid} = await tree.getEntry(name);
            const obj = await this.store.getObject(oid);
            if (!obj) return;
            tree = new Tree(obj, this.store);
        }

        return tree;
    }
}

function parseTree(data: Buffer): GCF.Entry[] {
    const list: GCF.Entry[] = [];

    let start = 0;
    let end: number;

    const {length} = data;
    while (start < length) {
        end = findZero(data, start);
        const line = data.slice(start, end - 1).toString();
        const [modeStr, name] = splitBySpace(line);
        const mode = getFileMode(modeStr);
        start = end + 20;
        const oid = data.slice(end, start).toString("hex");
        list.push({mode, name, oid});
    }

    return list;
}

function findZero(buf: Buffer, offset?: number): number {
    offset |= 0;
    while (buf[offset++]) {
        // nop
    }
    return offset;
}

function splitBySpace(line: string): string[] {
    const sp = line.indexOf(" ");
    return [line.slice(0, sp), line.slice(sp + 1)];
}
