const levels = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
};

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

function log(message) {
  console.log(formatMessage(levels.info, message));
}

function warn(message) {
  console.warn(formatMessage(levels.warn, message));
}

function error(message) {
  console.error(formatMessage(levels.error, message));
}

function debug(message) {
  console.debug(formatMessage(levels.debug, message));
}

module.exports = {
  log,
  warn,
  error,
  debug,
};