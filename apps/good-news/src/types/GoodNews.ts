import { OllamaClient } from "@otm/ollama";

export type GoodNewsUrlMap = Record<string, string>;

export interface GoodNewsInterface {
  ollamaClient: OllamaClient;

  fetchHeadlines(pageUrls: GoodNewsUrlMap): Promise<GoodNewsHeadline[]>;
  fetchHeadlinesFromPage(url: string): Promise<GoodNewsHeadline[]>;
  fetchArticleText(headline: GoodNewsHeadline): Promise<GoodNewsArticle>;
  fetchTopStories(): Promise<void>;
  generateSummary(article: GoodNewsArticle): Promise<GoodNewsSummary>;
}

export interface GoodNewsArticle {
  headline: GoodNewsHeadline;
  content: string;
}

export interface GoodNewsH3 {
  href: string;
  rel: string;
  title: string;
}

export interface GoodNewsHeadline {
  dateString: string;
  date: Date;
  href: string;
  rel: string;
  title: string;
  source?: string;
}

export interface GoodNewsSummary {
  article: GoodNewsArticle;
  score: number;
}

export enum GoodNewsPeriod {
  WEEK = 7,
  MONTH = 30,
}
