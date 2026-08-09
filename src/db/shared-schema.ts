import {pgTable, text, timestamp, uuid} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
    tenantId: uuid("tenant_id").primaryKey().notNull().defaultRandom(),
    tenantName: text("tenant_name").notNull().unique(),
    schemaName: text("schema_name").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow()
})

export type tenantType = typeof tenants.$inferInsert
