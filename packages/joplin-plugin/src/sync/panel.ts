import joplin from 'api';
import { Subject } from 'rxjs';
import { withLatestFrom } from 'rxjs/operators';

import { SyncHandler } from './handler';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : never;
type PanelHandle = UnwrapPromise<
  ReturnType<typeof joplin['views']['panels']['create']>
>;

export class SyncStatusPanel {
  constructor(private syncHandler: SyncHandler) {
    syncHandler.busy$
      .pipe(withLatestFrom(this.panel$))
      .subscribe(([busy, panel]) => {});
  }

  async setup() {
    const panels = joplin.views.panels;
    const view = await panels.create('autoanki.panel.sync');
    await panels.setHtml(
      view,
      `
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      <div id="root"></div>
      `
    );
    await panels.addScript(view, './app/index.js');
    this.panel$.next(view);
  }

  private panel$ = new Subject<PanelHandle>();
}
