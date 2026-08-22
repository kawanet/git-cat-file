import {strict as assert} from "node:assert"
import {createRequire} from "node:module"
import {test} from "node:test"

const require = createRequire(import.meta.url)

// The rest of the suite reaches the package through the exports "import"
// condition alone; this covers the require path the same way a CommonJS
// consumer does.
test("require entry (.cjs)", () => {
    const m = require("git-cat-file")
    assert.equal(typeof m.openLocalRepo, "function")
})
