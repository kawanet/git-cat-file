/**
 * https://github.com/kawanet/git-cat-file
 *
 * @see https://github.com/git/git/blob/master/Documentation/technical/pack-format.txt
 */

import {promises as fs} from "fs";
import {inflateSync} from "zlib";
import type {GCF} from "..";

const enum TypeBit {
    OBJ_COMMIT = 1,
    OBJ_TREE = 2,
    OBJ_BLOB = 3,
    OBJ_TAG = 4,
    OBJ_OFS_DELTA = 6,
    OBJ_REF_DELTA = 7,
}

const typeNames: GCF.ObjType[] = [null, "commit", "tree", "blob", "tag"];
const deltaTypes = {6: "OBJ_OFS_DELTA", 7: "OBJ_REF_DELTA"};
// const toHex = (buf: Buffer) => buf.toString("hex").replace(/(\w.)(?=\w)/g, "$1 ");

export async function readPackedObject(fh: fs.FileHandle, start: number, repo: GCF.Repo): Promise<GCF.ObjItem> {
    const buffer = Buffer.alloc(28);
    await fh.read({buffer, position: start});
    // console.warn(`read: ${start} (${toHex(buffer)})`);

    let pos = 0;
    let c = buffer[pos++];

    const typeBit = (c & 0x70) >> 4;
    const type = typeNames[typeBit];
    const deltaType = deltaTypes[typeBit as keyof typeof deltaTypes] || type;
    // console.warn(`type: ${typeBit} (${deltaType})`);
    if (!deltaType) throw new TypeError(`Invalid type: ${typeBit}`);

    let size = c & 0x0F;
    {
        let shift = 4;
        while (c & 0x80) {
            c = buffer[pos++];
            size += ((c & 0x7F) << shift);
            shift += 7;
        }
    }
    // console.warn(`size: ${size} bytes`);

    if (typeBit === TypeBit.OBJ_OFS_DELTA) {
        let c = buffer[pos++];
        let base_offset = c & 0x7F;
        while (c & 0x80) {
            base_offset += 1; // see unpack-objects.c
            c = buffer[pos++];
            base_offset = (base_offset << 7) + (c & 0x7F);
        }

        if (start < base_offset) {
            throw new RangeError(`offset value out of bound: ${start} < ${base_offset}`);
        }

        // console.warn(`delta: ${start} + ${pos}`);
        const delta = await getData(fh, start + pos, size);

        // console.warn(`base: ${start} - ${base_offset}`);
        const base = await readPackedObject(fh, start - base_offset, repo);

        const data = applyDelta(base.data, delta);
        return {type: base.type, data};
    }

    if (typeBit === TypeBit.OBJ_REF_DELTA) {
        const end = pos + 20;
        const oid = buffer.slice(pos, end).toString("hex");
        pos = end;

        // console.warn(`delta: ${start} + ${pos}`);
        const delta = await getData(fh, start + pos, size);

        // console.warn(`base: ${oid}`);
        const type = await repo.getType(oid);
        const base = await repo.getObject(oid);

        const data = applyDelta(base, delta);
        return {type, data};
    }

    if (!size) {
        const data = Buffer.alloc(0);
        return {type, data};
    }

    // console.warn(`position: ${start} + ${pos}`);
    const data = await getData(fh, start + pos, size);
    return {type, data};
}

async function getData(fh: fs.FileHandle, position: number, size: number): Promise<Buffer> {
    const buffer = Buffer.alloc(size * 17 / 16 + 256);
    await fh.read({buffer, position});
    const data = inflateSync(buffer, {maxOutputLength: size});
    // console.warn(`inflated: ${data.length} bytes`);
    return data;
}

function applyDelta(baseData: Buffer, deltaData: Buffer): Buffer {
    let deltaPos = 0;
    let dstPos = 0;

    // console.warn(`delta: ${toHex(deltaData.slice(0, 32))}`);

    // const srcSize = readSize();
    // console.warn(`srcSize: ${srcSize}`);

    const dstSize = readSize();
    // console.warn(`dstSize: ${dstSize}`);

    const dstData = Buffer.alloc(dstSize);
    const deltaEnd = deltaData.length;

    while (deltaPos < deltaEnd) {
        const inst = deltaData[deltaPos++];
        if (inst & 0x80) {
            let offset = 0;
            let size = 0;
            if (inst & 0x01) offset += deltaData[deltaPos++];
            if (inst & 0x02) offset += (deltaData[deltaPos++] << 8);
            if (inst & 0x04) offset += (deltaData[deltaPos++] << 16);
            if (inst & 0x08) offset += (deltaData[deltaPos++] << 24);
            if (inst & 0x10) size += deltaData[deltaPos++];
            if (inst & 0x20) size += (deltaData[deltaPos++] << 8);
            if (inst & 0x40) size += (deltaData[deltaPos++] << 16);
            if (!size) size = 0x10000;
            // console.warn(`copy: ${inst.toString(2)} offset=${offset} size=${size}`);
            baseData.copy(dstData, dstPos, offset, offset + size);
            dstPos += size;
        } else if (inst) {
            const end = deltaPos + inst;
            // console.warn(`add: ${inst}`);
            deltaData.copy(dstData, dstPos, deltaPos, end);
            deltaPos = end;
            dstPos += inst;
        } else {
            throw Error(`unexpected delta opcode: ${inst}`);
        }
    }

    return dstData;

    function readSize() {
        let c = deltaData[deltaPos++];
        let shift = 7;
        let size = c & 0x7F;
        while (c & 0x80) {
            c = deltaData[deltaPos++];
            size += ((c & 0x7F) << shift);
            shift += 7;
        }
        return size;
    }
}
