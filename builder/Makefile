# Force bash so `set -o pipefail` works in the recipes below.
SHELL := bash
.SHELLFLAGS := -eo pipefail -c

SRC   := $(wildcard ../lib/*.ts)
CLI_SRC := $(wildcard ../bin/*.ts)
TEST_SRC := $(wildcard ../test/*.test.ts)
TYPES := $(wildcard ../types/*.d.ts)
BUILDER_SRC := $(wildcard ./*.ts)

MJS_DST := ../dist/git-cat-file.mjs
CJS_DST := ../dist/git-cat-file.cjs
CLI_DST1 := ../dist/git-cat-file-js.mjs
CLI_DST2 := ../dist/git-ls-tree-js.mjs
CLI_DST3 := ../dist/git-rev-parse-js.mjs
CLI_DST := $(CLI_DST1) $(CLI_DST2) $(CLI_DST3)
TESTS_DST := ./tests/bundled.mjs

MJS_CONFIG := ./rollup-mjs.config.ts
CJS_CONFIG := ./rollup-cjs.config.ts
CLI_CONFIG := ./rollup-cli.config.ts
TESTS_CONFIG := ./rollup-tests.config.ts

# Each bundle should stay around 26 KB (lib/ + the two `dependencies` we
# externalise). Anything noticeably larger means an accidental bundling of
# Node built-ins or a transitive dep — fail the build so it cannot slip in.
MAX_BYTES := 30000

# Same purpose as the cap above: a jump past this means the test bundle
# accidentally inlined library sources or a dependency.
TEST_MAX_BYTES := 10000

ALL := $(MJS_DST) $(CJS_DST) $(CLI_DST)

# Build/test paths require Node's native TypeScript type-strip (default on
# Node 22.18+). Older runtimes (e.g. Node 20) report BUILDABLE=NO and can
# still verify pre-built bundles via the builder/pack targets.
BUILDABLE := $(shell node -e 'console.log(process.features.typescript ? "YES" : "NO")')

####

all: is-buildable $(ALL)

# Gate consumed by `all` and `npm prepack` so a build starts only where it
# can finish: with native type-strip and the devDependencies installed.
is-buildable:
	@ [ "$(BUILDABLE)" = "YES" ] && [ -f ../node_modules/.bin/rollup ]

# Inverse gate for `npm prepare`: a consumer install skips build/test and
# relies on prebuilt artifacts; contributors build on a capable runtime.
is-not-buildable:
	@ [ "$(BUILDABLE)" != "YES" ] || [ ! -f ../node_modules/.bin/rollup ]

$(MJS_DST): $(MJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

$(CJS_DST): $(CJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

# Plain-JS builds of the published bin entries. One rollup run emits
# all three; the recipe lives on the first CLI alone.
$(CLI_DST1): $(CLI_CONFIG) $(SRC) $(CLI_SRC) $(BUILDER_SRC)
	@mkdir -p ../dist
	../node_modules/.bin/rollup -c $(CLI_CONFIG)
	chmod a+x $(CLI_DST)
	@ls -l $@
	@echo ""

# The same rollup run above emits these too, so no second build
# command: the chain 1 -> 2 -> 3 keeps ordering, and ls fails
# loudly if a file is missing (recover: make clean).
$(CLI_DST2): $(CLI_DST1)
	@ls -l $@
	@echo ""

$(CLI_DST3): $(CLI_DST2)
	@ls -l $@
	@echo ""

# Plain-JS bundle of the test suites, importing the package by name.
# Runs against dist/ on any supported Node runtime without type-strip.
$(TESTS_DST): $(TESTS_CONFIG) $(SRC) $(BUILDER_SRC) $(TEST_SRC) $(MJS_DST)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(TEST_MAX_BYTES) || { echo "ERROR: $@ exceeds $(TEST_MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

####

# Consumer `npm install` skips the heavy test-full step to keep install fast.
# `npm pack` re-runs prepare for a fresh build; tests are skipped there too
# because CI runs them explicitly around the pack, while `npm publish`
# reports npm_command=publish and still gets the full run.
test:
	@case "$$npm_command" in \
		install|ci|pack) echo "npm $$npm_command detected: skipping full tests." ;; \
		*) $(MAKE) test-full ;; \
	esac

test-full: all
	cd .. && node_modules/.bin/tsc --noEmit
	cd .. && node_modules/.bin/ts-refine format --check && node_modules/.bin/ts-refine imports --check
	cd .. && rm -rf repo/ && sh test/repo1-prepare.sh && sh test/repo2-prepare.sh && sh test/repo3-prepare.sh && bash test/repo4-prepare.sh
	cd .. && sh test/repo1-test.sh && sh test/repo2-test.sh && sh test/repo3-test.sh
	cd .. && node --test test/*.test.ts

####

clean:
	/bin/rm -fr $(ALL) $(TESTS_DST)

.PHONY: all clean test test-full is-buildable is-not-buildable
