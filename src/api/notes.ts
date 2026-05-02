import { invoke } from "@tauri-apps/api/core";

export interface Note {
  id: string;
  content: string;
  created_at: number;
  updated_at: number;
  pinned: boolean;
  tags: string[];
}

export function loadDefaultNote(): Promise<Note> {
  return invoke<Note>("get_default_note");
}

export function saveNote(content: string): Promise<Note> {
  return invoke<Note>("save_note", { content });
}
