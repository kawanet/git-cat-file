/**
 * https://github.com/kawanet/git-cat-file
 */

import {promises as fs} from "fs";
import type {GCF} from "..";

import {shortCache} from "./cache";
import type {ObjStore} from "./obj-store";
import {Commit} from "./commit";
import {Tag} from "./tag";

interface RefCommit {
    ref: string;
    commit: string;
}

const isObjectId = (oid: string) => (oid && /^[0-9a-f]{40}$/i.test(oid));

export class Ref {
    constructor(protected readonly root: string) {
        //
    }

    async findCommitId(revision: string, store: ObjStore): Promise<string> {
        if (!revision || !/[^.\/]/.test(revision)) {
            throw new Error(`Invalid revision: ${revision}`);
        }

        let ancestry: string[];
        revision = revision.replace(/([~^]\d*)+$/, match => {
            ancestry = match.split(/([~^]\d*)/).filter(v => v);
            return "";
        });

        if (revision === "@") {
            revision = "HEAD";
        }

        const id = await this.findId(revision);
        if (id && !ancestry) return id;

        const obj = await this.getRawCommit(id || revision, store);
        if (!obj) return;
        if (obj && !ancestry) return obj.oid;

        // https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection#_ancestry_references
        // HEAD^
        // HEAD~2
        let commit: GCF.Commit = new Commit(obj, store);
        for (const gen of ancestry) {
            const mark = gen[0];
            const num = gen.substring(1) || "1";

            const tilde = (mark === "~") && +num || 1;
            const caret = (mark === "^") && +num || 1;

            for (let i = 0; i < tilde; i++) {
                const parents = await commit.getParents();
                if (!parents) return;
                commit = parents[caret - 1];
                if (!commit) return;
            }
        }

        return commit.getId();
    }

    private async findId(revision: string): Promise<string> {
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
    }

    private async getRawCommit(revision: string, store: ObjStore): Promise<GCF.IObject> {
        const object_id = await store.findObjectId(revision);
        if (!object_id) return; // not found

        let obj = await store.getObject(object_id);

        if (obj?.type === "tag") {
            const tag = new Tag(obj, store);
            const object_id = tag.getMeta("object");
            obj = await store.getObject(object_id);
        }

        if (obj.type === "commit") return obj;
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
        const ref = await this.readFirstLine(name);
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
        const path = `${this.root}/${name}`;
        // console.warn(`readFile: ${path}`);
        return fs.readFile(path, "utf-8");
    });
}

function splitBySpace(line: string): string[] {
    const sp = line.indexOf(" ");
    return [line.slice(0, sp), line.slice(sp + 1)];
}
