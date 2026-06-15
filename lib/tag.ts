/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "../types/git-cat-file.d.ts"
import {ObjItem} from "./obj-item.ts"
import type {ObjStore} from "./obj-store.ts"

export class Tag extends ObjItem<GCF.TagMeta> implements GCF.Tag {
    constructor(obj: GCF.IObject, store: ObjStore) {
        super(obj, store)

        if (obj.type !== "tag") {
            throw new TypeError(`Invalid tag object: ${obj.oid} (${obj.type})`)
        }
    }

    getDate(): Date {
        const tagger = this.getMeta("tagger")
        const match = tagger?.match(/\s+(\d+)(\s+[+\-]\d+)?$/)
        if (match) return new Date(+match[1] * 1000)
    }
}
