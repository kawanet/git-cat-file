# git-cat-file

[![Node.js CI](https://github.com/kawanet/git-cat-file/workflows/Node.js%20CI/badge.svg?branch=main)](https://github.com/kawanet/git-cat-file/actions/)
[![npm version](https://img.shields.io/npm/v/git-cat-file)](https://www.npmjs.com/package/git-cat-file)

`git cat-file -p` for node.js

## SYNOPSIS

```js
const {openLocalRepo} = require("git-cat-file");

async function showFile(revision, path) {
  const repo = openLocalRepo(".");
  const commitId = await repo.findCommitId(revision);
  const commit = await repo.getCommit(commitId);
  const file = await commit.getFile(path);
  process.stdout.write(file.data);
}

showFile("HEAD", "path/to/file.txt");
```

## CLI

```sh
./node_modules/.bin/git-js

Usage:
  git-js [-C path] cat-file [-t | -p] <object>
  git-js [-C path] ls-tree [<options>] <tree-ish> [<path>...]
  git-js [-C path] rev-parse <args>...
```

## LINKS

- https://github.com/kawanet/git-cat-file
- https://www.npmjs.com/package/git-cat-file
