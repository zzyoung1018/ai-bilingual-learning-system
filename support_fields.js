/**
 * Active teaching support fields (Phase 5C)
 *
 * These are the only fields that should be:
 * - Requested in Stage B prompts
 * - Validated for completeness
 * - Shown in UI
 * - Exported to Full Lesson DOCX
 * - Counted in debug reports
 */

export const ACTIVE_SUPPORT_FIELDS = [
  "glossary",
  "simplifiedExplanation",
  "keyConcepts",
  "commonMisconceptions",
  "teacherNotes",
  "classroomActivities",
  "extensionQuestions",
  "quiz",
];

export const CRITICAL_SUPPORT_FIELDS = [
  "glossary",
  "simplifiedExplanation",
  "quiz",
  "keyConcepts",
];

export const OPTIONAL_SUPPORT_FIELDS = [
  "commonMisconceptions",
  "teacherNotes",
  "classroomActivities",
  "extensionQuestions",
];

/**
 * Removed teaching support fields (Phase 5C)
 *
 * These fields were removed from the active schema.
 * They may appear in:
 * - Old imported packages (backward compatibility)
 * - Old model outputs (migration)
 *
 * But they must NOT be:
 * - Requested in prompts
 * - Required in validation
 * - Shown in UI
 * - Exported to DOCX
 * - Counted as missing in debug
 */
export const REMOVED_SUPPORT_FIELDS = [
  "learningObjectives",
  "differentiatedSupport",
  "studentWorksheet",
];

/**
 * Check if a field is an active support field
 */
export function isActiveSupportField(fieldName) {
  return ACTIVE_SUPPORT_FIELDS.includes(fieldName);
}

/**
 * Check if a field is a removed support field
 */
export function isRemovedSupportField(fieldName) {
  return REMOVED_SUPPORT_FIELDS.includes(fieldName);
}

/**
 * Check if a field is a critical support field
 */
export function isCriticalSupportField(fieldName) {
  return CRITICAL_SUPPORT_FIELDS.includes(fieldName);
}

/**
 * Check if a field is an optional support field
 */
export function isOptionalSupportField(fieldName) {
  return OPTIONAL_SUPPORT_FIELDS.includes(fieldName);
}
