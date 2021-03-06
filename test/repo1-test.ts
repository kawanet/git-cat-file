#!/usr/bin/env mocha -R spec

import {strict as assert} from "assert";
import {GCF, openLocalRepo} from "..";

const BASE = __dirname.replace(/\/[^/]+\/?$/, "");
const TITLE = __filename.split("/").pop();

describe(TITLE, () => {
    let repo: GCF.Repo;
    let HEAD: string;

    it(`Repo`, async () => {
        repo = openLocalRepo(`${BASE}/repo/repo1/.git`);
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

        const parents = await commit.getParents();
        assert.equal(parents.length, 1);

        const author = commit.getMeta("author");
        assert.ok(author);

        const date = commit.getDate();
        assert.ok(date instanceof Date);
        assert.ok(+date < +Date.now()); // past
        assert.ok(date.getFullYear() >= 2000);
    });

    it(`Tree`, async () => {
        const commit = await repo.getCommit(HEAD);
        const treeId = commit.getMeta("tree");
        assert.equal(typeof treeId, "string");

        const tree = await repo.getTree(treeId);
        assert.ok(Array.isArray(await tree.getEntries()));

        assert.equal(typeof tree.getId(), "string");

        const entry = await tree.getEntry(`bar/buz.txt`);
        assert.equal(entry.name, "buz.txt");
        assert.equal(entry.mode.isFile, true);

        const obj = await repo.getObject(entry.oid);
        const {data} = obj;
        assert.equal(data + "", "Buz\n");
    });
});
