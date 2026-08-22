import alias from "@rollup/plugin-alias"
import nodeResolve from "@rollup/plugin-node-resolve"
import sucrase from "@rollup/plugin-sucrase"
import type {Plugin, RollupOptions} from "rollup"
import {showFiles} from "./show-files.ts"

// Whether the source shebang survives the pipeline depends on unrelated
// details (sucrase eats it with the leading trivia of an elided type-only
// import). Strip it always, and let output.banner supply exactly one.
const stripShebang = (): Plugin => ({
    name: "strip-shebang",
    transform: (code) => code.replace(/^#![^\n]*/, ""),
})

// Builds each CLI into a plain-JS file under dist/, so the published bin
// entries run on any supported Node runtime without type-strip. The .mjs
// suffix keeps them ESM whatever package.json scope dist/ may carry.
// The three CLIs differ only by name, so one config maps over the list.
const cliConfig = (name: string): RollupOptions => ({
    input: `../bin/${name}.ts`,

    // Bare specifiers stay external; only relative paths are bundled.
    external: /^[^.\/]/,

    output: {
        file: `../dist/${name}.mjs`,
        format: "esm",
        // npm exposes bin entries as symlinks on POSIX, so the target
        // itself must carry the shebang to be executable from PATH.
        banner: "#!/usr/bin/env node",
    },

    plugins: [
        alias({
            entries: [
                // The CLI sources import the entry point by relative path so
                // they stay runnable on the .ts sources via type-strip during
                // development. Rewrite that to the package name here: it stays
                // external, and resolves through exports to dist/ at runtime.
                {find: /^(\.\.\/)+lib\/index\.ts$/, replacement: "git-cat-file"},
            ],
        }),

        nodeResolve({
            preferBuiltins: true,
        }),

        sucrase({
            disableESTransforms: true,
            exclude: ["node_modules/**"],
            transforms: ["typescript"],
        }),

        stripShebang(),

        showFiles(),
    ],
})

export default ["git-cat-file-js", "git-ls-tree-js", "git-rev-parse-js"].map(cliConfig)
