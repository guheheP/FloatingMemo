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
