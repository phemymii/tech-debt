/**
 * Sample fixture used to verify tech-debt scanning.
 *
 * @deprecated Use the new scanner API instead. See ENG-42.
 */
export function legacyHelper() {
  // TODO(ABC-123): replace with async variant
  // FIXME: handle empty input #88
  // HACK: temporary cache bypass
  // XXX: remove after migration
  // BUG: null when list is empty
  return 42
}

/* TODO: migrate callers off this module */
export const FLAG = true
