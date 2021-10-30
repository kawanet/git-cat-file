/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "../..";

export async function execute(repo: GCF.Repo, args: string[], _options: any) {
    const revision = args.shift();
    if (!revision) {
        process.stderr.write(`Usage:\n`);
        showHelp();
        process.exit(1);
    }

    const commit_id = await repo.findCommitId(revision);
    const obj = await repo.getObject(commit_id || revision);
    let {oid, type} = obj;

    if (type === "commit") {
        const commit = await repo.getCommit(oid);
        oid = await commit.getMeta("tree");
        const obj = await repo.getObject(oid);
        type = obj.type;
    }

    if (type !== "tree") {
        throw new Error(`Invalid tree-ish: ${revision} (${type})`);
    }

    const root = await repo.getTree(oid);

    if (!args.length) {
        return showEnties(root, "");
    }

    for (const path of args) {
        if (/[\/]$/.test(path)) {
            await showEnties(root, path);
        } else {
            const base = path.replace(/[^\/]+$/, "");
            const entry = await root.getEntry(path);
            await showEntry(entry, base);
        }
    }
}

async function showEnties(tree: GCF.Tree, path?: string) {
    if (path) {
        tree = await tree.getTree(path);
    }

    let entries: GCF.Entry[] = await tree.getEntries();
    entries = entries.slice().sort((a, b) => (a.name > b.name) ? 1 : (a.name < b.name) ? -1 : 0);

    for (const entry of entries) {
        showEntry(entry, path);
    }
}

function showEntry(entry: GCF.Entry, base: string) {
    const {mode} = entry;
    const typeName: GCF.ObjType = mode.isSubmodule ? "commit" : mode.isDirectory ? "tree" : "blob";
    process.stdout.write(`${mode} ${typeName} ${entry.oid}\t${base}${entry.name}\n`);
}

export function showHelp() {
    process.stderr.write(`  git-js [-C path] ls-tree [<options>] <tree-ish> [<path>...]\n`);
}
