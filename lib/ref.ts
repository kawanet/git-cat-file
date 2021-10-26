/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import {promises as fs} from "fs";

import {shortCache} from "./cache";

interface RefCommit {
    ref: string;
    commit: string;
}

const isObjectId = (oid: string) => (oid && /^[0-9a-f]+$/.test(oid));

export class Ref {
    constructor(protected readonly root: string) {
        //
    }

    async findCommitId(revision: string, repo: GCF.Repo): Promise<string> {
        if (!revision || !/[^.\/]/.test(revision)) {
            throw new Error(`Invalid revision: ${revision}`);
        }

        if (revision === "@") {
            revision = "HEAD";
        }

        const orig = revision;
        while (revision) {
            revision = await this.searchRef(revision);
            if (!revision) break;

            const ref = revision.replace(/^ref:\s*/, "");
            if (/^refs\//.test(ref)) {
                revision = await this.findRef(ref);
            }

            if (isObjectId(revision)) {
                return revision; // commit
            }
        }

        const object_id = await repo.findObjectId(orig);
        if (!object_id) return; // not found

        const obj = await repo.getObject(object_id);
        const {type} = obj;
        if (type === "commit") return object_id;
    }

    private readPackedRefIndex = shortCache(async () => {
        const index: { [ref: string]: string } = {};
        const list = await this.readPackedRefList();
        for (const ref of list) {
            index[ref.ref] = ref.commit;
        }
        return index;
    });

    private async readPackedRefList(): Promise<RefCommit[]> {
        const list: RefCommit[] = [];
        const text: string = await this.readTextFile(`packed-refs`).catch(_ => null);
        if (!text) return list;

        const lines = text.split(/\r?\n/).filter(s => /^\w/.test(s));
        for (const line of lines) {
            const [commit, ref] = splitBySpace(line);
            list.push({commit, ref});
        }
        return list;
    }

    private async searchRef(ref: string): Promise<string> {
        // .git/HEAD
        if (/HEAD$/.test(ref)) {
            const commit = await this.readFirstLine(ref).catch(_ => null);
            if (commit) return commit;
        }

        // .git/refs/heads/main
        {
            const commit = await this.findRef(`refs/heads/${ref}`).catch(_ => null);
            if (commit) return commit;
        }

        // .git/refs/tags/xxxx
        {
            const commit = await this.findRef(`refs/tags/${ref}`).catch(_ => null);
            if (commit) return commit;
        }

        // .git/refs/remotes/xxxx
        {
            const commit = await this.findRef(`refs/remotes/${ref}`).catch(_ => null);
            if (commit) return commit;
        }
    }

    private async findRef(name: string): Promise<string> {
        // loose ref
        const ref = this.readFirstLine(name);
        if (ref) return ref;

        // packed ref
        const index = await this.readPackedRefIndex();
        if (index[name]) return index[name];
    }

    private async readFirstLine(name: string): Promise<string> {
        const text: string = await this.readTextFile(name).catch(_ => null);
        if (text) return text.split(/\r?\n/).filter(s => /^[^#\s]/.test(s)).shift();
    }

    private readTextFile = shortCache((name: string): Promise<string> => {
        const path = `${this.root}/.git/${name}`;
        // console.warn(`readFile: ${path}`);
        return fs.readFile(path, "utf-8");
    });
}

function splitBySpace(line: string): string[] {
    const sp = line.indexOf(" ");
    return [line.slice(0, sp), line.slice(sp + 1)];
}
