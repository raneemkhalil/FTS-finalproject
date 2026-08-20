import {
    pgSchema,
    timestamp,
    uuid,
    text,
    varchar,
    jsonb,
    index,
    primaryKey,
    pgTable,
} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";

export const tenants = pgTable("tenants", {
    tenantId: uuid("tenant_id").primaryKey().notNull().defaultRandom(),
    tenantName: text("tenant_name").notNull().unique(),
    schemaName: text("schema_name").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow()
})

export function logsTable(tenant_name: string) {
    return pgSchema(tenant_name).table("logs", {
        requestId: uuid("request_id").notNull().defaultRandom(),
        level: text("level").notNull(),
        serviceName: text("service_name").notNull(),
        time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
        message: text("message"),
        attributes: jsonb("attributes").notNull().default(sql`'{}'::jsonb`),
    }, (t) => [
        index("logs_attribute_idx").using("gin", t.attributes).with({fastupdate: true}),
        primaryKey({name: "logs_pk", columns: [t.requestId, t.time, t.serviceName]})
    ]);
}

export function apiKeysTable(tenant_name: string) {
    return pgSchema(tenant_name).table("api_keys", {
        token: varchar("token", {length: 256}).primaryKey(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    })
}

export const logs = logsTable("template");
export const apiKeys = apiKeysTable("template");

export type Tenant = typeof tenants.$inferInsert
export type Log = typeof logs.$inferInsert
export type ApiKeys = typeof apiKeys.$inferInsert;
