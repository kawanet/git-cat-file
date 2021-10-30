/**
 * https://github.com/kawanet/git-cat-file
 *
 * @see https://github.com/git/git/blob/master/Documentation/technical/pack-format.txt
 */

import type {GCF} from "..";
import {promises as fs} from "fs";
import {inflateSync} from "zlib";

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

export async function readPackedObject(fh: fs.FileHandle, start: number, repo: GCF.Repo): Promise<Partial<GCF.IObject>> {
    const buffer = Buffer.alloc(28);
    await fh.read({buffer, position: start});
    // console.warn(`read: ${start} (${toHex(buffer)})`);

    let offset = 0;
    let c = buffer[offset++];

    const typeBit = (c & 0x70) >> 4;
    const type = typeNames[typeBit];
    const deltaType = deltaTypes[typeBit as keyof typeof deltaTypes];
    // console.warn(`type: ${typeBit} (${deltaType || type})`);
    if (!deltaType && !type) throw new TypeError(`Invalid type: ${typeBit}`);

    let size = c & 0x0F;
    {
        let shift = 4;
        while (c & 0x80) {
            c = buffer[offset++];
            size += ((c & 0x7F) << shift);
            shift += 7;
        }
    }
    // console.warn(`size: ${size} bytes`);

    if (typeBit === TypeBit.OBJ_OFS_DELTA) {
        let c = buffer[offset++];
        let baseOffset = c & 0x7F;
        while (c & 0x80) {
            baseOffset += 1; // see unpack-objects.c
            c = buffer[offset++];
            baseOffset = (baseOffset << 7) + (c & 0x7F);
        }

        if (start < baseOffset) {
            throw new RangeError(`offset value out of bound: ${start} < ${baseOffset}`);
        }

        // console.warn(`delta: ${start} + ${offset}`);
        const delta = await readData(fh, start + offset, size);

        // console.warn(`base: ${start} - ${baseOffset}`);
        const base = await readPackedObject(fh, start - baseOffset, repo);
        const data = applyDelta(base.data, delta);
        return {type: base.type, data};
    }

    if (typeBit === TypeBit.OBJ_REF_DELTA) {
        const end = offset + 20;
        const oid = buffer.slice(offset, end).toString("hex");
        offset = end;

        // console.warn(`delta: ${start} + ${offset}`);
        const delta = await readData(fh, start + offset, size);

        // console.warn(`base: ${oid}`);
        const base = await repo.getObject(oid);
        const data = applyDelta(base.data, delta);
        return {type: base.type, data};
    }

    if (!size) {
        const data = Buffer.alloc(0);
        return {type, data};
    }

    // console.warn(`position: ${start} + ${offset}`);
    const data = await readData(fh, start + offset, size);
    return {type, data};
}

async function readData(fh: fs.FileHandle, position: number, size: number): Promise<Buffer> {
    const bufSize = Math.ceil(size * 17 / 16 / 512) * 512;
    const buffer = Buffer.alloc(bufSize);
    await fh.read({buffer, position});
    return inflateSync(buffer, {maxOutputLength: size});
}

function applyDelta(baseData: Buffer, deltaData: Buffer): Buffer {
    let deltaPos = 0;
    let dstPos = 0;

    // console.warn(`delta: ${toHex(deltaData.slice(0, 32))}`);

    const srcSize = readSize();
    if (!srcSize) throw new Error(`Invalid source size: ${srcSize}`);

    const dstSize = readSize();
    if (!dstSize) throw new Error(`Invalid dest size: ${dstSize}`);

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
