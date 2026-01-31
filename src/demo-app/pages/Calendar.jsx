import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';

/**
 * Demo Calendar Page - Apple-style calendar
 */
const DemoCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const events = [
    { id: 1, title: 'Client Meeting - Oceanview', time: '9:00 AM', duration: '1h', color: 'bg-[#0071e3]' },
    { id: 2, title: 'Content Review', time: '11:00 AM', duration: '30m', color: 'bg-[#af52de]' },
    { id: 3, title: 'Team Standup', time: '2:00 PM', duration: '15m', color: 'bg-[#34c759]' },
    { id: 4, title: 'Photo Shoot', time: '4:00 PM', duration: '2h', color: 'bg-[#ff9500]' },
  ];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day) => {
    return day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() && currentDate.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Calendar</h1>
          <p className="text-[17px] text-[#86868b]">Schedule and manage your events.</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] active:scale-[0.98] transition-all">
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add Event
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
              {monthName} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-5 h-5 text-[#1d1d1f] dark:text-white" strokeWidth={1.5} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 rounded-lg text-[13px] font-medium text-[#0071e3] hover:bg-[#0071e3]/10 transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <ChevronRight className="w-5 h-5 text-[#1d1d1f] dark:text-white" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                disabled={!day}
                className={`
                  aspect-square p-2 rounded-xl text-[15px] font-medium
                  transition-all duration-200
                  ${!day ? 'invisible' : ''}
                  ${isToday(day) ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/30' : ''}
                  ${isSelected(day) && !isToday(day) ? 'bg-[#0071e3]/10 text-[#0071e3]' : ''}
                  ${!isToday(day) && !isSelected(day) && day ? 'text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5' : ''}
                `}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Events Sidebar */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="p-5 border-b border-black/5 dark:border-white/5">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Today's Schedule</h3>
            <p className="text-[13px] text-[#86868b]">{events.length} events</p>
          </div>
          <div className="p-4 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-1 self-stretch rounded-full ${event.color}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white mb-1 truncate">{event.title}</h4>
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                      <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{event.time}</span>
                      <span>•</span>
                      <span>{event.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-black/5 dark:border-white/5">
            <button className="w-full h-10 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 text-[13px] font-medium text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoCalendar;
