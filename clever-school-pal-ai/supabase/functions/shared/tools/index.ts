// 🌐 MODERN WEB SEARCH TOOLS - Versão Simplificada para Supabase Edge Functions
// Compatível com Deno e sem dependências externas

interface ToolConfig {
  enabled: boolean;
  cache?: boolean;
}

interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

interface CurrentEventsResult {
  events: Array<{
    title: string;
    description: string;
    source: string;
    url?: string;
  }>;
  headlines: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

interface WikipediaResult {
  results: Array<{
    title: string;
    snippet: string;
    url: string;
  }>;
}

interface DuckDuckGoResult {
  abstract: string;
  abstractSource: string;
  abstractURL: string;
  relatedTopics: Array<{
    text: string;
    firstURL: string;
  }>;
}

// 🔍 DuckDuckGo Search Tool
class SimpleDuckDuckGoTool {
  name = "duckduckgo_search";
  description = "Search for general information using DuckDuckGo";

  async _call(params: { query: string; maxResults?: number }): Promise<string> {
    try {
      const { query, maxResults = 3 } = params;
      
      // Usar DuckDuckGo Instant Answer API
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CleverSchoolPal/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const result: DuckDuckGoResult = {
        abstract: data.Abstract || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        relatedTopics: (data.RelatedTopics || []).slice(0, maxResults).map((topic: any) => ({
          text: topic.Text || '',
          firstURL: topic.FirstURL || ''
        }))
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return JSON.stringify({ abstract: '', abstractSource: '', abstractURL: '', relatedTopics: [] });
    }
  }
}

// 📖 Wikipedia Search Tool
class SimpleWikipediaTool {
  name = "wikipedia_search";
  description = "Search for encyclopedic information on Wikipedia";

  async _call(params: { query: string; maxResults?: number; language?: string }): Promise<string> {
    try {
      const { query, maxResults = 2, language = 'pt' } = params;
      
      // Usar Wikipedia API
      const searchUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'CleverSchoolPal/1.0'
        }
      });
      
      if (!response.ok) {
        // Se não encontrar página específica, fazer busca
        const searchApiUrl = `https://${language}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&format=json`;
        const searchResponse = await fetch(searchApiUrl);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const results: WikipediaResult = {
            results: searchData[1].map((title: string, index: number) => ({
              title,
              snippet: searchData[2][index] || '',
              url: searchData[3][index] || ''
            }))
          };
          return JSON.stringify(results);
        }
        
        throw new Error(`Wikipedia API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const result: WikipediaResult = {
        results: [{
          title: data.title || '',
          snippet: data.extract || '',
          url: data.content_urls?.desktop?.page || ''
        }]
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return JSON.stringify({ results: [] });
    }
  }
}

// 📰 Current Events Tool
class SimpleCurrentEventsTool {
  name = "current_events";
  description = "Get current events and news";

  async _call(params: { query: string; maxResults?: number; timeframe?: string; region?: string }): Promise<string> {
    try {
      const { query, maxResults = 3, timeframe = 'today', region = 'br' } = params;
      
      // Usar DuckDuckGo para buscar notícias atuais
      const newsQuery = `${query} notícias ${new Date().getFullYear()}`;
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(newsQuery)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CleverSchoolPal/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const events = [];
      const headlines = [];
      
      // Processar abstract como evento principal
      if (data.Abstract) {
        events.push({
          title: `Informações atuais sobre ${query}`,
          description: data.Abstract,
          source: data.AbstractSource || 'DuckDuckGo',
          url: data.AbstractURL || ''
        });
      }
      
      // Processar tópicos relacionados como manchetes
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, maxResults).forEach((topic: any) => {
          if (topic.Text) {
            headlines.push({
              title: topic.Text.split(' - ')[0] || topic.Text,
              description: topic.Text,
              url: topic.FirstURL || ''
            });
          }
        });
      }
      
      const result: CurrentEventsResult = {
        events,
        headlines
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('Current events search error:', error);
      return JSON.stringify({ events: [], headlines: [] });
    }
  }
}

// 📰 News Search Tool
class SimpleNewsSearchTool {
  name = "news_search";
  description = "Search for recent news articles";

  async _call(params: { query: string; maxResults?: number; language?: string }): Promise<string> {
    try {
      const { query, maxResults = 3, language = 'pt' } = params;
      
      // Usar DuckDuckGo para buscar notícias recentes
      const newsQuery = `${query} notícias site:g1.globo.com OR site:folha.uol.com.br OR site:estadao.com.br`;
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(newsQuery)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CleverSchoolPal/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const articles = [];
      
      // Processar abstract como artigo principal
      if (data.Abstract) {
        articles.push({
          title: `Notícia sobre ${query}`,
          description: data.Abstract,
          url: data.AbstractURL || '',
          source: data.AbstractSource || 'Portal de Notícias',
          publishedAt: new Date().toISOString()
        });
      }
      
      // Processar tópicos relacionados como artigos adicionais
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, maxResults - 1).forEach((topic: any) => {
          if (topic.Text) {
            articles.push({
              title: topic.Text.split(' - ')[0] || topic.Text,
              description: topic.Text,
              url: topic.FirstURL || '',
              source: 'Portal de Notícias',
              publishedAt: new Date().toISOString()
            });
          }
        });
      }
      
      const result = {
        articles
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('News search error:', error);
      return JSON.stringify({ articles: [] });
    }
  }
}

// 🏭 Factory Functions
export function createWebSearchTools(config?: ToolConfig): Array<SimpleDuckDuckGoTool | SimpleWikipediaTool | SimpleCurrentEventsTool | SimpleNewsSearchTool> {
  return [
    new SimpleDuckDuckGoTool(),
    new SimpleWikipediaTool(),
    new SimpleCurrentEventsTool(),
    new SimpleNewsSearchTool()
  ];
}

export function createConfiguredWebSearchTools(config: ToolConfig): Array<SimpleDuckDuckGoTool | SimpleWikipediaTool | SimpleCurrentEventsTool | SimpleNewsSearchTool> {
  if (!config.enabled) return [];
  return createWebSearchTools(config);
}

// Export individual tools
export { SimpleDuckDuckGoTool as DuckDuckGoSearchTool };
export { SimpleWikipediaTool as WikipediaSearchTool };
export { SimpleNewsSearchTool as NewsSearchTool };
export { SimpleCurrentEventsTool as CurrentEventsTool };