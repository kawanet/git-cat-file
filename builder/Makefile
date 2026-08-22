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
TESTS_DST := ../builder/tests/bundled.js

MJS_CONFIG := ./rollup-mjs.config.ts
CJS_CONFIG := ./rollup-cjs.config.ts
CLI_CONFIG := ./rollup-cli.config.ts
TESTS_CONFIG := ./rollup-tests.config.ts

# Each bundle should stay around 26 KB (lib/ + the two `dependencies` we
# externalise). Anything noticeably larger means an accidental bundling of
# Node built-ins or a transitive dep — fail the build so it cannot slip in.
MAX_BYTES := 30000

NAMED_EXPORTS := openLocalRepo

ALL := $(MJS_DST) $(CJS_DST) $(CLI_DST) $(TESTS_DST)

# Build/test paths require Node's native TypeScript type-strip (default on
# Node 22.18+). Older runtimes (e.g. Node 20) report BUILDABLE=NO and can
# still verify pre-built bundles via `make smoke`.
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
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@ls -l $@
	@echo ""

$(CJS_DST): $(CJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@ls -l $@
	@echo ""

# Plain-JS builds of the published bin entries. One rollup run emits
# all three, so the recipe lives on the first CLI alone: grouped
# targets (&:) would say this directly but need GNU make 4.3, and the
# parse error on older make -- macOS ships 3.81 -- kills every target.
$(CLI_DST1): $(CLI_CONFIG) $(SRC) $(CLI_SRC) $(BUILDER_SRC)
	@mkdir -p ../dist
	../node_modules/.bin/rollup -c $(CLI_CONFIG)
	@ls -l $(CLI_DST)
	@echo ""

# The others track the chain 1 -> 2 -> 3, so recovery of several
# missing files stays serialized even under `make -j`; the guard
# re-runs rollup only when its own file went missing.
$(CLI_DST2): $(CLI_DST1)
	@test -f $@ || ../node_modules/.bin/rollup -c $(CLI_CONFIG)

$(CLI_DST3): $(CLI_DST2)
	@test -f $@ || ../node_modules/.bin/rollup -c $(CLI_CONFIG)

# Plain-JS bundle of the test suites, importing the package by name.
# Runs against dist/ on any supported Node runtime without type-strip.
$(TESTS_DST): $(TESTS_CONFIG) $(SRC) $(BUILDER_SRC) $(TEST_SRC) $(MJS_DST)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@echo ""

# Verify the bundles by importing/requiring the package itself.
# This ensures the public entrypoints (exports/main) are correctly configured.
# Note: process.argv.slice(1) is used because `node -e 'code' arg1 arg2`
# results in process.argv = ['node', 'arg1', 'arg2'].
smoke: smoke-mjs smoke-cjs

# MJS smoke test via public entrypoint.
smoke-mjs: $(MJS_DST)
	cd .. && node --input-type=module -e 'const m = await import("git-cat-file"); for (const k of process.argv.slice(1)) { if (typeof m[k] !== "function") { console.error("missing MJS export:", k); process.exit(1); } console.log("MJS export OK:", k); }' $(NAMED_EXPORTS)

# CJS smoke test via public entrypoint.
smoke-cjs: $(CJS_DST)
	cd .. && node --input-type=commonjs -e 'const m = require("git-cat-file"); for (const k of process.argv.slice(1)) { if (typeof m[k] !== "function") { console.error("missing CJS export:", k); process.exit(1); } console.log("CJS export OK:", k); }' $(NAMED_EXPORTS)

####

# Consumer `npm install` and `npm ci` skip the heavy test-full step.
# CI re-runs `npm test` explicitly so the validation appears in logs.
test:
	@case "$$npm_command" in \
		install|ci) echo "npm $$npm_command detected: skipping full tests." ;; \
		*) $(MAKE) test-full ;; \
	esac

test-full: all smoke
	cd .. && node_modules/.bin/tsc --noEmit
	cd .. && node_modules/.bin/ts-refine format --check && node_modules/.bin/ts-refine imports --check
	cd .. && rm -rf repo/ && sh test/repo1-prepare.sh && sh test/repo2-prepare.sh && sh test/repo3-prepare.sh && bash test/repo4-prepare.sh
	cd .. && sh test/repo1-test.sh && sh test/repo2-test.sh && sh test/repo3-test.sh
	cd .. && node --test test/*.test.ts

clean:
	/bin/rm -fr $(ALL)

.PHONY: all clean test smoke test-full is-buildable is-not-buildable smoke-mjs smoke-cjs
