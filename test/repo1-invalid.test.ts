/**
 * https://github.com/kawanet/git-cat-file
 */

import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {fileURLToPath} from "node:url"

import {openLocalRepo} from "../lib/index.ts"

const HERE = fileURLToPath(new URL(".", import.meta.url))
const TITLE = fileURLToPath(import.meta.url).split("/").pop()
const BASE = HERE.replace(/\/[^/]+\/?$/, "")

describe(TITLE, () => {
    it(`Repo`, async () => {
        const repo = openLocalRepo(`${BASE}/repo/not-found`)
        assert.ok(repo)

        const commit = await repo.getCommit("HEAD")
        assert.equal(commit, undefined)
    })

    it(`Commit`, async () => {
        const repo = openLocalRepo(`${BASE}/repo/repo1/.git`)
        assert.ok(repo)

        let commit = await repo.getCommit("not-found")
        assert.equal(commit, undefined)

        commit = await repo.getCommit("HEAD")
        assert.ok(commit)

        const file = await commit.getFile("not-found")
        assert.equal(file, undefined)
    })

    it(`Tree`, async () => {
        const repo = openLocalRepo(`${BASE}/repo/repo1/.git`)
        assert.ok(repo)

        let tree = await repo.getTree("000000")
        assert.equal(tree, undefined)

        const commit = await repo.getCommit("HEAD")
        assert.ok(commit)

        tree = await commit.getTree()
        assert.ok(tree)

        const entry = await tree.getEntry("not-found")
        assert.equal(entry, undefined)

        const entry2 = await tree.getEntry("not-found/not-found.txt")
        assert.equal(entry2, undefined)
    })
})
