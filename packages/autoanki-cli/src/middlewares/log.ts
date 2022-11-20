import winston, { Logger as WinstonLogger } from 'winston';

import { setLogger } from '@autoanki/core';
import type { Logger } from '@autoanki/core';

function winstonToAutoankiCoreLogger(logger: WinstonLogger): Logger {
  return {
    error: (message) => {
      logger.error(message);
    },
    warn: (message) => {
      logger.warn(message);
    },
    info: (message) => {
      logger.info(message);
    },
    log: (message) => {
      logger.debug(message);
    },
  };
}

let logger: WinstonLogger;

const myFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp ? timestamp + ' ' : ''}${level}${
      label ? ' [' + label + ']' : ''
    }: ${message}`;
  }
);

export function createChildLogger(childName: string): Logger {
  return winstonToAutoankiCoreLogger(logger.child({ label: childName }));
}

export function initLog(verbose: boolean) {
  const formats = [winston.format.colorize(), winston.format.simple()];
  if (verbose) {
    formats.push(winston.format.timestamp());
  }
  logger = winston.createLogger({
    levels: winston.config.cli.levels,
    format: winston.format.combine(...formats, myFormat),
    transports: [new winston.transports.Console()],
  });

  winston.addColors(winston.config.cli.colors);
  logger.level = verbose ? 'verbose' : 'info';

  setLogger({
    ...createChildLogger('@autoanki/core'),
    createChildLogger,
  });
}

export function getLogger(): WinstonLogger {
  return logger;
}
