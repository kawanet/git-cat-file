/**
 * https://github.com/kawanet/git-cat-file
 *
 * @see https://github.com/git/git/blob/master/Documentation/technical/pack-format.txt
 */

import {promises as fs} from "fs";

export type PackIndex = { [oid: string]: number };

const toHex = (buf: Buffer) => buf.toString("hex").replace(/(\w.)(?=\w)/g, "$1 ");

export async function readPackIndex(path: string): Promise<PackIndex> {
    path = path.replace(/\.pack$/, ".idx");
    if (!/\.idx$/.test(path)) throw TypeError(`Invalid pack index file: ${path}`);
    const data = await fs.readFile(path);
    return parsePackIndex(data);
}

async function parsePackIndex(data: Buffer): Promise<PackIndex> {
    // validate header
    const headByte = data.slice(0, 4);
    const head = headByte.toString("latin1");
    if (head !== "\xFFtOc") throw TypeError(`Invalid header: ${toHex(headByte)}`);

    // validate version number
    const version = data.readUInt32BE(4);
    if (version !== 2) throw TypeError(`Invalid version number: ${version}`);

    let oidIdx = 8 + 4 * 256;

    // total objects count
    const total = data.readUInt32BE(oidIdx - 4);
    // console.warn(`found: ${total} packed objects`);

    const oidLast = oidIdx + 20 * total;
    let table4Idx = oidLast + 4 * total;
    let table8Idx = table4Idx + 4 * total;

    const packIndex: PackIndex = {};
    while (oidIdx < oidLast) {
        const end = oidIdx + 20;
        const oid = data.slice(oidIdx, end).toString("hex");
        let pos = data.readUInt32BE(table4Idx);
        table4Idx += 4;
        if (pos & 0x80000000) {
            // console.warn(pos.toString(16));
            const high = data.readUInt32BE(table8Idx);
            table8Idx += 4;
            const low = data.readUInt32BE(table8Idx);
            table8Idx += 4;
            pos = high * 0x100000000 + low;
        }
        packIndex[oid] = pos;

        oidIdx = end;
    }

    return packIndex;
}
