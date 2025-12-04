import { NextFunction, Request, Response } from "express";
import GoodNews from "../GoodNews";
import * as consts from "../consts";
import { GoodNewsPeriod } from "../types/GoodNews";

/**
 * Health check endpoint
 */
export function getHealth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        status: "healthy",
        service: "good-news",
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Fetch top stories from all configured news sources
 *
 * @param req.query.period - Optional period in days (defaults to 7 for WEEK)
 */
export function fetchTopStories() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period
        ? Number(req.query.period)
        : GoodNewsPeriod.WEEK;

      const news = await GoodNews.create(period);
      await news.fetchTopStories();

      res.status(200).json({
        message: "Top stories fetched and saved successfully",
        period: period,
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Fetch headlines from all configured news sources
 *
 * @param req.query.period - Optional period in days (defaults to 7 for WEEK)
 */
export function getHeadlines() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period
        ? Number(req.query.period)
        : GoodNewsPeriod.WEEK;

      const news = await GoodNews.create(period);
      const headlines = await news.fetchHeadlines(consts.HEADLINE_TYPES);

      res.status(200).json({
        count: headlines.length,
        headlines: headlines,
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Fetch headlines from a specific news source
 *
 * @param req.params.source - The source name (usa, world, inspiring, heroes, science, business)
 * @param req.query.period - Optional period in days (defaults to 7 for WEEK)
 */
export function getHeadlinesBySource() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const source = String(req.params.source);
      const period = req.query.period
        ? Number(req.query.period)
        : GoodNewsPeriod.WEEK;

      if (!consts.HEADLINE_TYPES[source]) {
        return res.status(404).json({
          error: `Source '${source}' not found. Available sources: ${Object.keys(
            consts.HEADLINE_TYPES,
          ).join(", ")}`,
        });
      }

      const news = await GoodNews.create(period);
      const headlines = await news.fetchHeadlinesFromPage(
        consts.HEADLINE_TYPES[source],
      );

      return res.status(200).json({
        source: source,
        count: headlines.length,
        headlines: headlines,
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Fetch article content from a headline URL
 *
 * @param req.body.href - The article URL to fetch
 */
export function getArticle() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { href } = req.body;

      if (!href) {
        res.status(400).json({
          error: "Missing required field: href",
        });
      }

      const news = await GoodNews.create(GoodNewsPeriod.WEEK);
      const headline = {
        href,
        title: "",
        date: new Date(),
        dateString: new Date().toDateString(),
        rel: "",
      };

      const article = await news.fetchArticleText(headline);

      res.status(200).json({
        article: article,
      });
    } catch (error) {
      next(error);
    }
  };
}
