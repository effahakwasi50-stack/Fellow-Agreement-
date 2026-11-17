import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { FellowRecord, filterFellows } from '../utils/verification';

interface FellowComboboxProps {
  fellows: readonly FellowRecord[];
  selectedFellow: string | null;
  onSelect: (fullName: string | null) => void;
  disabled?: boolean;
}

export const FellowCombobox: React.FC<FellowComboboxProps> = ({
  fellows,
  selectedFellow,
  onSelect,
  disabled = false,
}) => {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState<string>(selectedFellow ?? '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  useEffect(() => {
    setQuery(selectedFellow ?? '');
  }, [selectedFellow]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Restore selected label if user clicked away without choosing
        setQuery(selectedFellow ?? '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedFellow]);

  const filtered = useMemo(() => {
    // If input exactly matches already selected fellow and user hasn't edited query, show all options on open
    if (selectedFellow && query === selectedFellow) {
      return [...fellows];
    }
    return filterFellows(fellows, query);
  }, [fellows, query, selectedFellow]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const handleChoose = (fullName: string) => {
    onSelect(fullName);
    setQuery(fullName);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onSelect(null);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && isOpen && filtered[highlightedIndex]) {
      e.preventDefault();
      handleChoose(filtered[highlightedIndex].full_name);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(selectedFellow ?? '');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="block text-sm font-semibold text-[#0B1F3A] mb-2">
        Search &amp; Select Fellow Name
      </label>

      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && filtered[highlightedIndex]
              ? `${listboxId}-opt-${filtered[highlightedIndex].id}`
              : undefined
          }
          disabled={disabled}
          value={query}
          placeholder="Search Fellow Name"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(true);
            if (!val.trim() && selectedFellow) {
              onSelect(null);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[46px] pl-10 pr-20 py-2.5 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#C59B27]/30 transition-colors"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(query || selectedFellow) && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear Fellow selection"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B27]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? 'Close Fellow list' : 'Open Fellow list'}
            className="p-1.5 text-slate-500 hover:text-[#0B1F3A] rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B27]"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Republic Hall Fellows Directory"
          className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1 divide-y divide-slate-100"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              No Fellow matching &ldquo;{query}&rdquo; in directory.
            </li>
          ) : (
            filtered.map((fellow, index) => {
              const isSelected = selectedFellow === fellow.full_name;
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={fellow.id}
                  id={`${listboxId}-opt-${fellow.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleChoose(fellow.full_name);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#0B1F3A] text-white font-semibold'
                      : isHighlighted
                        ? 'bg-slate-100 text-[#0B1F3A]'
                        : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>{fellow.full_name}</span>
                  {isSelected && (
                    <span className="text-xs text-[#E2C05B] shrink-0">Selected</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
