export type Locale = "en" | "ta";

export const LOCALE_STORAGE_KEY = "tavekagov-locale";

export type MessageKey =
  | "app.tagline"
  | "nav.dashboard"
  | "nav.news"
  | "nav.publications"
  | "nav.administration"
  | "nav.electionResults"
  | "nav.tvkManifesto"
  | "nav.about"
  | "nav.search"
  | "search.title"
  | "search.placeholder"
  | "search.empty"
  | "a11y.skipToContent"
  | "locale.en"
  | "locale.ta";

const messages: Record<Locale, Record<MessageKey, string>> = {
  en: {
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
    "a11y.skipToContent": "Skip to main content",
    "locale.en": "English",
    "locale.ta": "தமிழ்",
  },
  ta: {
    "app.tagline": "தமிழ்நாடு திறந்த தரவு",
    "nav.dashboard": "டாஷ்போர்டு",
    "nav.news": "செய்திகள்",
    "nav.publications": "அரசு வெளியீடுகள்",
    "nav.administration": "அரசு நிர்வாகம்",
    "nav.electionResults": "தேர்தல் முடிவுகள்",
    "nav.tvkManifesto": "TVK அறிக்கை",
    "nav.about": "பற்றி",
    "nav.search": "தேடல்",
    "search.title": "அனைத்து தரவுகளிலும் தேடுங்கள்",
    "search.placeholder": "செய்தி, அரசாணை, திட்டம்…",
    "search.empty": "தேட குறைந்தது இரண்டு எழுத்துகள் typed செய்யுங்கள்.",
    "a11y.skipToContent": "முதன்மை உள்ளடக்கத்திற்கு செல்",
    "locale.en": "English",
    "locale.ta": "தமிழ்",
  },
};

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key] ?? key;
}

export function readStoredLocale(): Locale {
  if (typeof localStorage === "undefined") return "en";
  const value = localStorage.getItem(LOCALE_STORAGE_KEY);
  return value === "ta" ? "ta" : "en";
}
