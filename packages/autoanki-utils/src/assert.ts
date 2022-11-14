export class AssertionError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default function assert(
  value: unknown,
  message?: string
): asserts value {
  if (!value) {
    throw new AssertionError(message);
  }
}
