🎯 Funcionalidades

Lê feeds RSS do Google News usando a biblioteca rss-to-json
Extrai o conteúdo completo de cada artigo usando cheerio
Formata os dados para serem processados por ChatGPT/Claude ou outra IA

📦 Instalação
bashnpm install rss-to-json cheerio axios
🚀 Como usar
javascriptconst NewsExtractor = require('./news-extractor');

const extractor = new NewsExtractor();

// URL do Google News RSS (exemplo: notícias de tecnologia)
const rssUrl = 'https://news.google.com/rss/search?q=tecnologia&hl=pt-BR&gl=BR&ceid=BR:pt-419';

// Processar 5 artigos
extractor.processRSSFeed(rssUrl, 5).then(result => {
  console.log(result.aiPrompt); // Texto formatado para enviar à IA
  
  // Enviar para ChatGPT/Claude
  // await sendToAI(result.aiPrompt);
});
🔍 Recursos principais

Extração inteligente: Tenta múltiplos seletores CSS para encontrar o conteúdo principal
Limpeza automática: Remove scripts, anúncios, menus e elementos desnecessários
Rate limiting: Delay entre requisições para respeitar os servidores


const { parse } = require('rss-to-json');
const cheerio = require('cheerio');
const axios = require('axios');

/**
 * Classe para extrair notícias de feeds RSS do Google News
 * e preparar o conteúdo para processamento por IA (ChatGPT, Claude, etc)
 */
class NewsExtractor {
  
  /**
   * Busca e parseia um feed RSS
   * @param {string} rssUrl - URL do feed RSS (ex: Google News RSS)
   * @returns {Promise<Object>} Feed parseado com lista de artigos
   */
  async fetchRSS(rssUrl) {
    try {
      console.log(`📡 Buscando feed RSS: ${rssUrl}`);
      const feed = await parse(rssUrl);
      console.log(`✅ Feed obtido: ${feed.title}`);
      console.log(`📰 Total de artigos: ${feed.items.length}`);
      return feed;
    } catch (error) {
      console.error('❌ Erro ao buscar RSS:', error.message);
      throw error;
    }
  }

  /**
   * Extrai o conteúdo HTML de uma URL
   * @param {string} url - URL do artigo
   * @returns {Promise<string>} HTML da página
   */
  async fetchArticleHTML(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao buscar artigo ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Extrai o conteúdo principal do artigo usando Cheerio
   * @param {string} html - HTML da página
   * @param {string} url - URL do artigo (para contexto)
   * @returns {Object} Conteúdo extraído
   */
  extractArticleContent(html, url) {
    const $ = cheerio.load(html);
    
    // Remove scripts, styles e elementos desnecessários
    $('script, style, nav, header, footer, iframe, .advertisement').remove();
    
    // Tenta encontrar o conteúdo principal usando seletores comuns
    const selectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '#content'
    ];
    
    let content = '';
    let title = $('h1').first().text().trim() || $('title').text().trim();
    
    // Tenta extrair o conteúdo usando os seletores
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) {
          break;
        }
      }
    }
    
    // Se não encontrou conteúdo suficiente, pega todos os parágrafos
    if (!content || content.length < 200) {
      content = $('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
    }
    
    // Limpa espaços extras
    content = content.replace(/\s+/g, ' ').trim();
    
    return {
      title,
      content: content.substring(0, 5000), // Limita para não ficar muito grande
      url,
      wordCount: content.split(' ').length
    };
  }

  /**
   * Processa uma lista de artigos do RSS, extraindo o conteúdo completo
   * @param {Array} items - Lista de itens do feed RSS
   * @param {number} maxArticles - Número máximo de artigos para processar
   * @returns {Promise<Array>} Lista de artigos processados
   */
  async processArticles(items, maxArticles = 5) {
    const articles = [];
    const limit = Math.min(items.length, maxArticles);
    
    console.log(`\n🔍 Processando ${limit} artigos...\n`);
    
    for (let i = 0; i < limit; i++) {
      const item = items[i];
      console.log(`\n[${i + 1}/${limit}] Processando: ${item.title}`);
      console.log(`🔗 URL: ${item.link}`);
      
      const html = await this.fetchArticleHTML(item.link);
      
      if (html) {
        const extracted = this.extractArticleContent(html, item.link);
        
        articles.push({
          // Metadados do RSS
          rssTitle: item.title,
          rssDescription: item.description,
          rssLink: item.link,
          published: new Date(item.published || item.created),
          
          // Conteúdo extraído
          extractedTitle: extracted.title,
          content: extracted.content,
          wordCount: extracted.wordCount
        });
        
        console.log(`✅ Extraído: ${extracted.wordCount} palavras`);
      } else {
        console.log('⚠️  Não foi possível extrair o conteúdo');
      }
      
      // Delay entre requisições para ser respeitoso com os servidores
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return articles;
  }

  /**
   * Prepara os artigos para envio para uma IA (ChatGPT, Claude, etc)
   * @param {Array} articles - Lista de artigos processados
   * @returns {string} Texto formatado para IA
   */
  formatForAI(articles) {
    let prompt = "# Notícias Extraídas\n\n";
    prompt += `Total de artigos: ${articles.length}\n\n`;
    
    articles.forEach((article, index) => {
      prompt += `## Artigo ${index + 1}: ${article.extractedTitle || article.rssTitle}\n\n`;
      prompt += `**Data:** ${article.published.toLocaleString('pt-BR')}\n`;
      prompt += `**URL:** ${article.rssLink}\n`;
      prompt += `**Palavras:** ${article.wordCount}\n\n`;
      prompt += `**Conteúdo:**\n${article.content}\n\n`;
      prompt += `---\n\n`;
    });
    
    return prompt;
  }

  /**
   * Pipeline completo: RSS -> Extração -> Formatação para IA
   * @param {string} rssUrl - URL do feed RSS
   * @param {number} maxArticles - Número máximo de artigos
   * @returns {Promise<Object>} Dados processados
   */
  async processRSSFeed(rssUrl, maxArticles = 5) {
    try {
      // 1. Buscar feed RSS
      const feed = await this.fetchRSS(rssUrl);
      
      // 2. Processar artigos
      const articles = await this.processArticles(feed.items, maxArticles);
      
      // 3. Formatar para IA
      const aiPrompt = this.formatForAI(articles);
      
      return {
        feed: {
          title: feed.title,
          link: feed.link,
          description: feed.description
        },
        articles,
        aiPrompt,
        stats: {
          totalArticles: articles.length,
          totalWords: articles.reduce((sum, a) => sum + a.wordCount, 0)
        }
      };
    } catch (error) {
      console.error('❌ Erro no pipeline:', error);
      throw error;
    }
  }
}

// ========== EXEMPLO DE USO ==========

async function main() {
  const extractor = new NewsExtractor();
  
  // Exemplo com Google News RSS (tecnologia em português)
  const googleNewsRSS = 'https://news.google.com/rss/search?q=tecnologia&hl=pt-BR&gl=BR&ceid=BR:pt-419';
  
  try {
    const result = await extractor.processRSSFeed(googleNewsRSS, 3);
    
    console.log('\n\n📊 ESTATÍSTICAS:');
    console.log(`Feed: ${result.feed.title}`);
    console.log(`Artigos processados: ${result.stats.totalArticles}`);
    console.log(`Total de palavras: ${result.stats.totalWords}`);
    
    console.log('\n\n📝 CONTEÚDO FORMATADO PARA IA:');
    console.log('='.repeat(80));
    console.log(result.aiPrompt);
    
    // Aqui você pode enviar result.aiPrompt para ChatGPT/Claude
    console.log('\n\n💡 O conteúdo está pronto para ser enviado para a IA!');
    console.log('Use result.aiPrompt para enviar ao ChatGPT ou outra IA.');
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar exemplo
// main();

module.exports = NewsExtractor;



