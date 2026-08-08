import { MigrationMeta } from "drizzle-orm/migrator";
import path from "node:path";
import * as fs from "node:fs";
import {createHash} from "node:crypto";
import postgres from "postgres";
import {config} from "../config.ts";
import {drizzle} from "drizzle-orm/postgres-js";
import * as schema from "./schema.ts";
import {eq, not, sql} from "drizzle-orm";
import {tenants} from "./schema.ts";

const DRIZZLE_STATEMENT_BREAKPOINT = "--> statement-breakpoint";
const TENANT_MIGRATIONS_SCHEMA = "template";

const conn = postgres(config.dbCredential)
const db = drizzle(conn, { schema })

function getMigrationsForTenant(tenant: string): MigrationMeta[] {
    const migrationFolderTo = config.migrationsConfig.migrationsFolder // path.join(__dirname, "../migrations");
    const migrationQueries: MigrationMeta[] = [];
    const journalPath = path.join(migrationFolderTo, "meta/_journal.json");
    if (!fs.existsSync(journalPath)) {
        throw new Error(`Journal file not found at ${journalPath}`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath).toString()) as {
        entries: {
            idx: number;
            when: number;
            tag: string;
            breakpoints: boolean;
        }[];
    };

    for (const journalEntry of journal.entries) {
        const migrationPath = path.join(
            migrationFolderTo,
            `${journalEntry.tag}.sql`
        );

        try {
            const query = fs.readFileSync(migrationPath).toString();
            const res = query.split(DRIZZLE_STATEMENT_BREAKPOINT).filter((it) => !it.includes("tenants")).map((it) => {
                const i = it.replaceAll(TENANT_MIGRATIONS_SCHEMA, tenant);
                return i;
            });

            migrationQueries.push({
                sql: res,
                bps: journalEntry.breakpoints,
                folderMillis: journalEntry.when,
                hash: createHash("sha256").update(query).digest("hex"),
            });
        } catch (error) {
            console.error(`No file ${migrationPath} found in ${migrationFolderTo}`);
        }
    }

    return migrationQueries;
}

export async function migrateTenant(tenant: string) {
    const migrations = getMigrationsForTenant(tenant);

    const migrationsTable = "__drizzle_migrations";
    const migrationsSchema = tenant;

    const migrationTableCreate = sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
        )
    `;

    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(tenant)}`);

    await db.execute(migrationTableCreate);

    await db.insert(tenants).values({tenantName: tenant, schemaName: tenant}).onConflictDoNothing()

    const dbMigrations = await db.execute(sql`
        select id, hash, created_at  
        from ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)}
        order by created_at desc limit 1`,
    );

    const lastDbMigration = dbMigrations[0];

    await db.transaction(async (tx) => {
        for await (const migration of migrations) {
            if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
                for (const stmt of migration.sql) {
                    await tx.execute(sql.raw(stmt));
                }
                await tx.execute(
                    sql`
                        insert into ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} 
                        ("hash", "created_at") 
                        values (${migration.hash}, ${migration.folderMillis})
                    `,
                )
            }
        }
    })
}

async function migrate() {
    // await db.execute(sql`CREATE TABLE IF NOT EXISTS public.tenants (
    //     tenant_id SERIEL PRIMARY KEY,
    //     tenant_name text UNIQUE,
    //     schema_name text UNIQUE,
    //     created_at bigint
    // )`)
    const ts = await db.select({schemaName: tenants.schemaName}).from(tenants).where(not(eq(tenants.schemaName, "public")));
    await Promise.all(ts.map((t) => migrateTenant(t.schemaName))).catch((err) => console.error(err))
    await conn.end()
    process.exit(0)
}

migrate().catch(() => process.exit(1))
