import { invoke } from "@tauri-apps/api/core";

export type NoteKind = "memo" | "todo" | "event";

export interface Note {
  id: string;
  title: string;
  kind: NoteKind;
  content: string;
  created_at: number;
  updated_at: number;
  pinned: boolean;
  sort_order: number;
  tags: string[];
  note_date: string | null;
  due_at: number | null;
  done_at: number | null;
}

export function loadDefaultNote(): Promise<Note> {
  return invoke<Note>("get_default_note");
}

export function saveNote(content: string): Promise<Note> {
  return invoke<Note>("save_note", { content });
}

export function listNotes(): Promise<Note[]> {
  return invoke<Note[]>("list_notes");
}

export function getNote(id: string): Promise<Note> {
  return invoke<Note>("get_note", { id });
}

export function createNote(title: string, kind: NoteKind = "memo"): Promise<Note> {
  return invoke<Note>("create_note", { title, kind });
}

export function deleteNote(id: string): Promise<void> {
  return invoke<void>("delete_note", { id });
}

export function saveNoteContent(id: string, content: string): Promise<Note> {
  return invoke<Note>("save_note_content", { id, content });
}

export function updateNoteTitle(id: string, title: string): Promise<Note> {
  return invoke<Note>("update_note_title", { id, title });
}

export function setNotePinned(id: string, pinned: boolean): Promise<Note> {
  return invoke<Note>("set_note_pinned", { id, pinned });
}

export function searchNotes(query: string, limit = 50): Promise<Note[]> {
  return invoke<Note[]>("search_notes", { query, limit });
}

export function setNoteDate(id: string, date: string | null): Promise<Note> {
  return invoke<Note>("set_note_date", { id, date });
}

export function listNotesByMonth(yearMonth: string): Promise<Note[]> {
  return invoke<Note[]>("list_notes_by_month", { yearMonth });
}

export function listNotesByKind(kind: NoteKind): Promise<Note[]> {
  return invoke<Note[]>("list_notes_by_kind", { kind });
}

export function setNoteDone(id: string, done: boolean): Promise<Note> {
  return invoke<Note>("set_note_done", { id, done });
}

export function setNoteDueAt(id: string, dueAt: number | null): Promise<Note> {
  return invoke<Note>("set_note_due_at", { id, dueAt });
}
