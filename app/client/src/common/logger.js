const isLoggingEnabled = process.env.NODE_ENV === "development";

const checkLoggingFlag = () => {
  if (typeof window !== "undefined") {
    return window.FIRESHARE_ENABLE_LOGGING;
  }
  return undefined;
};

const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
  TRACE: "trace"
};

const getTimestamp = () => {
  const now = new Date;
  return `${now.toISOString().slice(11, 23)}`;
};

const formatLogMessage = (level, context, message) => {
  const timestamp = getTimestamp();
  return `[${timestamp}][${level.toUpperCase()}][${context}] ${message}`;
};

export const logger = {
  error: (context, message, data) => {
    console.error(formatLogMessage(LOG_LEVELS.ERROR, context, message), data !== undefined ? data : "");
  },
  warn: (context, message, data) => {
    if (checkLoggingFlag() !== false) {
      console.warn(formatLogMessage(LOG_LEVELS.WARN, context, message), data !== undefined ? data : "");
    }
  },
  info: (context, message, data) => {
    if (checkLoggingFlag() !== false) {
      console.info(formatLogMessage(LOG_LEVELS.INFO, context, message), data !== undefined ? data : "");
    }
  },
  debug: (context, message, data) => {
    const flag = checkLoggingFlag();
    if (flag === true || flag !== false && isLoggingEnabled) {
      console.log(formatLogMessage(LOG_LEVELS.DEBUG, context, message), data !== undefined ? data : "");
    }
  },
  trace: (context, message, data) => {
    if (checkLoggingFlag() === true) {
      console.debug(formatLogMessage(LOG_LEVELS.TRACE, context, message), data !== undefined ? data : "");
    }
  },
  group: (context, label, callback) => {
    const flag = checkLoggingFlag();
    if (flag === true || flag !== false && isLoggingEnabled) {
      const groupLabel = formatLogMessage(LOG_LEVELS.DEBUG, context, label);
      console.group(groupLabel);
      callback();
      console.groupEnd();
    }
  }
};

export const LOG_LEVEL = LOG_LEVELS;