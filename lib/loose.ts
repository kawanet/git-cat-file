/**
 * https://github.com/kawanet/git-cat-file
 */

import {promises as fs} from "fs"
import {inflateSync} from "zlib"
import type {GCF} from "../types/git-cat-file.d.ts"
import {shortCache} from "./cache.ts"

export class Loose {
    protected readonly root: string

    constructor(root: string) {
        this.root = root
    }

    private readdir = shortCache((first: string) => fs.readdir(`${this.root}/objects/${first}`))

    async findAll(object_id: string): Promise<string[]> {
        const first = object_id.slice(0, 2)
        const rest = object_id.slice(2)
        const {length} = rest
        const files: string[] = await this.readdir(first).catch((): null => null)
        if (!files) return
        return files.filter(name => name.slice(0, length) === rest).map(name => (first + name))
    }

    async getObject(oid: string): Promise<GCF.IObject> {
        const first = oid.slice(0, 2)
        const rest = oid.slice(2)
        const obj = new LooseObject(`${this.root}/objects/${first}/${rest}`)
        const type = await obj.getType()
        const data = await obj.getData()
        return {oid, type, data}
    }
}

function findZero(buf: Buffer, offset?: number): number {
    offset |= 0
    while (buf[offset++]) {
        // nop
    }
    return offset
}

class LooseObject {
    private buf: Promise<Buffer>
    private offset: Promise<number>
    private type: Promise<GCF.ObjType>
    private readonly path: string

    constructor(path: string) {
        this.path = path
    }

    private getRaw(): Promise<Buffer> {
        return this.buf || (this.buf = fs.readFile(this.path).then(inflateSync))
    }

    private getOffset(): Promise<number> {
        return this.offset || (this.offset = this.getRaw().then(findZero))
    }

    getType(): Promise<GCF.ObjType> {
        return this.type || (this.type = this.parseType())
    }

    private async parseType(): Promise<GCF.ObjType> {
        const raw = await this.getRaw()
        const offset = await this.getOffset()
        const head = raw.slice(0, offset - 2).toString()
        return head.split(/\s+/).shift() as GCF.ObjType
    }

    async getData(): Promise<Buffer> {
        const raw = await this.getRaw()
        const offset = await this.getOffset()
        return raw.slice(offset)
    }
}