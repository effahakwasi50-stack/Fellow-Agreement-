import React from 'react';
import { Users } from 'lucide-react';

export type ActiveTab = 'verify' | 'records';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onToggleSidebar,
  sidebarOpen,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('verify');
          }}
          className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-[#0B1F3A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C59B27]"
        >
          Republic Hall
        </a>

        {/* Zone 2: Clean single-line navigation tabs */}
        <nav aria-label="Primary navigation" className="flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('verify')}
            aria-current={activeTab === 'verify' ? 'page' : undefined}
            className={`relative py-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C59B27] ${
              activeTab === 'verify'
                ? 'text-[#0B1F3A]'
                : 'text-slate-600 hover:text-[#0B1F3A]'
            }`}
          >
            <span className="sm:hidden">Agreement</span>
            <span className="hidden sm:inline">Fellow Agreement</span>
            {activeTab === 'verify' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#C59B27]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('records')}
            aria-current={activeTab === 'records' ? 'page' : undefined}
            className={`relative py-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C59B27] ${
              activeTab === 'records'
                ? 'text-[#0B1F3A]'
                : 'text-slate-600 hover:text-[#0B1F3A]'
            }`}
          >
            <span className="sm:hidden">Records</span>
            <span className="hidden sm:inline">Admin Records</span>
            {activeTab === 'records' && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#C59B27]"
              />
            )}
          </button>
        </nav>

        {/* Zone 3: Single primary utility button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-expanded={sidebarOpen}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132B4C] border border-[#C59B27]/60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2C05B]" aria-hidden="true" />
            <span className="sm:hidden">Fellows</span>
            <span className="hidden sm:inline">Manage Fellows</span>
          </button>
        </div>
      </div>
    </header>
  );
};
