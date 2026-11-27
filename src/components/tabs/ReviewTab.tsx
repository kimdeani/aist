import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Pencil, Star, Trash2 } from 'lucide-react';
import { Book, BookReview, TabId } from '../../types/readlog';
import { BookCover } from '../BookCover';

interface ReviewTabProps {
  books: Book[];
  reviews: BookReview[];
  initialSelectedBookId?: string | null;
  onUpsertReview: (input: {
    bookId: string;
    rating: number;
    summary: string;
    pros: string;
    cons: string;
    finalThought: string;
  }) => void;
  onDeleteReview: (bookId: string) => void;
  onNavigateTab: (tab: TabId) => void;
}

type ReviewFilter = '전체' | '작성 완료' | '작성 대기';

export function ReviewTab({
  books,
  reviews,
  initialSelectedBookId,
  onUpsertReview,
  onDeleteReview,
  onNavigateTab,
}: ReviewTabProps) {
  const completedBooks = useMemo(() => books.filter((b) => b.status === '완독'), [books]);

  const reviewByBookId = useMemo(() => {
    const map = new Map<string, BookReview>();
    reviews.forEach((r) => map.set(r.bookId, r));
    return map;
  }, [reviews]);

  const [filter, setFilter] = useState<ReviewFilter>('전체');
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [finalThought, setFinalThought] = useState('');
  const [formError, setFormError] = useState('');

  const openEditor = (bookId: string) => {
    const existing = reviewByBookId.get(bookId);
    setActiveBookId(bookId);
    setRating(existing?.rating || 5);
    setSummary(existing?.summary || '');
    setPros(existing?.pros || '');
    setCons(existing?.cons || '');
    setFinalThought(existing?.finalThought || '');
    setFormError('');
  };

  useEffect(() => {
    if (initialSelectedBookId && completedBooks.some((b) => b.id === initialSelectedBookId)) {
      openEditor(initialSelectedBookId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedBookId]);

  const filteredCompleted = useMemo(() => {
    return completedBooks.filter((b) => {
      const hasReview = reviewByBookId.has(b.id);
      if (filter === '작성 완료') return hasReview;
      if (filter === '작성 대기') return !hasReview;
      return true;
    });
  }, [completedBooks, filter, reviewByBookId]);

  const activeBook = completedBooks.find((b) => b.id === activeBookId) || null;

  const averageRating = useMemo(() => {
    const valid = completedBooks
      .map((b) => reviewByBookId.get(b.id)?.rating)
      .filter((r): r is number => typeof r === 'number');
    if (valid.length === 0) return null;
    const avg = valid.reduce((acc, n) => acc + n, 0) / valid.length;
    return avg.toFixed(1);
  }, [completedBooks, reviewByBookId]);

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;
    if (!summary.trim() || !finalThought.trim()) {
      setFormError('총평과 최종 감상을 모두 입력해 주세요.');
      return;
    }
    onUpsertReview({
      bookId: activeBook.id,
      rating,
      summary,
      pros,
      cons,
      finalThought,
    });
    setActiveBookId(null);
    setFormError('');
  };

  return (
    <section aria-labelledby="review-heading" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#1E40AF]">04. 리뷰</p>
          <h1 id="review-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            완독 도서 최종 평가
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            완독으로 기록된 책에 1~5점 별점을 매기고 총평, 장단점, 최종 감상을 정리합니다.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-600 shrink-0">
          <div>
            <span className="text-zinc-500">완독 도서</span>{' '}
            <span className="font-mono-num font-semibold text-zinc-900">{completedBooks.length}권</span>
          </div>
          <span aria-hidden="true" className="text-zinc-300">/</span>
          <div>
            <span className="text-zinc-500">평균 별점</span>{' '}
            <span className="font-mono-num font-semibold text-amber-600">
              {averageRating ? `${averageRating} / 5.0` : '—'}
            </span>
          </div>
        </div>
      </div>

      {completedBooks.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-zinc-900">아직 완독한 도서가 없습니다.</p>
          <p className="mt-1 text-xs text-zinc-500">
            독서 이력 관리에서 책을 완독 상태로 변경하면 이곳에서 별점과 리뷰를 작성할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] cursor-pointer"
          >
            <span>독서 이력 관리로 이동</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="리뷰 상태 필터">
              {(['전체', '작성 완료', '작성 대기'] as ReviewFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    filter === item
                      ? 'bg-white text-zinc-900 border border-zinc-200/80'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Focused Review Editor */}
          {activeBook && (
            <form
              onSubmit={handleSaveReview}
              className="rounded-xl border border-zinc-300 bg-white p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-4">
                  <BookCover
                    title={activeBook.title}
                    author={activeBook.author}
                    coverImage={activeBook.coverImage}
                    coverTone={activeBook.coverTone}
                    size="sm"
                  />
                  <div>
                    <p className="text-xs font-medium text-[#1E40AF]">최종 리뷰 작성</p>
                    <h2 className="font-editorial text-lg font-semibold text-zinc-900">{activeBook.title}</h2>
                    <p className="text-xs text-zinc-500">
                      {activeBook.author} · 완독일 {activeBook.endDate || '미지정'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBookId(null)}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  닫기
                </button>
              </div>

              {formError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </p>
              )}

              {/* Star Rating 1~5 */}
              <div>
                <span className="block text-xs font-medium text-zinc-700">별점 (1~5점)</span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="별점 선택">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = (hoverRating ?? rating) >= value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={rating === value}
                          aria-label={`${value}점`}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setRating(value)}
                          className="p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] rounded"
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              active ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="font-mono-num text-sm font-semibold text-zinc-900">{rating} / 5점</span>
                </div>
              </div>

              <div>
                <label htmlFor="review-summary" className="block text-xs font-medium text-zinc-700">
                  총평 <span className="text-red-600">*</span>
                </label>
                <input
                  id="review-summary"
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="이 책을 한 문장으로 요약하면 어떤 책이었나요?"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="review-pros" className="block text-xs font-medium text-zinc-700">
                    장점
                  </label>
                  <textarea
                    id="review-pros"
                    rows={3}
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    placeholder="좋았던 문체, 구성, 통찰 등을 적어보세요."
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="review-cons" className="block text-xs font-medium text-zinc-700">
                    아쉬운 점 (단점)
                  </label>
                  <textarea
                    id="review-cons"
                    rows={3}
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    placeholder="호불호가 갈리거나 아쉬웠던 지점을 적어보세요."
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="review-final" className="block text-xs font-medium text-zinc-700">
                  최종 감상 <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="review-final"
                  rows={4}
                  value={finalThought}
                  onChange={(e) => setFinalThought(e.target.value)}
                  placeholder="완독 후 남는 여운과 나에게 어떤 의미가 있었는지 정리해 보세요."
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveBookId(null)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] cursor-pointer"
                >
                  리뷰 저장
                </button>
              </div>
            </form>
          )}

          {/* Completed Books & Reviews List */}
          {filteredCompleted.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-900">해당 조건의 완독 도서가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCompleted.map((book) => {
                const review = reviewByBookId.get(book.id);

                return (
                  <article key={book.id} className="rounded-xl border border-zinc-200 bg-white p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <BookCover
                        title={book.title}
                        author={book.author}
                        coverImage={book.coverImage}
                        coverTone={book.coverTone}
                        size="md"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="font-editorial text-lg font-semibold text-zinc-900">{book.title}</h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                              <span className="font-medium text-zinc-700">{book.author}</span>
                              <span aria-hidden="true">·</span>
                              <span>{book.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num">
                                {book.startDate || '?'} ~ {book.endDate || '완독'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {review ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditor(book.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>수정</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteReview(book.id)}
                                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>삭제</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openEditor(book.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] whitespace-nowrap cursor-pointer transition-colors"
                              >
                                <Star className="h-3.5 w-3.5" />
                                <span>리뷰 작성</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {review ? (
                          <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4">
                            {/* Rating + Summary */}
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-0.5" aria-label={`별점 ${review.rating}점`}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={`h-4 w-4 ${
                                      n <= review.rating ? 'fill-amber-500 text-amber-500' : 'text-zinc-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-mono-num text-xs font-semibold text-zinc-800">
                                {review.rating}.0 / 5.0
                              </span>
                              <span aria-hidden="true" className="text-zinc-300">·</span>
                              <span className="font-mono-num text-xs text-zinc-400">작성 {review.updatedAt}</span>
                            </div>

                            <p className="font-editorial text-base font-semibold text-zinc-900">
                              “{review.summary}”
                            </p>

                            {(review.pros || review.cons) && (
                              <div className="grid grid-cols-1 gap-4 border-y border-zinc-100 py-3.5 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-medium text-emerald-700">장점</p>
                                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                                    {review.pros || '기록 없음'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-zinc-500">단점</p>
                                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                                    {review.cons || '기록 없음'}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-medium text-zinc-500">최종 감상</p>
                              <p className="mt-1 text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
                                {review.finalThought}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 border-t border-zinc-100 pt-3">
                            <p className="text-xs text-zinc-500">
                              완독은 완료되었으나 아직 최종 리뷰가 작성되지 않았습니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
