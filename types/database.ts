export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";
export type UserRole = "tradepro" | "gc" | "vendor";
export type PayrollType = "direct" | "mixed" | "1099";
export type MatchTier = "green" | "yellow" | "blue";

export interface Profile {
  id: string;
  user_id: string;
  slug: string;
  first_name: string;
  last_name: string;
  trade: string;
  years_experience: number;
  location_city: string;
  location_state: string;
  location_zip: string;
  bio: string;
  phone: string;
  email: string;
  osha_certifications: string[];
  other_certifications: string[];
  payroll_type: PayrollType;
  company_id: string | null;
  is_lead_foreman: boolean;
  availability_status: "available" | "available_soon" | "booked";
  available_in_weeks: number | null;
  crew_size: number | null;
  gallery_urls: string[];
  avatar_url: string | null;
  verification_status: VerificationStatus;
  // Union — optional, self-reported
  union_member: boolean;
  union_name: string | null;
  union_local_number: string | null;
  union_member_status: string | null;
  prevailing_wage_certified: boolean;
  davis_bacon_eligible: boolean;
  union_card_expiration: string | null;
  // Job placement preferences — drive matching/notifications
  open_to_union_jobs_only: boolean;
  seeking_prevailing_wage_work: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  trade_specialties: string[];
  description: string;
  website: string | null;
  phone: string;
  email: string;
  location_city: string;
  location_state: string;
  location_zip: string;
  bonding_capacity: number | null;
  bonding_company: string | null;
  payroll_type: PayrollType;
  crew_capacity: number | null;
  min_project_value: number | null;
  max_project_value: number | null;
  geographic_radius_miles: number | null;
  sector_experience: string[];
  years_in_business: number | null;
  logo_url: string | null;
  gallery_urls: string[];
  availability_status: "available" | "available_soon" | "booked";
  available_in_weeks: number | null;
  direct_payroll_percentage: number;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  owner_id: string;
  owner_type: "profile" | "company";
  document_type: "bonding" | "insurance_coi" | "w9" | "osha_card" | "license" | "other";
  file_url: string;
  file_name: string;
  verification_status: VerificationStatus;
  ai_extracted_data: Record<string, unknown> | null;
  ai_confidence_score: number | null;
  expiration_date: string | null;
  verified_at: string | null;
  created_at: string;
}

export type JobStatus = "pending" | "approved" | "removed";

export interface Job {
  id: string;
  trade: string;
  location_city: string | null;
  location_state: string;
  job_type: string;
  union_requirement: string;
  prevailing_wage: boolean;
  davis_bacon: boolean;
  description: string;
  contact_email: string;
  company_name: string;
  posted_by_user_id: string | null;
  status: JobStatus;
  notified_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedPost {
  id: string;
  author_id: string;
  author_type: "profile" | "company";
  content: string;
  image_urls: string[];
  project_name: string | null;
  location: string | null;
  trade_tags: string[];
  likes_count: number;
  is_moderated: boolean;
  created_at: string;
  profile?: Partial<Profile>;
  company?: Partial<Company>;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company>; Relationships: [] };
      documents: { Row: Document; Insert: Partial<Document>; Update: Partial<Document>; Relationships: [] };
      feed_posts: { Row: FeedPost; Insert: Partial<FeedPost>; Update: Partial<FeedPost>; Relationships: [] };
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
