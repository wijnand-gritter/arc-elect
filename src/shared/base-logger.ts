// File-level comment: Bevat de gedeelde BaseLogger klasse voor consistente logging in main en renderer processen

export const colorMap = {
  unset: 'color: unset',
  black: 'color: black',
  red: 'color: red',
  green: 'color: green',
  yellow: 'color: yellow',
  blue: 'color: blue',
  magenta: 'color: magenta',
  cyan: 'color: cyan',
  white: 'color: white',
};

export type Color = keyof typeof colorMap;
export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'verbose' | 'silly';

export abstract class BaseLogger {
  protected context: string;
  protected abstract logImpl(level: LogLevel, message: unknown, ...args: unknown[]): void;
  // Nieuwe abstracte transport-methode voor console output
  protected abstract consoleTransport(level: LogLevel, fmt: string, ...fmtArgs: unknown[]): void;

  constructor(context: string) {
    this.context = context;
  }

  info(message: unknown, ...args: unknown[]) {
    this.logWithColor('info', message, 'blue', ...args);
  }
  warn(message: unknown, ...args: unknown[]) {
    this.logWithColor('warn', message, 'yellow', ...args);
  }
  error(message: unknown, ...args: unknown[]) {
    this.logWithColor('error', message, 'red', ...args);
  }
  debug(message: unknown, ...args: unknown[]) {
    this.logWithColor('debug', message, 'cyan', ...args);
  }
  verbose(message: unknown, ...args: unknown[]) {
    this.logWithColor('verbose', message, 'magenta', ...args);
  }
  silly(message: unknown, ...args: unknown[]) {
    this.logWithColor('silly', message, 'green', ...args);
  }

  protected logWithColor(
    level: LogLevel,
    message: unknown,
    color: Color = 'unset',
    ...args: unknown[]
  ) {
    this.logImpl(level, `[${this.context}] ${message}`, ...args);
    const [fmt, ...fmtArgs] = this.formatConsoleMessage(level, message, color, ...args);
    this.consoleTransport(level, fmt, ...fmtArgs);
  }

  // Centrale formatter
  protected formatConsoleMessage(
    level: LogLevel,
    message: unknown,
    color: Color,
    ...args: unknown[]
  ): [string, ...unknown[]] {
    const emojiMap: Record<LogLevel, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🐞',
      verbose: '🔊',
      silly: '🤪',
    };
    const time = new Date().toLocaleTimeString();
    return [
      `%c${emojiMap[level]} [${this.context}] [${level.toUpperCase()}] [${time}] ${message}`,
      colorMap[color],
      ...args,
    ];
  }
}
