import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(value: string): string {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  className = '',
  minDate,
  maxDate,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'day' | 'month' | 'year'>('day');
  const [viewDate, setViewDate] = useState<Date>(() => parseDate(value) ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) setViewDate(d);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = parseDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minD = minDate ? parseDate(minDate) : null;
  const maxD = maxDate ? parseDate(maxDate) : null;

  const isDisabledDate = (d: Date) => {
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const d = new Date(year, month, day);
    if (isDisabledDate(d)) return;
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setOpen(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const prevYear = () => setViewDate(new Date(year - 1, month, 1));
  const nextYear = () => setViewDate(new Date(year + 1, month, 1));

  const yearRange = Array.from({ length: 12 }, (_, i) => year - 5 + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setView('day'); } }}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border transition-all text-left ${
          disabled
            ? 'bg-slate-900/30 border-slate-800/50 text-slate-600 cursor-not-allowed'
            : open
              ? 'bg-slate-950/80 border-teal-500/50 ring-1 ring-teal-500/30 text-slate-200'
              : 'bg-slate-950/60 border-slate-700/50 text-slate-200 hover:border-teal-500/30'
        }`}
      >
        <Calendar className={`w-4 h-4 shrink-0 ${value ? 'text-teal-400' : 'text-slate-500'}`} />
        <span className={`flex-1 ${value ? 'text-slate-200' : 'text-slate-500'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <X
            className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
            onClick={e => { e.stopPropagation(); onChange(''); }}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-[9999] top-full mt-1.5 left-0 w-72 bg-slate-900/95 backdrop-blur-2xl border border-teal-500/20 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            {view === 'day' && (
              <>
                <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setView('month')}
                    className="text-sm font-semibold text-slate-200 hover:text-teal-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/60"
                  >
                    {MONTHS[month]}
                  </button>
                  <button
                    onClick={() => setView('year')}
                    className="text-sm font-semibold text-slate-200 hover:text-teal-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/60"
                  >
                    {year}
                  </button>
                </div>
                <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {view === 'month' && (
              <>
                <button onClick={prevYear} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setView('year')} className="text-sm font-semibold text-slate-200 hover:text-teal-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/60">{year}</button>
                <button onClick={nextYear} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </>
            )}
            {view === 'year' && (
              <>
                <button onClick={() => setViewDate(new Date(year - 12, month, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-semibold text-slate-200">{yearRange[0]} – {yearRange[11]}</span>
                <button onClick={() => setViewDate(new Date(year + 12, month, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/60 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </>
            )}
          </div>

          {/* Day view */}
          {view === 'day' && (
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />;
                  const d = new Date(year, month, day);
                  d.setHours(0, 0, 0, 0);
                  const isToday = d.getTime() === today.getTime();
                  const isSel = selected && d.getTime() === selected.getTime();
                  const isOff = isDisabledDate(d);
                  return (
                    <button
                      key={idx}
                      onClick={() => selectDay(day)}
                      disabled={isOff}
                      className={`h-8 w-full rounded-lg text-xs font-medium transition-all ${
                        isSel
                          ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                          : isToday
                            ? 'bg-slate-700/80 text-teal-300 border border-teal-500/40'
                            : isOff
                              ? 'text-slate-700 cursor-not-allowed'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-teal-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    const t = new Date();
                    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                    onChange(iso);
                    setOpen(false);
                  }}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Today
                </button>
                <button onClick={() => { onChange(''); }} className="text-xs text-slate-500 hover:text-rose-400 transition-colors">Clear</button>
              </div>
            </div>
          )}

          {/* Month view */}
          {view === 'month' && (
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setViewDate(new Date(year, i, 1)); setView('day'); }}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    i === month ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-teal-300'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Year view */}
          {view === 'year' && (
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {yearRange.map(y => (
                <button
                  key={y}
                  onClick={() => { setViewDate(new Date(y, month, 1)); setView('month'); }}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    y === year ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-teal-300'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
