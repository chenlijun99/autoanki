import winston, { Logger as WinstonLogger } from 'winston';

import { setLogger } from '@autoanki/core';
import type { Logger } from '@autoanki/core';

function winstonToAutoankiCoreLogger(logger: WinstonLogger): Logger {
  function isLevelEnabled(level: keyof typeof winston.config.cli.levels) {
    const levelNumber = winston.config.cli.levels[level];
    const currentLevelNumber = winston.config.cli.levels[logger.level];
    return currentLevelNumber >= levelNumber;
  }

  return {
    error: (message) => {
      logger.error(message);
    },
    errorLazy: (fn) => {
      if (isLevelEnabled('error')) {
        fn(logger.error);
      }
    },
    warn: (message) => {
      logger.warn(message);
    },
    warnLazy: (fn) => {
      if (isLevelEnabled('warn')) {
        fn(logger.warn);
      }
    },
    info: (message) => {
      logger.info(message);
    },
    infoLazy: (fn) => {
      if (isLevelEnabled('info')) {
        fn(logger.info);
      }
    },
    log: (message) => {
      logger.debug(message);
    },
    logLazy: (fn) => {
      if (isLevelEnabled('debug')) {
        fn(logger.debug);
      }
    },
  };
}

let winstonLogger: WinstonLogger;
let autoankiLogger: Logger;

const myFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp ? timestamp + ' ' : ''}${level}${
      label ? ' [' + label + ']' : ''
    }: ${message}`;
  }
);

export function createChildLogger(childName: string): Logger {
  return winstonToAutoankiCoreLogger(winstonLogger.child({ label: childName }));
}

export function initLog(verbose: boolean) {
  const formats = [winston.format.colorize(), winston.format.simple()];
  if (verbose) {
    formats.push(winston.format.timestamp());
  }
  winstonLogger = winston.createLogger({
    levels: winston.config.cli.levels,
    format: winston.format.combine(...formats, myFormat),
    transports: [new winston.transports.Console()],
  });

  winston.addColors(winston.config.cli.colors);
  winstonLogger.level = verbose ? 'verbose' : 'info';

  setLogger({
    ...createChildLogger('@autoanki/core'),
    createChildLogger,
  });
}

export function getLogger(): Logger {
  if (!autoankiLogger) {
    autoankiLogger = winstonToAutoankiCoreLogger(winstonLogger);
  }
  return autoankiLogger;
}
