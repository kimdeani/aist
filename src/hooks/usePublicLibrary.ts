import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  Book,
  BookReview,
  CoverTone,
  Priority,
  PublicProfile,
  ReadingNote,
  ReadingStatus,
} from '../types/readlog';

export function usePublicLibrary(enabled: boolean) {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [publicNotes, setPublicNotes] = useState<ReadingNote[]>([]);
  const [publicReviews, setPublicReviews] = useState<BookReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);

    const unsubProfiles = onSnapshot(
      query(collection(db, 'publicProfiles'), where('isPublic', '==', true), limit(40)),
      (snap) => {
        const list: PublicProfile[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            userId: String(d.userId || docSnap.id),
            displayName: String(d.displayName || '독서가'),
            bio: String(d.bio || ''),
            isPublic: Boolean(d.isPublic),
            bookCount: Number(d.bookCount || 0),
            completedCount: Number(d.completedCount || 0),
            reviewCount: Number(d.reviewCount || 0),
          };
        });
        list.sort((a, b) => b.bookCount - a.bookCount);
        setProfiles(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'publicProfiles'),
    );

    const unsubBooks = onSnapshot(
      query(collection(db, 'books'), where('isPublic', '==', true), limit(80)),
      (snap) => {
        const list: Book[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId || ''),
            ownerName: String(d.ownerName || '독서가'),
            isPublic: true,
            title: String(d.title || ''),
            author: String(d.author || ''),
            category: String(d.category || '일반'),
            totalPages: Number(d.totalPages || 300),
            reason: String(d.reason || ''),
            priority: (d.priority as Priority) || '보통',
            coverTone: (d.coverTone as CoverTone) || 'slate',
            coverImage: typeof d.coverImage === 'string' ? d.coverImage : undefined,
            status: (d.status as ReadingStatus) || '읽기 전',
            startDate: String(d.startDate || ''),
            endDate: String(d.endDate || ''),
            currentPage: Number(d.currentPage || 0),
            createdAt: String(d.createdDate || ''),
          };
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setPublicBooks(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'books'),
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('isPublic', '==', true), limit(80)),
      (snap) => {
        const list: ReadingNote[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId || ''),
            ownerName: String(d.ownerName || '독서가'),
            isPublic: true,
            bookId: String(d.bookId || ''),
            bookTitle: String(d.bookTitle || ''),
            page: typeof d.page === 'number' ? d.page : null,
            quote: String(d.quote || ''),
            memo: String(d.memo || ''),
            createdAt: String(d.createdDate || ''),
          };
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setPublicNotes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notes'),
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), where('isPublic', '==', true), limit(80)),
      (snap) => {
        const list: BookReview[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId || ''),
            ownerName: String(d.ownerName || '독서가'),
            isPublic: true,
            bookId: String(d.bookId || ''),
            bookTitle: String(d.bookTitle || ''),
            bookAuthor: String(d.bookAuthor || ''),
            rating: Number(d.rating || 5),
            summary: String(d.summary || ''),
            pros: String(d.pros || ''),
            cons: String(d.cons || ''),
            finalThought: String(d.finalThought || ''),
            updatedAt: String(d.updatedDate || ''),
          };
        });
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setPublicReviews(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews'),
    );

    return () => {
      unsubProfiles();
      unsubBooks();
      unsubNotes();
      unsubReviews();
    };
  }, [enabled]);

  return {
    profiles,
    publicBooks,
    publicNotes,
    publicReviews,
    loading,
  };
}
