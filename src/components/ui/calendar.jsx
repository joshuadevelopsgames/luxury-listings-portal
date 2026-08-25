import React, { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;
// Bars past this many stacked rows collapse into a "+n more" note on the day
const MAX_LANES = 3;

const startOfDayMs = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const Calendar = ({ events = [], onDateClick, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get calendar grid data (always whole weeks so the bar overlay lines up)
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || days.length < 42 || days.length % 7 !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getEventsForDate = (date) => {
    const cellDay = startOfDayMs(date);
    return events.filter(event => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : start;
      return cellDay >= startOfDayMs(start) && cellDay <= startOfDayMs(end);
    });
  };

  // One bar per event per week: clip the event to the week, then stack the
  // clipped segments into lanes so overlapping requests never sit on top of
  // each other. A multi-day request renders as a single stretched bar instead
  // of a repeated chip in every day cell.
  const getWeekSegments = (week) => {
    const weekStart = startOfDayMs(week[0]);
    const weekEnd = startOfDayMs(week[week.length - 1]);

    const segments = events
      .map((event, index) => {
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : start;
        const startMs = startOfDayMs(start);
        const endMs = startOfDayMs(end);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
        if (endMs < weekStart || startMs > weekEnd) return null;

        const startCol = Math.max(0, Math.round((startMs - weekStart) / DAY_MS));
        const endCol = Math.min(week.length - 1, Math.round((endMs - weekStart) / DAY_MS));

        return {
          key: event.id ?? `event-${index}`,
          event,
          startCol,
          endCol,
          span: endCol - startCol + 1,
          totalDays: Math.round((endMs - startMs) / DAY_MS) + 1,
          continuesBefore: startMs < weekStart,
          continuesAfter: endMs > weekEnd
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.startCol - b.startCol ||
        b.totalDays - a.totalDays ||
        String(a.event.title || '').localeCompare(String(b.event.title || ''))
      );

    const laneOccupancy = [];
    segments.forEach(segment => {
      let lane = 0;
      for (;;) {
        if (!laneOccupancy[lane]) laneOccupancy[lane] = new Array(week.length).fill(false);
        const isFree = laneOccupancy[lane]
          .slice(segment.startCol, segment.endCol + 1)
          .every(taken => !taken);
        if (isFree) {
          for (let col = segment.startCol; col <= segment.endCol; col += 1) {
            laneOccupancy[lane][col] = true;
          }
          segment.lane = lane;
          break;
        }
        lane += 1;
      }
    });

    const visible = segments.filter(segment => segment.lane < MAX_LANES);
    const overflowByCol = new Array(week.length).fill(0);
    segments
      .filter(segment => segment.lane >= MAX_LANES)
      .forEach(segment => {
        for (let col = segment.startCol; col <= segment.endCol; col += 1) {
          overflowByCol[col] += 1;
        }
      });

    return { visible, overflowByCol };
  };

  const getEventColor = (event) => {
    switch (event.type) {
      case 'leave': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'meeting': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'training': return 'bg-green-100 text-green-800 hover:bg-green-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (onDateClick) onDateClick(date);
  };

  const calendarDays = getCalendarDays();
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">{formatDate(currentDate)}</h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={goToToday} variant="outline" size="sm">
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="px-3 py-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Weeks — day cells underneath, spanning event bars on top */}
        {weeks.map((week, weekIndex) => {
          const { visible, overflowByCol } = getWeekSegments(week);

          return (
            <div key={weekIndex} className="relative">
              <div className="grid grid-cols-7">
                {week.map((date, dayIndex) => {
                  const dayEvents = getEventsForDate(date);
                  const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();

                  return (
                    <div
                      key={dayIndex}
                      className={`min-h-[128px] border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-300' : ''
                      } ${!isCurrentMonth(date) ? 'bg-gray-50 text-gray-400' : ''}`}
                      onClick={() => handleDateClick(date)}
                    >
                      <div className="flex items-center justify-between h-6">
                        <span className={`text-sm font-medium ${
                          isToday(date) ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                        }`}>
                          {date.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Event bars: a multi-day event is one bar stretched across its days */}
              <div className="absolute inset-x-0 top-[38px] grid grid-cols-7 gap-y-[3px] pointer-events-none">
                {visible.map(segment => (
                  <div
                    key={segment.key}
                    style={{
                      gridColumn: `${segment.startCol + 1} / span ${segment.span}`,
                      gridRow: segment.lane + 1
                    }}
                    className={`pointer-events-auto min-w-0 ${segment.continuesBefore ? 'ml-0' : 'ml-[6px]'} ${segment.continuesAfter ? 'mr-0' : 'mr-[6px]'}`}
                  >
                    <div
                      title={[segment.event.title, segment.event.time].filter(Boolean).join(' · ')}
                      className={`h-5 flex items-center px-2 text-[11px] font-medium leading-none truncate cursor-pointer transition-colors ${getEventColor(segment.event)} ${
                        segment.continuesBefore ? 'rounded-l-none' : 'rounded-l'
                      } ${segment.continuesAfter ? 'rounded-r-none' : 'rounded-r'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEventClick) onEventClick(segment.event);
                      }}
                    >
                      <span className="truncate">{segment.event.title}</span>
                    </div>
                  </div>
                ))}

                {overflowByCol.map((count, col) =>
                  count > 0 ? (
                    <div
                      key={`more-${col}`}
                      style={{ gridColumn: `${col + 1} / span 1`, gridRow: MAX_LANES + 1 }}
                      className="px-2 text-[11px] text-gray-500 truncate"
                    >
                      +{count} more
                    </div>
                  ) : null
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
