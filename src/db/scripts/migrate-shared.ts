import postgres from "postgres";
import {config} from "../../config";
import * as schema from "../schema"
import {drizzle} from "drizzle-orm/postgres-js";
import {getMigrations, migrate} from "./helper"


export async function migratePublic() {
    const conn = postgres({...config.dbCredential, max: 1})
    const db = drizzle(conn, { schema })

    const migrations = getMigrations("public");
    await migrate(db, "public", migrations)
    await conn.end()
}

migratePublic().catch(() => process.exit(1))

