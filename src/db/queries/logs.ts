import {Log, logsTable} from "../schema";
import {db} from "../index";

export enum Level {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

export async function createLog(log: Log, tenant: string) {
    const logs = logsTable(tenant);
    let res;
    try {
        [res] = await db.insert(logs).values(log).onConflictDoNothing().returning()
    } catch (e) {
        console.log(e)
        throw "Couldn't create the log."
    }
    return res
}