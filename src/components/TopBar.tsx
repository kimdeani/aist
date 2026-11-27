import { Plus } from 'lucide-react';
import { TabId } from '../types/readlog';

interface TopBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenRegisterModal: () => void;
  counts: {
    selection: number;
    notes: number;
    history: number;
    review: number;
  };
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'selection', label: '책 선정' },
  { id: 'notes', label: '감상 기록' },
  { id: 'history', label: '독서 이력 관리' },
  { id: 'review', label: '리뷰' },
];

export function TopBar({ activeTab, onSelectTab, onOpenRegisterModal, counts }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Brand Wordmark only */}
        <button
          type="button"
          onClick={() => onSelectTab('selection')}
          className="font-display text-xl font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] rounded-sm"
        >
          READLOG
        </button>

        {/* Zone 2: 4 concise single-line navigation tabs (desktop) */}
        <nav aria-label="주요 기능 탭" className="hidden md:flex items-center gap-8 h-full">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-full items-center gap-1.5 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] ${
                  isActive ? 'text-[#1E40AF]' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono-num text-xs text-zinc-400">({count})</span>
                {isActive && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1E40AF]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-4 py-2 text-xs sm:text-sm font-medium text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 hover:bg-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>책 등록</span>
          </button>
        </div>
      </div>

      {/* Mobile tab strip */}
      <nav
        aria-label="모바일 기능 탭"
        className="flex md:hidden items-center gap-5 overflow-x-auto border-t border-zinc-100 px-4 h-11"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex h-full items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isActive ? 'text-[#1E40AF]' : 'text-zinc-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono-num text-[11px] text-zinc-400">({counts[tab.id]})</span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1E40AF]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
