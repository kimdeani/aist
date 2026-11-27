import React, { useMemo, useState } from 'react';
import { BookOpenText, LogIn, Plus, Star, Users } from 'lucide-react';
import { usePublicLibrary } from '../../hooks/usePublicLibrary';
import { Book, CoverTone, Priority } from '../../types/readlog';
import { BookCover } from '../BookCover';

interface ExploreLibrariesTabProps {
  currentUserId?: string;
  myBooks: Book[];
  onSignIn: () => void;
  onAddBookFromCommunity: (input: {
    title: string;
    author: string;
    category: string;
    totalPages: number;
    reason: string;
    priority: Priority;
    coverTone: CoverTone;
    coverImage?: string;
  }) => void;
  onOpenProfileModal: () => void;
}

type ExploreSection = 'reviews' | 'notes' | 'books';

export function ExploreLibrariesTab({
  currentUserId,
  myBooks,
  onSignIn,
  onAddBookFromCommunity,
  onOpenProfileModal,
}: ExploreLibrariesTabProps) {
  const { profiles, publicBooks, publicNotes, publicReviews, loading } = usePublicLibrary(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [section, setSection] = useState<ExploreSection>('reviews');
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  const myBookTitles = useMemo(
    () => new Set(myBooks.map((b) => b.title.trim().toLowerCase().replace(/\s+/g, ''))),
    [myBooks],
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.userId === selectedUserId) || null,
    [profiles, selectedUserId],
  );

  const filteredReviews = useMemo(
    () =>
      selectedUserId === 'ALL'
        ? publicReviews
        : publicReviews.filter((r) => r.ownerId === selectedUserId),
    [publicReviews, selectedUserId],
  );

  const filteredNotes = useMemo(
    () =>
      selectedUserId === 'ALL'
        ? publicNotes
        : publicNotes.filter((n) => n.ownerId === selectedUserId),
    [publicNotes, selectedUserId],
  );

  const filteredBooks = useMemo(
    () =>
      selectedUserId === 'ALL'
        ? publicBooks
        : publicBooks.filter((b) => b.ownerId === selectedUserId),
    [publicBooks, selectedUserId],
  );

  const handleCopyBook = (book: Book) => {
    onAddBookFromCommunity({
      title: book.title,
      author: book.author,
      category: book.category,
      totalPages: book.totalPages,
      reason: book.reason || `${book.ownerName || '다른 독서가'}의 서재에서 담아온 책`,
      priority: '보통',
      coverTone: book.coverTone,
      coverImage: book.coverImage,
    });
    setCopiedIds((prev) => new Set(prev).add(book.id));
  };

  return (
    <section aria-labelledby="explore-heading" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#1E40AF]">05. 서재 구경</p>
          <h1 id="explore-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            다른 사람들의 서재와 독서 기록
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            서재를 공개한 다른 독서가들의 리뷰, 인상 깊은 문장, 현재 읽고 있는 책을 열람하고 내 책 선정 목록에 담을 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {currentUserId ? (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 whitespace-nowrap cursor-pointer"
            >
              내 서재 공개 설정
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] whitespace-nowrap cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>로그인해 내 서재도 공유하기</span>
            </button>
          )}
        </div>
      </div>

      {/* Public Reader Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-700">
            공개 서재 ({profiles.length}명)
          </h2>
          {selectedUserId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedUserId('ALL')}
              className="text-xs font-medium text-[#1E40AF] hover:underline cursor-pointer"
            >
              전체 독서가 보기
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 rounded-xl border border-zinc-200 bg-white p-4 animate-pulse" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center">
            <Users className="mx-auto h-6 w-6 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-900">아직 공개된 서재가 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Google 로그인 후 책을 등록하고 서재를 공개하면 이곳에서 다른 사람들과 독서 기록을 나눌 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((prof) => {
              const isSelected = selectedUserId === prof.userId;
              const isMe = prof.userId === currentUserId;

              return (
                <button
                  key={prof.userId}
                  type="button"
                  onClick={() => setSelectedUserId(isSelected ? 'ALL' : prof.userId)}
                  className={`text-left rounded-xl border p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-[#1E40AF] bg-[#1E40AF]/[0.03]'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900 truncate">
                      {prof.displayName}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-[#1E40AF]">(내 서재)</span>}
                    </span>
                    <span className="font-mono-num text-[11px] text-zinc-500 shrink-0">
                      도서 {prof.bookCount}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-1">
                    {prof.bio || '소개글이 없습니다.'}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-zinc-500 font-mono-num">
                    <span>완독 {prof.completedCount}권</span>
                    <span aria-hidden="true">·</span>
                    <span>리뷰 {prof.reviewCount}편</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Section Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-200 pt-5">
        <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 self-start" role="group" aria-label="열람 항목 선택">
          <button
            type="button"
            onClick={() => setSection('reviews')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              section === 'reviews'
                ? 'bg-white text-zinc-900 border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            리뷰 ({filteredReviews.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('notes')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              section === 'notes'
                ? 'bg-white text-zinc-900 border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            감상 기록 ({filteredNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('books')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              section === 'books'
                ? 'bg-white text-zinc-900 border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            도서 및 진행률 ({filteredBooks.length})
          </button>
        </div>

        {selectedProfile && (
          <p className="text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">{selectedProfile.displayName}</span>님의 서재 열람 중
          </p>
        )}
      </div>

      {/* Content View */}
      {section === 'reviews' && (
        filteredReviews.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center text-xs text-zinc-500">
            아직 공개된 완독 리뷰가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-editorial text-base font-semibold text-zinc-900">
                      {review.bookTitle || '도서'}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                      <span>{review.bookAuthor}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-zinc-700">{review.ownerName || '독서가'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{review.updatedAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
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
                      {review.rating}.0
                    </span>
                  </div>
                </div>

                <p className="font-editorial text-[15px] font-semibold text-zinc-900">
                  “{review.summary}”
                </p>

                {(review.pros || review.cons) && (
                  <div className="grid grid-cols-1 gap-4 border-y border-zinc-100 py-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="font-medium text-emerald-700">장점</span>
                      <p className="mt-1 text-zinc-700 leading-relaxed">{review.pros || '—'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-zinc-500">단점</span>
                      <p className="mt-1 text-zinc-700 leading-relaxed">{review.cons || '—'}</p>
                    </div>
                  </div>
                )}

                <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
                  {review.finalThought}
                </p>
              </article>
            ))}
          </div>
        )
      )}

      {section === 'notes' && (
        filteredNotes.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center text-xs text-zinc-500">
            <BookOpenText className="mx-auto mb-2 h-5 w-5 text-zinc-300" />
            아직 공개된 감상 기록이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {filteredNotes.map((note) => (
              <article key={note.id} className="p-5 sm:p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-900">{note.bookTitle || '도서'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-zinc-700">{note.ownerName || '독서가'}</span>
                  {note.page !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-[#1E40AF]">p. {note.page}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{note.createdAt}</span>
                </div>

                {note.quote && (
                  <blockquote className="rounded-lg bg-zinc-50 px-4 py-3 font-editorial text-sm leading-relaxed text-zinc-900">
                    “{note.quote}”
                  </blockquote>
                )}
                {note.memo && (
                  <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">{note.memo}</p>
                )}
              </article>
            ))}
          </div>
        )
      )}

      {section === 'books' && (
        filteredBooks.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center text-xs text-zinc-500">
            아직 공개된 도서가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {filteredBooks.map((book) => {
              const percent =
                book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
              const isMine = book.ownerId === currentUserId;
              const alreadyInMyShelf =
                copiedIds.has(book.id) ||
                myBookTitles.has(book.title.trim().toLowerCase().replace(/\s+/g, ''));

              return (
                <article key={book.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverImage={book.coverImage}
                      coverTone={book.coverTone}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-editorial text-base font-semibold text-zinc-900">
                            {book.title}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                            <span className="font-medium text-zinc-700">{book.author}</span>
                            <span aria-hidden="true">·</span>
                            <span>{book.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-zinc-800">{book.ownerName || '독서가'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{book.status}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num">{percent}%</span>
                          </div>
                        </div>

                        {!isMine && (
                          <div className="shrink-0">
                            {alreadyInMyShelf ? (
                              <span className="text-xs font-medium text-emerald-700">내 서재에 있음</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCopyBook(book)}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 whitespace-nowrap cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5 text-[#1E40AF]" />
                                <span>내 책 선정에 담기</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {book.reason && (
                        <p className="mt-2.5 text-xs leading-relaxed text-zinc-600">{book.reason}</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}
    </section>
  );
}
