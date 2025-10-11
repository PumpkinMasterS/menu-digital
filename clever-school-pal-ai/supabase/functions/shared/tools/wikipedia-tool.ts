import { Tool } from "@langchain/core/tools";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const WikipediaSearchSchema = z.object({
  query: z.string().describe("The search query to execute on Wikipedia"),
  maxResults: z.number().optional().default(3).describe("Maximum number of results to return"),
  language: z.string().optional().default("pt").describe("Language code for Wikipedia (pt, en, es, etc.)"),
});

export class WikipediaSearchTool extends Tool {
  name = "wikipedia_search";
  description = "Search Wikipedia for encyclopedic information, historical facts, and detailed explanations";
  schema = WikipediaSearchSchema;

  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 86400000; // 24 hours in milliseconds (Wikipedia content is more stable)

  constructor() {
    super();
  }

  private getCacheKey(query: string, maxResults: number, language: string): string {
    return `wiki:${language}:${query}:${maxResults}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  async _call(input: z.infer<typeof WikipediaSearchSchema>): Promise<string> {
    const { query, maxResults, language } = input;
    const cacheKey = this.getCacheKey(query, maxResults, language);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      return JSON.stringify(cached.data);
    }

    try {
      // First, search for articles
      const searchUrl = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}&origin=*`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'CleverSchoolPal/1.0 (https://cleverschoolpal.com)',
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`Wikipedia search API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const searchResults = searchData.query?.search || [];

      if (searchResults.length === 0) {
        return JSON.stringify({
          results: [],
          message: `No Wikipedia articles found for "${query}"`,
          query,
          language,
          timestamp: new Date().toISOString()
        });
      }

      // Get detailed content for the top results
      const pageIds = searchResults.slice(0, maxResults).map((result: any) => result.pageid);
      const contentUrl = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${pageIds.join('|')}&prop=extracts|info&exintro=true&explaintext=true&exsectionformat=plain&inprop=url&format=json&origin=*`;
      
      const contentResponse = await fetch(contentUrl, {
        headers: {
          'User-Agent': 'CleverSchoolPal/1.0 (https://cleverschoolpal.com)',
        },
      });

      if (!contentResponse.ok) {
        throw new Error(`Wikipedia content API error: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      const pages = contentData.query?.pages || {};

      const results = Object.values(pages).map((page: any) => ({
        title: page.title || '',
        extract: page.extract || '',
        url: page.fullurl || '',
        pageid: page.pageid || 0,
        snippet: page.extract ? page.extract.substring(0, 300) + '...' : ''
      }));

      const formattedResults = {
        results,
        query,
        language,
        totalResults: searchResults.length,
        timestamp: new Date().toISOString()
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: formattedResults,
        timestamp: Date.now()
      });

      return JSON.stringify(formattedResults);
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return JSON.stringify({
        error: `Failed to search Wikipedia: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query,
        language,
        timestamp: new Date().toISOString()
      });
    }
  }
}