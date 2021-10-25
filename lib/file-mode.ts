/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";

const enum OctalMode {
    file = 0o100644,
    executable = 0o100755,
    symlink = 0o120000,
    submodule = 0o160000,
    directory = 0o040000,
}

class FileMode implements GCF.FileMode {
    isFile: boolean; // 100644
    isExecutable: boolean; // 100755
    isSymlink: boolean; // 120000
    isSubmodule: boolean; // 160000
    isDirectory: boolean; // 040000

    constructor(private readonly mode: number) {
        switch (mode) {
            case OctalMode.executable:
            case OctalMode.executable & 0o777:
                this.isExecutable = true;
            /* falls through */

            case OctalMode.file:
            case OctalMode.file & 0o777:
                this.isFile = true;
                break;

            case OctalMode.symlink:
                this.isSymlink = true;
                break;

            case OctalMode.submodule:
                this.isSubmodule = true;
                break;

            case OctalMode.directory:
                this.isDirectory = true;
                break;

            default:
                throw new TypeError(`Invalid mode: ${mode}`);
        }
    }

    toString(): string {
        return (0o1000000 | this.mode).toString(8).substr(-6);
    }
}

const cachedMode: { [mode: string]: FileMode } = {};

export function getFileMode(mode: string) {
    const modeNum = parseInt(mode, 8);
    return cachedMode[modeNum] || (cachedMode[modeNum] = new FileMode(modeNum));
}
