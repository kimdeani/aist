export type Priority = '높음' | '보통' | '낮음';

export type ReadingStatus = '읽기 전' | '읽는 중' | '완독';

export type TabId = 'selection' | 'notes' | 'history' | 'review';

export type CoverTone = 'slate' | 'cobalt' | 'charcoal' | 'stone';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  totalPages: number;
  reason: string;
  priority: Priority;
  coverImage?: string;
  coverTone: CoverTone;
  status: ReadingStatus;
  startDate: string;
  endDate: string;
  currentPage: number;
  createdAt: string;
}

export interface ReadingNote {
  id: string;
  bookId: string;
  page: number | null;
  quote: string;
  memo: string;
  createdAt: string;
}

export interface BookReview {
  id: string;
  bookId: string;
  rating: number;
  summary: string;
  pros: string;
  cons: string;
  finalThought: string;
  updatedAt: string;
}

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

export interface BatchSearchGroup {
  query: string;
  results: BookSearchResult[];
  error?: string;
}
