/**
 * https://github.com/kawanet/git-cat-file
 */

import type {GCF} from "..";
import type {ObjStore} from "./obj-store";

export class ObjItem<IMeta> {
    private meta: { [key in keyof IMeta]: string[] };
    private message: string;

    constructor(private readonly obj: GCF.IObject, protected readonly store: ObjStore) {
        //
    }

    getId(): string {
        return this.obj.oid;
    }

    private parseMeta(): void {
        if (this.meta) return;

        const {data} = this.obj;
        const meta = this.meta = {} as { [key in keyof IMeta]: string[] };
        const lines = data.toString().split(/\r?\n/);
        let headerMode = true;
        let message: string;

        for (const line of lines) {
            if (headerMode) {
                const [key, val] = splitBySpace(line) as [keyof IMeta, string];
                if (meta[key]) {
                    meta[key].push(val)
                } else if (key) {
                    meta[key] = [val];
                } else {
                    headerMode = false;
                }
            } else {
                if (message) {
                    message += "\n" + line;
                } else {
                    message = line;
                }
            }
        }

        this.message = message;
    }

    getMeta(key: keyof IMeta): string {
        const array = this.getMetaArray(key);
        if (array) {
            if (array.length > 1) return array.join(" ");
            return array[0];
        }
    }

    protected getMetaArray(key: keyof IMeta): string[] {
        this.parseMeta();
        return this.meta[key];
    }

    getMessage(): string {
        this.parseMeta();
        return this.message;
    }
}

function splitBySpace(line: string): string[] {
    const sp = line.indexOf(" ");
    return [line.slice(0, sp), line.slice(sp + 1)];
}
