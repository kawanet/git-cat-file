# Force bash so `set -o pipefail` works in the recipes below.
SHELL := bash
.SHELLFLAGS := -eo pipefail -c

# Root of the copy under test: the installed package after `unpack`, or
# the checkout itself (PKG_ROOT=.) for the publish gate, which runs the
# staged artifacts in place without installing anything.
PKG_ROOT ?= node_modules/git-cat-file

# A target name in builder/, not a path from here.
TESTS_DST := ./tests/bundled.mjs

# The workflows drive these steps in order:
#   nodejs.yml   pack bundled unpack test
#   publish.yml  bundled test-dist

# Package-side lifecycle: `pack` builds the tarball (renamed to the fixed
# packed.tgz), `unpack` installs it (--no-save also works in a checkout),
# `test` exercises it. Build `bundled` only after `pack`: npm pack runs
# prepare, whose clean wipes the generated test bundle.
all: pack

pack: clean
	cd ../.. && npm pack --pack-destination builder/pack
	mv *-*.*.*.tgz packed.tgz

bundled:
	$(MAKE) -C .. $(TESTS_DST)

# The lane has no manifest, so the test-only peers the suites need come
# from builder/pack/package.json. It names no package and declares no
# exports, which is what keeps a self-reference from beating node_modules.
# A checkout has its own manifest and keeps it.
unpack:
	[ -e ../../package.json ] || cp package.json ../../
	cd ../.. && npm install ./builder/pack/packed.tgz --no-audit --no-fund --no-save

test: test-bundled test-bin test-cli

# The suites read throwaway repositories under repo/ that these scripts
# build from scratch, so the artifact ships them and a lane rebuilds the
# same fixture with no checkout. The interpreter is named explicitly:
# upload-artifact does not preserve the executable bit.
fixture:
	cd ../.. && sh test/repo1-prepare.sh
	cd ../.. && bash test/repo4-prepare.sh

# Resolves through node_modules after `unpack`; inside a checkout the
# package name self-references dist/ instead.
test-bundled: fixture
	cd ../.. && node --test builder/tests/bundled.mjs

# npm accepts a broken bin mapping silently -- the .bin link is just
# never created -- so assert the link exists, resolves and is executable.
# Launching the file itself is test-cli's job.
test-bin:
	[ -x ../../node_modules/.bin/git-cat-file-js ]
	[ -x ../../node_modules/.bin/git-ls-tree-js ]
	[ -x ../../node_modules/.bin/git-rev-parse-js ]

# The three CLIs end to end -- shebang, executable bit and real output
# read back from the fixture -- against $(PKG_ROOT), so they also run
# with no install involved.
test-cli: fixture
	cd ../.. && ./$(PKG_ROOT)/dist/git-rev-parse-js.mjs -C repo/repo1 HEAD | grep -qE '^[0-9a-f]{40}$$'
	cd ../.. && ./$(PKG_ROOT)/dist/git-cat-file-js.mjs -C repo/repo1 -t HEAD | grep -qx commit
	cd ../.. && ./$(PKG_ROOT)/dist/git-ls-tree-js.mjs -C repo/repo1 HEAD foo.txt | grep -q foo.txt

# Publish gate: the same behavior checks, run against the checkout's own
# staged artifacts in place -- no tarball install involved.
test-dist:
	$(MAKE) test-bundled test-cli PKG_ROOT=.

clean:
	/bin/rm -f *.tgz

.PHONY: all pack bundled unpack test fixture test-bundled test-bin test-cli test-dist clean
