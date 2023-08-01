#!/usr/bin/env bash

cd $(dirname $0)/..
[ -d repo/repo3/.git ] || sh -v test/repo3-prepare.sh || exit 1
cd repo/repo3

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

test rev-parse tag-root
test rev-parse tag-1a
test rev-parse tag-1b
test rev-parse tag-1b^
test rev-parse tag-1b^^
test rev-parse tag-2a
test rev-parse tag-2b
test rev-parse tag-2b~1
test rev-parse tag-2b~2

echo "[PASS]"
