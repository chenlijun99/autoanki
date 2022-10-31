import winston from 'winston';

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
