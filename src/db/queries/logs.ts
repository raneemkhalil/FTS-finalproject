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

// Helper function to split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

export async function createLog(requestId: string, logsList: LogReq, tenant: string) {
    const logs = logsTable(tenant);

    const logsListTemp = logsList.map((value) => {
        const parsedDate = new Date(value.timestamp);
        return {
            time: !isNaN(parsedDate.getTime()) ? parsedDate : new Date(),
            serviceName: value.service ?? 'unknown',
            message: value.message ?? '',
            level: value.level ?? 'info',
            attributes: value.attributes ?? {}, // Ensures JSON object is never undefined
            requestId: requestId ?? null
        };
    });

    // Perform chunked insertion
    const BATCH_SIZE = 500; // 500 items * 6 fields = 3,000 parameters (well within limit)
    const logBatches = chunkArray(logsListTemp, BATCH_SIZE);

    for (const batch of logBatches) {
        await db.insert(logs).values(batch).onConflictDoNothing();
    }
}

export async function getLogs(date: string | null, type: string | null, limit: number, tenant: string, req: express.Request) {
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
        return await db.execute(`SELECT to_timestamp(floor(extract(epoch FROM time) / ${epochSecondes}) * ${epochSecondes}) as start, null as group, COALESCE(COUNT(*), 0)::int AS count from "${tenant}"."logs" WHERE ${conditions} GROUP BY start ORDER BY start ASC`)
    }
    if (groupBy && groupBy !== "level" && groupBy !== "service") {
        throw new errors.BadRequestError("Group by should be level or service")
    }
    groupBy = groupBy.replace("service", "service_name")
    return await db.execute(`SELECT to_timestamp(floor(extract(epoch FROM time) / ${epochSecondes}) * ${epochSecondes}) as start, ${groupBy} as group, COALESCE(COUNT(*), 0)::int AS count from "${tenant}"."logs" WHERE ${conditions} GROUP BY ${groupBy}, start ORDER BY start ASC`)
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