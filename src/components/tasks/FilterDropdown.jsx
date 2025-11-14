import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Trash2, Star, Flag, Calendar, Users, Zap, Repeat, CheckCircle2 } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { toast } from 'react-hot-toast';

const PRESET_FILTERS = [
  {
    id: 'preset-p1',
    name: 'P1 Urgent',
    icon: Flag,
    color: 'text-red-600',
    criteria: { priorities: ['urgent', 'p1'] }
  },
  {
    id: 'preset-week',
    name: 'This Week',
    icon: Calendar,
    color: 'text-orange-600',
    criteria: { dueWithinDays: 7 }
  },
  {
    id: 'preset-client',
    name: 'Client Work',
    icon: Users,
    color: 'text-blue-600',
    criteria: { labels: ['client-work', 'urgent'] }
  },
  {
    id: 'preset-quick',
    name: 'Quick Wins',
    icon: Zap,
    color: 'text-yellow-600',
    criteria: { priorities: ['low', 'p4', 'medium', 'p3'], estimatedTimeMax: 30 }
  },
  {
    id: 'preset-recurring',
    name: 'Recurring',
    icon: Repeat,
    color: 'text-green-600',
    criteria: { isRecurring: true }
  }
];

const FilterDropdown = ({ isOpen, onClose, onApplyFilter, currentUser, activeFilter }) => {
  const [customFilters, setCustomFilters] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomFilters();
    }
  }, [isOpen]);

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
    if (!window.confirm('Delete this filter?')) return;

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

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-y-auto"
    >
      {/* Preset Filters */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <p className="text-xs font-semibold text-gray-600 uppercase">Quick Filters</p>
        </div>
        <div className="py-1 pb-2">
          {PRESET_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter?.id === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter)}
                className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                  isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${filter.color}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                  {filter.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Filters */}
      {customFilters.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase">My Filters</p>
          </div>
          <div className="py-1 pb-2">
            {customFilters.map((filter) => {
              const isActive = activeFilter?.id === filter.id;
              
              return (
                <div
                  key={filter.id}
                  className={`group relative ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <button
                    onClick={() => handleFilterClick(filter)}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 pr-10"
                  >
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                      {filter.name}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteFilter(filter.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Filter & Create New */}
      <div className="py-1 pb-2">
        {activeFilter?.id && (
          <button
            onClick={() => {
              onApplyFilter(null);
              onClose();
            }}
            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <CheckCircle2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Clear Filter</span>
          </button>
        )}
        <button
          onClick={() => {
            onClose();
            // Trigger create filter modal
            window.dispatchEvent(new CustomEvent('create-smart-filter'));
          }}
          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 text-blue-600 font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Create New Filter</span>
        </button>
      </div>
    </div>
  );
};

export default FilterDropdown;

