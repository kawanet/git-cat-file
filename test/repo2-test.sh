#!/usr/bin/env bash

cd $(dirname $0)/..
[ -d repo/repo2/.git ] || sh -v test/repo2-prepare.sh || exit 1
cd repo/repo2

test() {
  cmd=$1
  shift
  echo "$ git $cmd $*" >&2
  git $cmd $* | tee git-native.log || exit 1
  echo "" >&2
  echo "$ node git-$cmd-js $*" >&2
  node ../../bin/git-$cmd-js $* | tee git-js.log || exit 2
  echo "" >&2
  diff git-native.log git-js.log || exit 3
}

# https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection#_ancestry_references
test rev-parse HEAD
test rev-parse HEAD~
test rev-parse HEAD~~
test rev-parse HEAD~~~

test rev-parse HEAD~1
test rev-parse HEAD~2
test rev-parse HEAD~3

test rev-parse HEAD^
test rev-parse HEAD^^
test rev-parse HEAD^^^

test rev-parse HEAD^1
test rev-parse HEAD^2
test rev-parse HEAD^3

test rev-parse HEAD^1~1
test rev-parse HEAD~1^1

test rev-parse branch1
test rev-parse branch2
test rev-parse branch3

test rev-parse branch1^
test rev-parse branch2~

test rev-parse branch1^1~1
test rev-parse branch2~1^1

echo "[PASS]"
