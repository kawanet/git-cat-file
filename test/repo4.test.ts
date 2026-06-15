/**
 * https://github.com/kawanet/git-cat-file
 *
 * End-to-end coverage for the multi-line continuation header parser:
 * walk over the SSH-signed fixture repository built by repo4-prepare.sh
 * and assert that real `gpgsig` and `mergetag` blocks come back intact
 * without leaking into the message body. Skipped automatically when
 * repo/repo4 was not produced (e.g. on an environment without
 * `ssh-keygen`).
 */

import {strict as assert} from "node:assert"
import {existsSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {describe, it} from "node:test"

import {openLocalRepo} from "../lib/index.ts"
import type {GCF} from "../types/git-cat-file.d.ts"

const HERE = fileURLToPath(new URL(".", import.meta.url))
const TITLE = fileURLToPath(import.meta.url).split("/").pop()
const BASE = HERE.replace(/\/[^/]+\/?$/, "")
const REPO = `${BASE}/repo/repo4`

const SSH_BEGIN = "-----BEGIN SSH SIGNATURE-----"
const SSH_END = "-----END SSH SIGNATURE-----"

describe(TITLE, {skip: !existsSync(`${REPO}/.git`) && "repo/repo4 not built — likely no ssh-keygen"}, () => {
    let repo: GCF.Repo

    it(`Repo`, () => {
        repo = openLocalRepo(`${REPO}/.git`)
        assert.ok(repo)
    })

    it(`signed empty commit: gpgsig is recovered, message is just the subject`, async () => {
        // Walk back to the root commit (signed, empty body).
        let commit = await repo.getCommit("HEAD")
        while (true) {
            const parents = await commit.getParents()
            if (!parents || !parents.length) break
            commit = parents[0]
        }

        assert.equal(commit.getMessage(), "signed empty\n")

        const sig = commit.getMeta("gpgsig")
        assert.ok(sig?.startsWith(SSH_BEGIN), `gpgsig should start with ${SSH_BEGIN}`)
        assert.ok(sig?.endsWith(SSH_END), `gpgsig should end with ${SSH_END}`)
        assert.ok(sig?.split("\n").length >= 4, "gpgsig should span multiple lines")
    })

    it(`signed normal commit: body and signature are cleanly separated`, async () => {
        // The "Foo" commit sits one above the root (HEAD~2 in the merge layout).
        const head = await repo.getCommit("HEAD")
        const parents = await head.getParents()
        assert.ok(parents?.length, "HEAD should have at least one parent in the merge fixture")
        const fooCommit = parents[0]

        assert.equal(fooCommit.getMessage(), "Foo\n")

        const sig = fooCommit.getMeta("gpgsig")
        assert.ok(sig?.startsWith(SSH_BEGIN))
        assert.ok(sig?.endsWith(SSH_END))

        const file = await fooCommit.getFile("foo.txt")
        assert.equal(file.data + "", "Foo\n")
    })

    it(`merge commit: mergetag is recovered as a single block, body is just the merge subject`, async () => {
        const merge = await repo.getCommit("HEAD")

        assert.equal(merge.getMessage(), "merge tag v1\n")

        const parents = await merge.getParents()
        assert.equal(parents.length, 2)

        const tagBlock = merge.getMeta("mergetag")
        assert.ok(tagBlock, "mergetag header should be present")
        assert.match(tagBlock, /^object [0-9a-f]{40}\ntype commit\ntag v1\n/)
        assert.ok(tagBlock.includes("\ntag v1 message\n"), "tag message should be preserved")
        assert.ok(tagBlock.includes(SSH_BEGIN), "embedded tag signature should survive")
        assert.ok(tagBlock.endsWith(SSH_END), "mergetag block should end with the signature trailer")

        // The merge commit itself is also signed.
        const sig = merge.getMeta("gpgsig")
        assert.ok(sig?.startsWith(SSH_BEGIN))
        assert.ok(sig?.endsWith(SSH_END))
    })
})
