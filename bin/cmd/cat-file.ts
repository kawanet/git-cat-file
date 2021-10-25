/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "../..";
import * as lsTree from "./ls-tree";

interface Params {
    p?: boolean; // show object type
    t?: boolean; // show object content
}

export async function execute(repo: GCF.Repo, args: string[], _options: any) {
    const params: Params = {};

    while (/^-/.test(args[0])) {
        params[args.shift().slice(1) as keyof Params] = true;
    }

    const revision = args.shift();
    if (!revision || !(params.t || params.p)) {
        process.stderr.write(`Usage:\n`);
        showHelp();
        process.exit(1);
    }

    const commit = await repo.findCommitId(revision);
    const object_id = commit || await repo.findObjectId(revision);
    // console.warn(`object_id: ${object_id} (${revision})`);

    const type = await repo.getType(object_id);
    if (params.t) {
        process.stdout.write(`${type}\n`);
        process.exit(0);
    }

    if (type === "tree") {
        return lsTree.execute(repo, [object_id], null);
    } else {
        const data = await repo.getObject(object_id);
        process.stdout.write(data);
    }
}

export function showHelp() {
    process.stderr.write(`  git-js [-C path] cat-file [-t | -p] <object>\n`);
}
