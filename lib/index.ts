/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

import {Repo} from "./repo";

export function openLocalRepo(path: string): GCF.Repo {
    return new Repo(path);
}
