#!/usr/bin/env bash

cd $(dirname $0)/..
[ -d repo/repo1/.git ] || sh -v test/repo1-prepare.sh || exit 1
cd repo/repo1

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

test rev-parse HEAD

test cat-file -t HEAD
test cat-file -p HEAD

test ls-tree HEAD
test ls-tree HEAD foo.txt
test ls-tree HEAD bar
test ls-tree HEAD bar/
test ls-tree HEAD bar/buz.txt

test ls-tree HEAD qux/quux
test ls-tree HEAD qux/quux/
test ls-tree HEAD qux/quux/corge.txt

commit=$(git rev-parse HEAD^)
test cat-file -t $commit
test cat-file -p $commit

tree=$(git cat-file -p HEAD^ | grep ^tree | head -1 | cut -f 2 -d ' ')
test cat-file -t $tree
test cat-file -p $tree

blob=$(git ls-tree HEAD | grep 'foo.txt$' | cut -f 1 | cut -f 3 -d ' ')
test cat-file -t $blob
test cat-file -p $blob

short=$(echo $commit | cut -c 1-5)
test rev-parse $short

test rev-parse HEAD~
test rev-parse HEAD~~
test rev-parse HEAD~2
test rev-parse HEAD^
test rev-parse HEAD^^

echo "[PASS]"
