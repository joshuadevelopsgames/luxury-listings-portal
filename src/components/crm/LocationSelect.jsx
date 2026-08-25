import React, { useState, useRef, useEffect } from 'react';
import { CRM_LOCATIONS, normalizeLocation } from '../../services/crmService';
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

  const optionSetLower = new Set(options.map((o) => o.toLowerCase()));
  const legacyValue = normalizedValue && !optionSetLower.has(normalizedValue.toLowerCase()) ? normalizedValue : null;
  const allOptions = legacyValue && allowLegacy ? [legacyValue, ...options] : options;
  const q = query.trim();
  const filtered = q
    ? allOptions.filter((loc) => loc.toLowerCase().includes(q.toLowerCase())).slice(0, MAX_DROPDOWN)
    : allOptions.slice(0, MAX_DROPDOWN);
  const exactMatch = q && allOptions.some((loc) => loc.toLowerCase() === q.toLowerCase());
  const showCustomOption = q && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc) => {
    const val = loc ? normalizeLocation(String(loc).trim()) : '';
    onChange(val);
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
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-hairline-strong bg-surface shadow-lg py-1 text-[14px]">
          {normalizedValue && (
            <li>
              <button type="button" onClick={handleClear} className="w-full px-4 py-2.5 text-left text-ink-muted hover:bg-surface-3">
                Clear location
              </button>
            </li>
          )}
          {showCustomOption && (
            <li className="border-t border-hairline mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  const normalized = normalizeLocation(q);
                  handleSelect(normalized);
                  addCustomLocation(normalized, currentUser?.email || '').catch((err) => console.warn('addCustomLocation', err));
                }}
                className="w-full px-4 py-2.5 text-left text-brand hover:bg-surface-3 font-medium"
              >
                Use &quot;{q}&quot;
              </button>
            </li>
          )}
          {filtered.length === 0 && !showCustomOption ? (
            <li className="px-4 py-2.5 text-ink-muted">No matches — type to add a custom location</li>
          ) : (
            filtered.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-surface-3 ${loc === normalizedValue ? 'bg-brand/10 text-brand' : 'text-ink'}`}
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
