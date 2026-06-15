/**
 * https://github.com/kawanet/git-cat-file
 *
 * Type definitions for the `git-cat-file` package — a pure-JavaScript
 * implementation of `git cat-file -p` for Node.js.
 */

export {} // external module indicator

export declare namespace GCF {
    /**
     * The four object types stored in a Git object database. Returned in
     * `IObject.type` and used to discriminate the payload of `data`.
     */
    type ObjType = "blob" | "commit" | "tag" | "tree"

    /**
     * A handle to an on-disk Git repository. Created by `openLocalRepo()`.
     * All accessors are async because they may have to read and inflate
     * loose objects or seek inside packfiles.
     */
    interface Repo {
        /**
         * Reads the raw object identified by its full SHA-1 object id.
         * Returns `undefined` if the object is missing.
         */
        getObject(object_id: string): Promise<IObject>

        /**
         * Resolves the commit referenced by a branch name, tag, short sha,
         * or any other revision spec accepted by `git rev-parse`. Returns
         * `undefined` if the revision does not resolve to a commit.
         */
        getCommit(commit_id: string): Promise<Commit>

        /**
         * Reads the tree object identified by its full SHA-1 object id.
         * Returns `undefined` if the object is missing.
         */
        getTree(object_id: string): Promise<Tree>
    }

    /**
     * A parsed commit object.
     */
    interface Commit {
        /** The 40-character SHA-1 id of this commit. */
        getId(): string

        /** Returns a single header value from the commit body (e.g. `tree`, `author`). */
        getMeta(key: keyof CommitMeta): string

        /** Returns the commit's author date as a `Date`. */
        getDate(): Date

        /** Returns the commit message body (the text after the headers). */
        getMessage(): string

        /** Resolves to the root tree this commit points at. */
        getTree(): Promise<Tree>

        /**
         * Reads a single file from the commit's tree by repository-relative
         * path. Returns `undefined` if the path does not exist or is not a
         * regular file.
         */
        getFile(path: string): Promise<File>

        /** Resolves to the parent commits, in declared order. */
        getParents(): Promise<Commit[]>
    }

    /**
     * A parsed annotated-tag object. Lightweight tags resolve directly to
     * commits and never produce a `Tag` instance.
     */
    interface Tag {
        /** The 40-character SHA-1 id of this tag. */
        getId(): string

        /** Returns a single header value from the tag body (e.g. `object`, `tagger`). */
        getMeta(key: keyof TagMeta): string

        /** Returns the tagger date as a `Date`. */
        getDate(): Date

        /** Returns the tag message body (the text after the headers). */
        getMessage(): string
    }

    /**
     * A parsed tree object — the on-disk representation of a directory.
     */
    interface Tree {
        /** The 40-character SHA-1 id of this tree. */
        getId(): string

        /** Lists every immediate entry of this tree. */
        getEntries(): Promise<Entry[]>

        /**
         * Resolves a single entry by repository-relative path. Returns
         * `undefined` if no entry matches.
         */
        getEntry(path: string): Promise<Entry>

        /**
         * Descends into a subdirectory and returns it as a `Tree`. Returns
         * `undefined` if the path does not resolve to a tree entry.
         */
        getTree(path: string): Promise<Tree>
    }

    /**
     * The raw payload returned by `Repo.getObject()`. The `data` buffer is
     * the inflated object body, with no Git-specific framing.
     */
    interface IObject {
        /** The 40-character SHA-1 id of the object. */
        oid: string
        /** Object type as recorded in the Git object header. */
        type: ObjType
        /** Inflated object body. */
        data: Buffer
    }

    /**
     * A single entry inside a `Tree` — i.e. one row of `git ls-tree`.
     */
    interface Entry {
        /** File mode bits, decoded into convenient boolean accessors. */
        mode: FileMode
        /** The basename of the entry inside its parent tree. */
        name: string
        /** The 40-character SHA-1 id the entry points at. */
        oid: string
    }

    /**
     * Header keys that appear on a commit object.
     */
    interface CommitMeta {
        tree: string
        parent: string
        author: string
        committer: string
        encoding: string
        /**
         * Detached signature line(s). Returned as-is, with continuation
         * lines joined by `\n` and the leading space stripped, so the
         * value matches the original `-----BEGIN ... -----` block.
         */
        gpgsig: string
        /**
         * The embedded annotated-tag object on a merge commit produced by
         * merging an annotated tag. Continuation lines are joined the
         * same way as `gpgsig`.
         */
        mergetag: string
    }

    /**
     * Header keys that appear on an annotated-tag object.
     */
    interface TagMeta {
        object: string
        type: string
        tagger: string
        tag: string
    }

    /**
     * A file resolved through `Commit.getFile()`. Combines the entry's
     * mode metadata with the inflated blob payload.
     */
    interface File {
        /** The 40-character SHA-1 id of the underlying blob. */
        oid: string
        /** File mode bits from the parent tree entry. */
        mode: FileMode
        /** Inflated blob contents. */
        data: Buffer
    }

    /**
     * Decoded file-mode bits. The boolean accessors cover the modes Git
     * actually stores in tree entries; only one of them is `true` per
     * entry. `toString()` returns the mode as a six-digit octal string
     * (e.g. `"100644"`).
     */
    interface FileMode {
        toString(): string

        /** Regular file (mode `100644`). */
        isFile: boolean
        /** Executable file (mode `100755`). */
        isExecutable: boolean
        /** Symbolic link (mode `120000`). */
        isSymlink: boolean
        /** Gitlink / submodule pointer (mode `160000`). */
        isSubmodule: boolean
        /** Subdirectory entry (mode `040000`). */
        isDirectory: boolean
    }
}

/**
 * Opens a local Git repository for reading. `path` may point at either a
 * bare repository or the `.git` directory inside a working tree.
 *
 * @example
 * import {openLocalRepo} from "git-cat-file";
 * const repo = openLocalRepo("path/to/.git");
 * const head = await repo.getCommit("HEAD");
 */
export function openLocalRepo(path: string): GCF.Repo
