const enum DEBUG_LEVEL {
  DEBUG = 0,
  INFO = 1
}

export const logger = {
  _level: DEBUG_LEVEL.INFO,

  setLevel(level: string) {
    if (level === 'DEBUG') {
      this._level = DEBUG_LEVEL.DEBUG;
    } else {
      this._level = DEBUG_LEVEL.INFO;
    }
  },

  logDebug(msg: string) {
    if (this._level <= DEBUG_LEVEL.DEBUG) {
      console.log(`[DEBUG] ${msg}`);
    }
  },
  logInfo(msg: string) {
    console.log(`[INFO ] ${msg}`);
  }
};
