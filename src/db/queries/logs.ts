import { logsTable} from "../schema";
import {db} from "../index";
import {LogReq} from "../../z-types";
import express from "express";
import {setConditions} from "../../utils/set-conditions";
import errors from "../../errors";
import {parseEpoch} from "../utils/parse-epoch";

export enum Level {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
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

export async function getLogsAggregation(req: express.Request, tenant: string) {
    const bucket = req.query.bucket as string
    let groupBy = req.query.group_by as string
    const {since, until} = req.query
    if (!since) {
        throw new errors.BadRequestError("Since parameter is required.")
    }
    if (!until) {
        throw new errors.BadRequestError("Until parameter is required.")
    }
    if (!bucket) {
        throw new errors.BadRequestError("Bucket parameter is required.")
    }
    const conditions = setConditions(req, null, null)
    const epochSecondes = parseEpoch(bucket)
    if (!groupBy) {
        return await db.execute(`SELECT to_timestamp(floor(extract(epoch FROM time) / ${epochSecondes}) * ${epochSecondes}) as start_date, null as group, COUNT(*) from ${tenant}.logs WHERE ${conditions} GROUP BY start_date ORDER BY start_date ASC`)
    }
    groupBy = groupBy.replace("service", "service_name")
    return await db.execute(`SELECT to_timestamp(floor(extract(epoch FROM time) / ${epochSecondes}) * ${epochSecondes}) as start_date, ${groupBy} as group, COUNT(*) from ${tenant}.logs WHERE ${conditions} GROUP BY ${groupBy}, start_date ORDER BY start_date ASC`)
}