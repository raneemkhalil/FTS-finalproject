import {LogResponse} from "../types.js";
import {encodeCursor} from "../db/utils/parse-cursor.js";


export function setPointersUrls(logs: LogResponse[], limit: number, type: string | null, subUrl: string): [string | null, string | null, string | null] {
    // to know if i have next or previous logs
    const logsLength = logs.length
    let abelToNext: boolean = false
    let abelToPrev: boolean = false

    if (logsLength === limit + 1 && (type === "next" || type === null)) {
        // because we want exactly limit items
        logs.pop()
        abelToNext = true
    }
    if(logsLength === limit + 1 && type === "previous") {
        let revLogs = logs.reverse()
        revLogs.pop()
        logs = revLogs.reverse()
        abelToPrev = true
    }

    if (type === "next") {
        abelToPrev = true
    }
    if (type === "previous") {
        abelToNext = true
    }

    const prevTime= logs[0].timestamp
    const nextTime = logs[logs.length - 1].timestamp
    subUrl = subUrl.split('&cursor')[0]
    if (!(subUrl.includes("?limit"))) {
        subUrl += `?limit=${limit}`
    }

    let nextCursor: string | null = null
    let nextUrl: string | null = null
    let prevUrl: string | null = null

    if (prevTime) {
        const cursor = encodeCursor(prevTime, "previous")
        prevUrl = !abelToPrev ? null : `http://localhost:8080${subUrl}&cursor=${cursor}`
    }

    if (nextTime) {
        nextCursor = !abelToNext ? null : encodeCursor(nextTime, "next")
        nextUrl = nextCursor === null ? null : `http://localhost:8080${subUrl}&cursor=${nextCursor}`
    }
    return [prevUrl, nextCursor, nextUrl]
}