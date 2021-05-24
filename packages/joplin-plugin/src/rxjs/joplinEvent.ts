/**
 * * Juplin events observables
 */
import joplin from 'api';

import { defer, Observable } from 'rxjs';
import { share } from 'rxjs/operators';

const JOPLIN_EVENT_PAYLOAD_MAP = {
  noteSelectionChange: {
    registerFn: joplin.workspace.onNoteSelectionChange,
  },
  noteChange: {
    registerFn: joplin.workspace.onNoteChange,
  },
} as const;

type JoplinEventPayloadMap = typeof JOPLIN_EVENT_PAYLOAD_MAP;
type JoplinEvent = keyof JoplinEventPayloadMap;
type JoplinEventHandler<Event extends JoplinEvent> = Parameters<
  JoplinEventPayloadMap[Event]['registerFn']
>[0];
type JoplinEventHandlerPayload<
  Event extends JoplinEvent,
  Handler = JoplinEventHandler<Event>
> = Handler extends (...args: infer P) => any
  ? P
  : Handler extends Function
  ? void
  : never;

function createJoplinEventObservable<
  Event extends JoplinEvent,
  Payload = JoplinEventHandlerPayload<Event>
>(event: Event): Observable<Payload> {
  return defer(() => {
    return new Observable<Payload>((observer) => {
      JOPLIN_EVENT_PAYLOAD_MAP[event].registerFn(
        // @ts-ignore
        (...args) => {
          // @ts-ignore
          observer.next(args);
        }
      );
      return () => {
        // TODO proper unsubscribe logic
      };
    });
  }).pipe(share());
}

type EventObservableMap = {
  [P in JoplinEvent]: Observable<JoplinEventHandlerPayload<P>>;
};

const observables: EventObservableMap = Object.keys(
  JOPLIN_EVENT_PAYLOAD_MAP
).reduce((map, event) => {
  // @ts-ignore
  map[event as JoplinEvent] = createJoplinEventObservable(event as JoplinEvent);
  return map;
}, {} as EventObservableMap);

/**
 * Get an observable of a Joplin event
 *
 * @template Event - Supported event type
 * @param event - the interested event
 * @return Observable of the event
 */
export function fromJoplinEvent<Event extends JoplinEvent>(
  event: Event
): EventObservableMap[Event] {
  return observables[event];
}
