#!/usr/bin/env node

import * as catFile from "./git-cat-file-js";
import * as lsTree from "./git-ls-tree-js";
import * as revParse from "./git-rev-parse-js";

const options = require("process.argv")(process.argv.slice(2))({});

interface Command {
    execute: (args: string[], options: any) => Promise<void>,
    showHelp: (prefix: string) => void,
}

const commands: { [cmd: string]: Command } = {
    "cat-file": catFile,
    "ls-tree": lsTree,
    "rev-parse": revParse,
};

export async function CLI() {
    const args: string[] = options["--"] || [];

    const cmd = args.shift();
    const command = commands[cmd];
    if (!command) {
        process.stderr.write(`Usage:\n`);
        Object.keys(commands).sort().forEach(cmd => commands[cmd].showHelp("  "));
        process.exit(1);
    }

    await command.execute(args, options);
}

if (!module.parent) CLI().catch(console.error);
