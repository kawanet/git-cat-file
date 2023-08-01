#!/usr/bin/env bash -v

cd $(dirname $0)/..
/bin/rm -fr repo/repo3
mkdir -p repo/repo3
git -C repo/repo3 init -b main
cd repo/repo3
git config user.email "9765+kawanet@users.noreply.github.com"
git config user.name "git-cat-file"

git commit --allow-empty -m 'root'
git tag -a 'tag-root' -m 'tag Root'

git checkout -b branch1
git commit --allow-empty -m 'commit 1A'
git tag -a 'tag-1a' -m 'tag 1A'
git commit --allow-empty -m 'commit 1B'
git tag -a 'tag-1b' -m 'tag 1B'

git checkout main
git checkout -b branch2
git commit --allow-empty -m 'commit 2A'
git tag -a 'tag-2a' -m 'tag 2A'
git commit --allow-empty -m 'commit 2B'
git tag -a 'tag-2b' -m 'tag 2B'

git checkout main
git log --format=reference | cat
