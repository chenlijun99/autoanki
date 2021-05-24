import { mergeDictionary } from '../rxjs/mergeDictionary';

import { ExecutionTriggerSubjectMap } from './types';

export function syncEpic(exec: ExecutionTriggerSubjectMap) {
  const obs$ = mergeDictionary(exec);
}
