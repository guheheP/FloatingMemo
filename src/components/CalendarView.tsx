import { useEffect, useMemo, useState } from "react";
import {
  createNote,
  listNotesByMonth,
  setNoteDate,
  type Note,
} from "../api/notes";
import {
  addMonths,
  buildMonthGrid,
  formatYearMonth,
  todayStr,
  yearMonthStr,
  type DateStr,
} from "../lib/date";

interface CalendarViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNotesChanged: () => Promise<void> | void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function deriveDisplayTitle(note: Note): string {
  if (note.title.trim().length > 0) return note.title;
  const firstLine = note.content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (firstLine.length > 0) return firstLine.slice(0, 32);
  return "新規メモ";
}

export default function CalendarView({
  selectedId,
  onSelect,
  onNotesChanged,
}: CalendarViewProps) {
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split("-").map((p) => parseInt(p, 10));
    return { year: y, month1: m };
  });
  const [selectedDate, setSelectedDate] = useState<DateStr>(today);
  const [monthNotes, setMonthNotes] = useState<Note[]>([]);

  const yearMonth = yearMonthStr(cursor.year, cursor.month1);
  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month1),
    [cursor.year, cursor.month1],
  );

  const refreshMonth = async () => {
    try {
      const list = await listNotesByMonth(yearMonth);
      setMonthNotes(list);
    } catch {
      setMonthNotes([]);
    }
  };

  useEffect(() => {
    void refreshMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth]);

  const countByDate = useMemo(() => {
    const map = new Map<DateStr, number>();
    for (const n of monthNotes) {
      if (n.note_date) {
        map.set(n.note_date, (map.get(n.note_date) ?? 0) + 1);
      }
    }
    return map;
  }, [monthNotes]);

  const dayNotes = useMemo(
    () => monthNotes.filter((n) => n.note_date === selectedDate),
    [monthNotes, selectedDate],
  );

  const goPrev = () => {
    const next = addMonths(cursor.year, cursor.month1, -1);
    setCursor(next);
  };
  const goNext = () => {
    const next = addMonths(cursor.year, cursor.month1, 1);
    setCursor(next);
  };
  const goToday = () => {
    const [y, m] = today.split("-").map((p) => parseInt(p, 10));
    setCursor({ year: y, month1: m });
    setSelectedDate(today);
  };

  const handleNewForDate = async () => {
    try {
      const note = await createNote("", "memo");
      await setNoteDate(note.id, selectedDate);
      await refreshMonth();
      await onNotesChanged();
      onSelect(note.id);
    } catch (err) {
      alert(String(err));
    }
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          aria-label="前の月"
          onClick={goPrev}
        >
          ‹
        </button>
        <button
          type="button"
          className="calendar-month-label"
          title="今日へ"
          onClick={goToday}
        >
          {formatYearMonth(cursor.year, cursor.month1)}
        </button>
        <button
          type="button"
          className="calendar-nav"
          aria-label="次の月"
          onClick={goNext}
        >
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`calendar-weekday ${
              i === 0 ? "is-sun" : i === 6 ? "is-sat" : ""
            }`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {grid.flat().map((cell, i) => {
          if (!cell) return <div key={`b-${i}`} className="calendar-cell is-blank" />;
          const isToday = cell === today;
          const isSelected = cell === selectedDate;
          const count = countByDate.get(cell) ?? 0;
          const dom = i % 7;
          return (
            <button
              key={cell}
              type="button"
              className={`calendar-cell ${isToday ? "is-today" : ""} ${
                isSelected ? "is-selected" : ""
              } ${dom === 0 ? "is-sun" : dom === 6 ? "is-sat" : ""}`}
              onClick={() => setSelectedDate(cell)}
            >
              <span className="calendar-day">{parseInt(cell.slice(8), 10)}</span>
              {count > 0 && <span className="calendar-dot" aria-label={`${count}件`} />}
            </button>
          );
        })}
      </div>
      <div className="calendar-day-section">
        <div className="calendar-day-header">
          <span className="calendar-day-label">{selectedDate}</span>
          <button
            type="button"
            className="calendar-day-add"
            title="この日付で新規"
            aria-label="この日付で新規"
            onClick={() => void handleNewForDate()}
          >
            ＋
          </button>
        </div>
        <div className="calendar-day-list" role="list">
          {dayNotes.length === 0 && (
            <div className="calendar-day-empty">予定なし</div>
          )}
          {dayNotes.map((n) => (
            <div
              key={n.id}
              role="listitem"
              className={`calendar-day-item ${
                n.id === selectedId ? "is-active" : ""
              }`}
              onClick={() => onSelect(n.id)}
            >
              {n.pinned && <span className="calendar-day-pin" aria-hidden>◆</span>}
              <span className="calendar-day-title">{deriveDisplayTitle(n)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
