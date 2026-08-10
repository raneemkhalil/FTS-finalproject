ALTER TABLE "template"."logs" ALTER COLUMN "time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "template"."logs" ALTER COLUMN "time" SET DEFAULT now();