/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {Tree} from "./tree";
import type {ObjStore} from "./obj-store";

type CommitMetaA = { [key in keyof GCF.CommitMeta]: string[] };

export class Commit implements GCF.Commit {
    private meta: CommitMetaA;
    private message: string;

    constructor(private readonly obj: GCF.IObject, protected readonly store: ObjStore) {
        if (obj.type !== "commit") {
            throw new TypeError(`Invalid commit object: ${obj.oid} (${obj.type})`)
        }
    }

    getId(): string {
        return this.obj.oid;
    }

    private parseMeta(): void {
        if (this.meta) return;

        const {data} = this.obj;
        const meta = this.meta = {} as CommitMetaA;
        const lines = data.toString().split(/\r?\n/);
        let headerMode = true;
        let message: string;

        for (const line of lines) {
            if (headerMode) {
                const [key, val] = splitBySpace(line) as [keyof CommitMetaA, string];
                if (meta[key]) {
                    meta[key].push(val)
                } else if (key) {
                    meta[key] = [val];
                } else {
                    headerMode = false;
                }
            } else {
                if (message) {
                    message += "\n" + line;
                } else {
                    message = line;
                }
            }
        }

        this.message = message;
    }

    getMeta(key: keyof GCF.CommitMeta): string {
        this.parseMeta();
        const array = this.meta[key];
        if (array) {
            if (array.length > 1) return array.join(" ");
            return array[0];
        }
    }

    getDate(): Date {
        const author = this.getMeta("author") || this.getMeta("committer");
        const match = author?.match(/\s+(\d+)(\s+[+\-]\d+)?$/);
        if (match) return new Date(+match[1] * 1000);
    }

    getMessage(): string {
        this.parseMeta();
        return this.message;
    }

    async getTree(): Promise<GCF.Tree> {
        const oid = this.getMeta("tree");
        const obj = await this.store.getObject(oid);
        return new Tree(obj, this.store);
    }

    async getFile(path: string): Promise<GCF.File> {
        const tree = await this.getTree();
        const entry = await tree.getEntry(path);
        if (!entry) return;

        const {oid, mode} = entry;
        const obj = await this.store.getObject(oid);
        if (obj.type !== "blob") return;

        const {data} = obj;
        return {oid, mode, data};
    }

    async getParents(): Promise<GCF.Commit[]> {
        this.parseMeta();
        const {parent} = this.meta;
        if (!parent) return;

        const array: GCF.Commit[] = [];
        for (const oid of parent) {
            const obj = await this.store.getObject(oid);
            if (obj) array.push(new Commit(obj, this.store));
        }
        return array;
    }
}

function splitBySpace(line: string): string[] {
    const sp = line.indexOf(" ");
    return [line.slice(0, sp), line.slice(sp + 1)];
}
