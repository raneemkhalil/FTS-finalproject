import * as process from "node:process";
import { migrateEachTenant } from "./migrate-schemas";
import postgres from "postgres";
import {config} from "../../config";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function createTenant(schemaName: string) {
    const conn = postgres(config.dbCredential)
    const db = drizzle(conn, { schema })
    try {
        await migrateEachTenant(db, schemaName)
        console.log(`Tenant created: name="${schemaName}", schema="${schemaName}"`);
    } catch (err) {
        console.error("Failed to create tenant:", err);
        throw err;
    }
}

const tenantName = process.argv[2]
if (!tenantName) {
    console.error("Usage: npm run create-tenant -- <tenantName>")
    process.exit(1)
}

createTenant(tenantName).catch(() => process.exit(1))
