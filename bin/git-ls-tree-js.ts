#!/usr/bin/env node

/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
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
    const revision = args.shift();
    if (help || h || !revision) {
        process.stderr.write(`Usage:\n`);
        showHelp();
        process.exit(1);
    }

    const repo = openLocalRepo(".");

    const obj = await repo.getObject(revision);
    let {oid, type} = obj;

    if (type === "commit") {
        const commit = await repo.getCommit(oid);
        oid = commit.getMeta("tree");
        const obj = await repo.getObject(oid);
        type = obj.type;
    }

    if (type !== "tree") {
        throw new TypeError(`Invalid tree-ish: ${revision} (${type})`);
    }

    const root = await repo.getTree(oid);

    if (!args.length) {
        return showEnties(root);
    }

    for (const path of args) {
        if (/[\/]$/.test(path)) {
            await showEnties(root, path);
        } else {
            const base = path.replace(/[^\/]+$/, "");
            const entry = await root.getEntry(path);
            if (entry) showEntry(entry, base);
        }
    }
}

export async function showEnties(tree: GCF.Tree, path?: string) {
    if (path) {
        tree = await tree.getTree(path);
    } else {
        path = "";
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

function showHelp() {
    process.stderr.write(`  git-ls-tree-js [-C path] [<options>] <tree-ish> [<path>...]\n`);
}

if (!module.parent) CLI(process.argv.slice(2)).catch(console.error);
