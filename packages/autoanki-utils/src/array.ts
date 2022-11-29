export function groupByMap<T, I>(
  items: T[],
  iteratee: (item: T) => I
): Map<I, T[]> {
  const groups: Map<I, T[]> = new Map();

  for (const item of items) {
    const groupKey = iteratee(item);
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }

  return groups;
}
