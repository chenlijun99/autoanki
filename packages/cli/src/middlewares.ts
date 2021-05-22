import winston from 'winston';
import { cosmiconfigSync } from 'cosmiconfig';

import AutoAnkiService, { ConfigTypes } from '@autoanki/core';

export function initLog(verbose: boolean) {
  winston.configure({
    levels: winston.config.cli.levels,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    transports: [new winston.transports.Console()],
  });

  winston.addColors(winston.config.cli.colors);

  if (verbose) {
    winston.level = 'verbose';
  } else {
    winston.level = 'info';
  }
}

let config: ConfigTypes.AutoAnkiConfiguration = {
  lexemes: {
    metadataDelimiter: { start: '<!--', end: '-->' },
    noteDelimiter: {
      start: '<startOfLine>:{<noteType><newline>',
      end: '<startOfLine>:}<newline>',
    },
    fieldDelimiter: {
      start: '<startOfLine>:[<fieldName><newline>',
      end: '<startOfLine>:]<newline>',
    },
  },
};
export function getConfig(): ConfigTypes.AutoAnkiConfiguration {
  return config;
}
export function initConfig() {
  winston.debug('Loading configuration...');
  const result = cosmiconfigSync('autoanki').search();
  if (result) {
    winston.debug(`Using configuratino found at ${result.filepath}`);
    config = result.config;
  } else {
    winston.debug('No configuration file found. Use default configuration');
  }
}

let autoankiService: AutoAnkiService;
export function initAutoAnkiService() {
  autoankiService = new AutoAnkiService(config);
}
export function getAutoankiService(): AutoAnkiService {
  return autoankiService;
}
