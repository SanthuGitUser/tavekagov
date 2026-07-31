export type NewsArticle = {
  article_id: string;
  link: string;
  title: string;
  description: string | null;
  content: string | null;
  keywords: string[] | null;
  creator: string[] | null;
  language: string;
  country: string[];
  category: string[];
  datatype: string;
  pubDate: string;
  pubDateTZ: string;
  fetched_at: string;
  image_url: string | null;
  video_url: string | null;
  source_id: string;
  source_name: string;
  source_priority: number;
  source_url: string;
  source_icon: string | null;
  sentiment: string | null;
  sentiment_stats: string | null;
  ai_tag: string | null;
  ai_region: string | null;
  ai_org: string | null;
  ai_summary: string | null;
  duplicate: boolean;
};

export type NewsStoryGroup = {
  id: string;
  primary: NewsArticle;
  sources: NewsArticle[];
};

export type NewsSourceQuery = {
  endpoint: string;
  q: string;
  country: string;
  language: string;
};

export type NewsFeedResponse = {
  status: string;
  totalResults: number;
  filterDate: string;
  sourceQuery: NewsSourceQuery;
  results: NewsArticle[];
};
