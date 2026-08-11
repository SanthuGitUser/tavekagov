export type PressRelease = {
  id: number;
  name: string;
  pr_date: string;
  dipr_pr_no: string | null;
  pdf_url: string;
  release_type: string | null;
  department_name: string | null;
  topic: string | null;
  department_id: number | null;
  minister_id: number | null;
  name_parsed: boolean;
  parse_confidence: string | null;
  minister_match_confidence: string | null;
  created_at: string;
};

export type TnDept = {
  id: number;
  name: string;
  dep_id_encoded: string;
  profile_url?: string;
  icon_url?: string;
  minister_name: string | null;
  display_order: number;
};

export type TnMinister = {
  id: number;
  name: string;
  designation: string;
  portfolios: string[];
  photo_url: string | null;
  display_order: number;
  is_chief_minister: boolean;
};

export type TnDistrict = {
  id: number;
  name: string;
  dt_cd_encoded: string;
  profile_url?: string;
  area_size: string | null;
  population: string | null;
  website_url: string | null;
  display_order: number;
};

export type TnConstituency = {
  ac_number: number;
  name: string;
  district: string | null;
  member_name: string;
  party: string | null;
  email: string | null;
  member_display_name: string | null;
  address: string | null;
  phone: string | null;
  photo_url: string | null;
  is_minister: boolean;
  reserved_category: string | null;
  profile_url: string;
  display_order: number;
};

export type TnGoDept = {
  id: number;
  go_date: string;
  go_number: string;
  go_name: string;
  department_name: string;
  dep_id_encoded: string;
  pdf_url: string;
};

export type Magazine = {
  id: number;
  name: string;
  issue_date: string;
  url: string;
  created_at?: string;
  updated_at?: string;
};

export type TnGovtScheme = {
  id: string;
  title: string;
  category: string;
  benefit_summary: string;
  updated_label: string | null;
  is_popular: boolean;
  detail_url: string;
  display_order: number;
  section: "state" | "housing" | "scholarships";
};

export type GovPressRelease = {
  id: number;
  image_url: string;
  release_date: string;
  title: string | null;
  file_name: string | null;
  minister_name: string | null;
  department_name: string | null;
  minister_id: number | null;
  department_id: number | null;
  district_id: number | null;
  title_parsed: boolean;
  parse_confidence: string | null;
  minister_match_confidence: string | null;
  department_match_confidence: string | null;
  district_match_confidence: string | null;
  cm_visits: boolean;
  postings: boolean;
  review_meetings: boolean;
  budget: boolean;
  tributes: boolean;
  others: boolean;
  inspection: boolean;
  portfolio: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TnTransferOfficer = {
  name: string;
  details: string;
  old_post: string;
  new_post: string;
  confidence?: number;
};

export type TnTransfersPosting = {
  id: number;
  serial_number: number;
  go_date: string;
  go_number: string;
  subject: string;
  pdf_url: string;
  officers: TnTransferOfficer[];
  parse_status?: string;
  created_at?: string;
  updated_at?: string;
};

export type TnTransfersPostingRow = TnTransfersPosting & {
  row_id: string;
  officer_name: string;
  details: string;
  old_post: string;
  new_post: string;
  confidence?: number;
};

export type DashboardStats = {
  pressReleases: number;
  departments: number;
  ministers: number;
  districts: number;
  governmentOrders: number;
  transfersPostings: number;
};
