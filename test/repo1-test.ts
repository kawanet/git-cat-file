#!/usr/bin/env mocha -R spec

import {strict as assert} from "assert";
import {GCF, openLocalRepo} from "..";

const BASE = __dirname.replace(/\/[^/]+\/?$/, "");
const TITLE = __filename.split("/").pop();

describe(TITLE, () => {
    let repo: GCF.Repo;
    let HEAD: string;

    it(`Repo`, async () => {
        repo = openLocalRepo(`${BASE}/repo/repo1`);
        assert.ok(repo);
    });

    it(`Commit`, async () => {
        HEAD = await repo.findCommitId("HEAD");
        assert.equal(typeof HEAD, "string");
        assert.equal(HEAD?.length, 40);

        const type = await repo.getType(HEAD);
        assert.equal(type, "commit");

        const commit = repo.getCommit(HEAD);
        assert.equal(await commit.getMessage(), "Empty\n");

        const file = await commit.getFile(`foo.txt`);
        assert.equal(file.mode.isFile, true);
        assert.equal(file.data + "", "Foo\n");
    });

    it(`Tree`, async () => {
        const commit = repo.getCommit(HEAD);
        const tree = repo.getTree(await commit.getMeta("tree"));
        assert.ok(Array.isArray(await tree.getEntries()));

        const entry = await tree.getEntry(`bar/buz.txt`);
        assert.equal(entry.name, "buz.txt");
        assert.equal(entry.mode.isFile, true);

        const data = await repo.getObject(entry.oid);
        assert.equal(data + "", "Buz\n");
    });
});
