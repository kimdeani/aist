import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, Star } from 'lucide-react';
import { Book, BookReview, ReadingStatus, TabId } from '../../types/readlog';
import { BookCover } from '../BookCover';

interface ReadingHistoryTabProps {
  books: Book[];
  reviews: BookReview[];
  onSetStatus: (bookId: string, status: ReadingStatus) => void;
  onUpdateProgress: (bookId: string, page: number) => void;
  onUpdateBook: (bookId: string, patch: Partial<Book>) => void;
  onNavigateTab: (tab: TabId, bookId?: string) => void;
  onOpenRegisterModal: () => void;
}

type StatusFilter = '전체' | ReadingStatus;

export function ReadingHistoryTab({
  books,
  reviews,
  onSetStatus,
  onUpdateProgress,
  onUpdateBook,
  onNavigateTab,
  onOpenRegisterModal,
}: ReadingHistoryTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체');

  const reviewByBookId = useMemo(() => {
    const map = new Map<string, BookReview>();
    reviews.forEach((r) => map.set(r.bookId, r));
    return map;
  }, [reviews]);

  const stats = useMemo(() => {
    const before = books.filter((b) => b.status === '읽기 전').length;
    const reading = books.filter((b) => b.status === '읽는 중').length;
    const done = books.filter((b) => b.status === '완독').length;
    return { total: books.length, before, reading, done };
  }, [books]);

  const filteredBooks = useMemo(() => {
    const order: Record<ReadingStatus, number> = { '읽는 중': 0, '읽기 전': 1, 완독: 2 };
    return [...books]
      .filter((b) => (statusFilter === '전체' ? true : b.status === statusFilter))
      .sort((a, b) => order[a.status] - order[b.status]);
  }, [books, statusFilter]);

  return (
    <section aria-labelledby="history-heading" className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-6">
        <p className="text-xs font-medium tracking-wider text-[#1E40AF]">03. 독서 이력 관리</p>
        <h1 id="history-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          독서 상태와 완독 타임라인
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600">
          읽기 전·읽는 중·완독 상태와 시작일, 완독일, 진행률을 관리합니다. 완독한 책은 리뷰 탭에서 평가할 수 있습니다.
        </p>
      </div>

      {/* 4-column Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-zinc-500">전체 도서</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold text-zinc-900">{stats.total}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-zinc-500">읽기 전</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold text-zinc-700">{stats.before}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-zinc-500">읽는 중</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold text-[#1E40AF]">{stats.reading}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-zinc-500">완독</p>
          <p className="font-mono-num mt-1 text-2xl font-semibold text-emerald-700">{stats.done}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="독서 상태 필터">
          {(['전체', '읽기 전', '읽는 중', '완독'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === status
                  ? 'bg-white text-zinc-900 border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-zinc-900">해당 상태의 도서가 없습니다.</p>
          <p className="mt-1 text-xs text-zinc-500">책 선정에서 새 도서를 등록하거나 다른 상태 필터를 확인해 보세요.</p>
          <div className="mt-5 flex justify-center gap-2">
            {statusFilter !== '전체' && (
              <button
                type="button"
                onClick={() => setStatusFilter('전체')}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                전체 보기
              </button>
            )}
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] cursor-pointer"
            >
              책 등록하기
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {filteredBooks.map((book) => {
            const percent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
            const hasReview = reviewByBookId.has(book.id);

            return (
              <article key={book.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Book Info */}
                  <div className="flex items-start gap-4 min-w-0 lg:w-[34%]">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverImage={book.coverImage}
                      coverTone={book.coverTone}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h2 className="font-editorial text-base font-semibold text-zinc-900 truncate">
                        {book.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-500 truncate">
                        {book.author} · {book.category}
                      </p>

                      {/* Cross-tab links */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('notes', book.id)}
                          className="inline-flex items-center gap-1 font-medium text-zinc-600 hover:text-[#1E40AF] cursor-pointer"
                        >
                          <BookOpenText className="h-3.5 w-3.5" />
                          <span>감상 기록</span>
                        </button>

                        {book.status === '완독' && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('review', book.id)}
                            className="inline-flex items-center gap-1 font-medium text-[#1E40AF] hover:underline cursor-pointer"
                          >
                            <Star className="h-3.5 w-3.5" />
                            <span>{hasReview ? '리뷰 보기' : '리뷰 작성하기'}</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status + Dates + Progress Controls */}
                  <div className="flex-1 grid grid-cols-1 gap-5 sm:grid-cols-12 sm:items-center">
                    {/* Status Segmented Control */}
                    <div className="sm:col-span-4">
                      <span className="block text-[11px] font-medium text-zinc-500 mb-1.5">독서 상태</span>
                      <div className="inline-flex w-full items-center gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label={`${book.title} 독서 상태`}>
                        {(['읽기 전', '읽는 중', '완독'] as ReadingStatus[]).map((st) => {
                          const active = book.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => onSetStatus(book.id, st)}
                              className={`flex-1 rounded-md py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                                active
                                  ? st === '완독'
                                    ? 'bg-emerald-700 text-white'
                                    : st === '읽는 중'
                                      ? 'bg-[#1E40AF] text-white'
                                      : 'bg-white text-zinc-900 border border-zinc-200/80'
                                  : 'text-zinc-600 hover:text-zinc-900'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="sm:col-span-4 grid grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor={`start-${book.id}`} className="block text-[11px] font-medium text-zinc-500">
                          시작일
                        </label>
                        <input
                          id={`start-${book.id}`}
                          type="date"
                          value={book.startDate}
                          onChange={(e) => onUpdateBook(book.id, { startDate: e.target.value })}
                          className="font-mono-num mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor={`end-${book.id}`} className="block text-[11px] font-medium text-zinc-500">
                          완독일
                        </label>
                        <input
                          id={`end-${book.id}`}
                          type="date"
                          value={book.endDate}
                          disabled={book.status === '읽기 전'}
                          onChange={(e) => onUpdateBook(book.id, { endDate: e.target.value })}
                          className="font-mono-num mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="sm:col-span-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[11px] font-medium text-zinc-500">진행률</span>
                        <span className="font-mono-num font-semibold text-zinc-900">
                          {percent}%{' '}
                          <span className="font-normal text-zinc-500">
                            ({book.currentPage}/{book.totalPages}p)
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <input
                          type="range"
                          min={0}
                          max={book.totalPages}
                          value={book.currentPage}
                          aria-label={`${book.title} 읽은 페이지 슬라이더`}
                          onChange={(e) => onUpdateProgress(book.id, Number(e.target.value))}
                          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[#1E40AF]"
                        />
                        <input
                          type="number"
                          min={0}
                          max={book.totalPages}
                          value={book.currentPage}
                          aria-label={`${book.title} 현재 페이지`}
                          onChange={(e) => onUpdateProgress(book.id, Number(e.target.value))}
                          className="font-mono-num w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-right text-xs text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
