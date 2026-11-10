// UI labels shared across components. The site is English only.
const messages = {
  "app.tagline": "Tamil Nadu open data",
  "nav.dashboard": "Dashboard",
  "nav.news": "News",
  "nav.publications": "Govt Publications",
  "nav.administration": "Govt Administration",
  "nav.electionResults": "Election Results",
  "nav.tvkManifesto": "TVK Manifesto",
  "nav.about": "About",
  "nav.search": "Search",
  "search.title": "Search all datasets",
  "search.placeholder": "Search press releases, G.O.s, schemes…",
  "search.empty": "Type at least two characters to search indexed content.",
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}
