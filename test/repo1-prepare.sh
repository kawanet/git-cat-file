#!/usr/bin/env bash -v

cd $(dirname $0)/..
/bin/rm -fr repo/repo1
mkdir -p repo/repo1
git -C repo/repo1 init
cd repo/repo1
git commit --allow-empty -m 'root commit'
echo Foo > foo.txt
git add foo.txt
git commit -m Foo
mkdir bar
echo Buz > bar/buz.txt
git add bar/buz.txt
git commit -m Buz
git gc
mkdir qux
mkdir qux/quux
echo Corge > qux/quux/corge.txt
git add qux/quux/corge.txt
git commit -m Corge
touch empty.txt
git add empty.txt
git commit -m Empty
git log
