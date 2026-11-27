export type Priority = '높음' | '보통' | '낮음';

export type ReadingStatus = '읽기 전' | '읽는 중' | '완독';

export type TabId = 'selection' | 'notes' | 'history' | 'review' | 'explore';

export type CoverTone = 'slate' | 'cobalt' | 'charcoal' | 'stone';

export interface PublicProfile {
  userId: string;
  displayName: string;
  bio: string;
  isPublic: boolean;
  bookCount: number;
  completedCount: number;
  reviewCount: number;
}

export interface Book {
  id: string;
  ownerId?: string;
  ownerName?: string;
  isPublic?: boolean;
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
  ownerId?: string;
  ownerName?: string;
  isPublic?: boolean;
  bookId: string;
  bookTitle?: string;
  page: number | null;
  quote: string;
  memo: string;
  createdAt: string;
}

export interface BookReview {
  id: string;
  ownerId?: string;
  ownerName?: string;
  isPublic?: boolean;
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
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
