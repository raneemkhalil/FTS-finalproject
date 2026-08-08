CREATE TABLE "tenants" (
	"tenant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_name" text NOT NULL,
	"schema_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_tenant_name_unique" UNIQUE("tenant_name"),
	CONSTRAINT "tenants_schema_name_unique" UNIQUE("schema_name")
);
