import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Check, Pencil, Search, Trash2, X } from 'lucide-react';
import { Book, ReadingNote } from '../../types/readlog';

interface ReadingNotesTabProps {
  books: Book[];
  notes: ReadingNote[];
  initialSelectedBookId?: string | null;
  onAddNote: (input: { bookId: string; page: number | null; quote: string; memo: string; syncProgress?: boolean }) => void;
  onUpdateNote: (noteId: string, patch: Partial<ReadingNote>) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenRegisterModal: () => void;
}

type NoteFilterType = '전체' | '문장' | '메모';

export function ReadingNotesTab({
  books,
  notes,
  initialSelectedBookId,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onOpenRegisterModal,
}: ReadingNotesTabProps) {
  const defaultBookId = useMemo(() => {
    if (initialSelectedBookId && books.some((b) => b.id === initialSelectedBookId)) {
      return initialSelectedBookId;
    }
    const readingBook = books.find((b) => b.status === '읽는 중');
    return readingBook?.id || books[0]?.id || '';
  }, [books, initialSelectedBookId]);

  const [composerBookId, setComposerBookId] = useState(defaultBookId);
  const [pageInput, setPageInput] = useState('');
  const [quoteInput, setQuoteInput] = useState('');
  const [memoInput, setMemoInput] = useState('');
  const [syncProgress, setSyncProgress] = useState(true);
  const [formError, setFormError] = useState('');

  const [filterBookId, setFilterBookId] = useState<string>('전체');
  const [filterType, setFilterType] = useState<NoteFilterType>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editPage, setEditPage] = useState('');
  const [editQuote, setEditQuote] = useState('');
  const [editMemo, setEditMemo] = useState('');

  useEffect(() => {
    if (initialSelectedBookId && books.some((b) => b.id === initialSelectedBookId)) {
      setComposerBookId(initialSelectedBookId);
      setFilterBookId(initialSelectedBookId);
    }
  }, [initialSelectedBookId, books]);

  useEffect(() => {
    if (!composerBookId && books.length > 0) {
      setComposerBookId(books[0].id);
    }
  }, [books, composerBookId]);

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    books.forEach((b) => map.set(b.id, b));
    return map;
  }, [books]);

  const selectedComposerBook = bookMap.get(composerBookId);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => (filterBookId === '전체' ? true : n.bookId === filterBookId))
      .filter((n) => {
        if (filterType === '문장') return Boolean(n.quote.trim());
        if (filterType === '메모') return Boolean(n.memo.trim());
        return true;
      })
      .filter((n) => {
        if (!q) return true;
        const book = bookMap.get(n.bookId);
        return (
          n.quote.toLowerCase().includes(q) ||
          n.memo.toLowerCase().includes(q) ||
          (book?.title.toLowerCase().includes(q) ?? false)
        );
      });
  }, [notes, filterBookId, filterType, searchQuery, bookMap]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerBookId) {
      setFormError('기록할 도서를 먼저 선택해 주세요.');
      return;
    }
    if (!quoteInput.trim() && !memoInput.trim()) {
      setFormError('인상 깊은 문장 또는 독서 메모 중 하나 이상을 입력해 주세요.');
      return;
    }
    const parsedPage = pageInput.trim() ? parseInt(pageInput, 10) : null;
    if (parsedPage !== null && (isNaN(parsedPage) || parsedPage < 0)) {
      setFormError('페이지 번호는 0 이상의 숫자로 입력해 주세요.');
      return;
    }

    onAddNote({
      bookId: composerBookId,
      page: parsedPage,
      quote: quoteInput,
      memo: memoInput,
      syncProgress: syncProgress && parsedPage !== null,
    });
    setPageInput('');
    setQuoteInput('');
    setMemoInput('');
    setFormError('');
  };

  const startEdit = (note: ReadingNote) => {
    setEditingNoteId(note.id);
    setEditPage(note.page !== null ? String(note.page) : '');
    setEditQuote(note.quote);
    setEditMemo(note.memo);
  };

  const saveEdit = (noteId: string) => {
    const parsed = editPage.trim() ? parseInt(editPage, 10) : null;
    onUpdateNote(noteId, {
      page: parsed !== null && !isNaN(parsed) && parsed >= 0 ? parsed : null,
      quote: editQuote.trim(),
      memo: editMemo.trim(),
    });
    setEditingNoteId(null);
  };

  return (
    <section aria-labelledby="notes-heading" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#1E40AF]">02. 감상 기록</p>
          <h1 id="notes-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            문장과 생각의 갈피
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            독서 중 마주친 인상 깊은 문장과 떠오른 생각, 페이지 번호를 한곳에 기록합니다.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-600 shrink-0">
          <div>
            <span className="text-zinc-500">전체 기록</span>{' '}
            <span className="font-mono-num font-semibold text-zinc-900">{notes.length}개</span>
          </div>
          <span aria-hidden="true" className="text-zinc-300">/</span>
          <div>
            <span className="text-zinc-500">수집된 문장</span>{' '}
            <span className="font-mono-num font-semibold text-zinc-900">
              {notes.filter((n) => n.quote.trim()).length}개
            </span>
          </div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-zinc-900">등록된 도서가 아직 없습니다.</p>
          <p className="mt-1 text-xs text-zinc-500">먼저 책 선정 탭에서 읽을 책을 등록하면 감상 기록을 남길 수 있습니다.</p>
          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="mt-5 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] cursor-pointer"
          >
            책 등록하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Composer Column */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-semibold text-zinc-900">새 감상 작성</h2>
              {selectedComposerBook && (
                <span className="font-mono-num text-xs text-zinc-500">
                  {selectedComposerBook.currentPage} / {selectedComposerBook.totalPages}쪽
                </span>
              )}
            </div>

            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="note-book-select" className="block text-xs font-medium text-zinc-700">
                  도서 선택
                </label>
                <select
                  id="note-book-select"
                  value={composerBookId}
                  onChange={(e) => setComposerBookId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
                >
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} ({book.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="note-page-input" className="block text-xs font-medium text-zinc-700">
                  페이지 (p.)
                </label>
                <input
                  id="note-page-input"
                  type="number"
                  min={0}
                  max={selectedComposerBook?.totalPages || 9999}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="예: 142"
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="note-quote-input" className="block text-xs font-medium text-zinc-700">
                인상 깊은 문장
              </label>
              <textarea
                id="note-quote-input"
                rows={3}
                value={quoteInput}
                onChange={(e) => setQuoteInput(e.target.value)}
                placeholder="책에서 밑줄 긋고 싶은 문장을 그대로 옮겨 적어보세요."
                className="font-editorial mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 placeholder:font-sans placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="note-memo-input" className="block text-xs font-medium text-zinc-700">
                독서 메모
              </label>
              <textarea
                id="note-memo-input"
                rows={4}
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="문장을 읽으며 떠오른 생각이나 질문, 개인적인 해석을 자유롭게 남겨보세요."
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncProgress}
                onChange={(e) => setSyncProgress(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[#1E40AF] focus:ring-[#1E40AF]"
              />
              <span>입력한 페이지 번호로 독서 이력 진행률도 함께 업데이트</span>
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#1E40AF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3A8A] cursor-pointer transition-colors"
            >
              감상 기록 저장
            </button>
          </form>

          {/* Right Feed Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="도서별 필터"
                  value={filterBookId}
                  onChange={(e) => setFilterBookId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-[#1E40AF] focus:outline-none max-w-[200px]"
                >
                  <option value="전체">모든 도서</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>

                <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="기록 유형 필터">
                  {(['전체', '문장', '메모'] as NoteFilterType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                        filterType === type
                          ? 'bg-white text-zinc-900 border border-zinc-200/80'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="문장 또는 메모 검색"
                  aria-label="감상 기록 검색"
                  className="w-full sm:w-52 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
                <BookOpenText className="mx-auto h-6 w-6 text-zinc-300" />
                <p className="mt-3 text-sm font-medium text-zinc-900">기록된 감상이 없습니다.</p>
                <p className="mt-1 text-xs text-zinc-500">
                  왼쪽 작성 영역에서 인상 깊은 문장이나 독서 메모를 남겨보세요.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {filteredNotes.map((note) => {
                  const book = bookMap.get(note.bookId);
                  const isEditing = editingNoteId === note.id;

                  return (
                    <article key={note.id} className="p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span className="font-semibold text-zinc-900">{book?.title || '삭제된 도서'}</span>
                          {book?.author && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{book.author}</span>
                            </>
                          )}
                          {note.page !== null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num font-medium text-[#1E40AF]">p. {note.page}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{note.createdAt}</span>
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-3 shrink-0 text-xs">
                            <button
                              type="button"
                              onClick={() => startEdit(note)}
                              className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>수정</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteNote(note.id)}
                              className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>삭제</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
                          <div className="w-32">
                            <label className="block text-xs font-medium text-zinc-600">페이지</label>
                            <input
                              type="number"
                              min={0}
                              value={editPage}
                              onChange={(e) => setEditPage(e.target.value)}
                              className="font-mono-num mt-1 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs focus:border-[#1E40AF] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-600">인상 깊은 문장</label>
                            <textarea
                              rows={2}
                              value={editQuote}
                              onChange={(e) => setEditQuote(e.target.value)}
                              className="font-editorial mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1E40AF] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-600">독서 메모</label>
                            <textarea
                              rows={3}
                              value={editMemo}
                              onChange={(e) => setEditMemo(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1E40AF] focus:outline-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>취소</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(note.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>저장</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {note.quote && (
                            <blockquote className="rounded-lg bg-zinc-50 px-4 py-3.5 font-editorial text-[15px] leading-relaxed text-zinc-900">
                              “{note.quote}”
                            </blockquote>
                          )}
                          {note.memo && (
                            <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">{note.memo}</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
