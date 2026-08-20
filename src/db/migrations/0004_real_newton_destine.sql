DROP INDEX "template"."logs_attribute_idx";--> statement-breakpoint
CREATE INDEX "logs_attribute_idx" ON "template"."logs" USING gin ("attributes") WITH (fastupdate=true);