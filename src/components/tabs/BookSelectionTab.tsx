import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, Database, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Book, CoverTone, Priority, TabId } from '../../types/readlog';
import { BookCover } from '../BookCover';
import { BookDatabaseSearch } from '../BookDatabaseSearch';

interface BookSelectionTabProps {
  books: Book[];
  onOpenRegisterModal: () => void;
  onRegisterBatch: (
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
  onUpdateBook: (bookId: string, patch: Partial<Book>) => void;
  onDeleteBook: (bookId: string) => void;
  onStartReading: (bookId: string) => void;
  onNavigateTab: (tab: TabId, bookId?: string) => void;
}

type PriorityFilter = '전체' | Priority;

const PRIORITY_ORDER: Record<Priority, number> = {
  높음: 0,
  보통: 1,
  낮음: 2,
};

export function BookSelectionTab({
  books,
  onOpenRegisterModal,
  onRegisterBatch,
  onUpdateBook,
  onDeleteBook,
  onStartReading,
  onNavigateTab,
}: BookSelectionTabProps) {
  const [showDbSearch, setShowDbSearch] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<Priority>('보통');
  const [editReason, setEditReason] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...books]
      .filter((b) => (priorityFilter === '전체' ? true : b.priority === priorityFilter))
      .filter((b) =>
        q
          ? b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            b.reason.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => {
        if (a.status === '읽기 전' && b.status !== '읽기 전') return -1;
        if (a.status !== '읽기 전' && b.status === '읽기 전') return 1;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });
  }, [books, priorityFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      total: books.length,
      waiting: books.filter((b) => b.status === '읽기 전').length,
      high: books.filter((b) => b.priority === '높음').length,
    };
  }, [books]);

  const beginEdit = (book: Book) => {
    setEditingId(book.id);
    setEditPriority(book.priority);
    setEditReason(book.reason);
    setEditCategory(book.category);
    setConfirmDeleteId(null);
  };

  const saveEdit = (bookId: string) => {
    onUpdateBook(bookId, {
      priority: editPriority,
      reason: editReason.trim(),
      category: editCategory.trim() || '일반',
    });
    setEditingId(null);
  };

  return (
    <section aria-labelledby="selection-heading" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#1E40AF]">01. 책 선정</p>
          <h1 id="selection-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            읽고 싶은 책과 선정 이유
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            도서 데이터베이스에서 여러 권을 검색해 등록하거나 직접 추가하세요. 읽기를 시작하면 독서 이력 관리로 이어집니다.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-600 shrink-0">
          <div>
            <span className="text-zinc-500">선정 도서</span>{' '}
            <span className="font-mono-num font-semibold text-zinc-900">{counts.total}권</span>
          </div>
          <span aria-hidden="true" className="text-zinc-300">/</span>
          <div>
            <span className="text-zinc-500">읽기 대기</span>{' '}
            <span className="font-mono-num font-semibold text-zinc-900">{counts.waiting}권</span>
          </div>
          <span aria-hidden="true" className="text-zinc-300">/</span>
          <div>
            <span className="text-zinc-500">높은 우선순위</span>{' '}
            <span className="font-mono-num font-semibold text-[#1E40AF]">{counts.high}권</span>
          </div>
        </div>
      </div>

      {/* Collapsible Book Database Multi-Search Panel */}
      {showDbSearch && (
        <BookDatabaseSearch
          existingBooks={books}
          onRegisterMultiple={(items) => {
            onRegisterBatch(items);
          }}
        />
      )}

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="우선순위 필터">
            {(['전체', '높음', '보통', '낮음'] as PriorityFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPriorityFilter(item)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  priorityFilter === item
                    ? 'bg-white text-zinc-900 border border-zinc-200/80'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {item === '전체' ? '전체' : `우선순위 ${item}`}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="내 목록 내 제목·저자 검색"
              aria-label="선정 도서 검색"
              className="w-56 sm:w-64 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowDbSearch((prev) => !prev)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Database className="h-3.5 w-3.5 text-[#1E40AF]" />
            <span>{showDbSearch ? 'DB 검색 접기' : 'DB 검색 열기'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[#1E40AF]" />
            <span>직접 / 팝업 등록</span>
          </button>
        </div>
      </div>

      {/* Book Selection List */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-zinc-900">조건에 맞는 선정 도서가 없습니다.</p>
          <p className="mt-1 text-xs text-zinc-500">
            위의 도서 데이터베이스 검색에서 여러 권을 찾아 추가하거나 필터를 초기화해 보세요.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {(priorityFilter !== '전체' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('전체');
                  setSearchQuery('');
                }}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                필터 초기화
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
            const isEditing = editingId === book.id;
            const isConfirmingDelete = confirmDeleteId === book.id;

            return (
              <article key={book.id} className="p-5 sm:p-6 transition-colors hover:bg-zinc-50/40">
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
                        <h2 className="font-editorial text-lg font-semibold text-zinc-900 leading-snug">
                          {book.title}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span className="font-medium text-zinc-700">{book.author}</span>
                          <span aria-hidden="true">·</span>
                          <span>{book.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{book.totalPages}쪽</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              book.priority === '높음'
                                ? 'font-semibold text-[#1E40AF]'
                                : book.priority === '보통'
                                  ? 'font-medium text-zinc-700'
                                  : 'text-zinc-500'
                            }
                          >
                            우선순위 {book.priority}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">등록 {book.createdAt}</span>
                        </div>
                      </div>

                      {/* Interconnected Status & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {book.status === '읽기 전' ? (
                          <button
                            type="button"
                            onClick={() => onStartReading(book.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] whitespace-nowrap cursor-pointer transition-colors"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>읽기 시작</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('history')}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 whitespace-nowrap cursor-pointer transition-colors"
                          >
                            <span>{book.status}</span>
                            <ArrowRight className="h-3 w-3 text-zinc-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reading Reason or Inline Edit */}
                    {isEditing ? (
                      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-zinc-600">우선순위 변경</label>
                            <div className="mt-1 flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
                              {(['높음', '보통', '낮음'] as Priority[]).map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setEditPriority(p)}
                                  className={`flex-1 rounded-md py-1 text-xs font-medium cursor-pointer ${
                                    editPriority === p ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-600">분류</label>
                            <input
                              type="text"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600">읽을 이유</label>
                          <textarea
                            rows={2}
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>취소</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(book.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>저장</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <p className="text-sm leading-relaxed text-zinc-700 max-w-2xl">
                          <span className="mr-2 text-xs font-medium text-zinc-400">선정 이유</span>
                          {book.reason || '아직 작성된 읽을 이유가 없습니다.'}
                        </p>

                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <button
                            type="button"
                            onClick={() => beginEdit(book)}
                            className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>편집</span>
                          </button>
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onDeleteBook(book.id)}
                                className="font-medium text-red-600 hover:text-red-700 cursor-pointer"
                              >
                                삭제 확인
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-zinc-500 hover:text-zinc-800 cursor-pointer"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(book.id)}
                              className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>삭제</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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
