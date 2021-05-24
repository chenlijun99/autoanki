import joplin from 'api';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Note } from '../joplinData/notes';
import { fromJoplinEvent } from './joplinEvent';

export const currentNote$: Observable<Note | undefined> = fromJoplinEvent(
  'noteSelectionChange'
).pipe(
  switchMap(() => {
    return joplin.workspace.selectedNote();
  })
);
