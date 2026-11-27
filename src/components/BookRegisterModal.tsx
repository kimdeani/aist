import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Book, BookSearchResult, CoverTone, Priority } from '../types/readlog';
import { BookDatabaseSearch } from './BookDatabaseSearch';

interface BookRegisterModalProps {
  isOpen: boolean;
  existingBooks: Book[];
  onClose: () => void;
  onRegister: (input: {
    title: string;
    author: string;
    category: string;
    totalPages: number;
    reason: string;
    priority: Priority;
    coverTone: CoverTone;
    coverImage?: string;
  }) => void;
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
}

type ModalMode = 'search' | 'manual';

const TONE_OPTIONS: { value: CoverTone; label: string; swatch: string }[] = [
  { value: 'slate', label: '슬레이트', swatch: 'bg-[#E8ECEF]' },
  { value: 'cobalt', label: '코발트', swatch: 'bg-[#1E3A8A]' },
  { value: 'charcoal', label: '차콜', swatch: 'bg-[#18181B]' },
  { value: 'stone', label: '스톤', swatch: 'bg-[#F1F1EE]' },
];

export function BookRegisterModal({
  isOpen,
  existingBooks,
  onClose,
  onRegister,
  onRegisterBatch,
}: BookRegisterModalProps) {
  const [mode, setMode] = useState<ModalMode>('search');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [totalPages, setTotalPages] = useState('300');
  const [priority, setPriority] = useState<Priority>('높음');
  const [reason, setReason] = useState('');
  const [coverTone, setCoverTone] = useState<CoverTone>('slate');
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setCategory('');
    setTotalPages('300');
    setPriority('높음');
    setReason('');
    setCoverTone('slate');
    setCoverImage(undefined);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('책 제목과 저자를 입력해 주세요.');
      return;
    }
    const pagesNum = parseInt(totalPages, 10);
    if (isNaN(pagesNum) || pagesNum < 1) {
      setError('전체 페이지 수는 1 이상이어야 합니다.');
      return;
    }
    onRegister({
      title,
      author,
      category: category || '일반',
      totalPages: pagesNum,
      reason,
      priority,
      coverTone,
      coverImage,
    });
    resetForm();
    onClose();
  };

  const handleFillFromSearch = (item: BookSearchResult) => {
    setTitle(item.title);
    setAuthor(item.author);
    setCategory(item.category || '일반');
    setTotalPages(item.totalPages ? String(item.totalPages) : '300');
    setReason(item.description || '');
    setCoverImage(item.coverImage);
    setError('');
    setMode('manual');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-book-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="register-book-title" className="text-lg font-semibold text-zinc-900">
              책 선정 등록
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              도서 데이터베이스에서 여러 권을 검색해 등록하거나 직접 정보를 입력할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="등록 방식">
              <button
                type="button"
                onClick={() => setMode('search')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  mode === 'search' ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                도서 DB 검색
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  mode === 'manual' ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                직접 입력
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {mode === 'search' ? (
          <div className="mt-5">
            <BookDatabaseSearch
              existingBooks={existingBooks}
              compact
              onFillManualForm={handleFillFromSearch}
              onRegisterMultiple={(items) => {
                onRegisterBatch(items);
                onClose();
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            {coverImage && (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                <span>도서 데이터베이스에서 표지 이미지를 함께 불러왔습니다.</span>
                <button
                  type="button"
                  onClick={() => setCoverImage(undefined)}
                  className="text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                >
                  표지 제거
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="modal-book-title" className="block text-xs font-medium text-zinc-700">
                  책 제목 <span className="text-red-600">*</span>
                </label>
                <input
                  id="modal-book-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 작별하지 않는다"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="modal-book-author" className="block text-xs font-medium text-zinc-700">
                  저자 <span className="text-red-600">*</span>
                </label>
                <input
                  id="modal-book-author"
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="예: 한강"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="modal-book-category" className="block text-xs font-medium text-zinc-700">
                  분류
                </label>
                <input
                  id="modal-book-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 한국소설, 에세이, 인문"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="modal-book-pages" className="block text-xs font-medium text-zinc-700">
                  전체 페이지 수
                </label>
                <input
                  id="modal-book-pages"
                  type="number"
                  min={1}
                  max={9999}
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs font-medium text-zinc-700">우선순위</span>
                <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
                  {(['높음', '보통', '낮음'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                        priority === p ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-700">기본 표지 톤</span>
                <div className="mt-1.5 flex items-center gap-2 pt-1">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setCoverTone(tone.value)}
                      title={tone.label}
                      aria-label={`표지 톤: ${tone.label}`}
                      className={`h-8 w-8 rounded-md border cursor-pointer transition-transform ${tone.swatch} ${
                        coverTone === tone.value ? 'ring-2 ring-[#1E40AF] ring-offset-2 border-zinc-400' : 'border-zinc-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="modal-book-reason" className="block text-xs font-medium text-zinc-700">
                읽을 이유
              </label>
              <textarea
                id="modal-book-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="이 책을 읽고 싶은 이유나 기대하는 점을 적어두세요."
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A8A] cursor-pointer transition-colors"
              >
                등록하기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
