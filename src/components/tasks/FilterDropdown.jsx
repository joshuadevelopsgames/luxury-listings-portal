import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Star, Flag, Calendar, Users, Zap, Repeat, CheckCircle2 } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';

const PRESET_FILTERS = [
  { id: 'preset-p1', name: 'P1 Urgent', icon: Flag, color: 'text-[#ff3b30]', criteria: { priorities: ['urgent', 'p1'] } },
  { id: 'preset-week', name: 'This Week', icon: Calendar, color: 'text-[#ff9500]', criteria: { dueWithinDays: 7 } },
  { id: 'preset-client', name: 'Client Work', icon: Users, color: 'text-[#0071e3]', criteria: { labels: ['client-work', 'urgent'] } },
  { id: 'preset-quick', name: 'Quick Wins', icon: Zap, color: 'text-[#ffcc00]', criteria: { priorities: ['low', 'p4', 'medium', 'p3'], estimatedTimeMax: 30 } },
  { id: 'preset-recurring', name: 'Recurring', icon: Repeat, color: 'text-[#34c759]', criteria: { isRecurring: true } }
];

const FilterDropdown = ({ isOpen, onClose, onApplyFilter, currentUser, activeFilter, buttonRef }) => {
  const { confirm } = useConfirm();
  const [customFilters, setCustomFilters] = useState([]);
  const [maxHeight, setMaxHeight] = useState('none');
  const [dropUp, setDropUp] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomFilters();
    }
  }, [isOpen]);

  // Calculate position relative to button
  useEffect(() => {
    if (!isOpen || !buttonRef?.current) return;
    
    try {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate position from button
      const top = buttonRect.bottom + 8; // 8px gap below button
      const right = viewportWidth - buttonRect.right; // Distance from right edge
      
      setPosition({ top, right });
      
      // Calculate available space
      const spaceBelow = viewportHeight - top - 20;
      const spaceAbove = buttonRect.top - 20;
      
      // Determine if should drop up
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        setDropUp(true);
        setPosition({ bottom: viewportHeight - buttonRect.top + 8, right });
        setMaxHeight(spaceAbove > 500 ? 'none' : `${spaceAbove}px`);
      } else {
        setDropUp(false);
        setPosition({ top, right });
        setMaxHeight(spaceBelow > 500 ? 'none' : `${spaceBelow}px`);
      }
    } catch (error) {
      console.error('Error calculating dropdown position:', error);
      // Fallback to basic positioning
      setPosition({ top: 100, right: 20 });
      setMaxHeight('400px');
    }
  }, [isOpen, customFilters, buttonRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const loadCustomFilters = async () => {
    try {
      const filters = await firestoreService.getSmartFilters(currentUser.email);
      setCustomFilters(filters);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const handleDeleteFilter = async (filterId, e) => {
    e.stopPropagation();
    const confirmed = await confirm({ title: 'Delete filter', message: 'Delete this filter?', confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) return;

    try {
      await firestoreService.deleteSmartFilter(filterId);
      toast.success('Filter deleted!');
      await loadCustomFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast.error('Failed to delete filter');
    }
  };

  const handleFilterClick = (filter) => {
    onApplyFilter(filter);
    onClose();
  };

  if (!isOpen || !buttonRef?.current) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-72 bg-white dark:bg-[#1d1d1f] rounded-xl shadow-xl border border-black/10 dark:border-white/10 z-50 overflow-y-auto"
      style={{ 
        maxHeight,
        ...(dropUp ? { bottom: position.bottom, right: position.right } : { top: position.top, right: position.right })
      }}
    >
      {/* Preset Filters */}
      <div className="border-b border-black/5 dark:border-white/10">
        <div className="px-3 py-2.5 bg-black/[0.02] dark:bg-white/5 border-b border-black/5 dark:border-white/10 sticky top-0 z-10">
          <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Quick Filters</p>
        </div>
        <div className="py-1 pb-2">
          {PRESET_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter?.id === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter)}
                className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3 rounded-lg mx-1 ${
                  isActive
                    ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border-l-2 border-[#0071e3] text-[#0071e3]'
                    : 'hover:bg-black/5 dark:hover:bg-white/10 text-[#1d1d1f] dark:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${filter.color} dark:opacity-90`} />
                <span className="text-[13px] font-medium">{filter.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Filters */}
      {customFilters.length > 0 && (
        <div className="border-b border-black/5 dark:border-white/10">
          <div className="px-3 py-2.5 bg-black/[0.02] dark:bg-white/5 border-b border-black/5 dark:border-white/10 sticky top-0 z-10">
            <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">My Filters</p>
          </div>
          <div className="py-1 pb-2">
            {customFilters.map((filter) => {
              const isActive = activeFilter?.id === filter.id;
              return (
                <div
                  key={filter.id}
                  className={`group relative rounded-lg mx-1 ${isActive ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border-l-2 border-[#0071e3]' : ''}`}
                >
                  <button
                    onClick={() => handleFilterClick(filter)}
                    className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3 pr-10 ${
                      isActive ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <Star className="w-4 h-4 text-[#ff9500] dark:text-[#ff9f0a]" />
                    <span className="text-[13px] font-medium">{filter.name}</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteFilter(filter.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[#ff3b30]/10 dark:hover:bg-[#ff3b30]/20 text-[#ff3b30]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Filter & Create New */}
      <div className="py-2 pb-3 sticky bottom-0 z-10 bg-white dark:bg-[#1d1d1f] border-t border-black/5 dark:border-white/10">
        {activeFilter?.id && (
          <button
            onClick={() => {
              onApplyFilter(null);
              onClose();
            }}
            className="w-full px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-3 rounded-lg mx-1 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[13px] font-medium">Clear Filter</span>
          </button>
        )}
        <button
          onClick={() => {
            onClose();
            window.dispatchEvent(new CustomEvent('create-smart-filter'));
          }}
          className="w-full px-4 py-2.5 text-left hover:bg-[#0071e3]/10 dark:hover:bg-[#0071e3]/20 transition-colors flex items-center gap-3 text-[#0071e3] font-medium mb-2 rounded-lg mx-1"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[13px]">Create New Filter</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default FilterDropdown;

