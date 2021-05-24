import joplin from 'api';

export interface Note {
  id: string | null;
  /**
   * ID of the notebook that contains this note.
   * Change this ID to move the note to a different notebook.
   */
  parent_id: string;
  /**
   * The note title.
   */
  title: string;
  /**
   * The note body, in Markdown. May also contain HTML.
   */
  body: string;
  created_time: number;
  updated_time: number;
  is_conflict: number;
  latitude: number;
  longitude: number;
  altitude: number;
  author: string;
  /**
   * The full URL where the note comes from.
   */
  source_url: string;
  is_todo: number;
  todo_due: number;
  todo_completed: number;
  /**
   * N/A
   */
  source: string;
  /**
   * N/A
   */
  source_application: string;
  application_data: string;
  order: number;
  user_created_time: number;
  user_updated_time: number;
  encryption_cipher_text: string;
  encryption_applied: number;
  markup_language: number;
  is_shared: number;
  share_id: string;
}

export async function getAllNotes(): Promise<Note> {
  return joplin.data.get(['notes']) as Promise<Note>;
}
