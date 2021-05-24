import { Note } from 'src/joplinData/notes';

import type AutoAnkiService from '@autoanki/core';

export async function syncNote(service: AutoAnkiService, note: Note) {
  return service.sync([note.body], [], 'deck');
}
