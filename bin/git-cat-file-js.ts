#!/usr/bin/env node

/**
 * https://github.com/kawanet/git-cat-file
 */

import {openLocalRepo} from "..";
import {showEnties} from "./git-ls-tree-js";
import {parseOptions} from "../lib/cli-lib";

const longParams = {
    help: true,
};

const shortParams = {
    C: "path", // change directory
    h: true, // show help
    p: true, // show object type
    t: true, // show object content
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

    const {help} = options.long;
    const {h, t, p} = options.short;
    const revision = options.args.shift();
    if (help || h || !revision || !(t || p)) {
        process.stderr.write(`Usage:\n`);
        showHelp();
        process.exit(1);
    }

    const repo = openLocalRepo(".");

    const {oid, type, data} = await repo.getObject(revision);
    if (t) {
        process.stdout.write(`${type}\n`);
        process.exit(0);
    }

    if (type === "tree") {
        const tree = await repo.getTree(oid);
        await showEnties(tree);
    } else {
        process.stdout.write(data);
    }
}

function showHelp() {
    process.stderr.write(`  git-cat-file-js [-C path] [-t | -p] <object>\n`);
}

if (!module.parent) CLI(process.argv.slice(2)).catch(console.error);
