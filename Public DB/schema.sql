-- Run in Supabase → SQL Editor after creating the project.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.tn_dept (
    id bigint primary key,
    name text not null,
    dep_id_encoded text not null,
    minister_name text,
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_dept_name_idx on public.tn_dept (name);
create index if not exists tn_dept_display_order_idx on public.tn_dept (display_order);

drop trigger if exists tn_dept_set_updated_at on public.tn_dept;
create trigger tn_dept_set_updated_at
before update on public.tn_dept
for each row execute function public.set_updated_at();

alter table public.tn_dept enable row level security;

create policy "Public read tn departments"
on public.tn_dept for select
to anon, authenticated
using (true);

create table if not exists public.tn_ministers (
    id bigint primary key,
    name text not null,
    designation text not null,
    portfolio text,
    photo_url text,
    display_order integer not null default 0,
    is_chief_minister boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_ministers_name_idx on public.tn_ministers (name);
create index if not exists tn_ministers_display_order_idx on public.tn_ministers (display_order);

drop trigger if exists tn_ministers_set_updated_at on public.tn_ministers;
create trigger tn_ministers_set_updated_at
before update on public.tn_ministers
for each row execute function public.set_updated_at();

alter table public.tn_ministers enable row level security;

create policy "Public read tn ministers"
on public.tn_ministers for select
to anon, authenticated
using (true);

create table if not exists public.tn_districts (
    id bigint primary key,
    name text not null,
    dt_cd_encoded text not null,
    area_size text,
    population text,
    website_url text,
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_districts_name_idx on public.tn_districts (name);
create index if not exists tn_districts_display_order_idx on public.tn_districts (display_order);

drop trigger if exists tn_districts_set_updated_at on public.tn_districts;
create trigger tn_districts_set_updated_at
before update on public.tn_districts
for each row execute function public.set_updated_at();

alter table public.tn_districts enable row level security;

create policy "Public read tn districts"
on public.tn_districts for select
to anon, authenticated
using (true);

create table if not exists public.tn_go_dept (
    id bigserial primary key,
    go_date date not null,
    go_number text not null,
    go_name text not null,
    department_name text not null,
    dep_id_encoded text not null,
    pdf_url text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (go_number, dep_id_encoded, go_date, pdf_url)
);

create index if not exists tn_go_dept_go_date_idx on public.tn_go_dept (go_date desc);
create index if not exists tn_go_dept_department_name_idx on public.tn_go_dept (department_name);

drop trigger if exists tn_go_dept_set_updated_at on public.tn_go_dept;
create trigger tn_go_dept_set_updated_at
before update on public.tn_go_dept
for each row execute function public.set_updated_at();

alter table public.tn_go_dept enable row level security;

create policy "Public read tn go dept"
on public.tn_go_dept for select
to anon, authenticated
using (true);

create table if not exists public.tn_press_release (
    id bigint primary key,
    name text not null,
    pr_date date not null,
    dipr_pr_no text,
    pdf_url text not null,
    release_type text,
    department_name text,
    topic text,
    department_id bigint references public.tn_dept (id),
    minister_id bigint references public.tn_ministers (id),
    name_parsed boolean not null default false,
    parse_confidence text,
    minister_match_confidence text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_press_release_pr_date_idx on public.tn_press_release (pr_date desc);
create index if not exists tn_press_release_dipr_pr_no_idx on public.tn_press_release (dipr_pr_no);
create index if not exists tn_press_release_department_name_idx
    on public.tn_press_release (department_name);
create index if not exists tn_press_release_release_type_idx
    on public.tn_press_release (release_type);
create index if not exists tn_press_release_minister_id_idx
    on public.tn_press_release (minister_id);
create index if not exists tn_press_release_name_parsed_idx
    on public.tn_press_release (name_parsed)
    where name_parsed = false;

drop trigger if exists tn_press_release_set_updated_at on public.tn_press_release;
create trigger tn_press_release_set_updated_at
before update on public.tn_press_release
for each row execute function public.set_updated_at();

alter table public.tn_press_release enable row level security;

create policy "Public read tn press release"
on public.tn_press_release for select
to anon, authenticated
using (true);

create table if not exists public.magazine (
    id bigint primary key,
    name text not null,
    issue_date date not null,
    url text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists magazine_issue_date_idx on public.magazine (issue_date desc);
create index if not exists magazine_name_idx on public.magazine (name);

drop trigger if exists magazine_set_updated_at on public.magazine;
create trigger magazine_set_updated_at
before update on public.magazine
for each row execute function public.set_updated_at();

alter table public.magazine enable row level security;

create policy "Public read magazine"
on public.magazine for select
to anon, authenticated
using (true);

create table if not exists public.tn_gov_press_releases (
    id bigserial primary key,
    image_url text not null unique,
    release_date date not null,
    title text,
    file_name text,
    minister_name text,
    department_name text,
    minister_id bigint references public.tn_ministers (id),
    department_id bigint references public.tn_dept (id),
    district_id bigint references public.tn_districts (id),
    title_parsed boolean not null default false,
    parse_confidence text,
    minister_match_confidence text,
    department_match_confidence text,
    district_match_confidence text,
    cm_visits boolean not null default false,
    postings boolean not null default false,
    review_meetings boolean not null default false,
    budget boolean not null default false,
    tributes boolean not null default false,
    others boolean not null default false,
    inspection boolean not null default false,
    portfolio boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_gov_press_releases_minister_id_idx
    on public.tn_gov_press_releases (minister_id);

create index if not exists tn_gov_press_releases_department_id_idx
    on public.tn_gov_press_releases (department_id);

create index if not exists tn_gov_press_releases_district_id_idx
    on public.tn_gov_press_releases (district_id);

create index if not exists tn_gov_press_releases_title_parsed_idx
    on public.tn_gov_press_releases (title_parsed)
    where title_parsed = false;

create index if not exists tn_gov_press_releases_cm_visits_idx
    on public.tn_gov_press_releases (cm_visits)
    where cm_visits = true;

create index if not exists tn_gov_press_releases_postings_idx
    on public.tn_gov_press_releases (postings)
    where postings = true;

create index if not exists tn_gov_press_releases_review_meetings_idx
    on public.tn_gov_press_releases (review_meetings)
    where review_meetings = true;

create index if not exists tn_gov_press_releases_budget_idx
    on public.tn_gov_press_releases (budget)
    where budget = true;

create index if not exists tn_gov_press_releases_tributes_idx
    on public.tn_gov_press_releases (tributes)
    where tributes = true;

create index if not exists tn_gov_press_releases_others_idx
    on public.tn_gov_press_releases (others)
    where others = true;

create index if not exists tn_gov_press_releases_inspection_idx
    on public.tn_gov_press_releases (inspection)
    where inspection = true;

create index if not exists tn_gov_press_releases_portfolio_idx
    on public.tn_gov_press_releases (portfolio)
    where portfolio = true;

create index if not exists tn_gov_press_releases_release_date_idx
    on public.tn_gov_press_releases (release_date desc);

drop trigger if exists tn_gov_press_releases_set_updated_at on public.tn_gov_press_releases;
create trigger tn_gov_press_releases_set_updated_at
before update on public.tn_gov_press_releases
for each row execute function public.set_updated_at();

alter table public.tn_gov_press_releases enable row level security;

create policy "Public read tn gov press releases"
on public.tn_gov_press_releases for select
to anon, authenticated
using (true);

create table if not exists public.tn_transfers_postings (
    id bigserial primary key,
    serial_number integer not null,
    go_date date not null,
    go_number text not null,
    subject text not null,
    pdf_url text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_transfers_postings_go_date_idx
    on public.tn_transfers_postings (go_date desc);

create index if not exists tn_transfers_postings_go_number_idx
    on public.tn_transfers_postings (go_number);

drop trigger if exists tn_transfers_postings_set_updated_at on public.tn_transfers_postings;
create trigger tn_transfers_postings_set_updated_at
before update on public.tn_transfers_postings
for each row execute function public.set_updated_at();

alter table public.tn_transfers_postings enable row level security;

create policy "Public read tn transfers postings"
on public.tn_transfers_postings for select
to anon, authenticated
using (true);
