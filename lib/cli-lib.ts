/**
 * https://github.com/kawanet/git-cat-file
 */

interface Options<L, S> {
    long: L;
    short: S;
    args: string[];
}

export function parseOptions<L extends object, S extends object>(input: Options<L, S>): Options<L, S> {
    const argv = require("process.argv")(input.args)({});
    const args: string[] = argv["--"] || [];

    const shortDef = input.short;
    const shortParams: any = {};

    while (/^-/.test(args[0])) {
        const key = args.shift().slice(1) as keyof typeof shortDef;
        if (!(key in shortDef)) {
            shortParams.h = true;
            break;
        }
        if ("string" === typeof shortDef[key]) {
            shortParams[key] = args.shift();
        } else {
            shortParams[key] = true;
        }
    }

    return {long: argv, short: shortParams, args};
}
