import { load as cheerioLoad, CheerioAPI } from "cheerio";
import axios from "axios";

export async function fetchUrlToCheerio(url: string): Promise<CheerioAPI> {
  const response = await axios.get(url);
  const html = response.data;
  return cheerioLoad(html);
}
