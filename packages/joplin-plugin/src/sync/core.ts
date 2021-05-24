import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { concatMap, map, scan, tap } from 'rxjs/operators';

import { mergeDictionary } from '../rxjs/mergeDictionary';

import { ExecutionTriggerSubjectMap } from './types';
import { syncFolder } from './syncFolder';
import { syncNote } from './syncNote';

export function syncEpic(exec: ExecutionTriggerSubjectMap) {
  const newTrigger$ = new Subject<unknown>();
  const finish$ = new Subject<unknown>();
  const busy$: Observable<boolean> = mergeDictionary({
    newTrigger$,
    finish$,
  }).pipe(
    scan((count, value) => {
      return count + (value.key === 'newTrigger$' ? 1 : -1);
    }, 0),
    map((count) => count > 0)
  );

  mergeDictionary(exec)
    .pipe(
      tap(newTrigger$),
      concatMap(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(1);
          }, 1000);
        });
      }),
      tap(finish$)
    )
    .subscribe(() => {});

  return {
    busy$,
  };
}
