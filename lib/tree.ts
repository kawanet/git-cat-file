/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {getFileMode} from "./file-mode";
import type {ObjStore} from "./obj-store";

const isObjectId = (oid: string) => (oid && /^[0-9a-f]{40}$/i.test(oid));

export class Tree implements GCF.Tree {
    protected oid: string;

    constructor(object_id: string, protected readonly store: ObjStore) {
        if (!isObjectId(object_id)) {
            throw new Error(`Invalid object_id: ${object_id}`);
        }

        this.oid = object_id;
    }

    async getEntries(): Promise<GCF.Entry[]> {
        const {data} = await this.store.getObject(this.oid);
        if (data) return parseTree(data);
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
            tree = new Tree(oid, this.store);
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
