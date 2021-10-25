/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "../..";

export async function execute(repo: GCF.Repo, args: string[], _options: any) {
    while (args.length) {
        const revision = args.shift();
        const commit_id = await repo.findCommitId(revision);
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
