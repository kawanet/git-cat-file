#!/usr/bin/env node

/**
 * https://github.com/kawanet/git-cat-file
 *
 * Executed directly by Node via its built-in TypeScript type-stripping
 * (Node >= 22). No bundling step is involved for CLI entry points.
 */

import {promises as fs} from "node:fs"

import {parseOptions} from "../lib/cli-lib.ts"
import {openLocalRepo} from "../lib/index.ts"
import {showEnties, showEntry} from "../lib/show-tree.ts"

const longParams = {
    help: true,
}

const shortParams = {
    C: "path", // change directory
    h: true, // show help
}

async function CLI(args: string[]) {
    const options = parseOptions({
        long: longParams,
        short: shortParams,
        args: args,
    })
    args = options.args

    const {C} = options.short
    if (C) process.chdir(C)

    if (await fs.readdir(".git").catch((): null => null)) {
        process.chdir(".git")
    }

    const {help} = options.long
    const {h} = options.short
    const revision = args.shift()
    if (help || h || !revision) {
        process.stderr.write(`Usage:\n`)
        showHelp()
        process.exit(1)
    }

    const repo = openLocalRepo(".")

    const obj = await repo.getObject(revision)
    let {oid, type} = obj

    if (type === "commit") {
        const commit = await repo.getCommit(oid)
        oid = commit.getMeta("tree")
        const obj = await repo.getObject(oid)
        type = obj.type
    }

    if (type !== "tree") {
        throw new TypeError(`Invalid tree-ish: ${revision} (${type})`)
    }

    const root = await repo.getTree(oid)

    if (!args.length) {
        return showEnties(root)
    }

    for (const path of args) {
        if (/[\/]$/.test(path)) {
            await showEnties(root, path)
        } else {
            const base = path.replace(/[^\/]+$/, "")
            const entry = await root.getEntry(path)
            if (entry) showEntry(entry, base)
        }
    }
}

function showHelp() {
    process.stderr.write(`  git-ls-tree-js [-C path] [<options>] <tree-ish> [<path>...]\n`)
}

CLI(process.argv.slice(2)).catch(console.error)
