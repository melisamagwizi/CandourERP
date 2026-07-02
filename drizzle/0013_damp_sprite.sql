CREATE TYPE "public"."pay_component_kind" AS ENUM('earning', 'deduction');--> statement-breakpoint
CREATE TYPE "public"."pay_component_method" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pay_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "pay_component_kind" DEFAULT 'deduction' NOT NULL,
	"method" "pay_component_method" DEFAULT 'percent' NOT NULL,
	"rate_bps" integer,
	"amount_minor" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pay_components" ADD CONSTRAINT "pay_components_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
