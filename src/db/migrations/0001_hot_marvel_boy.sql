CREATE TABLE "template"."logs" (
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"level" text NOT NULL,
	"service_name" text NOT NULL,
	"time" timestamp with time zone DEFAULT now() NOT NULL,
	"message" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_id" uuid,
	CONSTRAINT "logs_pk" PRIMARY KEY("user_id","request_id","time","service_name")
);
--> statement-breakpoint
CREATE TABLE "template"."refresh_tokens" (
	"token" varchar(256) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "template"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"password" text NOT NULL,
	"username" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "template"."logs" ADD CONSTRAINT "logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "template"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "template"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "logs_attribute_idx" ON "template"."logs" USING gin ("attributes");