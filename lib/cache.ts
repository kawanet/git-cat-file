/**
 * https://github.com/kawanet/git-cat-file
 */

import {queueFactory} from "async-cache-queue";

export const shortCache = queueFactory({
    cache: 1000, // 1 seconds
    negativeCache: 1000, // 1 second
    maxItems: 1000,
});

export const longCache = queueFactory({
    cache: 3600000, // 1 hour
    negativeCache: 1000, // 1 second
    maxItems: 1000,
});
