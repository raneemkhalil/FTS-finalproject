import {config} from "../config.js";
import process from "node:process";
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "../db/schema.js";
import {migrateEachTenant} from "../db/scripts/migrate-schemas.js";
import {ApiKeys, apiKeysTable} from "../db/schema.js";

async function setup(tenant: string) {
    const conn = postgres(config.dbCredential)
    const db = drizzle(conn, { schema })
    try {
        if (config.auth_enabled && config.token) {
            await migrateEachTenant(db, tenant)
            const apiKeys = apiKeysTable(tenantName);

            const createdDate = new Date();
            const [res]: ApiKeys[] = await db.insert(apiKeys).values({
                createdAt: createdDate,
                token: tenant + " " + config.token,
            }).returning().onConflictDoNothing()
            console.log(`Token was saved! - tokenId: ${res.token}`)
        } else {
            tenant = config.default_tenant
            await migrateEachTenant(db, tenant)
        }
        console.log(`Tenant created: name="${tenant}", schema="${tenant}"`);
    } catch (err) {
        console.error("Failed to create tenant:", err);
        throw err;
    } finally {
        await conn.end()
    }
}

const tenantName = process.argv[2] ? process.argv[2] : config.default_tenant

setup(tenantName).catch(() => process.exit(1))
