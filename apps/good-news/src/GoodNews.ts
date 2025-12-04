import dayjs from "dayjs";
import * as consts from "./consts";
import * as utils from "@otm/utils";
import {
  GoodNewsInterface,
  GoodNewsArticle,
  GoodNewsHeadline,
  GoodNewsSummary,
  GoodNewsUrlMap,
  GoodNewsH3,
  GoodNewsPeriod,
} from "./types/GoodNews";
import { Ollama, OllamaClient } from "@otm/ollama";

/**
 * Main class for fetching, processing, and summarizing good news articles from various sources.
 *
 * This class implements the GoodNewsInterface and provides functionality to:
 * - Fetch headlines from multiple news sources
 * - Extract article content from headlines
 * - Generate summaries using an Ollama LLM client
 * - Filter and save top stories based on quality scores
 *
 * @implements {GoodNewsInterface}
 */
export default class GoodNews implements GoodNewsInterface {
  /** The cutoff date for acceptable news articles based on the specified period */
  lastAcceptableDate: Date;

  /** The Ollama client instance used for generating article summaries */
  ollamaClient: OllamaClient;

  /**
   * Creates a new GoodNews instance.
   *
   * @param {GoodNewsPeriod} period - The time period (in days) to look back for news articles
   * @param {OllamaClient} ollamaClient - The Ollama client instance for generating summaries
   */
  constructor(period: GoodNewsPeriod, ollamaClient: OllamaClient) {
    this.ollamaClient = ollamaClient;
    const today = new Date();
    this.lastAcceptableDate = new Date();
    this.lastAcceptableDate.setDate(today.getDate() - period);
  }

  /**
   * Factory method to create a new GoodNews instance with an initialized Ollama client.
   *
   * @param {GoodNewsPeriod} period - The time period (in days) to look back for news articles
   * @returns {Promise<GoodNews>} A Promise that resolves to a new GoodNews instance
   */
  static async create(period: GoodNewsPeriod) {
    const ollamaClient = await Ollama.createOllama(consts.OLLAMA_MODEL);

    return new GoodNews(period, ollamaClient);
  }

  /**
   * Writes article summaries to disk, organizing them by source and date period.
   *
   * Summaries are sorted by score (descending) and saved in two locations:
   * - Individual files per source (e.g., `usa.txt`, `world.txt`)
   * - A combined file containing all summaries (`all.txt`)
   *
   * Files are organized in directories by year and date period (e.g., `2024/January1_January8/`)
   *
   * @private
   * @param {GoodNewsSummary[]} data - Array of article summaries to write
   * @returns {Promise<void>} A Promise that resolves when all files have been written
   */
  private async writeSummary(data: GoodNewsSummary[]): Promise<void> {
    data.sort((a, b) => b.score - a.score);
    const now = dayjs();
    const year = now.format("YYYY");
    const today = now.format("MMMMD");
    const lastPeriod = dayjs(this.lastAcceptableDate).format("MMMMD");
    const periodDir = `${lastPeriod}_${today}`;
    const dataDir = `${__dirname}/data/${year}/${periodDir}`;
    await utils.createDirectoriesSync(dataDir);
    for (const summary of data) {
      const subjectFile = `${dataDir}/${summary.article.headline.source}.txt`;
      const allFile = `${dataDir}/all.txt`;
      await utils.appendFileSync(subjectFile, JSON.stringify(summary, null, 2));
      await utils.appendFileSync(allFile, JSON.stringify(summary, null, 2));
    }
  }

  /**
   * Fetches headlines from multiple news sources specified in the URL map.
   *
   * Deduplicates headlines by title to avoid processing the same article multiple times.
   *
   * @param {GoodNewsUrlMap} pageUrls - Map of source names to their corresponding URLs
   * @returns {Promise<GoodNewsHeadline[]>} A Promise that resolves to an array of unique headlines
   */
  async fetchHeadlines(pageUrls: GoodNewsUrlMap): Promise<GoodNewsHeadline[]> {
    const headlineTitles: Set<string> = new Set();
    const headlines: GoodNewsHeadline[] = [];

    for (const [source, headlineUrl] of Object.entries(pageUrls)) {
      for (const headline of await this.fetchHeadlinesFromPage(headlineUrl)) {
        if (!headlineTitles.has(headline.title)) {
          headline.source = source;
          headlines.push(headline);
        }
        headlineTitles.add(headline.title);
      }
    }

    return headlines;
  }

  /**
   * Fetches headlines from a single news page URL.
   *
   * Parses the HTML page using Cheerio, extracts headlines from elements with class "td_module_3",
   * and filters them based on whether their publication date is within the acceptable range.
   *
   * @param {string} url - The URL of the news page to fetch headlines from
   * @returns {Promise<GoodNewsHeadline[]>} A Promise that resolves to an array of headlines from the page
   */
  async fetchHeadlinesFromPage(url: string): Promise<GoodNewsHeadline[]> {
    const $ = await utils.fetchUrlToCheerio(url);

    const headlines: GoodNewsHeadline[] = [];

    $(".td_module_3").each((_: any, element) => {
      const data = $(element).find("h3 a").attr() as unknown as GoodNewsH3;
      const dateText = $(element).find(".td-post-date").text().trim();
      const date = new Date(dateText);
      if (date >= this.lastAcceptableDate) {
        headlines.push({
          dateString: date.toDateString(),
          date,
          rel: data.rel,
          href: data.href,
          title: data.title,
        });
      }
    });

    return headlines;
  }

  /**
   * Fetches and extracts the full text content of an article from its headline.
   *
   * Cleans the article text by removing empty lines and trimming whitespace,
   * then joins the filtered content into a single string.
   *
   * @param {GoodNewsHeadline} headline - The headline object containing the article URL
   * @returns {Promise<GoodNewsArticle>} A Promise that resolves to an article object with headline and content
   */
  async fetchArticleText(headline: GoodNewsHeadline): Promise<GoodNewsArticle> {
    const $ = await utils.fetchUrlToCheerio(headline.href);

    const postText = $("div.td-post-content").text();
    let postTextArr = postText.split("\n");
    postTextArr = postTextArr.map((text) => text.trim());
    postTextArr = postTextArr.filter((str) => str !== "");
    const filteredText = postTextArr.join(" ");

    return {
      headline: headline,
      content: filteredText,
    };
  }

  /**
   * Generates a quality score summary for an article using the Ollama LLM client.
   *
   * Sends the article's title and content to the Ollama model, which returns a numeric score.
   * The score is used to determine if the article qualifies as a "top story".
   *
   * @param {GoodNewsArticle} article - The article to generate a summary for
   * @returns {Promise<GoodNewsSummary>} A Promise that resolves to a summary object containing the article and its score
   */
  async generateSummary(article: GoodNewsArticle): Promise<GoodNewsSummary> {
    const res = await this.ollamaClient.generate({
      prompt: `${article.headline.title} ${article.content}`,
    });

    const score = Number(res.response);

    return {
      article: article,
      score,
    };
  }

  /**
   * Main workflow method that orchestrates the entire news fetching and processing pipeline.
   *
   * This method:
   * 1. Fetches headlines from all configured news sources
   * 2. Fetches the full text content for each headline
   * 3. Generates quality scores for each article using the LLM
   * 4. Filters articles with scores greater than 6
   * 5. Writes the top stories to disk
   *
   * @returns {Promise<void>} A Promise that resolves when all processing is complete
   */
  async fetchTopStories() {
    const headlines: GoodNewsHeadline[] = await this.fetchHeadlines(
      consts.HEADLINE_TYPES,
    );

    const articles: GoodNewsArticle[] = [];
    for (const headline of headlines) {
      articles.push(await this.fetchArticleText(headline));
    }

    const summaries: GoodNewsSummary[] = [];
    for (const article of articles) {
      const summary = await this.generateSummary(article);
      if (summary.score > 6) {
        summaries.push(summary);
      }
    }

    await this.writeSummary(summaries);
  }
}

/**
 * Main entry point for the GoodNews application.
 *
 * Creates a GoodNews instance configured for a one-week period and fetches top stories.
 */
async function main() {
  const news = await GoodNews.create(GoodNewsPeriod.WEEK);
  news.fetchTopStories();
}

main();
