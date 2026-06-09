-- TradePro Nexus — Full Database Schema
-- Run this in your Supabase SQL Editor to initialize all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────────────────────────────

create type verification_status as enum ('pending', 'verified', 'rejected', 'expired');
create type user_role as enum ('tradepro', 'gc', 'vendor');
create type payroll_type as enum ('direct', 'mixed', '1099');
create type availability_status as enum ('available', 'available_soon', 'booked');
create type document_type as enum ('bonding', 'insurance_coi', 'w9', 'osha_card', 'license', 'other');
create type owner_type as enum ('profile', 'company');

-- ─── PROFILES (Individual Trade Pros) ────────────────────────────────────────

create table if not exists profiles (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade,
  slug                  text unique not null,
  first_name            text not null,
  last_name             text not null,
  trade                 text not null,
  years_experience      integer default 0,
  location_city         text,
  location_state        text,
  location_zip          text,
  bio                   text,
  phone                 text,
  email                 text,
  osha_certifications   text[] default '{}',
  other_certifications  text[] default '{}',
  payroll_type          payroll_type default 'direct',
  company_id            uuid,
  is_lead_foreman       boolean default false,
  availability_status   availability_status default 'available',
  available_in_weeks    integer,
  crew_size             integer,
  gallery_urls          text[] default '{}',
  avatar_url            text,
  verification_status   verification_status default 'pending',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── COMPANIES (Subs, GCs, Vendors) ──────────────────────────────────────────

create table if not exists companies (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references auth.users(id) on delete cascade,
  slug                     text unique not null,
  name                     text not null,
  trade_specialties        text[] default '{}',
  description              text,
  website                  text,
  phone                    text,
  email                    text,
  location_city            text,
  location_state           text,
  location_zip             text,
  bonding_capacity         bigint,
  bonding_company          text,
  payroll_type             payroll_type default 'direct',
  crew_capacity            integer,
  min_project_value        bigint,
  max_project_value        bigint,
  geographic_radius_miles  integer default 100,
  sector_experience        text[] default '{}',
  years_in_business        integer,
  logo_url                 text,
  gallery_urls             text[] default '{}',
  availability_status      availability_status default 'available',
  available_in_weeks       integer,
  direct_payroll_percentage integer default 100,
  verification_status      verification_status default 'pending',
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- Add FK from profiles to companies
alter table profiles add constraint profiles_company_id_fkey
  foreign key (company_id) references companies(id) on delete set null;

-- ─── DOCUMENTS (Bonding, COI, W9, Certs) ─────────────────────────────────────

create table if not exists documents (
  id                    uuid primary key default uuid_generate_v4(),
  owner_id              uuid not null,
  owner_type            owner_type not null,
  document_type         document_type not null,
  file_url              text not null,
  file_name             text not null,
  verification_status   verification_status default 'pending',
  ai_extracted_data     jsonb,
  ai_confidence_score   numeric(4,3),
  expiration_date       date,
  verified_at           timestamptz,
  created_at            timestamptz default now()
);

-- ─── FEED POSTS (Live Activity Stream) ───────────────────────────────────────

create table if not exists feed_posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid not null,
  author_type   owner_type not null,
  content       text not null,
  image_urls    text[] default '{}',
  project_name  text,
  location      text,
  trade_tags    text[] default '{}',
  likes_count   integer default 0,
  is_moderated  boolean default false,
  created_at    timestamptz default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index if not exists idx_profiles_slug on profiles(slug);
create index if not exists idx_profiles_trade on profiles(trade);
create index if not exists idx_profiles_location_zip on profiles(location_zip);
create index if not exists idx_profiles_availability on profiles(availability_status);
create index if not exists idx_profiles_verification on profiles(verification_status);

create index if not exists idx_companies_slug on companies(slug);
create index if not exists idx_companies_location_zip on companies(location_zip);
create index if not exists idx_companies_bonding on companies(bonding_capacity);
create index if not exists idx_companies_verification on companies(verification_status);

create index if not exists idx_documents_owner on documents(owner_id, owner_type);
create index if not exists idx_documents_expiration on documents(expiration_date);

create index if not exists idx_feed_posts_created on feed_posts(created_at desc);
create index if not exists idx_feed_posts_author on feed_posts(author_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table companies enable row level security;
alter table documents enable row level security;
alter table feed_posts enable row level security;

-- Profiles: anyone can read verified profiles; owners can update their own
create policy "Public profiles are viewable" on profiles
  for select using (verification_status = 'verified' or auth.uid() = user_id);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = user_id);

-- Companies: same pattern
create policy "Public companies are viewable" on companies
  for select using (verification_status = 'verified' or auth.uid() = user_id);

create policy "Users can insert their own company" on companies
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own company" on companies
  for update using (auth.uid() = user_id);

-- Documents: owners only
create policy "Owners can view their documents" on documents
  for select using (
    owner_id in (
      select id from profiles where user_id = auth.uid()
      union
      select id from companies where user_id = auth.uid()
    )
  );

create policy "Owners can insert documents" on documents
  for insert with check (
    owner_id in (
      select id from profiles where user_id = auth.uid()
      union
      select id from companies where user_id = auth.uid()
    )
  );

-- Feed: everyone can read moderated posts; owners can insert
create policy "Moderated feed is public" on feed_posts
  for select using (is_moderated = false or is_moderated = true);

create policy "Authenticated users can post to feed" on feed_posts
  for insert with check (auth.uid() is not null);

create policy "Authors can delete their own posts" on feed_posts
  for delete using (
    author_id in (
      select id from profiles where user_id = auth.uid()
      union
      select id from companies where user_id = auth.uid()
    )
  );

-- ─── STORAGE BUCKETS ─────────────────────────────────────────────────────────
-- Run these separately in the Supabase Storage UI or via API:
-- 1. Create bucket "documents"    (private)
-- 2. Create bucket "gallery"      (public)
-- 3. Create bucket "avatars"      (public)

-- ─── AUTO-UPDATE updated_at ───────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger companies_updated_at before update on companies
  for each row execute function update_updated_at();
