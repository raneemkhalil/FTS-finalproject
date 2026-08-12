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
import {desc, sql} from "drizzle-orm";

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
        requestId: uuid("request_id").notNull().defaultRandom(),
        level: text("level").notNull(),
        serviceName: text("service_name").notNull(),
        time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
        message: text("message"),
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

export function refreshTokensTable(tenant_name: string) {
    return pgSchema(tenant_name).table("refresh_tokens", {
        token: varchar("token", {length: 256}).primaryKey(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
        userId: uuid("user_id").references(() => users.id, {onDelete: "cascade"}),
        expiresAt: timestamp("expires_at").notNull(),
        revokedAt: timestamp("revoked_at"),
    })
}

export const users = usersTable("template");
export const logs = logsTable("template");
export const refreshTokens = refreshTokensTable("template");

export type Tenant = typeof tenants.$inferInsert
export type User = typeof users.$inferInsert
export type Log = typeof logs.$inferInsert
export type RefreshToken = typeof refreshTokens.$inferInsert;
