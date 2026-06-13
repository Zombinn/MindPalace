#!/usr/bin/env node
const { chromium } = require('/Users/zombin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const MODE = process.argv[2] || 'campus';
const IS_CAMPUS = MODE === 'campus';
const TIMEOUT = 25000;

const KEYWORDS = ['机器学习','计算机视觉','AI infra','深度学习','算法工程师','大模型','AI agent','NLP','AIGC','LLM','强化学习','人工智能'];

const COMPANIES = [
  ['字节跳动', `https://jobs.bytedance.com/${IS_CAMPUS ? 'campus' : 'experienced'}/position`],
  ['小米', `https://xiaomi.jobs.f.mioffice.cn/${IS_CAMPUS ? 'campus' : 'social'}/`],
  ['美团', `https://${IS_CAMPUS ? 'campus' : 'zhaopin'}.meituan.com/${IS_CAMPUS ? 'jobs' : 'web/social'}`],
  ['大疆', IS_CAMPUS ? 'https://apply.careers.dji.com/campus-recruitment/dji/168240?locale=zh-CN' : 'https://apply.careers.dji.com/social-recruitment/dji/168240?locale=zh-CN'],
  ['阿里巴巴', IS_CAMPUS ? 'https://talent.alibaba.com/campus/' : 'https://talent.alibaba.com/off-campus/'],
  ['蚂蚁集团', IS_CAMPUS ? 'https://talent.antgroup.com/campus-full-list' : 'https://talent.antgroup.com/off-campus'],
  ['网易', IS_CAMPUS ? 'https://campus.163.com/app/hy/school' : 'https://hr.163.com/job-list.html'],
  ['Insta360', IS_CAMPUS ? 'https://arashivision.jobs.feishu.cn/campus/?limit=10' : 'https://www.insta360.com/about/careers'],
  ['华大基因', IS_CAMPUS ? 'https://genomics.zhiye.com/campus/jobs' : 'https://www.genomics.cn/careers.html'],
  ['MiniMax', IS_CAMPUS ? 'https://vrfi1sk8a0.jobs.feishu.cn/379481/' : 'https://www.minimax.com/careers'],
  ['Shopee', `https://careers.shopee.cn/${IS_CAMPUS ? 'campus' : 'jobs'}`],
  ['DeepSeek', 'https://www.deepseek.com/'],
  ['腾讯', IS_CAMPUS ? 'https://join.qq.com/post.html?query=2_75,2_76,2_77,2_84,2_93,2_231,2_250,p_2,p_1,w_1&c_t=1' : 'https://careers.tencent.com/search.html'],
  ['百度', IS_CAMPUS ? 'https://talent.baidu.com/jobs/list?type=0' : 'https://talent.baidu.com/jobs/list'],
  ['华为', `https://career.huawei.com/reccampportal/portal5/${IS_CAMPUS ? 'campus-recruitment' : 'social-recruitment'}.html`],
  ['快手', IS_CAMPUS ? 'https://campus.kuaishou.cn/recruit/campus' : 'https://zhaopin.kuaishou.cn/recruit/e/#/official/social/'],
  ['小红书', IS_CAMPUS ? 'https://job.xiaohongshu.com/campus' : 'https://job.xiaohongshu.com/social'],
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function matchKeywords(text) {
  const t = (text || '').toLowerCase();
  return KEYWORDS.filter(k => t.includes(k.toLowerCase()));
}

function csvEscape(s) {
  if (!s) return '';
  const str = String(s).replace(/"/g, '""');
  return `"${str}"`;
}

function stripHtml(text) {
  return (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function scrapeCompany(browser, name, url) {
  const jobs = [];
  const page = await browser.newPage();
  try {
    console.error(`[${name}] ${url}`);
    let loaded = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        loaded = true; break;
      } catch (e) {
        if (attempt === 1) throw e;
        console.error(`  retry...`);
        await sleep(2000);
      }
    }
    await page.waitForTimeout(3000);

    // Strategy: get all text content first
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    console.error(`  body: ${bodyText.length} chars`);

    // Strategy: find clickable job list items
    const cards = await page.$$(
      'a[href*="job"], a[href*="position"], a[href*="detail"], ' +
      '[class*="job-item"], [class*="position-item"], [class*="job-card"], [class*="position-card"], ' +
      'li[class*="job"], li[class*="position"], [class*="list-item"], ' +
      '.job-list > *, .position-list > *'
    );

    if (cards.length === 0) {
      console.error(`  no job cards found`);
      return jobs;
    }
    console.error(`  cards: ${cards.length}`);

    for (let i = 0; i < Math.min(cards.length, 15); i++) {
      try {
        const card = cards[i];
        // Get visible text of the card itself
        const cardText = await card.textContent().catch(() => '');
        const matched = matchKeywords(cardText);
        if (matched.length === 0) continue;

        // Try to get title
        const title = await card.$eval('h3, h4, [class*="title"], [class*="name"], strong', el => el.textContent.trim()).catch(() => cardText.slice(0, 60).trim());

        // Try to click the card to expand detail (inline or new tab)
        let detailText = '';
        try {
          const link = await card.getAttribute('href').catch(() => '');
          if (link) {
            // Open detail page in a new tab
            const detailPage = await browser.newPage();
            try {
              const fullUrl = link.startsWith('http') ? link : new URL(link, page.url()).href;
              await detailPage.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await detailPage.waitForTimeout(2000);
              detailText = await detailPage.evaluate(() => document.body?.innerText || '');
            } catch { /* detail page timeout, skip */ }
            finally { await detailPage.close(); }
          } else {
            // Try inline click expansion
            await card.click().catch(() => {});
            await page.waitForTimeout(1000);
            detailText = await card.textContent().catch(() => cardText);
          }
        } catch {}

        const fullText = (detailText || cardText).replace(/\s+/g, ' ').trim();
        if (!fullText) continue;

        // Parse: try to split into responsibilities (职责) and requirements (要求)
        let resp = '', reqs = '';
        const respMatch = fullText.match(/(?:岗位职责|工作职责|职位描述|职责描述|岗位描述)[：:\s]*(.*?)(?:任职要求|岗位要求|职位要求|工作要求)/);
        const reqsMatch = fullText.match(/(?:任职要求|岗位要求|职位要求|工作要求)[：:\s]*(.*?)(?:$|岗位职责|工作职责)/);
        if (respMatch) resp = respMatch[1].trim().slice(0, 500);
        if (reqsMatch) reqs = reqsMatch[1].trim().slice(0, 500);
        if (!resp && !reqs) resp = fullText.slice(0, 500);

        jobs.push({
          company: name,
          title: title.slice(0, 100),
          responsibilities: resp,
          requirements: reqs,
          link: page.url(),
        });
        console.error(`  ✅ ${title.slice(0, 50)}`);
      } catch {}
    }

    console.error(`  → ${jobs.length} jobs matched`);
  } catch (e) {
    console.error(`  ❌ ${e.message.slice(0, 80)}`);
  } finally {
    await page.close();
    await sleep(1000);
  }
  return jobs;
}

async function main() {
  console.error(`\n🔍 ${IS_CAMPUS ? '校招' : '社招'} AI/ML 职位抓取 (CSV output)\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  const allJobs = [];
  for (const [name, url] of COMPANIES) {
    const jobs = await scrapeCompany(context, name, url);
    allJobs.push(...jobs);
  }
  await browser.close();

  // De-duplicate
  const seen = new Set();
  const unique = allJobs.filter(j => {
    const k = `${j.company}|${j.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.error(`\n📊 ${unique.length} jobs total\n`);

  // Output CSV to stdout
  if (unique.length === 0) {
    console.log('company|title|responsibilities|requirements');
    console.log('(no matching jobs found)|-|-|-');
  } else {
    console.log('company|title|responsibilities|requirements');
    for (const j of unique) {
      console.log(`${csvEscape(j.company)}|${csvEscape(j.title)}|${csvEscape(j.responsibilities)}|${csvEscape(j.requirements)}`);
    }
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
