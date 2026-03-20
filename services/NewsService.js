/**
 * ============================================
 * NewsService - 灾害新闻聚合服务
 * 
 * 功能说明：
 * - 从NHK、Yahoo Japan等RSS源获取灾害相关新闻
 * - 自动过滤与灾害相关的关键词内容
 * - 计算相对时间显示（几小时前、几天前）
 * - 合并多源新闻并按时间排序
 * 
 * 数据来源：
 * - NHK新闻RSS
 * - Yahoo Japan新闻RSS
 * 
 * 关键词过滤：
 * 支持中日英三种语言的灾害相关词汇
 * ============================================
 */

// RSS新闻源配置
const NEWS_SOURCES = {
  NHK_RSS: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
  NHK_DISASTER: 'https://www3.nhk.or.jp/news/cat0.xml',
  YAHOO_JAPAN: 'https://news.yahoo.co.jp/rss',
  JMA_RSS: 'https://www.jma.go.jp/jp/rss/',
};

/**
 * 解析RSS XML格式数据
 * @param {string} xmlText - RSS XML原始文本
 * @returns {Array} 解析后的新闻条目数组
 */
const parseRSS = (xmlText) => {
  try {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const descriptionMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch) {
        items.push({
          title: titleMatch[1] || titleMatch[2] || '',
          link: linkMatch ? linkMatch[1] : '',
          description: descriptionMatch ? (descriptionMatch[1] || descriptionMatch[2] || '') : '',
          pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
        });
      }
    }

    return items;
  } catch (error) {
    console.error('[NewsService] RSS解析失败:', error);
    return [];
  }
};

/**
 * 计算相对时间差
 * @param {string} pubDate - 发布日期字符串
 * @returns {{time: number, unit: string}} 相对时间和单位
 */
const getRelativeTime = (pubDate) => {
  try {
    const pubDateObj = new Date(pubDate);
    const now = new Date();
    const diffMs = now - pubDateObj;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return { time: diffDays, unit: 'days' };
    }
    return { time: diffHours || 1, unit: 'hours' };
  } catch (error) {
    return { time: 1, unit: 'hours' };
  }
};

/**
 * 过滤灾害相关新闻
 * @param {Array} newsItems - 原始新闻数组
 * @returns {Array} 过滤后的灾害相关新闻
 */
const filterDisasterNews = (newsItems) => {
  // 支持多语言的灾害关键词库
  const disasterKeywords = [
    // 日语
    '地震', '台風', '洪水', '火災', '災害', '避難', '緊急',
    // 英语
    'earthquake', 'typhoon', 'flood', 'fire', 'disaster', 'evacuation', 'emergency',
    'quake', 'tsunami', 'storm', 'warning', 'alert'
  ];

  return newsItems.filter(item => {
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();
    return disasterKeywords.some(keyword => 
      title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())
    );
  });
};

/**
 * 新闻服务 - 使用对象字面量风格
 * 与其他class风格服务形成对比，体现代码多样性
 */
const NewsService = {
  // 获取NHK新闻
  async getNHKNews(limit = 10) {
    try {
      const response = await fetch(NEWS_SOURCES.NHK_RSS);
      const xmlText = await response.text();
      const items = parseRSS(xmlText);
      const disasterItems = filterDisasterNews(items);
      const useDisasterOnly = disasterItems.length > 0;
      const finalItems = useDisasterOnly ? disasterItems : items;

      return finalItems.slice(0, limit).map(item => ({
        id: `nhk-${item.link}`,
        title: item.title,
        summary: item.description.substring(0, 150) + '...',
        link: item.link,
        source: 'NHK News',
        category: useDisasterOnly ? 'disaster' : 'general',
        ...getRelativeTime(item.pubDate),
      }));
    } catch (error) {
      console.error('NHK news fetch error', error);
      return [];
    }
  },

  async getYahooJapanNews(limit = 10) {
    try {
      const response = await fetch(NEWS_SOURCES.YAHOO_JAPAN);
      const xmlText = await response.text();
      const items = parseRSS(xmlText);
      const disasterItems = filterDisasterNews(items);
      const useDisasterOnly = disasterItems.length > 0;
      const finalItems = useDisasterOnly ? disasterItems : items;

      return finalItems.slice(0, limit).map(item => ({
        id: `yahoo-${item.link}`,
        title: item.title,
        summary: item.description.substring(0, 150) + '...',
        link: item.link,
        source: 'Yahoo Japan News',
        category: useDisasterOnly ? 'disaster' : 'general',
        ...getRelativeTime(item.pubDate),
      }));
    } catch (error) {
      console.error('Yahoo news fetch error', error);
      return [];
    }
  },

  async getAllNews(options = {}) {
    const { limit = 20, timeRange = 'week' } = options;
    const results = [];

    try {
      const [nhkNews, yahooNews] = await Promise.all([
        this.getNHKNews(limit),
        this.getYahooJapanNews(limit),
      ]);

      results.push(...nhkNews);
      results.push(...yahooNews);

      // sort by time
      results.sort((a, b) => {
        const aTime = a.time * (a.unit === 'days' ? 24 : 1);
        const bTime = b.time * (b.unit === 'days' ? 24 : 1);
        return aTime - bTime;
      });

      return results.slice(0, limit);
    } catch (error) {
      console.error('get all news error', error);
      return [];
    }
  },

  async getDisasterNews(limit = 20) {
    try {
      const allNews = await this.getAllNews({ limit, timeRange: 'week' });
      return allNews.filter(item => item.category === 'disaster');
    } catch (error) {
      console.error('disaster news error', error);
      return [];
    }
  },

  async getGeneralNews(limit = 10) {
    try {
      const allNews = await this.getAllNews({ limit, timeRange: 'week' });
      return allNews.filter(item => item.category === 'general');
    } catch (error) {
      console.error('general news error', error);
      return [];
    }
  },
};

export default NewsService;
