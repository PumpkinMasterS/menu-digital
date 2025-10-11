import { Tool } from "@langchain/core/tools";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const NewsSearchSchema = z.object({
  query: z.string().describe("The search query for news articles"),
  maxResults: z.number().optional().default(5).describe("Maximum number of news articles to return"),
  language: z.string().optional().default("pt").describe("Language code for news (pt, en, es, etc.)"),
  category: z.string().optional().describe("News category (business, entertainment, general, health, science, sports, technology)"),
});

export class NewsSearchTool extends Tool {
  name = "news_search";
  description = "Search for recent news articles and current events from reliable news sources";
  schema = NewsSearchSchema;

  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 1800000; // 30 minutes in milliseconds (news changes frequently)

  constructor() {
    super();
  }

  private getCacheKey(query: string, maxResults: number, language: string, category?: string): string {
    return `news:${language}:${category || 'general'}:${query}:${maxResults}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  async _call(input: z.infer<typeof NewsSearchSchema>): Promise<string> {
    const { query, maxResults, language, category } = input;
    const cacheKey = this.getCacheKey(query, maxResults, language, category);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      return JSON.stringify(cached.data);
    }

    try {
      // Use NewsAPI if available, otherwise fallback to RSS feeds
      const newsApiKey = Deno.env.get('NEWS_API_KEY');
      
      if (newsApiKey) {
        return await this.searchWithNewsAPI(query, maxResults, language, category, cacheKey);
      } else {
        return await this.searchWithRSSFeeds(query, maxResults, language, cacheKey);
      }
    } catch (error) {
      console.error('News search error:', error);
      return JSON.stringify({
        error: `Failed to search news: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query,
        language,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async searchWithNewsAPI(
    query: string, 
    maxResults: number, 
    language: string, 
    category: string | undefined,
    cacheKey: string
  ): Promise<string> {
    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    const baseUrl = 'https://newsapi.org/v2/everything';
    
    const params = new URLSearchParams({
      q: query,
      language: language,
      sortBy: 'publishedAt',
      pageSize: maxResults.toString(),
      apiKey: newsApiKey!
    });

    if (category) {
      params.set('category', category);
    }

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'User-Agent': 'CleverSchoolPal/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    const results = {
      articles: data.articles?.map((article: any) => ({
        title: article.title || '',
        description: article.description || '',
        url: article.url || '',
        source: article.source?.name || '',
        publishedAt: article.publishedAt || '',
        urlToImage: article.urlToImage || ''
      })) || [],
      totalResults: data.totalResults || 0,
      query,
      language,
      category,
      timestamp: new Date().toISOString()
    };

    // Cache the results
    this.cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    return JSON.stringify(results);
  }

  private async searchWithRSSFeeds(
    query: string, 
    maxResults: number, 
    language: string,
    cacheKey: string
  ): Promise<string> {
    // Fallback to RSS feeds from reliable sources
    const rssSources = language === 'pt' ? [
      'https://feeds.folha.uol.com.br/folha/cotidiano/rss091.xml',
      'https://g1.globo.com/rss/g1/',
      'https://www.uol.com.br/rss/ultnot/',
    ] : [
      'https://feeds.reuters.com/reuters/topNews',
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://rss.cnn.com/rss/edition.rss',
    ];

    try {
      // For now, return a simplified response indicating RSS parsing would be needed
      const results = {
        articles: [],
        message: `RSS feed parsing for "${query}" would be implemented here. Consider using NewsAPI for better results.`,
        query,
        language,
        sources: rssSources,
        timestamp: new Date().toISOString(),
        note: 'To enable full news search, add NEWS_API_KEY to environment variables'
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });

      return JSON.stringify(results);
    } catch (error) {
      throw new Error(`RSS feed parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}