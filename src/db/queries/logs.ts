import {Log, logsTable} from "../schema";
import {db} from "../index";

export enum Level {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

export async function createLog(userId: string, requestId: string, logsList: Log[], tenant: string) {
    const logs = logsTable(tenant);

    logsList = logsList.map((value) => {
        value.requestId = requestId
        value.userId = userId
        return value
    })

    const res = await Promise.all(logsList.map(async (log) => {
        const [r] = await db.insert(logs).values(log).onConflictDoNothing().returning().catch((err) => {console.log(err); throw "Couldn't create the log."})
        return r
    }))
    return res
}

export async function getLogs(tenant: string) {
    const logs = logsTable(tenant)
    const res: Log[] = await db.select().from(logs)
    return res
}