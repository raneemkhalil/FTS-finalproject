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

export function usersTable(tenant_name: string) {
    return pgSchema(tenant_name).table("users", {
        id: uuid("id").primaryKey().defaultRandom().notNull(),
        password: text("password").notNull(),
        username: text("username").unique().notNull()
    });
}

export function logsTable(tenant_name: string) {
    return pgSchema(tenant_name).table("logs", {
        requestId: uuid("request_id").notNull(),
        level: text("level").notNull(),
        serviceName: text("service_name").notNull(),
        time: timestamp("time").notNull().defaultNow().$onUpdate(() => new Date()),
        message: varchar({length: 256}),
        attributes: jsonb("attributes").notNull().default(sql`'{}'::jsonb`),
        userId: uuid("user_id").references(() => {
            const users = usersTable(tenant_name);
            return users.id
        }, { onDelete: "cascade" })
    }, (t) => [
        index("logs_attribute_idx").using("gin", t.attributes),
        primaryKey({name: "logs_pk", columns: [t.userId, t.requestId, t.time, t.serviceName]})
    ]);
}

export const users = usersTable("template");
export const logs = logsTable("template");

export type tenantType = typeof tenants.$inferInsert
export type userType = typeof users.$inferInsert
export type logType = typeof logs.$inferInsert
