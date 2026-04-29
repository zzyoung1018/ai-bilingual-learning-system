// STAGE B SPLIT ARCHITECTURE PLAN
//
// Current: One huge JSON call with all 12 fields
// Problem: 256s first attempt, often invalid, then 113s retry + 56s completion = 425s total
//
// New: Two smaller JSON calls
//
// Call 1: Core Support (student-facing, essential)
// - glossary (5 items)
// - simplifiedExplanation (2-4 paragraphs)
// - learningObjectives (3 items)
// - keyConcepts (3 items)
// - quiz (3-4 questions)
//
// Call 2: Teacher Support (teacher-facing, supplemental)
// - commonMisconceptions (2 items)
// - teacherNotes (3 notes)
// - classroomActivities (1 activity)
// - differentiatedSupport (3 sections)
// - extensionQuestions (2 questions)
// - studentWorksheet (1-2 tasks)
//
// Benefits:
// - Smaller JSON = faster generation
// - Less likely to break
// - If one fails, retry only that one
// - Parallel potential (future)
//
// Implementation:
// 1. buildCoreSupportMessages() - returns messages for core support
// 2. buildTeacherSupportMessages() - returns messages for teacher support
// 3. requestParsedCoreSupport() - calls model, parses core JSON
// 4. requestParsedTeacherSupport() - calls model, parses teacher JSON
// 5. mergeCoreAndTeacherSupport() - combines into full lesson
// 6. generateTeachingSupportWithModel() - orchestrates both calls
//
// Retry logic:
// - If core fails, retry core only
// - If teacher fails, retry teacher only
// - If both succeed but fields missing, targeted completion
//
// Debug timing:
// - coreSupportDurationMs
// - teacherSupportDurationMs
// - coreSupportApiCallCount
// - teacherSupportApiCallCount
// - coreSupportRetryAttempted
// - teacherSupportRetryAttempted
// - coreSupportSucceeded
// - teacherSupportSucceeded
