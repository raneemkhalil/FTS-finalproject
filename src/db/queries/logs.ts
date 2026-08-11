import {Log, logsTable} from "../schema";
import {db} from "../index";
import {LogReq} from "../../z-types";

export enum Level {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

export async function createLog(userId: string, requestId: string, logsList: LogReq[], tenant: string) {
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

export async function getLogs(tenant: string) {
    const logs = logsTable(tenant)
    const res: Log[] = await db.select().from(logs)
    return res
}