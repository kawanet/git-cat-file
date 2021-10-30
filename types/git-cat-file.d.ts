/**
 * https://github.com/kawanet/git-cat-file
 */
import * as Buffer from "buffer";

export declare module GCF {
    type ObjType = "blob" | "commit" | "tag" | "tree";

    interface Repo {
        /**
         * find the full commit_id for branch name, tag, etc.
         */
        findCommitId(revision: string): Promise<string>;

        /**
         * get object content for the full object_id given
         */
        getObject(object_id: string): Promise<IObject>;

        /**
         * find the commit for the given branch name, tag, etc.
         */
        getCommit(commit_id: string): Promise<Commit>;

        /**
         * get a list of objects for the full object_id given
         */
        getTree(object_id: string): Promise<Tree>;
    }

    interface Commit {
        getMeta(key: keyof CommitMeta): Promise<string>;

        getMessage(): Promise<string>;

        getTree(): Promise<Tree>;

        getFile(path: string): Promise<File>;
    }

    interface Tree {
        getEntries(): Promise<Entry[]>;

        getEntry(path: string): Promise<Entry>;

        getTree(path: string): Promise<Tree>;
    }

    interface IObject {
        oid: string;
        type: ObjType;
        data: Buffer;
    }

    interface Entry {
        mode: FileMode;
        name: string;
        oid: string;
    }

    interface CommitMeta {
        tree: string;
        parent: string;
        author: string;
        committer: string;
        encoding: string;
    }

    interface File {
        oid: string;
        mode: FileMode;
        data: Buffer;
    }

    interface FileMode {
        toString(): string;

        isFile: boolean; // 100644
        isExecutable: boolean; // 100755
        isSymlink: boolean; // 120000
        isSubmodule: boolean; // 160000
        isDirectory: boolean; // 040000
    }
}

export function openLocalRepo(path: string): GCF.Repo;
