import {Log, logsTable} from "../schema.js";
import {db} from "../index.js";
import {LogReq} from "../../z-types.js";
import express from "express";
import {setConditions} from "../../utils/set-conditions.js";
import errors from "../../errors.js";
import {parseEpoch} from "../utils/parse-epoch.js";
import {decodeLookupId} from "../utils/log-lookup.js";
import {and, eq} from "drizzle-orm";
import {LogResponse} from "../../types.js";

export enum Level {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

export async function createLog(requestId: string, logsList: LogReq, tenant: string) {
    const logs = logsTable(tenant);

    let logsListTemp = logsList.map(value => ({
        time: new Date(value.timestamp),
        serviceName: value.service,
        message: value.message,
        level: value.level,
        attributes: value.attributes,
        requestId: requestId
    }))

    const res = await Promise.all(logsListTemp.map(async (log) => {
        const [r] = await db.insert(logs).values(log).onConflictDoNothing().returning().catch((err) => {console.log(err); throw "Couldn't create the log."})
        return r
    }))
    return res
}

export async function getLogs(date: string | null, type: string, limit: number, tenant: string, req: express.Request) {
    let res: LogResponse[];
    let conditions = setConditions(req, date, type);

    let sql = `
        SELECT 
            encode(
                convert_to(CONCAT(time, '|', service_name, '|', request_id), 'UTF8'), 
                'hex'
            ) AS id, 
            time as timestamp, 
            level, 
            service_name as service, 
            message, 
            attributes 
        FROM "${tenant}"."logs" 
    `;

    if (conditions) {
        sql += `WHERE ${conditions} `;
    }

    sql += `ORDER BY time DESC LIMIT ${limit};`;

    res = await db.execute(sql);
    return res;
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
        return await db.execute(`SELECT to_timestamp(floor(extract(epoch FROM time) / ${epochSecondes}) * ${epochSecondes}) as start_date, null as group, COUNT(*) from "${tenant}"."logs" WHERE ${conditions} GROUP BY start_date ORDER BY start_date ASC`)
    }
    groupBy = groupBy.replace("service", "service_name")
    return await db.execute(`SELECT to_timestamp(floor(extract(epoch FROM time) / ${epochSecondes}) * ${epochSecondes}) as start_date, ${groupBy} as group, COUNT(*) from "${tenant}"."logs" WHERE ${conditions} GROUP BY ${groupBy}, start_date ORDER BY start_date ASC`)
}

export async function getLogByLookup(lookup: string, tenant: string) {
    const logs = logsTable(tenant)
    const { time, serviceName, requestId } = decodeLookupId(lookup)
    const datetime = new Date(time)

    const [log]: Log[] = await db.select().from(logs).where(and(
        eq(logs.time, datetime),
        eq(logs.serviceName, serviceName),
        eq(logs.requestId, requestId)
    ))
    return {
        id: lookup,
        timestamp: log.time || null,
        level: log.level,
        service: log.serviceName,
        message: log.message || "",
        attributes: log.attributes
    }
}