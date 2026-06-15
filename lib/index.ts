/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "../types/git-cat-file.d.ts"
import {Repo} from "./repo.ts"

export function openLocalRepo(path: string): GCF.Repo {
    return new Repo(path)
}
