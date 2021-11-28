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
        const commit = await repo.getCommit("HEAD");
        assert.equal(commit.getMessage(), "Empty\n");

        HEAD = commit.getId();
        assert.equal(typeof HEAD, "string");
        assert.equal(HEAD?.length, 40);

        const obj = await repo.getObject(HEAD);
        const {type} = obj;
        assert.equal(type, "commit");

        const file = await commit.getFile(`foo.txt`);
        assert.equal(file.mode.isFile, true);
        assert.equal(file.data + "", "Foo\n");
    });

    it(`Tree`, async () => {
        const commit = await repo.getCommit(HEAD);
        const treeId = commit.getMeta("tree");
        assert.equal(typeof treeId, "string");

        const tree = await repo.getTree(treeId);
        assert.ok(Array.isArray(await tree.getEntries()));

        const entry = await tree.getEntry(`bar/buz.txt`);
        assert.equal(entry.name, "buz.txt");
        assert.equal(entry.mode.isFile, true);

        const obj = await repo.getObject(entry.oid);
        const {data} = obj;
        assert.equal(data + "", "Buz\n");
    });
});
