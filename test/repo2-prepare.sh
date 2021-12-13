#!/usr/bin/env bash -v

cd $(dirname $0)/..
/bin/rm -fr repo/repo2
mkdir -p repo/repo2
git -C repo/repo2 init -b main
cd repo/repo2
git config user.email "9765+kawanet@users.noreply.github.com"
git config user.name "git-cat-file"

git commit --allow-empty -m 'root'

git checkout main
git checkout -b branch1
git commit --allow-empty -m 'commit 1A'
git commit --allow-empty -m 'commit 1B'

git checkout main
git checkout -b branch2
git commit --allow-empty -m 'commit 2A'
git commit --allow-empty -m 'commit 2B'

git checkout main
git checkout -b branch3
git commit --allow-empty -m 'commit 3A'
git commit --allow-empty -m 'commit 3B'

git checkout main
git merge branch1 branch2 branch3 -m 'merged'
rm -f
git log --format=reference | cat
