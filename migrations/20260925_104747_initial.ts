import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_template" AS ENUM('home', 'about', 'team', 'offers', 'contact', 'book', 'hub', 'category', 'service', 'emergency', 'legal', 'sitemap', 'blog');
  CREATE TYPE "public"."enum__pages_v_version_template" AS ENUM('home', 'about', 'team', 'offers', 'contact', 'book', 'hub', 'category', 'service', 'emergency', 'legal', 'sitemap', 'blog');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_enquiries_form_type" AS ENUM('appointment', 'contact', 'newsletter');
  CREATE TYPE "public"."enum_enquiries_email_status" AS ENUM('sent', 'failed');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('301', '302');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TABLE "pages_home_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "pages_home_service_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"desc" varchar
  );
  
  CREATE TABLE "pages_home_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_about_tech_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_emergency_wait_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_hub_category_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_hub_extra_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_category_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"heading" varchar,
  	"body" jsonb,
  	"has_image" boolean,
  	"image_upload_id" integer,
  	"image_path" varchar,
  	"image_alt" varchar
  );
  
  CREATE TABLE "pages_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"template" "enum_pages_template" NOT NULL,
  	"hero_h1" varchar,
  	"hero_intro" varchar,
  	"hero_hero_image_upload_id" integer,
  	"hero_hero_image_path" varchar,
  	"hero_hero_image_alt" varchar,
  	"home_h1" varchar,
  	"home_hero_intro" varchar,
  	"home_hero_image_upload_id" integer,
  	"home_hero_image_path" varchar,
  	"home_hero_image_alt" varchar,
  	"home_trust_line" varchar,
  	"home_stat_label" varchar,
  	"home_stat_number" varchar,
  	"home_stat_text" varchar,
  	"home_chips_title" varchar,
  	"home_funds_caption" varchar,
  	"home_welcome_eyebrow" varchar,
  	"home_welcome_lead" varchar,
  	"home_welcome_statement" varchar,
  	"home_float_image_1_upload_id" integer,
  	"home_float_image_1_path" varchar,
  	"home_float_image_1_alt" varchar,
  	"home_float_image_2_upload_id" integer,
  	"home_float_image_2_path" varchar,
  	"home_float_image_2_alt" varchar,
  	"home_services_heading" varchar,
  	"home_services_intro" varchar,
  	"home_why_heading" varchar,
  	"home_why_text" jsonb,
  	"home_story_heading" varchar,
  	"home_story_text" jsonb,
  	"home_story_image_upload_id" integer,
  	"home_story_image_path" varchar,
  	"home_story_image_alt" varchar,
  	"home_offers_heading" varchar,
  	"home_visit_heading" varchar,
  	"home_visit_intro" varchar,
  	"about_story_heading" varchar,
  	"about_story" jsonb,
  	"about_philosophy_heading" varchar,
  	"about_philosophy_text" jsonb,
  	"about_philosophy_image_upload_id" integer,
  	"about_philosophy_image_path" varchar,
  	"about_philosophy_image_alt" varchar,
  	"about_tech_heading" varchar,
  	"about_tech_intro" varchar,
  	"about_tech_outro" varchar,
  	"about_continuity_heading" varchar,
  	"about_continuity_text" jsonb,
  	"about_continuity_image_upload_id" integer,
  	"about_continuity_image_path" varchar,
  	"about_continuity_image_alt" varchar,
  	"about_visit_heading" varchar,
  	"about_visit_text" varchar,
  	"offers_page_intro_heading" varchar,
  	"offers_page_intro" jsonb,
  	"offers_page_footnote" varchar,
  	"contact_find_text" varchar,
  	"contact_message_heading" varchar,
  	"contact_message_text" varchar,
  	"contact_emergency_heading" varchar,
  	"contact_emergency_text" varchar,
  	"emergency_banner" varchar,
  	"emergency_wait_heading" varchar,
  	"emergency_wait_note" varchar,
  	"emergency_seen_heading" varchar,
  	"emergency_seen_body" jsonb,
  	"category_cards_heading" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"og_image_upload_id" integer,
  	"og_image_path" varchar,
  	"og_image_alt" varchar,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_pages_v_version_home_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_home_service_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"desc" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_home_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_about_tech_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_emergency_wait_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_hub_category_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_hub_extra_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_category_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"heading" varchar,
  	"body" jsonb,
  	"has_image" boolean,
  	"image_upload_id" integer,
  	"image_path" varchar,
  	"image_alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_path" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_template" "enum__pages_v_version_template" NOT NULL,
  	"version_hero_h1" varchar,
  	"version_hero_intro" varchar,
  	"version_hero_hero_image_upload_id" integer,
  	"version_hero_hero_image_path" varchar,
  	"version_hero_hero_image_alt" varchar,
  	"version_home_h1" varchar,
  	"version_home_hero_intro" varchar,
  	"version_home_hero_image_upload_id" integer,
  	"version_home_hero_image_path" varchar,
  	"version_home_hero_image_alt" varchar,
  	"version_home_trust_line" varchar,
  	"version_home_stat_label" varchar,
  	"version_home_stat_number" varchar,
  	"version_home_stat_text" varchar,
  	"version_home_chips_title" varchar,
  	"version_home_funds_caption" varchar,
  	"version_home_welcome_eyebrow" varchar,
  	"version_home_welcome_lead" varchar,
  	"version_home_welcome_statement" varchar,
  	"version_home_float_image_1_upload_id" integer,
  	"version_home_float_image_1_path" varchar,
  	"version_home_float_image_1_alt" varchar,
  	"version_home_float_image_2_upload_id" integer,
  	"version_home_float_image_2_path" varchar,
  	"version_home_float_image_2_alt" varchar,
  	"version_home_services_heading" varchar,
  	"version_home_services_intro" varchar,
  	"version_home_why_heading" varchar,
  	"version_home_why_text" jsonb,
  	"version_home_story_heading" varchar,
  	"version_home_story_text" jsonb,
  	"version_home_story_image_upload_id" integer,
  	"version_home_story_image_path" varchar,
  	"version_home_story_image_alt" varchar,
  	"version_home_offers_heading" varchar,
  	"version_home_visit_heading" varchar,
  	"version_home_visit_intro" varchar,
  	"version_about_story_heading" varchar,
  	"version_about_story" jsonb,
  	"version_about_philosophy_heading" varchar,
  	"version_about_philosophy_text" jsonb,
  	"version_about_philosophy_image_upload_id" integer,
  	"version_about_philosophy_image_path" varchar,
  	"version_about_philosophy_image_alt" varchar,
  	"version_about_tech_heading" varchar,
  	"version_about_tech_intro" varchar,
  	"version_about_tech_outro" varchar,
  	"version_about_continuity_heading" varchar,
  	"version_about_continuity_text" jsonb,
  	"version_about_continuity_image_upload_id" integer,
  	"version_about_continuity_image_path" varchar,
  	"version_about_continuity_image_alt" varchar,
  	"version_about_visit_heading" varchar,
  	"version_about_visit_text" varchar,
  	"version_offers_page_intro_heading" varchar,
  	"version_offers_page_intro" jsonb,
  	"version_offers_page_footnote" varchar,
  	"version_contact_find_text" varchar,
  	"version_contact_message_heading" varchar,
  	"version_contact_message_text" varchar,
  	"version_contact_emergency_heading" varchar,
  	"version_contact_emergency_text" varchar,
  	"version_emergency_banner" varchar,
  	"version_emergency_wait_heading" varchar,
  	"version_emergency_wait_note" varchar,
  	"version_emergency_seen_heading" varchar,
  	"version_emergency_seen_body" jsonb,
  	"version_category_cards_heading" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_og_image_upload_id" integer,
  	"version_og_image_path" varchar,
  	"version_og_image_alt" varchar,
  	"version_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" varchar DEFAULT 'Dental Health',
  	"date_published" timestamp(3) with time zone,
  	"date_modified" timestamp(3) with time zone,
  	"excerpt" varchar,
  	"featured_image_upload_id" integer,
  	"featured_image_path" varchar,
  	"featured_image_alt" varchar,
  	"body" jsonb,
  	"surgical_disclaimer" boolean DEFAULT false,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" varchar DEFAULT 'Dental Health',
  	"version_date_published" timestamp(3) with time zone,
  	"version_date_modified" timestamp(3) with time zone,
  	"version_excerpt" varchar,
  	"version_featured_image_upload_id" integer,
  	"version_featured_image_path" varchar,
  	"version_featured_image_alt" varchar,
  	"version_body" jsonb,
  	"version_surgical_disclaimer" boolean DEFAULT false,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_noindex" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer
  );
  
  CREATE TABLE "team" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar DEFAULT 'Dentist' NOT NULL,
  	"order" numeric DEFAULT 1 NOT NULL,
  	"photo_upload_id" integer,
  	"photo_path" varchar,
  	"photo_alt" varchar,
  	"bio" jsonb,
  	"ahpra_number" varchar,
  	"hidden" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "offers_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "offers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"price" varchar,
  	"order" numeric DEFAULT 1 NOT NULL,
  	"note" varchar,
  	"body" jsonb,
  	"cta_label" varchar DEFAULT 'Book Now',
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"hidden" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"builtin_path" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_type" "enum_enquiries_form_type",
  	"name" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"service" varchar,
  	"preferred" varchar,
  	"message" varchar,
  	"email_status" "enum_enquiries_email_status",
  	"email_error" varchar,
  	"followed_up" boolean DEFAULT false,
  	"page" varchar,
  	"ip" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"type" "enum_redirects_type" DEFAULT '301',
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer,
  	"team_id" integer,
  	"offers_id" integer,
  	"media_id" integer,
  	"enquiries_id" integer,
  	"redirects_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"days" varchar NOT NULL,
  	"time" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"practice_phone" varchar,
  	"practice_email" varchar,
  	"practice_address" varchar,
  	"practice_maps_url" varchar,
  	"practice_review_url" varchar,
  	"practice_review_label" varchar,
  	"practice_facebook" varchar,
  	"practice_instagram" varchar,
  	"practice_linkedin" varchar,
  	"hours_note" varchar,
  	"announcement_enabled" boolean DEFAULT false,
  	"announcement_text" varchar,
  	"announcement_link" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_status" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"last_changed_at" timestamp(3) with time zone,
  	"last_published_at" timestamp(3) with time zone,
  	"last_imported_at" timestamp(3) with time zone,
  	"last_publish_note" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "pages_home_chips" ADD CONSTRAINT "pages_home_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_home_service_cards" ADD CONSTRAINT "pages_home_service_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_home_features" ADD CONSTRAINT "pages_home_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_about_tech_cards" ADD CONSTRAINT "pages_about_tech_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_emergency_wait_cards" ADD CONSTRAINT "pages_emergency_wait_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_hub_category_cards" ADD CONSTRAINT "pages_hub_category_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_hub_extra_cards" ADD CONSTRAINT "pages_hub_extra_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_category_cards" ADD CONSTRAINT "pages_category_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_sections" ADD CONSTRAINT "pages_sections_image_upload_id_media_id_fk" FOREIGN KEY ("image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_sections" ADD CONSTRAINT "pages_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_faq" ADD CONSTRAINT "pages_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_hero_image_upload_id_media_id_fk" FOREIGN KEY ("hero_hero_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_home_hero_image_upload_id_media_id_fk" FOREIGN KEY ("home_hero_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_home_float_image_1_upload_id_media_id_fk" FOREIGN KEY ("home_float_image_1_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_home_float_image_2_upload_id_media_id_fk" FOREIGN KEY ("home_float_image_2_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_home_story_image_upload_id_media_id_fk" FOREIGN KEY ("home_story_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_about_philosophy_image_upload_id_media_id_fk" FOREIGN KEY ("about_philosophy_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_about_continuity_image_upload_id_media_id_fk" FOREIGN KEY ("about_continuity_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_og_image_upload_id_media_id_fk" FOREIGN KEY ("og_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_version_home_chips" ADD CONSTRAINT "_pages_v_version_home_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_home_service_cards" ADD CONSTRAINT "_pages_v_version_home_service_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_home_features" ADD CONSTRAINT "_pages_v_version_home_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_about_tech_cards" ADD CONSTRAINT "_pages_v_version_about_tech_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_emergency_wait_cards" ADD CONSTRAINT "_pages_v_version_emergency_wait_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hub_category_cards" ADD CONSTRAINT "_pages_v_version_hub_category_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hub_extra_cards" ADD CONSTRAINT "_pages_v_version_hub_extra_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_category_cards" ADD CONSTRAINT "_pages_v_version_category_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_sections" ADD CONSTRAINT "_pages_v_version_sections_image_upload_id_media_id_fk" FOREIGN KEY ("image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_version_sections" ADD CONSTRAINT "_pages_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_faq" ADD CONSTRAINT "_pages_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_hero_image_upload_id_media_id_fk" FOREIGN KEY ("version_hero_hero_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_home_hero_image_upload_id_media_id_fk" FOREIGN KEY ("version_home_hero_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_home_float_image_1_upload_id_media_id_fk" FOREIGN KEY ("version_home_float_image_1_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_home_float_image_2_upload_id_media_id_fk" FOREIGN KEY ("version_home_float_image_2_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_home_story_image_upload_id_media_id_fk" FOREIGN KEY ("version_home_story_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_about_philosophy_image_upload_id_media_id_fk" FOREIGN KEY ("version_about_philosophy_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_about_continuity_image_upload_id_media_id_fk" FOREIGN KEY ("version_about_continuity_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_og_image_upload_id_media_id_fk" FOREIGN KEY ("version_og_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_upload_id_media_id_fk" FOREIGN KEY ("featured_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_image_upload_id_media_id_fk" FOREIGN KEY ("version_featured_image_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_photo_upload_id_media_id_fk" FOREIGN KEY ("photo_upload_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers_bullets" ADD CONSTRAINT "offers_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_offers_fk" FOREIGN KEY ("offers_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_hours" ADD CONSTRAINT "site_settings_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_home_chips_order_idx" ON "pages_home_chips" USING btree ("_order");
  CREATE INDEX "pages_home_chips_parent_id_idx" ON "pages_home_chips" USING btree ("_parent_id");
  CREATE INDEX "pages_home_service_cards_order_idx" ON "pages_home_service_cards" USING btree ("_order");
  CREATE INDEX "pages_home_service_cards_parent_id_idx" ON "pages_home_service_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_home_features_order_idx" ON "pages_home_features" USING btree ("_order");
  CREATE INDEX "pages_home_features_parent_id_idx" ON "pages_home_features" USING btree ("_parent_id");
  CREATE INDEX "pages_about_tech_cards_order_idx" ON "pages_about_tech_cards" USING btree ("_order");
  CREATE INDEX "pages_about_tech_cards_parent_id_idx" ON "pages_about_tech_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_emergency_wait_cards_order_idx" ON "pages_emergency_wait_cards" USING btree ("_order");
  CREATE INDEX "pages_emergency_wait_cards_parent_id_idx" ON "pages_emergency_wait_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_hub_category_cards_order_idx" ON "pages_hub_category_cards" USING btree ("_order");
  CREATE INDEX "pages_hub_category_cards_parent_id_idx" ON "pages_hub_category_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_hub_extra_cards_order_idx" ON "pages_hub_extra_cards" USING btree ("_order");
  CREATE INDEX "pages_hub_extra_cards_parent_id_idx" ON "pages_hub_extra_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_category_cards_order_idx" ON "pages_category_cards" USING btree ("_order");
  CREATE INDEX "pages_category_cards_parent_id_idx" ON "pages_category_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_sections_order_idx" ON "pages_sections" USING btree ("_order");
  CREATE INDEX "pages_sections_parent_id_idx" ON "pages_sections" USING btree ("_parent_id");
  CREATE INDEX "pages_sections_image_image_upload_idx" ON "pages_sections" USING btree ("image_upload_id");
  CREATE INDEX "pages_faq_order_idx" ON "pages_faq" USING btree ("_order");
  CREATE INDEX "pages_faq_parent_id_idx" ON "pages_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_path_idx" ON "pages" USING btree ("path");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_hero_hero_image_hero_hero_image_upload_idx" ON "pages" USING btree ("hero_hero_image_upload_id");
  CREATE INDEX "pages_home_hero_image_home_hero_image_upload_idx" ON "pages" USING btree ("home_hero_image_upload_id");
  CREATE INDEX "pages_home_float_image_1_home_float_image_1_upload_idx" ON "pages" USING btree ("home_float_image_1_upload_id");
  CREATE INDEX "pages_home_float_image_2_home_float_image_2_upload_idx" ON "pages" USING btree ("home_float_image_2_upload_id");
  CREATE INDEX "pages_home_story_image_home_story_image_upload_idx" ON "pages" USING btree ("home_story_image_upload_id");
  CREATE INDEX "pages_about_philosophy_image_about_philosophy_image_uplo_idx" ON "pages" USING btree ("about_philosophy_image_upload_id");
  CREATE INDEX "pages_about_continuity_image_about_continuity_image_uplo_idx" ON "pages" USING btree ("about_continuity_image_upload_id");
  CREATE INDEX "pages_og_image_og_image_upload_idx" ON "pages" USING btree ("og_image_upload_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "_pages_v_version_home_chips_order_idx" ON "_pages_v_version_home_chips" USING btree ("_order");
  CREATE INDEX "_pages_v_version_home_chips_parent_id_idx" ON "_pages_v_version_home_chips" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_home_service_cards_order_idx" ON "_pages_v_version_home_service_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_version_home_service_cards_parent_id_idx" ON "_pages_v_version_home_service_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_home_features_order_idx" ON "_pages_v_version_home_features" USING btree ("_order");
  CREATE INDEX "_pages_v_version_home_features_parent_id_idx" ON "_pages_v_version_home_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_about_tech_cards_order_idx" ON "_pages_v_version_about_tech_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_version_about_tech_cards_parent_id_idx" ON "_pages_v_version_about_tech_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_emergency_wait_cards_order_idx" ON "_pages_v_version_emergency_wait_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_version_emergency_wait_cards_parent_id_idx" ON "_pages_v_version_emergency_wait_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_hub_category_cards_order_idx" ON "_pages_v_version_hub_category_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hub_category_cards_parent_id_idx" ON "_pages_v_version_hub_category_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_hub_extra_cards_order_idx" ON "_pages_v_version_hub_extra_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hub_extra_cards_parent_id_idx" ON "_pages_v_version_hub_extra_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_category_cards_order_idx" ON "_pages_v_version_category_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_version_category_cards_parent_id_idx" ON "_pages_v_version_category_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_sections_order_idx" ON "_pages_v_version_sections" USING btree ("_order");
  CREATE INDEX "_pages_v_version_sections_parent_id_idx" ON "_pages_v_version_sections" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_sections_image_image_upload_idx" ON "_pages_v_version_sections" USING btree ("image_upload_id");
  CREATE INDEX "_pages_v_version_faq_order_idx" ON "_pages_v_version_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_version_faq_parent_id_idx" ON "_pages_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_path_idx" ON "_pages_v" USING btree ("version_path");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_hero_hero_image_version_hero_hero_image_idx" ON "_pages_v" USING btree ("version_hero_hero_image_upload_id");
  CREATE INDEX "_pages_v_version_home_hero_image_version_home_hero_image_idx" ON "_pages_v" USING btree ("version_home_hero_image_upload_id");
  CREATE INDEX "_pages_v_version_home_float_image_1_version_home_float_i_idx" ON "_pages_v" USING btree ("version_home_float_image_1_upload_id");
  CREATE INDEX "_pages_v_version_home_float_image_2_version_home_float_i_idx" ON "_pages_v" USING btree ("version_home_float_image_2_upload_id");
  CREATE INDEX "_pages_v_version_home_story_image_version_home_story_ima_idx" ON "_pages_v" USING btree ("version_home_story_image_upload_id");
  CREATE INDEX "_pages_v_version_about_philosophy_image_version_about_ph_idx" ON "_pages_v" USING btree ("version_about_philosophy_image_upload_id");
  CREATE INDEX "_pages_v_version_about_continuity_image_version_about_co_idx" ON "_pages_v" USING btree ("version_about_continuity_image_upload_id");
  CREATE INDEX "_pages_v_version_og_image_version_og_image_upload_idx" ON "_pages_v" USING btree ("version_og_image_upload_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_featured_image_featured_image_upload_idx" ON "posts" USING btree ("featured_image_upload_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_posts_id_idx" ON "posts_rels" USING btree ("posts_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_featured_image_version_featured_image_u_idx" ON "_posts_v" USING btree ("version_featured_image_upload_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_posts_id_idx" ON "_posts_v_rels" USING btree ("posts_id");
  CREATE INDEX "team_photo_photo_upload_idx" ON "team" USING btree ("photo_upload_id");
  CREATE INDEX "team_updated_at_idx" ON "team" USING btree ("updated_at");
  CREATE INDEX "team_created_at_idx" ON "team" USING btree ("created_at");
  CREATE INDEX "offers_bullets_order_idx" ON "offers_bullets" USING btree ("_order");
  CREATE INDEX "offers_bullets_parent_id_idx" ON "offers_bullets" USING btree ("_parent_id");
  CREATE INDEX "offers_updated_at_idx" ON "offers" USING btree ("updated_at");
  CREATE INDEX "offers_created_at_idx" ON "offers" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_team_id_idx" ON "payload_locked_documents_rels" USING btree ("team_id");
  CREATE INDEX "payload_locked_documents_rels_offers_id_idx" ON "payload_locked_documents_rels" USING btree ("offers_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_hours_order_idx" ON "site_settings_hours" USING btree ("_order");
  CREATE INDEX "site_settings_hours_parent_id_idx" ON "site_settings_hours" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_home_chips" CASCADE;
  DROP TABLE "pages_home_service_cards" CASCADE;
  DROP TABLE "pages_home_features" CASCADE;
  DROP TABLE "pages_about_tech_cards" CASCADE;
  DROP TABLE "pages_emergency_wait_cards" CASCADE;
  DROP TABLE "pages_hub_category_cards" CASCADE;
  DROP TABLE "pages_hub_extra_cards" CASCADE;
  DROP TABLE "pages_category_cards" CASCADE;
  DROP TABLE "pages_sections" CASCADE;
  DROP TABLE "pages_faq" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "_pages_v_version_home_chips" CASCADE;
  DROP TABLE "_pages_v_version_home_service_cards" CASCADE;
  DROP TABLE "_pages_v_version_home_features" CASCADE;
  DROP TABLE "_pages_v_version_about_tech_cards" CASCADE;
  DROP TABLE "_pages_v_version_emergency_wait_cards" CASCADE;
  DROP TABLE "_pages_v_version_hub_category_cards" CASCADE;
  DROP TABLE "_pages_v_version_hub_extra_cards" CASCADE;
  DROP TABLE "_pages_v_version_category_cards" CASCADE;
  DROP TABLE "_pages_v_version_sections" CASCADE;
  DROP TABLE "_pages_v_version_faq" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "team" CASCADE;
  DROP TABLE "offers_bullets" CASCADE;
  DROP TABLE "offers" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_hours" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_status" CASCADE;
  DROP TYPE "public"."enum_pages_template";
  DROP TYPE "public"."enum__pages_v_version_template";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_enquiries_form_type";
  DROP TYPE "public"."enum_enquiries_email_status";
  DROP TYPE "public"."enum_redirects_type";
  DROP TYPE "public"."enum_users_role";`)
}
