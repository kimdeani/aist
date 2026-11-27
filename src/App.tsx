/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ArrowRight, LogIn, UserCheck, X } from 'lucide-react';
import { BookRegisterModal } from './components/BookRegisterModal';
import { ProfileModal } from './components/ProfileModal';
import { TopBar } from './components/TopBar';
import { BookSelectionTab } from './components/tabs/BookSelectionTab';
import { ExploreLibrariesTab } from './components/tabs/ExploreLibrariesTab';
import { ReadingHistoryTab } from './components/tabs/ReadingHistoryTab';
import { ReadingNotesTab } from './components/tabs/ReadingNotesTab';
import { ReviewTab } from './components/tabs/ReviewTab';
import { useReadlogStore } from './hooks/useReadlogStore';
import { ReadingStatus, TabId } from './types/readlog';

interface ToastBanner {
  message: string;
  actionLabel?: string;
  targetTab?: TabId;
  bookId?: string;
}

export default function App() {
  const {
    user,
    authReady,
    authError,
    profile,
    cloudLoaded,
    localBookCount,
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
  } = useReadlogStore();

  const [activeTab, setActiveTab] = useState<TabId>('selection');
  const [focusedBookId, setFocusedBookId] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [dismissedMigration, setDismissedMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const handleNavigateTab = (tab: TabId, bookId?: string) => {
    setActiveTab(tab);
    setFocusedBookId(bookId ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartReading = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    setReadingStatus(bookId, '읽는 중');
    setToast({
      message: `『${book?.title ?? '도서'}』 독서를 시작했습니다. 독서 이력 관리에 반영되었습니다.`,
      actionLabel: '독서 이력 관리 보기',
      targetTab: 'history',
    });
  };

  const handleSetStatus = (bookId: string, status: ReadingStatus) => {
    const book = books.find((b) => b.id === bookId);
    setReadingStatus(bookId, status);
    if (status === '완독') {
      setToast({
        message: `『${book?.title ?? '도서'}』 완독으로 기록되었습니다. 리뷰 탭에서 최종 평가를 남길 수 있습니다.`,
        actionLabel: '리뷰 작성하기',
        targetTab: 'review',
        bookId,
      });
    }
  };

  const handleBatchRegister = (items: Parameters<typeof addBooksBatch>[0]) => {
    const created = addBooksBatch(items);
    if (created.length === 0) return;
    setActiveTab('selection');
    setToast({
      message:
        created.length === 1
          ? `『${created[0].title}』이(가) 책 선정 목록에 등록되었습니다.`
          : `${created.length}권의 도서가 책 선정 목록에 일괄 등록되었습니다.`,
      actionLabel: '독서 이력에서 확인',
      targetTab: 'history',
    });
  };

  const completedCount = books.filter((b) => b.status === '완독').length;
  const showMigrationOffer =
    Boolean(user) && cloudLoaded && books.length === 0 && localBookCount > 0 && !dismissedMigration;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigateTab(tab)}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        onSignIn={signInWithGoogle}
        isSignedIn={Boolean(user)}
        counts={{
          selection: books.length,
          notes: notes.length,
          history: books.length,
          review: completedCount,
          explore: 0,
        }}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Personal Book Space & Account Strip */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tracking-[0.16em] font-medium text-zinc-500">MY PERSONAL BOOK SPACE</span>
            <span aria-hidden="true" className="text-zinc-300">/</span>
            <span className="font-mono-num text-zinc-400">
              선정 {books.length} · 감상 {notes.length} · 완독 {completedCount} · 리뷰 {reviews.length}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!authReady ? (
              <span className="text-zinc-400">계정 확인 중...</span>
            ) : user ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-zinc-700 font-medium">
                  <UserCheck className="h-3.5 w-3.5 text-[#1E40AF]" />
                  <span>{profile?.displayName || user.displayName || '내 계정'}</span>
                </span>
                <span aria-hidden="true" className="text-zinc-300">·</span>
                <span className={profile?.isPublic ? 'text-emerald-700 font-medium' : 'text-zinc-500'}>
                  {profile?.isPublic ? '서재 공개중' : '비공개'}
                </span>
                <span aria-hidden="true" className="text-zinc-300">·</span>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="font-medium text-[#1E40AF] hover:underline cursor-pointer"
                >
                  계정·공개 설정
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span>로컬 체험 모드</span>
                <span aria-hidden="true" className="text-zinc-300">·</span>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-1 font-medium text-[#1E40AF] hover:underline cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Google 로그인으로 내 서재 동기화</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {authError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
          >
            {authError}
          </div>
        )}

        {/* First-time local-to-cloud migration prompt */}
        {showMigrationOffer && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-800">
            <span>
              로그인 전 브라우저에 저장된 도서 기록 <strong className="font-mono-num">{localBookCount}권</strong>이 있습니다. 내 계정 클라우드 서재로 가져올까요?
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDismissedMigration(true)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                건너뛰기
              </button>
              <button
                type="button"
                disabled={migrating}
                onClick={async () => {
                  setMigrating(true);
                  const count = await importLocalToCloud();
                  setMigrating(false);
                  setDismissedMigration(true);
                  setToast({
                    message: `${count}권의 도서와 감상·리뷰를 내 계정으로 가져왔습니다.`,
                  });
                }}
                className="rounded-lg bg-[#1E40AF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A8A] disabled:opacity-60 cursor-pointer"
              >
                {migrating ? '가져오는 중...' : '내 계정에 가져오기'}
              </button>
            </div>
          </div>
        )}

        {/* Cross-tab feedback banner */}
        {toast && (
          <div
            role="status"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-800"
          >
            <span>{toast.message}</span>
            <div className="flex items-center gap-3 shrink-0">
              {toast.targetTab && toast.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    const target = toast.targetTab!;
                    const targetBookId = toast.bookId;
                    setToast(null);
                    handleNavigateTab(target, targetBookId);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-[#1E40AF] hover:underline cursor-pointer"
                >
                  <span>{toast.actionLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="알림 닫기"
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 5 Independent Functional Tabs */}
        {activeTab === 'selection' && (
          <BookSelectionTab
            books={books}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            onRegisterBatch={handleBatchRegister}
            onUpdateBook={updateBook}
            onDeleteBook={deleteBook}
            onStartReading={handleStartReading}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'notes' && (
          <ReadingNotesTab
            books={books}
            notes={notes}
            initialSelectedBookId={focusedBookId}
            onAddNote={addNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <ReadingHistoryTab
            books={books}
            reviews={reviews}
            onSetStatus={handleSetStatus}
            onUpdateProgress={updateProgress}
            onUpdateBook={updateBook}
            onNavigateTab={handleNavigateTab}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {activeTab === 'review' && (
          <ReviewTab
            books={books}
            reviews={reviews}
            initialSelectedBookId={focusedBookId}
            onUpsertReview={upsertReview}
            onDeleteReview={deleteReview}
            onNavigateTab={(tab) => handleNavigateTab(tab)}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreLibrariesTab
            currentUserId={user?.uid}
            myBooks={books}
            onSignIn={signInWithGoogle}
            onAddBookFromCommunity={(input) => {
              const created = addBook(input);
              setToast({
                message: `『${created.title}』을(를) 내 책 선정 목록에 담았습니다.`,
                actionLabel: '책 선정에서 보기',
                targetTab: 'selection',
              });
            }}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span className="font-display font-semibold text-zinc-800">READLOG</span>
          <span>My Personal Book Space</span>
        </div>
      </footer>

      <BookRegisterModal
        isOpen={isRegisterModalOpen}
        existingBooks={books}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={(input) => {
          const created = addBook(input);
          setActiveTab('selection');
          setToast({
            message: `『${created.title}』이(가) 책 선정 목록에 등록되었습니다.`,
            actionLabel: '독서 이력에서 확인',
            targetTab: 'history',
          });
        }}
        onRegisterBatch={handleBatchRegister}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        profile={profile}
        email={user?.email || null}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={updateProfile}
        onSignOut={signOutUser}
      />
    </div>
  );
}
