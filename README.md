# git-cat-file

[![Node.js CI](https://github.com/kawanet/git-cat-file/workflows/Node.js%20CI/badge.svg?branch=main)](https://github.com/kawanet/git-cat-file/actions/)
[![npm version](https://img.shields.io/npm/v/git-cat-file)](https://www.npmjs.com/package/git-cat-file)

Pure JavaScript `git cat-file -p` for node.js

## SYNOPSIS

```js
const {openLocalRepo} = require("git-cat-file");

async function catFile(revision, path) {
  const repo = openLocalRepo("repository/.git");
  const commit = await repo.getCommit(revision);
  const file = await commit.getFile(path);
  process.stdout.write(file.data);
}

catFile("HEAD", "path/to/file.txt");
```

## CLI

```sh
Usage:
  git-cat-file-js [-C path] [-t | -p] <object>
  git-ls-tree-js [-C path] [<options>] <tree-ish> [<path>...]
  git-rev-parse-js [-C path] <args>...
```

Bundled CLI commands are also available via the `git` command. 

```sh
npm install git-cat-file
export PATH=node_modules/.bin:$PATH
git cat-file-js [-t | -p] <object>
git ls-tree-js [<options>] <tree-ish> [<path>...]
git rev-parse-js <args>...
```

## LINKS

- https://github.com/kawanet/git-cat-file
- https://www.npmjs.com/package/git-cat-file
- https://www.npmjs.com/package/serve-static-git
