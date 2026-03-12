const log = (level, message, meta = null) => {
  const timestamp = new Date().toISOString();
  if (meta) {
    console.log(`[${timestamp}] [${level}] ${message}`, meta);
  } else {
    console.log(`[${timestamp}] [${level}] ${message}`);
  }
};

module.exports = {
  info: (msg, meta) => log("INFO", msg, meta),
  warn: (msg, meta) => log("WARN", msg, meta),
  error: (msg, meta) => log("ERROR", msg, meta)
};