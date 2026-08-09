import postgres from "postgres";
import {config} from "../../config";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "../schema";
import {eq, not, sql} from "drizzle-orm";
import { tenants } from "../schema";
import {getMigrations, migrate} from "./helper"
import {dbType} from "../index";


async function addPartitionExtension(db: dbType, tenant: string) {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
    await db.execute(sql`SELECT create_hypertable(
       '${sql.identifier(tenant)}.${sql.identifier("logs")}',
       'time',
       partitioning_column => 'service_name',
       number_partitions => 32,
       if_not_exists => true
    );`)
    await db.execute(sql`SELECT set_chunk_time_interval('${sql.identifier(tenant)}.${sql.identifier("logs")}', INTERVAL '1 day');`)
    await db.execute(sql`ALTER TABLE ${sql.identifier(tenant)}.${sql.identifier("logs")} SET (timescaledb.compress, timescaledb.compress_segmentby = 'service_name');`)
    await db.execute(sql`SELECT add_compression_policy('${sql.identifier(tenant)}.${sql.identifier("logs")}', INTERVAL '7 days', if_not_exists => true);`)
    await db.execute(sql`SELECT add_retention_policy('${sql.identifier(tenant)}.${sql.identifier("logs")}', INTERVAL '90 days', if_not_exists => true);`)
}

export async function migrateEachTenant(db: dbType, tenant: string) {
    const migrations = getMigrations(tenant);
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(tenant)}`);
    await db.insert(tenants).values({tenantName: tenant, schemaName: tenant}).onConflictDoNothing()

    await migrate(db, tenant, migrations)
    await addPartitionExtension(db, tenant)
}

async function migrateSchema() {
    const conn = postgres(config.dbCredential)
    const db = drizzle(conn, { schema })

    const ts = await db.select({schemaName: tenants.schemaName}).from(tenants);
    await Promise.all(ts.map((t) => migrateEachTenant(db, t.schemaName))).catch((err) => console.error(err))

    await conn.end()
    process.exit(0)
}

migrateSchema().catch(() => process.exit(1))
