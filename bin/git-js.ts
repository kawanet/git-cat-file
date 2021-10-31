#!/usr/bin/env node

import type {GCF} from "..";
import {openLocalRepo} from "..";
import * as catFile from "./git-cat-file-js";
import * as lsTree from "./git-ls-tree-js";
import * as revParse from "./git-rev-parse-js";

const options = require("process.argv")(process.argv.slice(2))({});

interface Command {
    execute: (repo: GCF.Repo, args: string[], options: any) => Promise<void>,
    showHelp: (prefix: string) => void,
}

const commands: { [cmd: string]: Command } = {
    "cat-file": catFile,
    "ls-tree": lsTree,
    "rev-parse": revParse,
};

export async function CLI() {
    const args: string[] = options["--"] || [];

    let path = ".";
    if (args[0] === "-C") {
        args.shift();
        path = args.shift();
    }

    const cmd = args.shift();
    const command = commands[cmd];
    if (!command) {
        process.stderr.write(`Usage:\n`);
        Object.keys(commands).sort().forEach(cmd => commands[cmd].showHelp("  "));
        process.exit(1);
    }

    const repo = openLocalRepo(path);
    await command.execute(repo, args, options);
}

if (!module.parent) CLI().catch(console.error);
