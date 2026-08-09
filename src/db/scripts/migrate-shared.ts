import postgres from "postgres";
import {config} from "../../config";
import * as schema from "../schema"
import {drizzle} from "drizzle-orm/postgres-js";
import {getMigrations, migrate} from "./helper"


async function migratePublic() {
    const conn = postgres(config.dbCredential)
    const db = drizzle(conn, { schema })

    const migrations = getMigrations("public");
    await migrate(db, "public", migrations)

    await conn.end()
    process.exit(0)
}

migratePublic().catch(() => process.exit(1))

