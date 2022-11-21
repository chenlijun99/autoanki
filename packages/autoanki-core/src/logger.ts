/**
 * @file Logging primitives for Autoanki
 *
 * In this file we define a TypeScript logging facade that can be used across
 * all autoanki packages.
 *
 * A default implementation based on `console` is also provided.
 */

/**
 * A simple function that prints a string
 */
interface LogFunction {
  (message: string): void;
}

/**
 * A lazy log function is invoked only if the corresponding logging level
 * is enabled. Using this, we can avoid the formatting cost of the arguments.
 *
 * Premature optimization at its finest.
 */
interface LazyLogFunction {
  (logIfEnabled: (print: LogFunction) => void): void;
}

export interface Logger {
  error: LogFunction;
  errorLazy: LazyLogFunction;
  warn: LogFunction;
  warnLazy: LazyLogFunction;
  info: LogFunction;
  infoLazy: LazyLogFunction;
  log: LogFunction;
  logLazy: LazyLogFunction;
}

export type RootLogger = Logger & {
  createChildLogger(childName: string): Logger;
};

export const consoleLogger: RootLogger = {
  ...console,
  errorLazy: (fn) => {
    fn(console.error);
  },
  warnLazy: (fn) => {
    fn(console.warn);
  },
  infoLazy: (fn) => {
    fn(console.info);
  },
  logLazy: (fn) => {
    fn(console.debug);
  },
  createChildLogger: (childName: string) => {
    const childLogger = {
      error: (message) => {
        console.error(`${childName}: ${message}`);
      },
      warn: (message) => {
        console.warn(`${childName}: ${message}`);
      },
      info: (message) => {
        console.info(`${childName}: ${message}`);
      },
      log: (message) => {
        console.log(`${childName}: ${message}`);
      },
    } as Partial<Logger>;
    childLogger.errorLazy = (fn) => {
      fn(childLogger.error!);
    };
    childLogger.warnLazy = (fn) => {
      fn(childLogger.warn!);
    };
    childLogger.infoLazy = (fn) => {
      fn(childLogger.info!);
    };
    childLogger.logLazy = (fn) => {
      fn(childLogger.log!);
    };
    return childLogger as Logger;
  },
};

let logger: RootLogger = consoleLogger;

export function setLogger(aLogger: RootLogger): void {
  logger = aLogger;
}

export function getLogger(): RootLogger {
  return logger;
}
