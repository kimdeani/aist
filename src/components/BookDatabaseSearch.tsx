import React, { useMemo, useState } from 'react';
import { Check, Database, Layers, Loader2, Search } from 'lucide-react';
import { BatchSearchGroup, Book, BookSearchResult, CoverTone, Priority } from '../types/readlog';
import { BookCover } from './BookCover';

interface BookDatabaseSearchProps {
  existingBooks: Book[];
  onRegisterMultiple: (
    items: Array<{
      title: string;
      author: string;
      category: string;
      totalPages: number;
      reason: string;
      priority: Priority;
      coverTone: CoverTone;
      coverImage?: string;
    }>,
  ) => void;
  onFillManualForm?: (item: BookSearchResult) => void;
  compact?: boolean;
}

type SearchMode = 'single' | 'batch';

const TONE_CYCLE: CoverTone[] = ['slate', 'cobalt', 'charcoal', 'stone'];
const QUICK_QUERIES = ['한강', '소설', '에세이', '인문', '과학', '경제'];

export function BookDatabaseSearch({
  existingBooks,
  onRegisterMultiple,
  onFillManualForm,
  compact = false,
}: BookDatabaseSearchProps) {
  const [mode, setMode] = useState<SearchMode>('single');
  const [singleQuery, setSingleQuery] = useState('');
  const [batchQueryText, setBatchQueryText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [singleResults, setSingleResults] = useState<BookSearchResult[]>([]);
  const [batchGroups, setBatchGroups] = useState<BatchSearchGroup[]>([]);

  const [selectedItems, setSelectedItems] = useState<Record<string, BookSearchResult>>({});
  const [defaultPriority, setDefaultPriority] = useState<Priority>('높음');
  const [defaultReason, setDefaultReason] = useState('');

  const existingTitleSet = useMemo(() => {
    return new Set(existingBooks.map((b) => b.title.trim().toLowerCase().replace(/\s+/g, '')));
  }, [existingBooks]);

  const isAlreadyAdded = (title: string) => {
    return existingTitleSet.has(title.trim().toLowerCase().replace(/\s+/g, ''));
  };

  const toggleSelect = (item: BookSearchResult) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.externalId]) {
        delete next[item.externalId];
      } else {
        next[item.externalId] = item;
      }
      return next;
    });
  };

  const runSingleSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      setError('검색할 책 제목이나 저자를 입력해 주세요.');
      return;
    }

    setSingleQuery(q);
    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}&limit=24`);
      const data = (await res.json()) as { results?: BookSearchResult[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || '도서 검색 요청에 실패했습니다.');
      }
      setSingleResults(data.results || []);
      setBatchGroups([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '도서 데이터베이스 연결 중 오류가 발생했습니다.');
      setSingleResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSingleSearch(singleQuery);
  };

  const handleBatchSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQueries = batchQueryText
      .split(/[\n,]+/)
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    const uniqueQueries = Array.from(new Set(parsedQueries)).slice(0, 10);
    if (uniqueQueries.length === 0) {
      setError('쉼표(,) 또는 줄바꿈으로 구분하여 검색할 책 제목을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await fetch('/api/books/search-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: uniqueQueries }),
      });
      const data = (await res.json()) as { groups?: BatchSearchGroup[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || '일괄 검색 요청에 실패했습니다.');
      }
      setBatchGroups(data.groups || []);
      setSingleResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '도서 데이터베이스 연결 중 오류가 발생했습니다.');
      setBatchGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const enrichItems = async (
    items: BookSearchResult[],
  ): Promise<
    Record<string, { totalPages: number | null; category?: string; description?: string; isbn?: string }>
  > => {
    const yes24Ids = items
      .map((i) => i.externalId)
      .filter((id) => id.startsWith('yes24:'))
      .slice(0, 10);
    if (yes24Ids.length === 0) return {};

    try {
      const res = await fetch('/api/books/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalIds: yes24Ids }),
      });
      if (!res.ok) return {};
      const data = (await res.json()) as {
        details?: Record<string, { totalPages: number | null; category?: string; description?: string; isbn?: string }>;
      };
      return data.details || {};
    } catch {
      return {};
    }
  };

  const selectedList = Object.values(selectedItems);

  const handleRegisterSelected = async () => {
    if (selectedList.length === 0 || isEnriching) return;
    setIsEnriching(true);

    try {
      const details = await enrichItems(selectedList);

      const payload = selectedList.map((item, idx) => {
        const extra = details[item.externalId];
        return {
          title: item.title,
          author: item.author,
          category: extra?.category || item.category || '일반',
          totalPages: extra?.totalPages || item.totalPages || 300,
          reason: defaultReason.trim() || extra?.description || item.description || '',
          priority: defaultPriority,
          coverTone: TONE_CYCLE[idx % TONE_CYCLE.length],
          coverImage: item.coverImage,
        };
      });

      onRegisterMultiple(payload);
      setSelectedItems({});
      setDefaultReason('');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleFillClick = async (item: BookSearchResult) => {
    if (!onFillManualForm || isEnriching) return;
    setIsEnriching(true);
    try {
      const details = await enrichItems([item]);
      const extra = details[item.externalId];
      onFillManualForm({
        ...item,
        category: extra?.category || item.category,
        totalPages: extra?.totalPages || item.totalPages,
        description: extra?.description || item.description,
        isbn: extra?.isbn || item.isbn,
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const selectAllSingle = () => {
    const next = { ...selectedItems };
    singleResults.forEach((item) => {
      next[item.externalId] = item;
    });
    setSelectedItems(next);
  };

  const renderResultRow = (item: BookSearchResult) => {
    const checked = Boolean(selectedItems[item.externalId]);
    const alreadyAdded = isAlreadyAdded(item.title);

    return (
      <div
        key={item.externalId}
        className={`flex items-start gap-3.5 p-4 transition-colors ${
          checked ? 'bg-[#1E40AF]/[0.03]' : 'hover:bg-zinc-50/70'
        }`}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`${item.title} 선택`}
          onClick={() => toggleSelect(item)}
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border cursor-pointer transition-colors ${
            checked
              ? 'border-[#1E40AF] bg-[#1E40AF] text-white'
              : 'border-zinc-300 bg-white hover:border-zinc-400'
          }`}
        >
          {checked && <Check className="h-3.5 w-3.5" />}
        </button>

        <BookCover
          title={item.title}
          author={item.author}
          coverImage={item.coverImage}
          coverTone="slate"
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h4 className="font-editorial text-sm font-semibold text-zinc-900 leading-snug break-keep">
                {item.title}
              </h4>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">{item.author}</span>
                {item.category && item.category !== '도서' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{item.category}</span>
                  </>
                )}
                {item.totalPages && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{item.totalPages}쪽</span>
                  </>
                )}
                {item.publishYear && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{item.publishYear}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="text-zinc-400">{item.source}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs">
              {alreadyAdded && <span className="font-medium text-emerald-700">이미 등록됨</span>}
              {onFillManualForm && (
                <button
                  type="button"
                  disabled={isEnriching}
                  onClick={() => handleFillClick(item)}
                  className="font-medium text-[#1E40AF] hover:underline whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  정보 불러와 편집
                </button>
              )}
            </div>
          </div>

          {!compact && item.description && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 line-clamp-2">{item.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      {/* Header & Mode Switch */}
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#1E40AF]" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">도서 데이터베이스 검색</h3>
            <p className="text-xs text-zinc-500">
              국내·해외 도서 DB에서 책 정보를 조회해 여러 권을 한 번에 책 선정 목록으로 가져옵니다.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 shrink-0 self-start sm:self-auto" role="group" aria-label="검색 방식 선택">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setError('');
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              mode === 'single' ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>통합 검색</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('batch');
              setError('');
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              mode === 'batch' ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>여러 권 일괄 검색</span>
          </button>
        </div>
      </div>

      {/* Search Form */}
      <div className="p-4 sm:px-5 space-y-3">
        {mode === 'single' ? (
          <>
            <form onSubmit={handleSingleSearch} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={singleQuery}
                  onChange={(e) => setSingleQuery(e.target.value)}
                  placeholder="책 제목, 저자, 주제어 검색 (예: 작별하지 않는다, 도둑맞은 집중력, 한강, Atomic Habits)"
                  aria-label="도서 데이터베이스 검색어"
                  className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A8A] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>검색</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>추천 키워드:</span>
              {QUICK_QUERIES.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => runSingleSearch(kw)}
                  className="text-zinc-700 hover:text-[#1E40AF] hover:underline cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleBatchSearch} className="space-y-3">
            <div>
              <label htmlFor="batch-book-queries" className="block text-xs font-medium text-zinc-700">
                검색할 책 목록 (최대 10권 · 쉼표 또는 줄바꿈으로 구분)
              </label>
              <textarea
                id="batch-book-queries"
                rows={3}
                value={batchQueryText}
                onChange={(e) => setBatchQueryText(e.target.value)}
                placeholder={'작별하지 않는다\n도둑맞은 집중력\n물고기는 존재하지 않는다\nAtomic Habits'}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                각 검색어별로 도서 DB를 동시에 조회한 뒤 원하는 책들을 한꺼번에 체크하여 등록할 수 있습니다.
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A8A] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                <span>일괄 검색</span>
              </button>
            </div>
          </form>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="divide-y divide-zinc-100 border-t border-zinc-100">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-start gap-4 p-4 animate-pulse">
              <div className="mt-1 h-5 w-5 rounded bg-zinc-200" />
              <div className="h-[74px] w-14 rounded bg-zinc-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-1/3 rounded bg-zinc-200" />
                <div className="h-3 w-1/2 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Area */}
      {!isLoading && hasSearched && mode === 'single' && (
        <div className="border-t border-zinc-200">
          {singleResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-zinc-500">
              검색 결과가 없습니다. 다른 제목이나 저자명으로 다시 검색해 보세요.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-600">
                <span>
                  검색 결과 <span className="font-mono-num font-semibold text-zinc-900">{singleResults.length}권</span>
                </span>
                <button
                  type="button"
                  onClick={selectAllSingle}
                  className="font-medium text-[#1E40AF] hover:underline cursor-pointer"
                >
                  검색 결과 전체 선택
                </button>
              </div>
              <div className="max-h-[440px] overflow-y-auto divide-y divide-zinc-200">
                {singleResults.map((item) => renderResultRow(item))}
              </div>
            </>
          )}
        </div>
      )}

      {!isLoading && hasSearched && mode === 'batch' && (
        <div className="border-t border-zinc-200">
          {batchGroups.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-zinc-500">검색 결과가 없습니다.</div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-zinc-200">
              {batchGroups.map((group) => (
                <div key={group.query}>
                  <div className="flex items-center justify-between bg-zinc-50 px-4 py-2 text-xs">
                    <span className="font-semibold text-zinc-800">검색어: “{group.query}”</span>
                    <span className="font-mono-num text-zinc-500">{group.results.length}건</span>
                  </div>
                  {group.results.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-zinc-500">
                      {group.error || '일치하는 도서 정보를 찾지 못했습니다.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {group.results.map((item) => renderResultRow(item))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Select Action Footer */}
      {selectedList.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 p-4 sm:px-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-zinc-900">
              선택한 도서 <span className="font-mono-num text-[#1E40AF]">{selectedList.length}권</span> 일괄 등록 설정
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">우선순위</span>
              <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 border border-zinc-200">
                {(['높음', '보통', '낮음'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDefaultPriority(p)}
                    className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      defaultPriority === p ? 'bg-[#1E40AF] text-white' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={defaultReason}
              onChange={(e) => setDefaultReason(e.target.value)}
              placeholder="선택한 책들의 읽을 이유 (비워두면 DB 도서 설명이 자동 반영됩니다)"
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isEnriching}
                onClick={() => setSelectedItems({})}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                선택 해제
              </button>
              <button
                type="button"
                disabled={isEnriching}
                onClick={handleRegisterSelected}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] disabled:opacity-60 whitespace-nowrap cursor-pointer transition-colors"
              >
                {isEnriching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {isEnriching ? '상세 정보 불러오는 중...' : `선택한 ${selectedList.length}권 책 선정에 추가`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
