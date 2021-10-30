/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {Tree} from "./tree";

export class Commit implements GCF.Commit {
    private meta: GCF.CommitMeta;
    private message: string;
    private oid: string;

    constructor(protected readonly repo: GCF.Repo, commit_id: string) {
        this.oid = commit_id;
    }

    async getId(): Promise<string> {
        return this.oid;
    }

    private async parseMeta(): Promise<void> {
        if (this.meta) return;

        const {oid, type, data} = await this.repo.getObject(this.oid);
        this.oid = oid;

        if (type !== "commit") {
            throw new Error(`Invalid type: ${type}`);
        }

        const meta = this.meta = {} as GCF.CommitMeta;
        const lines = data.toString().split(/\r?\n/);
        let headerMode = true;
        let message: string;

        for (const line of lines) {
            if (headerMode) {
                const [key, val] = splitBySpace(line);
                if (key) {
                    meta[key as keyof GCF.CommitMeta] = val;
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

    async getMeta(key: keyof GCF.CommitMeta): Promise<string> {
        await this.parseMeta();
        return this.meta[key];
    }

    async getMessage(): Promise<string> {
        await this.parseMeta();
        return this.message;
    }

    async getTree(): Promise<GCF.Tree> {
        return new Tree(this.repo, await this.getMeta("tree"));
    }

    async getFile(path: string): Promise<GCF.File> {
        const tree = await this.getTree();
        const entry = await tree.getEntry(path);
        if (!entry) return;

        const {oid, mode} = entry;
        const obj = await this.repo.getObject(oid);
        const {type} = obj;
        if (type !== "blob") return;

        const {data} = obj;
        return {oid, mode, data};
    }
}

function splitBySpace(line: string): string[] {
    const sp = line.indexOf(" ");
    return [line.slice(0, sp), line.slice(sp + 1)];
}
