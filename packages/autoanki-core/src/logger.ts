interface LogFunction {
  (message: string): void;
}

export interface Logger {
  error: LogFunction;
  warn: LogFunction;
  info: LogFunction;
  log: LogFunction;
}

export type RootLogger = Logger & {
  createChildLogger(childName: string): Logger;
};

let logger: RootLogger = {
  ...console,
  createChildLogger: (childName: string) => {
    return {
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
    };
  },
};

export function setLogger(aLogger: RootLogger): void {
  logger = aLogger;
}

export function getLogger(): RootLogger {
  return logger;
}
