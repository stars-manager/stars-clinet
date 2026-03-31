/**
 * 统一日志服务
 * 提供结构化日志记录，支持不同日志级别和格式化输出
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message: `[${this.context}] ${message}`,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private log(entry: LogEntry, error?: Error): void {
    const prefix = `[${entry.timestamp}] [${entry.level}]`;
    const fullMessage = error
      ? `${entry.message}\nError: ${error.message}\nStack: ${error.stack}`
      : entry.message;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, fullMessage, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, fullMessage, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, fullMessage, entry.context || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, fullMessage, entry.context || '', error || '');
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      const entry = this.formatMessage(LogLevel.DEBUG, message, context);
      this.log(entry);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatMessage(LogLevel.INFO, message, context);
    this.log(entry);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatMessage(LogLevel.WARN, message, context);
    this.log(entry);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry = this.formatMessage(LogLevel.ERROR, message, context);
    this.log(entry, error);
  }
}

// 创建日志实例的工厂函数
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// 默认日志实例
export const logger = createLogger('App');

// API 日志实例
export const apiLogger = createLogger('API');

// 组件日志实例
export const componentLogger = createLogger('Component');

// Store 日志实例
export const storeLogger = createLogger('Store');
