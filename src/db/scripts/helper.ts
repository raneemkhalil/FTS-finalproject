import {sql} from "drizzle-orm";
import {MigrationMeta} from "drizzle-orm/migrator";
import {dbType} from "../index.js";
import path from "node:path";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {config} from "../../config.js";
import {Journal} from "../../types.js";

const DRIZZLE_STATEMENT_BREAKPOINT = "--> statement-breakpoint";
const TENANT_MIGRATIONS_SCHEMA = "template";

function addMigrationQuery(migrationQueries: MigrationMeta[], migrationFolderTo: string, journal: Journal, tenant: string){

    for (const journalEntry of journal.entries) {
        const migrationPath = path.join(
            migrationFolderTo,
            `${journalEntry.tag}.sql`
        );

        try {
            const query = fs.readFileSync(migrationPath).toString();
            let res = query.split(DRIZZLE_STATEMENT_BREAKPOINT).filter((it: string) => (tenant === "public" && it.includes("tenants")) ||
                (tenant !== "public" && !it.includes("tenants")));
            if (tenant !== "public") {
                res = res.map((it) => {
                    const i = it.replaceAll(TENANT_MIGRATIONS_SCHEMA, tenant);
                    return i;
                });
            }
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
}

export function getMigrations(tenant: string): MigrationMeta[] {
    const migrationFolderTo = config.migrationsConfig.migrationsFolder
    const migrationQueries: MigrationMeta[] = [];
    const journalPath = path.join(migrationFolderTo, "meta/_journal.json");
    if (!fs.existsSync(journalPath)) {
        throw new Error(`Journal file not found at ${journalPath}`);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath).toString()) as Journal;

    addMigrationQuery(migrationQueries, migrationFolderTo, journal, tenant)

    return migrationQueries;
}

export async function migrate(db: dbType, tenant: string, migrations: MigrationMeta[]) {
    const migrationsTable = "__drizzle_migrations";
    const migrationsSchema = tenant

    const migrationTableCreate = sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
        )
    `;
    await db.execute(migrationTableCreate);

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