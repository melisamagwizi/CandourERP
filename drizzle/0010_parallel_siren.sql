ALTER TABLE "opportunities" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "next_follow_up_at" date;