/**
 * Pure parser tests for multi-line continuation headers (`gpgsig`,
 * `mergetag`). The fixtures are hand-crafted commit object payloads, so
 * the suite has no dependency on `ssh-keygen`, `gpg`, or any installed
 * git plumbing — it runs anywhere Node 22 does.
 */

import {strict as assert} from "node:assert"
import {test} from "node:test"

import {Commit} from "../lib/commit.ts"
import type {GCF} from "../types/git-cat-file.d.ts"

// Only a truly empty line ends the header section; space-prefixed lines
// are RFC 822 continuations of the preceding header.
const SIGNED_COMMIT = [
    "tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904",
    "parent 0123456789abcdef0123456789abcdef01234567",
    "author Test User <test@example.com> 1700000000 +0900",
    "committer Test User <test@example.com> 1700000000 +0900",
    "gpgsig -----BEGIN SSH SIGNATURE-----",
    " U1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAg",
    " 0123456789abcdef0123456789abcdef0123456789ab",
    " -----END SSH SIGNATURE-----",
    "",
    "Subject line",
    "",
    "Body paragraph spanning",
    "two lines.",
    "",
].join("\n")

const MERGE_WITH_MERGETAG = [
    "tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904",
    "parent 1111111111111111111111111111111111111111",
    "parent 2222222222222222222222222222222222222222",
    "author Test User <test@example.com> 1700000000 +0900",
    "committer Test User <test@example.com> 1700000000 +0900",
    "mergetag object 2222222222222222222222222222222222222222",
    " type commit",
    " tag v1",
    " tagger Test User <test@example.com> 1700000000 +0900",
    " ",
    " tag message",
    " -----BEGIN SSH SIGNATURE-----",
    " AAAAaaaaBBBBbbbbCCCCccccDDDDddddEEEEeeeeFFFF",
    " -----END SSH SIGNATURE-----",
    "",
    "Merge tag 'v1'",
    "",
].join("\n")

// parseMeta never touches the store, so a null is enough for these tests.
const fakeStore = null as never

const buildCommit = (data: string): Commit => {
    const obj: GCF.IObject = {oid: "deadbeef", type: "commit", data: Buffer.from(data)}
    return new Commit(obj, fakeStore)
}

test("gpgsig: multi-line continuation does not bleed into the message body", () => {
    const commit = buildCommit(SIGNED_COMMIT)

    assert.equal(commit.getMessage(), "Subject line\n\nBody paragraph spanning\ntwo lines.\n")
})

test("gpgsig: the full signature block is recovered as a single header value", () => {
    const commit = buildCommit(SIGNED_COMMIT)

    const expected = [
        "-----BEGIN SSH SIGNATURE-----",
        "U1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAg",
        "0123456789abcdef0123456789abcdef0123456789ab",
        "-----END SSH SIGNATURE-----",
    ].join("\n")

    assert.equal(commit.getMeta("gpgsig"), expected)
})

test("gpgsig: single-line headers around the signature are unaffected", () => {
    const commit = buildCommit(SIGNED_COMMIT)

    assert.equal(commit.getMeta("tree"), "4b825dc642cb6eb9a060e54bf8d69288fbee4904")
    assert.equal(commit.getMeta("parent"), "0123456789abcdef0123456789abcdef01234567")
    assert.equal(commit.getMeta("author"), "Test User <test@example.com> 1700000000 +0900")
    assert.equal(commit.getMeta("committer"), "Test User <test@example.com> 1700000000 +0900")
})

test("mergetag: the embedded tag object is recovered as a single header value", () => {
    const commit = buildCommit(MERGE_WITH_MERGETAG)

    const expected = [
        "object 2222222222222222222222222222222222222222",
        "type commit",
        "tag v1",
        "tagger Test User <test@example.com> 1700000000 +0900",
        "",
        "tag message",
        "-----BEGIN SSH SIGNATURE-----",
        "AAAAaaaaBBBBbbbbCCCCccccDDDDddddEEEEeeeeFFFF",
        "-----END SSH SIGNATURE-----",
    ].join("\n")

    assert.equal(commit.getMeta("mergetag"), expected)
})

test("mergetag: the merge commit's own message is just the merge subject", () => {
    const commit = buildCommit(MERGE_WITH_MERGETAG)

    assert.equal(commit.getMessage(), "Merge tag 'v1'\n")
})

test("mergetag: both parents of the merge commit are listed", () => {
    const commit = buildCommit(MERGE_WITH_MERGETAG)

    assert.deepEqual(
        commit["getMetaArray"]("parent" as never),
        ["1111111111111111111111111111111111111111", "2222222222222222222222222222222222222222"],
    )
})
