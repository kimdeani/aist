import React, { useEffect, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { PublicProfile } from '../types/readlog';

interface ProfileModalProps {
  isOpen: boolean;
  profile: PublicProfile | null;
  email: string | null;
  onClose: () => void;
  onSave: (patch: { displayName: string; bio: string; isPublic: boolean }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function ProfileModal({
  isOpen,
  profile,
  email,
  onClose,
  onSave,
  onSignOut,
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !profile) return;
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setIsPublic(profile.isPublic);
    setError('');
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        bio: bio.trim(),
        isPublic,
      });
      onClose();
    } catch {
      setError('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 id="profile-modal-title" className="text-lg font-semibold text-zinc-900">
              내 계정 및 서재 공개 설정
            </h2>
            {email && <p className="mt-0.5 text-xs text-zinc-500">{email}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="profile-display-name" className="block text-xs font-medium text-zinc-700">
              닉네임 (최대 50자)
            </label>
            <input
              id="profile-display-name"
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-xs font-medium text-zinc-700">
              서재 소개 (최대 200자)
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={200}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="주로 읽는 분야나 독서 취향을 한 줄로 소개해 보세요."
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-700">다른 사용자에게 내 서재 공개</span>
            <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  isPublic ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600'
                }`}
              >
                공개 (서재 구경 노출)
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  !isPublic ? 'bg-white text-zinc-900 border border-zinc-200/80' : 'text-zinc-600'
                }`}
              >
                비공개 (나만 보기)
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              공개 시 닉네임·책 목록·감상 기록·리뷰가 ‘서재 구경’ 탭에 표시되며, 이메일 주소는 비공개로 유지됩니다.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={async () => {
                await onSignOut();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>로그아웃</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E3A8A] disabled:opacity-60 cursor-pointer"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
