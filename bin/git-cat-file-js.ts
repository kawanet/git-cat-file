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
import {showEnties} from "../lib/show-tree.ts"

const longParams = {
    help: true,
}

const shortParams = {
    C: "path", // change directory
    h: true, // show help
    p: true, // show object type
    t: true, // show object content
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
    const {h, t, p} = options.short
    const revision = options.args.shift()
    if (help || h || !revision || !(t || p)) {
        process.stderr.write(`Usage:\n`)
        showHelp()
        process.exit(1)
    }

    const repo = openLocalRepo(".")

    const {oid, type, data} = await repo.getObject(revision)
    if (t) {
        process.stdout.write(`${type}\n`)
        process.exit(0)
    }

    if (type === "tree") {
        const tree = await repo.getTree(oid)
        await showEnties(tree)
    } else {
        process.stdout.write(data)
    }
}

function showHelp() {
    process.stderr.write(`  git-cat-file-js [-C path] [-t | -p] <object>\n`)
}

CLI(process.argv.slice(2)).catch(console.error)
