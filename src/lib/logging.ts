const IS_DEBUG_LOGGING_ENABLED = process.env.DEBUG_LOGGING === 'true';

export function debugLog(...args: any[]) {
  if (IS_DEBUG_LOGGING_ENABLED) {
    console.log(...args);
  }
}

export function debugWarn(...args: any[]) {
  if (IS_DEBUG_LOGGING_ENABLED) {
    console.warn(...args);
  }
}

