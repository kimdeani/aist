import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { INITIAL_BOOKS, INITIAL_NOTES, INITIAL_REVIEWS } from '../data/initialData';
import { OperationType, auth, db, googleProvider, handleFirestoreError } from '../firebase';
import {
  Book,
  BookReview,
  CoverTone,
  Priority,
  PublicProfile,
  ReadingNote,
  ReadingStatus,
} from '../types/readlog';

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

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || `id_${Date.now()}`;
}

function clampStr(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function useReadlogStore() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');

  const [localBooks, setLocalBooks] = useState<Book[]>(() =>
    loadFromStorage(STORAGE_KEYS.books, INITIAL_BOOKS),
  );
  const [localNotes, setLocalNotes] = useState<ReadingNote[]>(() =>
    loadFromStorage(STORAGE_KEYS.notes, INITIAL_NOTES),
  );
  const [localReviews, setLocalReviews] = useState<BookReview[]>(() =>
    loadFromStorage(STORAGE_KEYS.reviews, INITIAL_REVIEWS),
  );

  const [cloudBooks, setCloudBooks] = useState<Book[]>([]);
  const [cloudNotes, setCloudNotes] = useState<ReadingNote[]>([]);
  const [cloudReviews, setCloudReviews] = useState<BookReview[]>([]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Persist local guest mode state
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(localBooks));
    } catch {
      // Ignore quota errors
    }
  }, [localBooks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(localNotes));
    } catch {
      // Ignore quota errors
    }
  }, [localNotes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(localReviews));
    } catch {
      // Ignore quota errors
    }
  }, [localReviews]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setCloudBooks([]);
        setCloudNotes([]);
        setCloudReviews([]);
        setProfile(null);
        setCloudLoaded(false);
      }
    });
    return () => unsub();
  }, []);

  // Ensure user docs exist on sign-in and attach Firestore listeners
  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    const uid = user.uid;
    const defaultName = clampStr(user.displayName || user.email?.split('@')[0] || '독서가', 50) || '독서가';

    const ensureProfile = async () => {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid,
            email: clampStr(user.email || 'user@example.com', 160),
            displayName: defaultName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const pubRef = doc(db, 'publicProfiles', uid);
        const pubSnap = await getDoc(pubRef);
        if (!pubSnap.exists()) {
          await setDoc(pubRef, {
            userId: uid,
            displayName: defaultName,
            bio: '나만의 속도로 책을 읽고 기록하는 공간입니다.',
            isPublic: true,
            bookCount: 0,
            completedCount: 0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        if (!cancelled) {
          handleFirestoreError(err, OperationType.WRITE, `publicProfiles/${uid}`);
        }
      }
    };

    ensureProfile();

    const unsubProfile = onSnapshot(
      doc(db, 'publicProfiles', uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            userId: String(d.userId || uid),
            displayName: String(d.displayName || defaultName),
            bio: String(d.bio || ''),
            isPublic: Boolean(d.isPublic),
            bookCount: Number(d.bookCount || 0),
            completedCount: Number(d.completedCount || 0),
            reviewCount: Number(d.reviewCount || 0),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `publicProfiles/${uid}`),
    );

    const unsubBooks = onSnapshot(
      query(collection(db, 'books'), where('ownerId', '==', uid)),
      (snap) => {
        const items: Book[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId || uid),
            ownerName: String(d.ownerName || defaultName),
            isPublic: Boolean(d.isPublic),
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
            createdAt: String(d.createdDate || getTodayString()),
          };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setCloudBooks(items);
        setCloudLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'books'),
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('ownerId', '==', uid)),
      (snap) => {
        const items: ReadingNote[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId || uid),
            ownerName: String(d.ownerName || defaultName),
            isPublic: Boolean(d.isPublic),
            bookId: String(d.bookId || ''),
            bookTitle: String(d.bookTitle || ''),
            page: typeof d.page === 'number' ? d.page : null,
            quote: String(d.quote || ''),
            memo: String(d.memo || ''),
            createdAt: String(d.createdDate || getTodayString()),
          };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setCloudNotes(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notes'),
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), where('ownerId', '==', uid)),
      (snap) => {
        const items: BookReview[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId || uid),
            ownerName: String(d.ownerName || defaultName),
            isPublic: Boolean(d.isPublic),
            bookId: String(d.bookId || ''),
            bookTitle: String(d.bookTitle || ''),
            bookAuthor: String(d.bookAuthor || ''),
            rating: Number(d.rating || 5),
            summary: String(d.summary || ''),
            pros: String(d.pros || ''),
            cons: String(d.cons || ''),
            finalThought: String(d.finalThought || ''),
            updatedAt: String(d.updatedDate || getTodayString()),
          };
        });
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setCloudReviews(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews'),
    );

    return () => {
      cancelled = true;
      unsubProfile();
      unsubBooks();
      unsubNotes();
      unsubReviews();
    };
  }, [authReady, user]);

  // Keep publicProfiles stats synchronized when cloud data changes
  useEffect(() => {
    if (!user || !profile || !cloudLoaded) return;
    const bookCount = cloudBooks.length;
    const completedCount = cloudBooks.filter((b) => b.status === '완독').length;
    const reviewCount = cloudReviews.length;

    if (
      profile.bookCount === bookCount &&
      profile.completedCount === completedCount &&
      profile.reviewCount === reviewCount
    ) {
      return;
    }

    updateDoc(doc(db, 'publicProfiles', user.uid), {
      bookCount,
      completedCount,
      reviewCount,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `publicProfiles/${user.uid}`));
  }, [user, profile, cloudLoaded, cloudBooks, cloudReviews]);

  const books = user ? cloudBooks : localBooks;
  const notes = user ? cloudNotes : localNotes;
  const reviews = user ? cloudReviews : localReviews;

  const ownerName = clampStr(profile?.displayName || user?.displayName || '독서가', 50) || '독서가';
  const isPublicDefault = profile ? profile.isPublic : true;

  const signInWithGoogle = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Google 로그인을 완료하지 못했습니다. 팝업 허용 여부를 확인해 주세요.');
      }
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const updateProfile = async (patch: { displayName: string; bio: string; isPublic: boolean }) => {
    if (!user) return;
    const cleanName = clampStr(patch.displayName, 50) || '독서가';
    const cleanBio = clampStr(patch.bio, 200);
    const batch = writeBatch(db);

    batch.update(doc(db, 'publicProfiles', user.uid), {
      displayName: cleanName,
      bio: cleanBio,
      isPublic: patch.isPublic,
      updatedAt: serverTimestamp(),
    });

    cloudBooks.forEach((b) => {
      batch.update(doc(db, 'books', b.id), {
        isPublic: patch.isPublic,
        ownerName: cleanName,
        updatedAt: serverTimestamp(),
      });
    });
    cloudNotes.forEach((n) => {
      batch.update(doc(db, 'notes', n.id), {
        isPublic: patch.isPublic,
        ownerName: cleanName,
        updatedAt: serverTimestamp(),
      });
    });
    cloudReviews.forEach((r) => {
      batch.update(doc(db, 'reviews', r.id), {
        isPublic: patch.isPublic,
        ownerName: cleanName,
        updatedAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `publicProfiles/${user.uid}`);
    }
  };

  const importLocalToCloud = async () => {
    if (!user || localBooks.length === 0) return 0;
    const uid = user.uid;
    const batch = writeBatch(db);
    const idMap = new Map<string, string>();
    const statusByNewId = new Map<string, ReadingStatus>();

    localBooks.forEach((b, idx) => {
      const newBookId = sanitizeId(`b_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`);
      idMap.set(b.id, newBookId);
      statusByNewId.set(newBookId, b.status);

      const totalPages = Math.min(Math.max(1, Math.round(b.totalPages || 300)), 50000);
      const currentPage = Math.min(Math.max(0, Math.round(b.currentPage || 0)), totalPages);
      const payload: Record<string, unknown> = {
        ownerId: uid,
        ownerName,
        isPublic: isPublicDefault,
        title: clampStr(b.title, 200) || '제목 없음',
        author: clampStr(b.author, 120) || '저자 미상',
        category: clampStr(b.category || '일반', 60),
        totalPages,
        reason: clampStr(b.reason || '', 1000),
        priority: b.priority,
        coverTone: b.coverTone,
        status: b.status,
        startDate: clampStr(b.startDate || '', 20),
        endDate: clampStr(b.endDate || '', 20),
        currentPage,
        createdDate: clampStr(b.createdAt || getTodayString(), 20),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (b.coverImage && b.coverImage.startsWith('https://')) {
        payload.coverImage = clampStr(b.coverImage, 500);
      }
      batch.set(doc(db, 'books', newBookId), payload);
    });

    localNotes.forEach((n, idx) => {
      const targetBookId = idMap.get(n.bookId);
      const srcBook = localBooks.find((b) => b.id === n.bookId);
      if (!targetBookId || !srcBook) return;
      const quote = clampStr(n.quote, 2000);
      const memo = clampStr(n.memo, 4000);
      if (!quote && !memo) return;

      const noteId = sanitizeId(`n_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`);
      batch.set(doc(db, 'notes', noteId), {
        ownerId: uid,
        ownerName,
        isPublic: isPublicDefault,
        bookId: targetBookId,
        bookTitle: clampStr(srcBook.title, 200),
        page: typeof n.page === 'number' ? Math.min(Math.max(0, Math.round(n.page)), 50000) : null,
        quote,
        memo,
        createdDate: clampStr(n.createdAt || getTodayString(), 20),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    localReviews.forEach((r, idx) => {
      const targetBookId = idMap.get(r.bookId);
      const srcBook = localBooks.find((b) => b.id === r.bookId);
      if (!targetBookId || !srcBook || statusByNewId.get(targetBookId) !== '완독') return;

      const reviewId = sanitizeId(`r_${targetBookId}`);
      batch.set(doc(db, 'reviews', reviewId), {
        ownerId: uid,
        ownerName,
        isPublic: isPublicDefault,
        bookId: targetBookId,
        bookTitle: clampStr(srcBook.title, 200),
        bookAuthor: clampStr(srcBook.author, 120),
        rating: Math.min(Math.max(1, Math.round(r.rating)), 5),
        summary: clampStr(r.summary || '완독 리뷰', 300),
        pros: clampStr(r.pros || '', 1500),
        cons: clampStr(r.cons || '', 1500),
        finalThought: clampStr(r.finalThought || '완독 완료', 5000),
        updatedDate: clampStr(r.updatedAt || getTodayString(), 20),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      void idx;
    });

    try {
      await batch.commit();
      return localBooks.length;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'books');
    }
  };

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
    const id = sanitizeId(`book_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const today = getTodayString();
    const totalPages = Math.min(Math.max(1, Math.round(input.totalPages || 300)), 50000);
    const newBook: Book = {
      id,
      ownerId: user?.uid,
      ownerName,
      isPublic: isPublicDefault,
      title: clampStr(input.title, 200),
      author: clampStr(input.author, 120),
      category: clampStr(input.category || '일반', 60),
      totalPages,
      reason: clampStr(input.reason, 1000),
      priority: input.priority,
      coverImage: input.coverImage ? clampStr(input.coverImage, 500) : undefined,
      coverTone: input.coverTone,
      status: '읽기 전',
      startDate: '',
      endDate: '',
      currentPage: 0,
      createdAt: today,
    };

    if (!user) {
      setLocalBooks((prev) => [newBook, ...prev]);
      return newBook;
    }

    const payload: Record<string, unknown> = {
      ownerId: user.uid,
      ownerName,
      isPublic: isPublicDefault,
      title: newBook.title,
      author: newBook.author,
      category: newBook.category,
      totalPages: newBook.totalPages,
      reason: newBook.reason,
      priority: newBook.priority,
      coverTone: newBook.coverTone,
      status: newBook.status,
      startDate: '',
      endDate: '',
      currentPage: 0,
      createdDate: today,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (newBook.coverImage) {
      payload.coverImage = newBook.coverImage;
    }

    setDoc(doc(db, 'books', id), payload).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `books/${id}`),
    );
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
      id: sanitizeId(`book_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`),
      ownerId: user?.uid,
      ownerName,
      isPublic: isPublicDefault,
      title: clampStr(input.title, 200),
      author: clampStr(input.author, 120),
      category: clampStr(input.category || '일반', 60),
      totalPages: Math.min(Math.max(1, Math.round(input.totalPages || 300)), 50000),
      reason: clampStr(input.reason, 1000),
      priority: input.priority,
      coverImage: input.coverImage ? clampStr(input.coverImage, 500) : undefined,
      coverTone: input.coverTone,
      status: '읽기 전',
      startDate: '',
      endDate: '',
      currentPage: 0,
      createdAt: today,
    }));

    if (!user) {
      setLocalBooks((prev) => [...created, ...prev]);
      return created;
    }

    const batch = writeBatch(db);
    created.forEach((b) => {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        ownerName,
        isPublic: isPublicDefault,
        title: b.title,
        author: b.author,
        category: b.category,
        totalPages: b.totalPages,
        reason: b.reason,
        priority: b.priority,
        coverTone: b.coverTone,
        status: b.status,
        startDate: '',
        endDate: '',
        currentPage: 0,
        createdDate: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (b.coverImage) {
        payload.coverImage = b.coverImage;
      }
      batch.set(doc(db, 'books', b.id), payload);
    });

    batch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, 'books'));
    return created;
  };

  const updateBook = (bookId: string, patch: Partial<Book>) => {
    if (!user) {
      setLocalBooks((prev) =>
        prev.map((book) => {
          if (book.id !== bookId) return book;
          const nextTotal =
            patch.totalPages !== undefined ? Math.max(1, patch.totalPages) : book.totalPages;
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
      return;
    }

    const existingBook = cloudBooks.find((b) => b.id === bookId);
    if (!existingBook) return;
    const nextTotal =
      patch.totalPages !== undefined
        ? Math.min(Math.max(1, Math.round(patch.totalPages)), 50000)
        : existingBook.totalPages;
    const nextPage =
      patch.currentPage !== undefined
        ? Math.min(Math.max(0, Math.round(patch.currentPage)), nextTotal)
        : Math.min(existingBook.currentPage, nextTotal);

    const updatePayload: Record<string, unknown> = {
      totalPages: nextTotal,
      currentPage: nextPage,
      updatedAt: serverTimestamp(),
    };
    if (patch.title !== undefined) updatePayload.title = clampStr(patch.title, 200);
    if (patch.author !== undefined) updatePayload.author = clampStr(patch.author, 120);
    if (patch.category !== undefined) updatePayload.category = clampStr(patch.category || '일반', 60);
    if (patch.reason !== undefined) updatePayload.reason = clampStr(patch.reason, 1000);
    if (patch.priority !== undefined) updatePayload.priority = patch.priority;
    if (patch.coverTone !== undefined) updatePayload.coverTone = patch.coverTone;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.startDate !== undefined) updatePayload.startDate = clampStr(patch.startDate, 20);
    if (patch.endDate !== undefined) updatePayload.endDate = clampStr(patch.endDate, 20);

    updateDoc(doc(db, 'books', bookId), updatePayload).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `books/${bookId}`),
    );
  };

  const deleteBook = (bookId: string) => {
    if (!user) {
      setLocalBooks((prev) => prev.filter((b) => b.id !== bookId));
      setLocalNotes((prev) => prev.filter((n) => n.bookId !== bookId));
      setLocalReviews((prev) => prev.filter((r) => r.bookId !== bookId));
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, 'books', bookId));
    cloudNotes
      .filter((n) => n.bookId === bookId)
      .forEach((n) => batch.delete(doc(db, 'notes', n.id)));
    cloudReviews
      .filter((r) => r.bookId === bookId)
      .forEach((r) => batch.delete(doc(db, 'reviews', r.id)));

    batch.commit().catch((err) => handleFirestoreError(err, OperationType.DELETE, `books/${bookId}`));
  };

  const setReadingStatus = (bookId: string, status: ReadingStatus) => {
    const today = getTodayString();
    const target = books.find((b) => b.id === bookId);
    if (!target) return;

    let patch: Partial<Book>;
    if (status === '읽기 전') {
      patch = { status, endDate: '', currentPage: 0 };
    } else if (status === '읽는 중') {
      patch = {
        status,
        startDate: target.startDate || today,
        endDate: '',
        currentPage:
          target.currentPage >= target.totalPages
            ? Math.max(0, target.totalPages - 1)
            : target.currentPage,
      };
    } else {
      patch = {
        status: '완독',
        startDate: target.startDate || today,
        endDate: target.endDate || today,
        currentPage: target.totalPages,
      };
    }

    updateBook(bookId, patch);
  };

  const updateProgress = (bookId: string, page: number) => {
    const today = getTodayString();
    const target = books.find((b) => b.id === bookId);
    if (!target) return;

    const clamped = Math.min(Math.max(0, Math.round(page)), target.totalPages);
    let patch: Partial<Book>;

    if (clamped >= target.totalPages) {
      patch = {
        currentPage: target.totalPages,
        status: '완독',
        startDate: target.startDate || today,
        endDate: target.endDate || today,
      };
    } else if (clamped > 0 && target.status === '읽기 전') {
      patch = {
        currentPage: clamped,
        status: '읽는 중',
        startDate: target.startDate || today,
      };
    } else {
      patch = {
        currentPage: clamped,
        status: target.status === '완독' && clamped < target.totalPages ? '읽는 중' : target.status,
        endDate: target.status === '완독' && clamped < target.totalPages ? '' : target.endDate,
      };
    }

    updateBook(bookId, patch);
  };

  const addNote = (input: {
    bookId: string;
    page: number | null;
    quote: string;
    memo: string;
    syncProgress?: boolean;
  }) => {
    const id = sanitizeId(`note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const today = getTodayString();
    const book = books.find((b) => b.id === input.bookId);

    const newNote: ReadingNote = {
      id,
      ownerId: user?.uid,
      ownerName,
      isPublic: isPublicDefault,
      bookId: input.bookId,
      bookTitle: book?.title || '',
      page: input.page !== null ? Math.min(Math.max(0, Math.round(input.page)), 50000) : null,
      quote: clampStr(input.quote, 2000),
      memo: clampStr(input.memo, 4000),
      createdAt: today,
    };

    if (!user) {
      setLocalNotes((prev) => [newNote, ...prev]);
      if (input.syncProgress && input.page !== null && input.page >= 0) {
        updateProgress(input.bookId, input.page);
      }
      return newNote;
    }

    setDoc(doc(db, 'notes', id), {
      ownerId: user.uid,
      ownerName,
      isPublic: isPublicDefault,
      bookId: input.bookId,
      bookTitle: clampStr(book?.title || '도서', 200),
      page: newNote.page,
      quote: newNote.quote,
      memo: newNote.memo,
      createdDate: today,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `notes/${id}`));

    if (input.syncProgress && input.page !== null && input.page >= 0) {
      updateProgress(input.bookId, input.page);
    }

    return newNote;
  };

  const updateNote = (noteId: string, patch: Partial<ReadingNote>) => {
    if (!user) {
      setLocalNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...patch } : n)));
      return;
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (patch.page !== undefined) {
      payload.page = patch.page !== null ? Math.min(Math.max(0, Math.round(patch.page)), 50000) : null;
    }
    if (patch.quote !== undefined) payload.quote = clampStr(patch.quote, 2000);
    if (patch.memo !== undefined) payload.memo = clampStr(patch.memo, 4000);

    updateDoc(doc(db, 'notes', noteId), payload).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `notes/${noteId}`),
    );
  };

  const deleteNote = (noteId: string) => {
    if (!user) {
      setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
      return;
    }
    deleteDoc(doc(db, 'notes', noteId)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `notes/${noteId}`),
    );
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
    const book = books.find((b) => b.id === input.bookId);
    const rating = Math.min(Math.max(1, Math.round(input.rating)), 5);

    if (!user) {
      setLocalReviews((prev) => {
        const existing = prev.find((r) => r.bookId === input.bookId);
        if (existing) {
          return prev.map((r) =>
            r.bookId === input.bookId
              ? {
                  ...r,
                  rating,
                  summary: clampStr(input.summary, 300),
                  pros: clampStr(input.pros, 1500),
                  cons: clampStr(input.cons, 1500),
                  finalThought: clampStr(input.finalThought, 5000),
                  updatedAt: today,
                }
              : r,
          );
        }
        return [
          {
            id: sanitizeId(`review_${input.bookId}`),
            bookId: input.bookId,
            rating,
            summary: clampStr(input.summary, 300),
            pros: clampStr(input.pros, 1500),
            cons: clampStr(input.cons, 1500),
            finalThought: clampStr(input.finalThought, 5000),
            updatedAt: today,
          },
          ...prev,
        ];
      });
      return;
    }

    const existing = cloudReviews.find((r) => r.bookId === input.bookId);
    const reviewId = existing ? existing.id : sanitizeId(`rev_${input.bookId}`);

    if (existing) {
      updateDoc(doc(db, 'reviews', reviewId), {
        rating,
        summary: clampStr(input.summary, 300),
        pros: clampStr(input.pros, 1500),
        cons: clampStr(input.cons, 1500),
        finalThought: clampStr(input.finalThought, 5000),
        updatedDate: today,
        updatedAt: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`));
    } else {
      setDoc(doc(db, 'reviews', reviewId), {
        ownerId: user.uid,
        ownerName,
        isPublic: isPublicDefault,
        bookId: input.bookId,
        bookTitle: clampStr(book?.title || '도서', 200),
        bookAuthor: clampStr(book?.author || '저자 미상', 120),
        rating,
        summary: clampStr(input.summary, 300),
        pros: clampStr(input.pros, 1500),
        cons: clampStr(input.cons, 1500),
        finalThought: clampStr(input.finalThought, 5000),
        updatedDate: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`));
    }
  };

  const deleteReview = (bookId: string) => {
    if (!user) {
      setLocalReviews((prev) => prev.filter((r) => r.bookId !== bookId));
      return;
    }
    const existing = cloudReviews.find((r) => r.bookId === bookId);
    if (!existing) return;
    deleteDoc(doc(db, 'reviews', existing.id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `reviews/${existing.id}`),
    );
  };

  return {
    user,
    authReady,
    authError,
    profile,
    cloudLoaded,
    localBookCount: localBooks.length,
    signInWithGoogle,
    signOutUser,
    updateProfile,
    importLocalToCloud,
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
