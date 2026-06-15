/**
 * https://github.com/kawanet/git-cat-file
 *
 * Helpers shared by the `git-ls-tree-js` and `git-cat-file-js` CLIs to
 * print tree entries in `git ls-tree` format. Kept in lib/ so that
 * importing them from another bin/*.ts does not trigger that script's
 * top-level CLI invocation as a side effect.
 */

import type {GCF} from "../types/git-cat-file.d.ts"

export async function showEnties(tree: GCF.Tree, path?: string): Promise<void> {
    if (path) {
        tree = await tree.getTree(path)
        if (!tree) return
    } else {
        path = ""
    }

    let entries: GCF.Entry[] = await tree.getEntries()
    entries = entries.slice().sort((a, b) => (a.name > b.name) ? 1 : (a.name < b.name) ? -1 : 0)

    for (const entry of entries) {
        showEntry(entry, path)
    }
}

export function showEntry(entry: GCF.Entry, base: string): void {
    const {mode} = entry
    const typeName: GCF.ObjType = mode.isSubmodule ? "commit" : mode.isDirectory ? "tree" : "blob"
    process.stdout.write(`${mode} ${typeName} ${entry.oid}\t${base}${entry.name}\n`)
}
