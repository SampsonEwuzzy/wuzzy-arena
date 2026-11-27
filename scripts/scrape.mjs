// Pulls headlines from public RSS feeds and writes public/data/posts.json.
// Only the headline, a short summary and a link back to the publisher are stored.
import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const FEEDS = [
  ['BBC Sport', 'Football', 'https://feeds.bbci.co.uk/sport/football/rss.xml'],
  ['BBC Sport', 'Tennis', 'https://feeds.bbci.co.uk/sport/tennis/rss.xml'],
  ['BBC Sport', 'Formula 1', 'https://feeds.bbci.co.uk/sport/formula1/rss.xml'],
  ['BBC Sport', 'Boxing', 'https://feeds.bbci.co.uk/sport/boxing/rss.xml'],
  ['BBC Sport', 'Athletics', 'https://feeds.bbci.co.uk/sport/athletics/rss.xml'],
  ['BBC Sport', 'Cricket', 'https://feeds.bbci.co.uk/sport/cricket/rss.xml'],
  ['BBC Sport', 'Rugby', 'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml'],
  ['ESPN', 'Basketball', 'https://www.espn.com/espn/rss/nba/news'],
  ['ESPN', 'Football', 'https://www.espn.com/espn/rss/soccer/news'],
  ['The Guardian', 'Football', 'https://www.theguardian.com/football/rss'],
  ['Sky Sports', 'Football', 'https://www.skysports.com/rss/12040'],
];

const OUT = 'public/data/posts.json';
const parser = new Parser({
  timeout: 15000,
  customFields: { item: [['media:thumbnail', 'thumb'], ['media:content', 'media']] },
});
const clean = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const imgOf = (i) => i.enclosure?.url || i.thumb?.$?.url || i.media?.$?.url || null;

const fresh = [];
for (const [source, category, url] of FEEDS) {
  try {
    const feed = await parser.parseURL(url);
    for (const i of feed.items.slice(0, 15)) {
      if (!i.link || !i.title) continue;
      fresh.push({
        id: createHash('sha1').update(i.link).digest('hex').slice(0, 16),
        title: clean(i.title),
        summary: clean(i.contentSnippet || i.content || '').slice(0, 240),
        link: i.link, image: imgOf(i), source, category,
        date: new Date(i.isoDate || i.pubDate || Date.now()).toISOString(),
      });
    }
    console.log(`ok   ${source} / ${category}`);
  } catch (e) { console.warn(`skip ${source} / ${category}: ${e.message}`); }
}

const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const byId = new Map([...old, ...fresh].map((p) => [p.id, p]));
const posts = [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 200);
mkdirSync('public/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(posts, null, 1));
console.log(`Saved ${posts.length} stories`);
