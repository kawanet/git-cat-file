#!/usr/bin/env node

/**
 * https://github.com/kawanet/git-cat-file
 */

import {openLocalRepo} from "..";
import {promises as fs} from "fs";

import {parseOptions} from "../lib/cli-lib";

const longParams = {
    help: true,
};

const shortParams = {
    C: "path", // change directory
    h: true, // show help
};

async function CLI(args: string[]) {
    const options = parseOptions({
        long: longParams,
        short: shortParams,
        args: args,
    });
    args = options.args;

    const {C} = options.short;
    if (C) process.chdir(C);

    if (await fs.readdir(".git").catch(_ => null)) {
        process.chdir(".git");
    }

    const {help} = options.long;
    const {h} = options.short;
    if (help || h) {
        process.stderr.write(`Usage:\n`);
        showHelp();
        process.exit(1);
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

function showHelp() {
    process.stderr.write(`  git-rev-parse-js [-C path] <args>...\n`);
}

if (!module.parent) CLI(process.argv.slice(2)).catch(console.error);
