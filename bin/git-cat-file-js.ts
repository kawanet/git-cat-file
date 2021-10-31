/**
 * https://github.com/kawanet/git-cat-file
 */

import {openLocalRepo} from "..";
import * as lsTree from "./git-ls-tree-js";

interface Params {
    p?: boolean; // show object type
    t?: boolean; // show object content
}

export async function execute(args: string[], _options: any) {
    const params: Params = {};

    if (args[0] === "-C") {
        args.shift();
        const path = args.shift();
        process.chdir(path);
    }

    const repo = openLocalRepo(".");

    while (/^-/.test(args[0])) {
        params[args.shift().slice(1) as keyof Params] = true;
    }

    const revision = args.shift();
    if (!revision || !(params.t || params.p)) {
        process.stderr.write(`Usage:\n`);
        showHelp();
        process.exit(1);
    }

    const {oid, type, data} = await repo.getObject(revision);
    if (params.t) {
        process.stdout.write(`${type}\n`);
        process.exit(0);
    }

    if (type === "tree") {
        return lsTree.execute([oid], null);
    } else {
        process.stdout.write(data);
    }
}

export function showHelp() {
    process.stderr.write(`  git-js [-C path] cat-file [-t | -p] <object>\n`);
}
