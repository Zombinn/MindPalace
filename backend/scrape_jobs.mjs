#!/usr/bin/env node
/**
 * 校招/社招职位抓取 — 使用 Playwright 绕过 JS 渲染和反爬。
 * 用法: node scrape_jobs.mjs [campus|social]
 */
import { chromium } from 'playwright';

const MODE = process.argv[2] || 'campus';
const IS_CAMPUS = MODE === 'campus';

const KEYWORDS = ['机器学习','计算机视觉','AI','深度学习','算法','大模型','LLM','NLP','AIGC','强化学习'];
const TIMEOUT = 15000;
const RESULTS = [];

function matchKeyword(title) {
  const t = (title || '').toLowerCase();
  return KEYWORDS.some(kw => t.includes(kw.toLowerCase()));
}

async function scrapeNowcoder(browser) {
  console.error('[牛客网 校招]');
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    // 牛客网 校招职位搜索
    const url = 'https://www.nowcoder.com/jobs/school/center?recruitType=1&page=1';
    await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT });

    // 等待职位列表加载
    await page.waitForSelector('.job-list-item, .recruit-list-item, li[class*="job"]', { timeout: 8000 }).catch(() => {});

    // 输入搜索关键词
    for (const kw of KEYWORDS.slice(0, 3)) {
      try {
        const input = await page.$('input[placeholder*="搜索"], input[class*="search"]');
        if (input) {
          await input.fill('');
          await input.fill(kw);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);
        }
      } catch {}

      const items = await page.$$('.job-list-item, .recruit-list-item, li[class*="job"], div[class*="job-item"]');
      for (const item of items.slice(0, 10)) {
        try {
          const title = await item.$eval('[class*="title"], [class*="job-name"], h3, h4', el => el.textContent.trim()).catch(() => '');
          const company = await item.$eval('[class*="company"], [class*="com-name"]', el => el.textContent.trim()).catch(() => '牛客网');
          const location = await item.$eval('[class*="city"], [class*="location"], [class*="area"]', el => el.textContent.trim()).catch(() => '');
          const link = await item.$eval('a', el => el.href).catch(() => '');
          if (title && matchKeyword(title)) {
            RESULTS.push({ company, title, location, link: link || url, source: '牛客网' });
          }
        } catch {}
      }
    }
    await page.close();
  } catch (e) {
    console.error(`  [牛客网] 抓取失败: ${e.message}`);
  }
}

async function scrapeBytedance(browser) {
  console.error('[字节跳动]');
  const base = IS_CAMPUS
    ? 'https://jobs.bytedance.com/campus/position'
    : 'https://jobs.bytedance.com/experienced/position';
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    await page.goto(base, { waitUntil: 'networkidle', timeout: TIMEOUT });

    // 等待职位卡片
    await page.waitForSelector('[class*="position"], [class*="job"], .list-item', { timeout: 10000 }).catch(() => {});

    // 搜索
    for (const kw of KEYWORDS.slice(0, 3)) {
      try {
        const input = await page.$('input[placeholder*="搜索"], input[class*="search"], input[type="text"]');
        if (input) {
          await input.fill('');
          await input.fill(kw);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2500);
        }
      } catch {}

      const items = await page.$$('[class*="position-card"], [class*="job-card"], [class*="job-item"], .list-item');
      for (const item of items.slice(0, 10)) {
        try {
          const title = await item.$eval('[class*="title"], [class*="name"], h3, h4, span', el => el.textContent.trim()).catch(() => '');
          const location = await item.$eval('[class*="city"], [class*="location"], [class*="area"]', el => el.textContent.trim()).catch(() => '');
          const link = await item.$eval('a', el => el.href).catch(() => base);
          if (title && matchKeyword(title)) {
            RESULTS.push({ company: '字节跳动', title, location, link, source: '字节跳动官网' });
          }
        } catch {}
      }
    }
    await page.close();
  } catch (e) {
    console.error(`  [字节跳动] 抓取失败: ${e.message}`);
  }
}

async function scrapeBossZhipin(browser) {
  console.error('[BOSS直聘]');
  const url = IS_CAMPUS
    ? 'https://www.zhipin.com/web/campus'
    : 'https://www.zhipin.com/web/geek/job';
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT });

    for (const kw of KEYWORDS.slice(0, 3)) {
      try {
        const input = await page.$('input[placeholder*="搜索"], .search-input');
        if (input) {
          await input.fill(kw);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(3000);
        }
      } catch {}

      const items = await page.$$('[class*="job-card"], [class*="job-item"], li[class*="job"]');
      for (const item of items.slice(0, 8)) {
        try {
          const title = await item.$eval('[class*="job-name"], [class*="job-title"], h3', el => el.textContent.trim()).catch(() => '');
          const company = await item.$eval('[class*="company-name"], [class*="company"]', el => el.textContent.trim()).catch(() => '');
          const location = await item.$eval('[class*="job-area"], [class*="location"]', el => el.textContent.trim()).catch(() => '');
          const link = await item.$eval('a', el => el.href).catch(() => '');
          if (title && matchKeyword(title)) {
            RESULTS.push({ company: company || '未知', title, location, link, source: 'BOSS直聘' });
          }
        } catch {}
      }
    }
    await page.close();
  } catch (e) {
    console.error(`  [BOSS直聘] 抓取失败: ${e.message}`);
  }
}

async function main() {
  console.error(`\n🔍 开始${IS_CAMPUS ? '校招' : '社招'} AI/ML 职位抓取...\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    await scrapeBytedance(browser);
    await scrapeBossZhipin(browser);
    if (IS_CAMPUS) {
      await scrapeNowcoder(browser);
    }
  } finally {
    await browser.close();
  }

  // 去重
  const seen = new Set();
  const unique = RESULTS.filter(r => {
    const key = `${r.company}|${r.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    console.log(JSON.stringify({ total: 0, items: [], note: '未找到匹配职位。招聘网站可能暂时无法访问或反爬升级。' }));
  } else {
    console.log(JSON.stringify({ total: unique.length, items: unique }));
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
