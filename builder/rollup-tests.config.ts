import alias from "@rollup/plugin-alias"
import multiEntry from "@rollup/plugin-multi-entry"
import nodeResolve from "@rollup/plugin-node-resolve"
import sucrase from "@rollup/plugin-sucrase"
import type {RollupOptions} from "rollup"
import {showFiles} from "./show-files.ts"

// Bundles the test suites into a single plain-JS file, so any supported
// Node.js runtime can run them against dist/ without needing type-strip.
const rollupConfig: RollupOptions = {
    // multi-line-header tests the internal Commit class, which the public
    // entry point does not export, so it stays a source-only suite.
    input: ["../test/*.test.ts", "!../test/multi-line-header.test.ts"],

    // Bare specifiers stay external; only relative paths are bundled.
    external: /^[^.\/]/,

    output: {
        file: "./tests/bundled.js",
        format: "esm",
    },

    treeshake: false,

    plugins: [
        alias({
            entries: [
                // The suites import the entry point by relative path so they
                // run on the .ts sources directly during development. Rewrite
                // that to the package name here: it stays external, and the
                // bundle resolves it through exports to dist/ at runtime.
                {find: /^(\.\.\/)+lib\/index\.ts$/, replacement: "git-cat-file"},
            ],
        }),

        multiEntry(),

        nodeResolve({
            preferBuiltins: true,
        }),

        sucrase({
            disableESTransforms: true,
            exclude: ["node_modules/**"],
            transforms: ["typescript"],
        }),

        showFiles(),
    ],
}

export default rollupConfig
