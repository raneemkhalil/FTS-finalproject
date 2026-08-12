import crypto from "node:crypto";
import {Log} from "../db/schema";


export let pointers: {
    next: {
        cursor: string | null,
        date: Date | null,
        nextUrl: string | null,
        type: "next"
    },
    previous: {
        cursor: string | null,
        date: Date | null,
        prevUrl: string | null,
        type: "previous"
    }
} = {
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

export function setPointersUrls(logs: Log[], tenantName: string, limit: number, type: string) {
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

    const prevTime= logs[0].time
    const nextTime = logs[logs.length - 1].time

    if (prevTime && pointers.next.cursor !== null) {
        pointers.previous.cursor = crypto.randomBytes(32).toString("base64").replaceAll('+', '-')
        pointers.previous.date = prevTime
        pointers.previous.prevUrl = type === "previous" && logsLength !== limit + 1 ? null : `http://localhost:8080/${tenantName}/api/logs?limit=${limit}&cursor=${pointers.previous.cursor}`
    }

    if (nextTime) {
        pointers.next.cursor = crypto.randomBytes(32).toString("base64").replaceAll('+', '-')
        pointers.next.date = nextTime
        pointers.next.nextUrl = type === "next" && logsLength !== limit + 1 ? null : `http://localhost:8080/${tenantName}/api/logs?limit=${limit}&cursor=${pointers.next.cursor}`
    }
}