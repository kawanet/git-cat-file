#!/usr/bin/env bash -c make

all: lib/index.js

clean:
	/bin/rm -f bin/*.js bin/cmd/*.js lib/*.js test/*.js
	/bin/rm -fr repo/repo1

test: all test-prepare
	sh ./test/repo1-test.sh
	make mocha

test-prepare: repo/repo1/.git

repo/repo1/.git:
	sh ./test/repo1-prepare.sh

./node_modules/.bin/tsc:
	npm install

./node_modules/.bin/mocha:
	npm install

lib/%.js: lib/%.ts ./node_modules/.bin/tsc
	./node_modules/.bin/tsc -p .

test/%.js: test/%.ts ./node_modules/.bin/tsc
	./node_modules/.bin/tsc -p .

mocha: test-prepare ./node_modules/.bin/mocha test/repo1-test.js
	./node_modules/.bin/mocha test

.PHONY: all clean test
