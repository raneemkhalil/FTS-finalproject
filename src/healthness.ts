import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";
import {config} from "./config";
import {sql} from "drizzle-orm";
import {migratePublic} from "./db/scripts/migrate-shared";
import {migrateSchema} from "./db/scripts/migrate-schemas";


export enum Status {
    SUCCESS = "success",
    FAILED = "failed"
}

export async function checkDbConnection() {
    const conn = postgres({...config.dbCredential, max: 1})
    let result
    try {
        const db = drizzle(conn, {schema})
        await db.execute(sql`SELECT 1`)
        result = {
            status: Status.SUCCESS
        }
    } catch (e) {
        result = {
            status: Status.FAILED,
            message: e
        }
    } finally {
        await conn.end()
    }
    return result
}

export async function checkMigrations() {
    try {
        await migratePublic()
        await migrateSchema()
    } catch (e) {
        return {
            status: Status.FAILED,
            message: e
        }
    }
    return {
        status: Status.SUCCESS
    }
}
