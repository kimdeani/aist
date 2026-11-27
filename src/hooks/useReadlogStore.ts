import { useEffect, useState } from 'react';
import { INITIAL_BOOKS, INITIAL_NOTES, INITIAL_REVIEWS } from '../data/initialData';
import { Book, BookReview, CoverTone, Priority, ReadingNote, ReadingStatus } from '../types/readlog';

const STORAGE_KEYS = {
  books: 'readlog_books_v1',
  notes: 'readlog_notes_v1',
  reviews: 'readlog_reviews_v1',
};

export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useReadlogStore() {
  const [books, setBooks] = useState<Book[]>(() => loadFromStorage(STORAGE_KEYS.books, INITIAL_BOOKS));
  const [notes, setNotes] = useState<ReadingNote[]>(() => loadFromStorage(STORAGE_KEYS.notes, INITIAL_NOTES));
  const [reviews, setReviews] = useState<BookReview[]>(() => loadFromStorage(STORAGE_KEYS.reviews, INITIAL_REVIEWS));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(books));
    } catch {
      // Ignore storage quota errors
    }
  }, [books]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
    } catch {
      // Ignore storage quota errors
    }
  }, [notes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(reviews));
    } catch {
      // Ignore storage quota errors
    }
  }, [reviews]);

  const addBook = (input: {
    title: string;
    author: string;
    category: string;
    totalPages: number;
    reason: string;
    priority: Priority;
    coverTone: CoverTone;
    coverImage?: string;
  }): Book => {
    const newBook: Book = {
      id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: input.title.trim(),
      author: input.author.trim(),
      category: input.category.trim() || '일반',
      totalPages: Math.max(1, Math.round(input.totalPages || 300)),
      reason: input.reason.trim(),
      priority: input.priority,
      coverImage: input.coverImage,
      coverTone: input.coverTone,
      status: '읽기 전',
      startDate: '',
      endDate: '',
      currentPage: 0,
      createdAt: getTodayString(),
    };
    setBooks((prev) => [newBook, ...prev]);
    return newBook;
  };

  const addBooksBatch = (
    inputs: Array<{
      title: string;
      author: string;
      category: string;
      totalPages: number;
      reason: string;
      priority: Priority;
      coverTone: CoverTone;
      coverImage?: string;
    }>,
  ): Book[] => {
    const today = getTodayString();
    const created: Book[] = inputs.map((input, idx) => ({
      id: `book-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: input.title.trim(),
      author: input.author.trim(),
      category: input.category.trim() || '일반',
      totalPages: Math.max(1, Math.round(input.totalPages || 300)),
      reason: input.reason.trim(),
      priority: input.priority,
      coverImage: input.coverImage,
      coverTone: input.coverTone,
      status: '읽기 전',
      startDate: '',
      endDate: '',
      currentPage: 0,
      createdAt: today,
    }));
    setBooks((prev) => [...created, ...prev]);
    return created;
  };

  const updateBook = (bookId: string, patch: Partial<Book>) => {
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;
        const nextTotal = patch.totalPages !== undefined ? Math.max(1, patch.totalPages) : book.totalPages;
        const nextPage =
          patch.currentPage !== undefined
            ? Math.min(Math.max(0, patch.currentPage), nextTotal)
            : Math.min(book.currentPage, nextTotal);
        return {
          ...book,
          ...patch,
          totalPages: nextTotal,
          currentPage: nextPage,
        };
      }),
    );
  };

  const deleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    setNotes((prev) => prev.filter((n) => n.bookId !== bookId));
    setReviews((prev) => prev.filter((r) => r.bookId !== bookId));
  };

  const setReadingStatus = (bookId: string, status: ReadingStatus) => {
    const today = getTodayString();
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;
        if (status === '읽기 전') {
          return {
            ...book,
            status,
            endDate: '',
            currentPage: 0,
          };
        }
        if (status === '읽는 중') {
          return {
            ...book,
            status,
            startDate: book.startDate || today,
            endDate: '',
            currentPage: book.currentPage >= book.totalPages ? Math.max(0, book.totalPages - 1) : book.currentPage,
          };
        }
        // 완독
        return {
          ...book,
          status: '완독',
          startDate: book.startDate || today,
          endDate: book.endDate || today,
          currentPage: book.totalPages,
        };
      }),
    );
  };

  const updateProgress = (bookId: string, page: number) => {
    const today = getTodayString();
    setBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book;
        const clamped = Math.min(Math.max(0, Math.round(page)), book.totalPages);
        if (clamped >= book.totalPages) {
          return {
            ...book,
            currentPage: book.totalPages,
            status: '완독',
            startDate: book.startDate || today,
            endDate: book.endDate || today,
          };
        }
        if (clamped > 0 && book.status === '읽기 전') {
          return {
            ...book,
            currentPage: clamped,
            status: '읽는 중',
            startDate: book.startDate || today,
          };
        }
        return {
          ...book,
          currentPage: clamped,
          status: book.status === '완독' && clamped < book.totalPages ? '읽는 중' : book.status,
          endDate: book.status === '완독' && clamped < book.totalPages ? '' : book.endDate,
        };
      }),
    );
  };

  const addNote = (input: { bookId: string; page: number | null; quote: string; memo: string; syncProgress?: boolean }) => {
    const newNote: ReadingNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bookId: input.bookId,
      page: input.page,
      quote: input.quote.trim(),
      memo: input.memo.trim(),
      createdAt: getTodayString(),
    };
    setNotes((prev) => [newNote, ...prev]);

    if (input.syncProgress && input.page !== null && input.page >= 0) {
      updateProgress(input.bookId, input.page);
    }
    return newNote;
  };

  const updateNote = (noteId: string, patch: Partial<ReadingNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...patch } : n)));
  };

  const deleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const upsertReview = (input: {
    bookId: string;
    rating: number;
    summary: string;
    pros: string;
    cons: string;
    finalThought: string;
  }) => {
    const today = getTodayString();
    setReviews((prev) => {
      const existing = prev.find((r) => r.bookId === input.bookId);
      if (existing) {
        return prev.map((r) =>
          r.bookId === input.bookId
            ? {
                ...r,
                rating: input.rating,
                summary: input.summary.trim(),
                pros: input.pros.trim(),
                cons: input.cons.trim(),
                finalThought: input.finalThought.trim(),
                updatedAt: today,
              }
            : r,
        );
      }
      const created: BookReview = {
        id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        bookId: input.bookId,
        rating: input.rating,
        summary: input.summary.trim(),
        pros: input.pros.trim(),
        cons: input.cons.trim(),
        finalThought: input.finalThought.trim(),
        updatedAt: today,
      };
      return [created, ...prev];
    });
  };

  const deleteReview = (bookId: string) => {
    setReviews((prev) => prev.filter((r) => r.bookId !== bookId));
  };

  return {
    books,
    notes,
    reviews,
    addBook,
    addBooksBatch,
    updateBook,
    deleteBook,
    setReadingStatus,
    updateProgress,
    addNote,
    updateNote,
    deleteNote,
    upsertReview,
    deleteReview,
  };
}
