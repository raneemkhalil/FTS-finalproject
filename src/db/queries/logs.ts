import {Log, logsTable} from "../schema";
import {db} from "../index";
import {LogReq} from "../../z-types";
import {desc, gt, lt} from "drizzle-orm";

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

export async function getLogs(date: Date | null, type: string, limit: number, tenant: string) {
    const logs = logsTable(tenant)
    let res: Log[];

    if (!date) {
        res = await db.select().from(logs).limit(limit).orderBy(desc(logs.time))
    } else if (type === "next") {
        res = await db.select().from(logs).where(lt(logs.time, date)).orderBy(desc(logs.time)).limit(limit)
    } else {
        res = await db.select().from(logs).where(gt(logs.time, date)).orderBy(desc(logs.time)).limit(limit)
    }
    return res
}