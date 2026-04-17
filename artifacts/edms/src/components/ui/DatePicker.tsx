import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(value: string): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  placeholder = "Select date",
  label,
  className = "",
  minDate,
  maxDate,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"day" | "month" | "year">("day");
  const [viewDate, setViewDate] = useState<Date>(
    () => parseDate(value) ?? new Date(),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) setViewDate(d);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

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
    onChange(toIsoDate(d));
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
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((o) => !o);
            setView("day");
          }
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`w-full flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm tabular-nums transition-all ${
          disabled
            ? "bg-card/30 border-border/50 text-slate-600 cursor-not-allowed"
            : open
              ? "bg-slate-950/90 border-teal-400/60 ring-1 ring-teal-400/30 shadow-[0_18px_40px_rgba(13,148,136,0.16)] text-foreground"
              : "bg-slate-950/65 border-border/60 text-foreground hover:border-teal-400/35 hover:bg-slate-950/80"
        }`}
      >
        <Calendar
          className={`w-4 h-4 shrink-0 ${value ? "text-primary/90" : "text-muted-foreground"}`}
        />
        <span
          className={`flex-1 ${value ? "text-foreground" : "text-muted-foreground"}`}
        >
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <X
            className="w-3.5 h-3.5 shrink-0 text-muted-foreground transition-colors hover:text-rose-400"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label ?? placeholder}
          className="absolute left-0 top-full z-[9999] mt-2 w-72 overflow-hidden rounded-2xl border border-teal-400/20 bg-[linear-gradient(180deg,rgba(5,12,20,0.98),rgba(9,19,30,0.96))] backdrop-blur-2xl shadow-[0_28px_90px_rgba(2,8,23,0.72)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-slate-950/40 via-slate-900/20 to-teal-500/5 px-4 py-3">
            {view === "day" && (
              <>
                <button
                  onClick={prevMonth}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/70 hover:text-primary/90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setView("month")}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70 hover:text-teal-200"
                  >
                    {MONTHS[month]}
                  </button>
                  <button
                    onClick={() => setView("year")}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70 hover:text-teal-200"
                  >
                    {year}
                  </button>
                </div>
                <button
                  onClick={nextMonth}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/70 hover:text-primary/90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {view === "month" && (
              <>
                <button
                  onClick={prevYear}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/70 hover:text-primary/90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("year")}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70 hover:text-teal-200"
                >
                  {year}
                </button>
                <button
                  onClick={nextYear}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/70 hover:text-primary/90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {view === "year" && (
              <>
                <button
                  onClick={() => setViewDate(new Date(year - 12, month, 1))}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/70 hover:text-primary/90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-foreground">
                  {yearRange[0]} – {yearRange[11]}
                </span>
                <button
                  onClick={() => setViewDate(new Date(year + 12, month, 1))}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/70 hover:text-primary/90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Day view */}
          {view === "day" && (
            <div className="p-3.5">
              <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-slate-950/40 px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Selected
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {value ? formatDisplay(value) : "No date selected"}
                  </p>
                </div>
                <div className="rounded-full border border-teal-400/20 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
                  {MONTHS[month].slice(0, 3)}
                </div>
              </div>
              <div className="mb-1 grid grid-cols-7">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
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
                      className={`h-9 w-full rounded-xl text-xs font-semibold tabular-nums transition-all ${
                        isSel
                          ? "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-[0_10px_24px_rgba(20,184,166,0.35)]"
                          : isToday
                            ? "border border-teal-400/40 bg-secondary/85 text-teal-200"
                            : isOff
                              ? "text-slate-700 cursor-not-allowed"
                              : "text-foreground/90 hover:bg-secondary/85 hover:text-teal-200"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <button
                  onClick={() => {
                    const t = new Date();
                    onChange(toIsoDate(t));
                    setOpen(false);
                  }}
                  className="rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-200 transition-colors hover:border-teal-300/40 hover:bg-teal-500/15"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-rose-400/30 hover:text-rose-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Month view */}
          {view === "month" && (
            <div className="grid grid-cols-3 gap-1.5 p-3.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => {
                    setViewDate(new Date(year, i, 1));
                    setView("day");
                  }}
                  className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${
                    i === month
                      ? "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-[0_8px_20px_rgba(20,184,166,0.28)]"
                      : "text-foreground/90 hover:bg-secondary/85 hover:text-teal-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Year view */}
          {view === "year" && (
            <div className="grid grid-cols-3 gap-1.5 p-3.5">
              {yearRange.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setViewDate(new Date(y, month, 1));
                    setView("month");
                  }}
                  className={`rounded-xl py-2.5 text-xs font-semibold tabular-nums transition-all ${
                    y === year
                      ? "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-[0_8px_20px_rgba(20,184,166,0.28)]"
                      : "text-foreground/90 hover:bg-secondary/85 hover:text-teal-200"
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
