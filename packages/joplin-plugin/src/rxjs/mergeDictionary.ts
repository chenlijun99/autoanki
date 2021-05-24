import { Observable, ObservableInput, merge, from } from 'rxjs';
import { map } from 'rxjs/operators';

type ObservableReturnType<T> = T extends Observable<infer R> ? R : never;

type ObservableReturnTypeHelper<T> = {
  [P in keyof T]: {
    key: P;
    value: ObservableReturnType<T[P]>;
  };
};

type ObservableReturnTypes<T> =
  ObservableReturnTypeHelper<T>[keyof ObservableReturnTypeHelper<T>];

/**
 * Given an dictionary of observables, merge the observables of the dictionary
 * (using merge()).
 * Each emitted value will be an object with, as `key` property, one key
 * of the given dict and, as `value` property, the value emitted by the
 * observable associated with that key.
 *
 * @template ObsDict - Type of the dictionary of observables
 * @param observableObject - input dict
 * @return An observable that will emit values as described in the descrption
 */
export function mergeDictionary<
  ObsDict extends { [key: string]: ObservableInput<any> }
>(observableObject: ObsDict): Observable<ObservableReturnTypes<ObsDict>> {
  const keys = Object.keys(observableObject);
  const observables = keys.map((key) => {
    return from(observableObject[key]).pipe(
      map((value) => {
        return {
          key,
          value,
        };
      })
    );
  });

  return merge(...observables) as Observable<ObservableReturnTypes<ObsDict>>;
}
