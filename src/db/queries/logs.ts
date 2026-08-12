import { logsTable} from "../schema";
import {db} from "../index";
import {LogReq} from "../../z-types";
import express from "express";
import {setConditions} from "../../utils/set-conditions";

export enum Level {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

export type LogResponse = {
    timestamp: Date,
    level: string,
    service: string,
    message: string,
    attributes: unknown
}

export async function createLog(userId: string, requestId: string, logsList: LogReq, tenant: string) {
    const logs = logsTable(tenant);

    let logsListTemp = logsList.map(value => ({
        time: new Date(value.timestamp),
        serviceName: value.service,
        message: value.message,
        level: value.level,
        attributes: value.attributes,
        userId: userId,
        requestId: requestId
    }))

    const res = await Promise.all(logsList.map(async (log) => {
        const [r] = await db.insert(logs).values(logsListTemp).onConflictDoNothing().returning().catch((err) => {console.log(err); throw "Couldn't create the log."})
        return r
    }))
    return res
}

export async function getLogs(date: Date | null, type: string, limit: number, tenant: string, req: express.Request) {
    let res: LogResponse[];
    let conditions = setConditions(req, date, type)
    res = await db.execute(`SELECT time as timestamp, level, service_name as service, message, attributes FROM ${tenant}.logs WHERE ${conditions} ORDER BY time DESC LIMIT ${limit}`)
    return res
}