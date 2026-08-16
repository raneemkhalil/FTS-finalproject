CREATE TABLE "template"."api_keys" (
	"token" varchar(256) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template"."logs" (
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"level" text NOT NULL,
	"service_name" text NOT NULL,
	"time" timestamp with time zone DEFAULT now() NOT NULL,
	"message" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "logs_pk" PRIMARY KEY("request_id","time","service_name")
);
--> statement-breakpoint
CREATE INDEX "logs_attribute_idx" ON "template"."logs" USING gin ("attributes");