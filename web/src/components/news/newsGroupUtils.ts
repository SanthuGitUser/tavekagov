import type { NewsArticle, NewsStoryGroup } from "@/types/news";
import { getArticleDateInIst } from "@/lib/newsDateUtils";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

const SIMILARITY_THRESHOLD = 0.45;
const TITLE_OVERLAP_THRESHOLD = 0.55;

function areSameStory(left: NewsArticle, right: NewsArticle): boolean {
  if (getArticleDateInIst(left) !== getArticleDateInIst(right)) return false;

  const titleOverlap = overlapCoefficient(tokenize(left.title), tokenize(right.title));
  if (titleOverlap >= TITLE_OVERLAP_THRESHOLD) return true;

  return storySimilarity(left, right) >= SIMILARITY_THRESHOLD;
}

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return new Set(tokens);
}

function overlapCoefficient(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  return intersection / Math.min(left.size, right.size);
}

function keywordTokens(article: NewsArticle): Set<string> {
  const keywords = (article.keywords ?? [])
    .map((keyword) => keyword.toLowerCase().trim())
    .filter(Boolean);
  return new Set(keywords);
}

function storySimilarity(left: NewsArticle, right: NewsArticle): number {
  const titleOverlap = overlapCoefficient(tokenize(left.title), tokenize(right.title));
  const keywordOverlap = overlapCoefficient(keywordTokens(left), keywordTokens(right));
  return titleOverlap * 0.7 + keywordOverlap * 0.3;
}

function sortSources(sources: NewsArticle[]): NewsArticle[] {
  return [...sources].sort((left, right) => {
    const priorityDiff = left.source_priority - right.source_priority;
    if (priorityDiff !== 0) return priorityDiff;
    return right.pubDate.localeCompare(left.pubDate);
  });
}

export function groupNewsArticles(articles: NewsArticle[]): NewsStoryGroup[] {
  if (articles.length === 0) return [];

  const parent = articles.map((_, index) => index);

  function find(index: number): number {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  }

  function union(leftIndex: number, rightIndex: number) {
    const leftRoot = find(leftIndex);
    const rightRoot = find(rightIndex);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  }

  for (let leftIndex = 0; leftIndex < articles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < articles.length; rightIndex += 1) {
      if (areSameStory(articles[leftIndex], articles[rightIndex])) {
        union(leftIndex, rightIndex);
      }
    }
  }

  const clusters = new Map<number, NewsArticle[]>();
  for (let index = 0; index < articles.length; index += 1) {
    const root = find(index);
    const cluster = clusters.get(root) ?? [];
    cluster.push(articles[index]);
    clusters.set(root, cluster);
  }

  return [...clusters.values()]
    .map((sources) => {
      const sortedSources = sortSources(sources);
      return {
        id: sortedSources[0].article_id,
        primary: sortedSources[0],
        sources: sortedSources,
      };
    })
    .sort((left, right) => right.primary.pubDate.localeCompare(left.primary.pubDate));
}

export function storyMatchesSearch(group: NewsStoryGroup, query: string): boolean {
  const haystack = group.sources
    .flatMap((article) => [
      article.title,
      article.description,
      article.source_name,
      article.source_id,
      ...(article.keywords ?? []),
      ...(article.creator ?? []),
      ...article.category,
      ...article.country,
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function storyMatchesCategory(group: NewsStoryGroup, filterId: string): boolean {
  return group.sources.some((article) =>
    article.category.some((category) => category.toLowerCase() === filterId.toLowerCase()),
  );
}

export function getStoryFilters(groups: NewsStoryGroup[]) {
  const categoryCounts = new Map<string, number>();

  for (const group of groups) {
    const categories = new Set<string>();
    for (const article of group.sources) {
      for (const category of article.category) {
        categories.add(category.toLowerCase());
      }
    }
    for (const category of categories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  return [...categoryCounts.entries()]
    .sort((left, right) => {
      const countDiff = right[1] - left[1];
      if (countDiff !== 0) return countDiff;
      return left[0].localeCompare(right[0]);
    })
    .map(([category, count]) => ({
      id: category,
      label: category,
      count,
    }));
}
