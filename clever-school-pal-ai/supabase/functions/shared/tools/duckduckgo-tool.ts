import { Tool } from "@langchain/core/tools";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const DuckDuckGoSearchSchema = z.object({
  query: z.string().describe("The search query to execute"),
  maxResults: z.number().optional().default(5).describe("Maximum number of results to return"),
});

export class DuckDuckGoSearchTool extends Tool {
  name = "duckduckgo_search";
  description = "Search the web using DuckDuckGo for general information, current events, and real-time data";
  schema = DuckDuckGoSearchSchema;

  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 3600000; // 1 hour in milliseconds

  constructor() {
    super();
  }

  private getCacheKey(query: string, maxResults: number): string {
    return `ddg:${query}:${maxResults}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  async _call(input: z.infer<typeof DuckDuckGoSearchSchema>): Promise<string> {
    const { query, maxResults } = input;
    const cacheKey = this.getCacheKey(query, maxResults);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      return JSON.stringify(cached.data);
    }

    try {
      // Use DuckDuckGo Instant Answer API (free, no API key required)
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CleverSchoolPal/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Format results for LLM consumption
      const results = {
        abstract: data.Abstract || '',
        abstractText: data.AbstractText || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        relatedTopics: data.RelatedTopics?.slice(0, maxResults).map((topic: any) => ({
          text: topic.Text || '',
          firstURL: topic.FirstURL || ''
        })) || [],
        answer: data.Answer || '',
        answerType: data.AnswerType || '',
        definition: data.Definition || '',
        definitionSource: data.DefinitionSource || '',
        definitionURL: data.DefinitionURL || '',
        infobox: data.Infobox || null,
        type: data.Type || '',
        redirect: data.Redirect || ''
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });

      return JSON.stringify(results);
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return JSON.stringify({
        error: `Failed to search DuckDuckGo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query,
        timestamp: new Date().toISOString()
      });
    }
  }
}