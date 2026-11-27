import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BookSearchResult {
  externalId: string;
  source: 'YES24' | 'Open Library' | 'Apple Books' | 'Google Books';
  title: string;
  author: string;
  category: string;
  totalPages: number | null;
  publishYear: string;
  description: string;
  coverImage?: string;
  isbn?: string;
}

const ALLOWED_COVER_HOSTS = new Set([
  'image.yes24.com',
  'covers.openlibrary.org',
  'books.google.com',
  'is1-ssl.mzstatic.com',
  'is2-ssl.mzstatic.com',
  'is3-ssl.mzstatic.com',
  'is4-ssl.mzstatic.com',
  'is5-ssl.mzstatic.com',
]);

function sanitizeCoverUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  try {
    const normalized = rawUrl.replace(/^http:\/\//i, 'https://');
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') return undefined;
    if (!ALLOWED_COVER_HOSTS.has(parsed.hostname)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function stripHtmlAndDecode(text?: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function translateGenre(raw?: string): string {
  if (!raw) return '일반';
  const lower = raw.toLowerCase();
  if (lower.includes('fiction') || lower.includes('novel') || lower.includes('소설')) return '소설';
  if (lower.includes('essay') || lower.includes('에세이')) return '에세이';
  if (lower.includes('science') || lower.includes('nature') || lower.includes('과학')) return '과학';
  if (lower.includes('history') || lower.includes('역사')) return '역사';
  if (lower.includes('philosophy') || lower.includes('철학') || lower.includes('인문')) return '인문';
  if (lower.includes('psychology') || lower.includes('심리')) return '심리';
  if (lower.includes('business') || lower.includes('economics') || lower.includes('경영') || lower.includes('경제')) return '경제·경영';
  if (lower.includes('biography') || lower.includes('memoir') || lower.includes('자서전')) return '에세이·전기';
  if (lower.includes('poetry') || lower.includes('시')) return '시·문학';
  if (lower.includes('art') || lower.includes('architecture') || lower.includes('예술')) return '예술';
  return raw.slice(0, 24);
}

async function searchYes24(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL('https://www.yes24.com/Product/Search');
  url.searchParams.set('domain', 'BOOK');
  url.searchParams.set('query', query);
  url.searchParams.set('PageSize', String(Math.min(Math.max(limit, 1), 24)));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(7000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ReadlogBookLookup/1.0)',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const chunks = html.split('<li ');
  const results: BookSearchResult[] = [];

  for (const chunk of chunks) {
    const idMatch = chunk.match(/data-goods-no="(\d+)"/);
    if (!idMatch) continue;
    const goodsNo = idMatch[1];

    const titleMatch = chunk.match(/<a class="gd_name"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    const title = stripHtmlAndDecode(titleMatch[1]);
    if (!title) continue;

    const authMatch = chunk.match(/<span class="authPub info_auth"[\s\S]*?>([\s\S]*?)<\/span>/);
    const rawAuthor = authMatch ? stripHtmlAndDecode(authMatch[1]) : '';
    const author =
      rawAuthor
        .replace(/정보\s*더\s*보기\/감추기/g, '')
        .replace(/\s*(저|역|그림|글|편|엮음|감수)(\s*\/\s*.*)?$/, '')
        .replace(/\s+/g, ' ')
        .trim() || '저자 미상';

    const pubMatch = chunk.match(/<span class="authPub info_pub"[\s\S]*?>([\s\S]*?)<\/span>/);
    const publisher = pubMatch ? stripHtmlAndDecode(pubMatch[1]) : '';

    const dateMatch = chunk.match(/<span class="authPub info_date"[^>]*>([\s\S]*?)<\/span>/);
    const yearMatch = dateMatch ? dateMatch[1].match(/(\d{4})/) : null;
    const publishYear = yearMatch ? yearMatch[1] : '';

    const readMatch = chunk.match(/<div class="info_row info_read"[\s\S]*?>([\s\S]*?)<\/div>/);
    const sigMatch = chunk.match(/<div class="info_row info_signature"[^>]*>([\s\S]*?)<\/div>/);
    const descParts = [readMatch ? stripHtmlAndDecode(readMatch[1]) : '', sigMatch ? stripHtmlAndDecode(sigMatch[1]) : '']
      .filter(Boolean)
      .join(' · ');
    const description = descParts || (publisher ? `출판사: ${publisher}` : '');

    const coverImage = sanitizeCoverUrl(`https://image.yes24.com/goods/${goodsNo}/L`);

    results.push({
      externalId: `yes24:${goodsNo}`,
      source: 'YES24',
      title,
      author,
      category: '도서',
      totalPages: null,
      publishYear,
      description: description.slice(0, 260),
      coverImage,
    });

    if (results.length >= limit) break;
  }

  return results;
}

async function fetchYes24BookDetail(
  goodsNo: string,
): Promise<{ totalPages: number | null; category?: string; description?: string; isbn?: string }> {
  const url = `https://www.yes24.com/product/goods/${goodsNo}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5500),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ReadlogBookLookup/1.0)',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  if (!res.ok) return { totalPages: null };
  const html = await res.text();

  let totalPages: number | null = null;
  const pageMatch = html.match(/<th[^>]*>쪽수[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/);
  if (pageMatch) {
    const numMatch = pageMatch[1].match(/(\d+)\s*쪽/);
    if (numMatch) {
      totalPages = parseInt(numMatch[1], 10);
    }
  }

  let isbn: string | undefined;
  const isbnMatch = html.match(/<th[^>]*>ISBN13<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/);
  if (isbnMatch) {
    const cleanIsbn = stripHtmlAndDecode(isbnMatch[1]).replace(/[^0-9Xx]/g, '');
    if (cleanIsbn) isbn = cleanIsbn;
  }

  let category: string | undefined;
  const cateBlock = html.match(/id="infoset_goodsCate"[\s\S]*?<ul class="yesAlertLi">([\s\S]*?)<\/ul>/);
  if (cateBlock) {
    const links = Array.from(cateBlock[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)).map((m) =>
      stripHtmlAndDecode(m[1]),
    );
    const meaningful = links.filter((c) => c && c !== '국내도서' && c !== '외국도서');
    if (meaningful.length > 0) {
      category = meaningful.slice(0, 2).join('·');
    }
  }

  let description: string | undefined;
  const ogDescMatch = html.match(/<meta property="og:description" content="([\s\S]*?)"\s*\/?>/);
  if (ogDescMatch) {
    const cleaned = stripHtmlAndDecode(ogDescMatch[1]);
    if (cleaned) description = cleaned.slice(0, 260);
  }

  return { totalPages, category, description, isbn };
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  subject?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  first_sentence?: string[] | string;
}

async function searchOpenLibrary(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL('https://openlibrary.org/search.json');
  if (query.length < 3) {
    url.searchParams.set('title', query);
  } else {
    url.searchParams.set('q', query);
  }
  url.searchParams.set('limit', String(limit));
  url.searchParams.set(
    'fields',
    'key,title,author_name,subject,number_of_pages_median,first_publish_year,cover_i,isbn,first_sentence',
  );

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  if (!Array.isArray(data.docs)) return [];

  return data.docs
    .filter((doc) => doc.title)
    .map((doc, idx): BookSearchResult => {
      const coverUrl = doc.cover_i
        ? sanitizeCoverUrl(`https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`)
        : undefined;
      const firstSentence = Array.isArray(doc.first_sentence)
        ? doc.first_sentence[0]
        : typeof doc.first_sentence === 'string'
          ? doc.first_sentence
          : '';
      return {
        externalId: `ol:${doc.key || idx}`,
        source: 'Open Library',
        title: String(doc.title).trim(),
        author:
          Array.isArray(doc.author_name) && doc.author_name.length > 0
            ? doc.author_name.slice(0, 2).join(', ')
            : '저자 미상',
        category: translateGenre(Array.isArray(doc.subject) ? doc.subject[0] : undefined),
        totalPages:
          typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0
            ? doc.number_of_pages_median
            : null,
        publishYear: doc.first_publish_year ? String(doc.first_publish_year) : '',
        description: stripHtmlAndDecode(firstSentence).slice(0, 240),
        coverImage: coverUrl,
        isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : undefined,
      };
    });
}

interface AppleBookItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  genres?: string[];
  description?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  releaseDate?: string;
}

async function searchAppleBooks(query: string, country: 'kr' | 'us', limit: number): Promise<BookSearchResult[]> {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', query);
  url.searchParams.set('entity', 'ebook');
  url.searchParams.set('country', country);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: AppleBookItem[] };
  if (!Array.isArray(data.results)) return [];

  return data.results
    .filter((item) => item.trackName)
    .map((item, idx): BookSearchResult => {
      const rawArt = item.artworkUrl100 || item.artworkUrl60;
      const upgradedArt = rawArt ? rawArt.replace(/\/(100|60)x\1bb\./, '/300x400bb.') : undefined;
      const year = item.releaseDate ? item.releaseDate.slice(0, 4) : '';
      return {
        externalId: `ab-${country}:${item.trackId || idx}`,
        source: 'Apple Books',
        title: String(item.trackName).trim(),
        author: item.artistName?.trim() || '저자 미상',
        category: translateGenre(Array.isArray(item.genres) ? item.genres[0] : undefined),
        totalPages: null,
        publishYear: /^\d{4}$/.test(year) ? year : '',
        description: stripHtmlAndDecode(item.description).slice(0, 260),
        coverImage: sanitizeCoverUrl(upgradedArt),
      };
    });
}

interface GoogleBookVolume {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    categories?: string[];
    pageCount?: number;
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
  };
}

async function searchGoogleBooks(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(Math.min(limit, 20)));
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(4500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: GoogleBookVolume[] };
  if (!Array.isArray(data.items)) return [];

  return data.items
    .filter((vol) => vol.volumeInfo?.title)
    .map((vol, idx): BookSearchResult => {
      const info = vol.volumeInfo!;
      const year = info.publishedDate ? info.publishedDate.slice(0, 4) : '';
      const rawThumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      return {
        externalId: `gb:${vol.id || idx}`,
        source: 'Google Books',
        title: String(info.title).trim(),
        author:
          Array.isArray(info.authors) && info.authors.length > 0 ? info.authors.slice(0, 2).join(', ') : '저자 미상',
        category: translateGenre(Array.isArray(info.categories) ? info.categories[0] : undefined),
        totalPages: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : null,
        publishYear: /^\d{4}$/.test(year) ? year : '',
        description: stripHtmlAndDecode(info.description).slice(0, 260),
        coverImage: sanitizeCoverUrl(rawThumb),
        isbn: info.industryIdentifiers?.[0]?.identifier,
      };
    });
}

function scoreResult(item: BookSearchResult, normalizedQuery: string): number {
  let score = 0;
  const titleLower = item.title.toLowerCase();
  const authorLower = item.author.toLowerCase();
  const isSetBundle = titleLower.includes('세트') || titleLower.includes('전집');
  if (titleLower === normalizedQuery) score += 120;
  else if (titleLower.startsWith(normalizedQuery)) score += 70;
  else if (titleLower.includes(normalizedQuery)) score += 45;
  if (authorLower.includes(normalizedQuery)) score += 30;
  if (item.source === 'YES24') score += 20;
  if (isSetBundle) score -= 18;
  if (item.coverImage) score += 12;
  if (item.totalPages) score += 8;
  if (item.description) score += 6;
  if (item.publishYear) score += 3;
  return score;
}

async function searchBookDatabase(rawQuery: string, maxItems = 24): Promise<BookSearchResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const hasHangul = /[\uAC00-\uD7A3]/.test(query);

  const tasks: Promise<BookSearchResult[]>[] = [
    searchYes24(query, 24),
    searchOpenLibrary(query, 12),
    searchAppleBooks(query, 'kr', 10),
    searchGoogleBooks(query, 10),
  ];

  if (!hasHangul) {
    tasks.push(searchAppleBooks(query, 'us', 12));
  }

  const settled = await Promise.allSettled(tasks);
  const combined: BookSearchResult[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      combined.push(...result.value);
    }
  }

  const normalizedQuery = query.toLowerCase();
  const deduped = new Map<string, BookSearchResult>();

  for (const item of combined) {
    const key = `${item.title.toLowerCase().replace(/\s+/g, '')}::${item.author.toLowerCase().replace(/\s+/g, '')}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, item);
    } else {
      const existingScore = scoreResult(existing, normalizedQuery);
      const candidateScore = scoreResult(item, normalizedQuery);
      if (candidateScore > existingScore) {
        deduped.set(key, {
          ...item,
          totalPages: item.totalPages ?? existing.totalPages,
          coverImage: item.coverImage ?? existing.coverImage,
          description: item.description || existing.description,
        });
      } else {
        deduped.set(key, {
          ...existing,
          totalPages: existing.totalPages ?? item.totalPages,
          coverImage: existing.coverImage ?? item.coverImage,
          description: existing.description || item.description,
        });
      }
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => scoreResult(b, normalizedQuery) - scoreResult(a, normalizedQuery))
    .slice(0, maxItems);
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/books/search', async (req: Request, res: Response) => {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQ) {
      res.status(400).json({ error: '검색어를 입력해 주세요.' });
      return;
    }
    if (rawQ.length > 120) {
      res.status(400).json({ error: '검색어는 120자 이내로 입력해 주세요.' });
      return;
    }

    const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 24;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 30) : 24;

    try {
      const results = await searchBookDatabase(rawQ, limit);
      res.json({ query: rawQ, results });
    } catch {
      res.status(502).json({ error: '도서 데이터베이스 조회 중 문제가 발생했습니다.' });
    }
  });

  app.post('/api/books/search-batch', async (req: Request, res: Response) => {
    const body = req.body as { queries?: unknown };
    if (!body || !Array.isArray(body.queries)) {
      res.status(400).json({ error: '검색어 목록(queries)이 필요합니다.' });
      return;
    }

    const cleanedQueries = body.queries
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 120)
      .slice(0, 10);

    if (cleanedQueries.length === 0) {
      res.status(400).json({ error: '유효한 검색어를 1개 이상 입력해 주세요.' });
      return;
    }

    try {
      const groups = await Promise.all(
        cleanedQueries.map(async (query) => {
          try {
            const results = await searchBookDatabase(query, 12);
            return { query, results };
          } catch {
            return { query, results: [] as BookSearchResult[], error: '조회 실패' };
          }
        }),
      );
      res.json({ groups });
    } catch {
      res.status(502).json({ error: '다중 도서 검색 중 문제가 발생했습니다.' });
    }
  });

  app.post('/api/books/enrich', async (req: Request, res: Response) => {
    const body = req.body as { externalIds?: unknown };
    if (!body || !Array.isArray(body.externalIds)) {
      res.status(400).json({ error: 'externalIds 배열이 필요합니다.' });
      return;
    }

    const validIds = body.externalIds
      .filter((id): id is string => typeof id === 'string')
      .filter((id) => /^yes24:\d{4,12}$/.test(id))
      .slice(0, 10);

    const details: Record<string, { totalPages: number | null; category?: string; description?: string; isbn?: string }> =
      {};

    await Promise.all(
      validIds.map(async (externalId) => {
        const goodsNo = externalId.slice('yes24:'.length);
        try {
          details[externalId] = await fetchYes24BookDetail(goodsNo);
        } catch {
          details[externalId] = { totalPages: null };
        }
      }),
    );

    res.json({ details });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`READLOG server running on http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start READLOG server:', err);
  process.exit(1);
});
