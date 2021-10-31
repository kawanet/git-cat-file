/**
 * https://github.com/kawanet/git-cat-file
 */

import {openLocalRepo} from "..";

export async function execute(args: string[], _options: any) {
    if (args[0] === "-C") {
        args.shift();
        const path = args.shift();
        process.chdir(path);
    }

    const repo = openLocalRepo(".");

    while (args.length) {
        const revision = args.shift();
        const commit = await repo.getCommit(revision);
        const commit_id = await commit.getId();
        if (!commit_id) {
            process.stderr.write(`Invalid revision: ${revision}\n`);
            showHelp();
            process.exit(1);
        }

        process.stdout.write(`${commit_id}\n`);
    }
}

export function showHelp() {
    process.stderr.write(`  git-js [-C path] rev-parse <args>...\n`);
}
