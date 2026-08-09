CREATE TABLE "template"."logs" (
	"request_id" uuid NOT NULL,
	"level" text NOT NULL,
	"service_name" text NOT NULL,
	"time" timestamp DEFAULT now() NOT NULL,
	"message" varchar(256),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_id" uuid,
	CONSTRAINT "logs_pk" PRIMARY KEY("user_id","request_id","time","service_name")
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
CREATE INDEX "logs_attribute_idx" ON "template"."logs" USING gin ("attributes");