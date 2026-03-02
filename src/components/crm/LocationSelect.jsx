import React, { useState, useRef, useEffect } from 'react';
import { CRM_LOCATIONS } from '../../services/crmService';
import { useCustomLocations } from '../../contexts/CustomLocationsContext';
import { useAuth } from '../../contexts/AuthContext';

const MAX_DROPDOWN = 200;

export function LocationSelect({ value, onChange, placeholder = 'Search or select location', className = '', options: optionsProp, allowLegacy = true }) {
  const { allLocationOptions, addCustomLocation } = useCustomLocations();
  const { currentUser } = useAuth();
  const options = optionsProp ?? allLocationOptions;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const normalizedValue = (value || '').trim() || null;
  const displayValue = open ? query : (normalizedValue || '');

  const optionSet = new Set(options);
  const legacyValue = normalizedValue && !optionSet.has(normalizedValue) ? normalizedValue : null;
  const allOptions = legacyValue && allowLegacy ? [legacyValue, ...options] : options;
  const q = query.trim();
  const filtered = q
    ? allOptions.filter((loc) => loc.toLowerCase().includes(q.toLowerCase())).slice(0, MAX_DROPDOWN)
    : allOptions.slice(0, MAX_DROPDOWN);
  const exactMatch = q && allOptions.some((loc) => loc === q);
  const showCustomOption = q && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc) => {
    onChange(loc ? String(loc).trim() : '');
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { setOpen(true); setQuery(normalizedValue || ''); }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1d1d1f] shadow-lg py-1 text-[14px]">
          {normalizedValue && (
            <li>
              <button type="button" onClick={handleClear} className="w-full px-4 py-2.5 text-left text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5">
                Clear location
              </button>
            </li>
          )}
          {showCustomOption && (
            <li className="border-t border-black/5 dark:border-white/10 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleSelect(q);
                  addCustomLocation(q, currentUser?.email || '').catch((err) => console.warn('addCustomLocation', err));
                }}
                className="w-full px-4 py-2.5 text-left text-[#0071e3] hover:bg-black/5 dark:hover:bg-white/5 font-medium"
              >
                Use &quot;{q}&quot;
              </button>
            </li>
          )}
          {filtered.length === 0 && !showCustomOption ? (
            <li className="px-4 py-2.5 text-[#86868b]">No matches — type to add a custom location</li>
          ) : (
            filtered.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 ${loc === normalizedValue ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'}`}
                >
                  {loc}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
