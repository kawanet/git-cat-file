/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {getFileMode} from "./file-mode";

export class Tree implements GCF.Tree {

    constructor(protected readonly repo: GCF.Repo, protected readonly object_id: string) {
        //
    }

    async getEntries(): Promise<GCF.Entry[]> {
        const obj = await this.repo.getObject(this.object_id);
        const {data} = obj;
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
            const item = await tree.getEntry(name);
            tree = new Tree(tree.repo, item.oid);
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
