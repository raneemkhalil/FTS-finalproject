import crypto from "node:crypto";

export let pointers: Pointers = {
    next: {
        cursor: null,
        date: null,
        nextUrl: null,
        type: "next"
    },
    previous: {
        cursor: null,
        date: null,
        prevUrl: null,
        type: "previous"
    }
}

export function setPointersUrls(logs: LogResponse[], limit: number, type: string, subUrl: string) {
    // to know if i have next or previous logs
    const logsLength = logs.length

    if (logsLength === limit + 1 && type === "next") {
        // because we want exactly limit items
        logs.pop()
    }
    if(logsLength === limit + 1 && type === "previous") {
        let revLogs = logs.reverse()
        revLogs.pop()
        logs = revLogs.reverse()
    }

    const prevTime= logs[0].timestamp
    const nextTime = logs[logs.length - 1].timestamp
    subUrl = subUrl.split('&cursor')[0]
    if (!(subUrl.includes("?limit"))) {
        subUrl += `?limit=${limit}`
    }

    if (prevTime && pointers.next.cursor !== null) {
        pointers.previous.cursor = crypto.randomBytes(32).toString("base64").replaceAll('+', '-')
        pointers.previous.date = prevTime
        pointers.previous.prevUrl = type === "previous" && logsLength !== limit + 1 ? null : `http://localhost:8080${subUrl}&cursor=${pointers.previous.cursor}`
    }

    if (nextTime) {
        pointers.next.cursor = type === "next" && logsLength !== limit + 1 ? null : crypto.randomBytes(32).toString("base64").replaceAll('+', '-')
        pointers.next.date = nextTime
        pointers.next.nextUrl = type === "next" && logsLength !== limit + 1 ? null : `http://localhost:8080${subUrl}&cursor=${pointers.next.cursor}`
    }
}