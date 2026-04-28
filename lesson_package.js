/**
 * Lesson package helpers.
 *
 * This file keeps export/import logic in one easy place:
 * - JSON package build
 * - JSON package download
 * - JSON package import/validation
 */

function safeFilename(name) {
  return (name || "lesson-package").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function buildLessonPackage({
  lessonTitle,
  sourceText,
  targetLanguage,
  translation,
  glossary,
  simplifiedExplanation,
  learningObjectives,
  keyConcepts,
  commonMisconceptions,
  teacherNotes,
  classroomActivities,
  differentiatedSupport,
  extensionQuestions,
  studentWorksheet,
  quizSettings,
  quiz,
  mode,
  packageType,
  documentSourceType,
  documentFileName,
  originalFileName,
  convertedDocxFileName,
  meta,
}) {
  const base = {
    packageVersion: "1.0",
    packageType: packageType || "teacher",
    lessonTitle: lessonTitle || "Untitled Lesson",
    sourceText: sourceText || "",
    targetLanguage: targetLanguage || "Chinese",
    translation: translation || "",
    glossary: Array.isArray(glossary) ? glossary : [],
    simplifiedExplanation: simplifiedExplanation || "",
    learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [],
    keyConcepts: Array.isArray(keyConcepts) ? keyConcepts : [],
    quizSettings: quizSettings || {},
    quiz: Array.isArray(quiz) ? quiz : [],
    mode: mode || "teacher",
    metadata: {
      createdAt: new Date().toISOString(),
      tool: "AI-Supported Bilingual Education Tool",
      usedFallback: Boolean(meta?.usedFallback),
      notes: meta?.reason || "",
      documentSourceType: documentSourceType || "text",
      documentFileName: documentFileName || "",
      originalFileName: originalFileName || "",
      convertedDocxFileName: convertedDocxFileName || "",
      pipelineVersion: meta?.pipelineVersion || "",
      translationPromptVersion: meta?.translationPromptVersion || "",
      enrichmentPromptVersion: meta?.enrichmentPromptVersion || "",
      enrichmentQualityVersion: meta?.enrichmentQualityVersion || "",
      cacheVersion: meta?.cacheVersion || "",
      supportFieldCounts: meta?.supportFieldCounts || {},
    },
  };

  if (base.packageType === "student") {
    return {
      ...base,
      extensionQuestions: Array.isArray(extensionQuestions) ? extensionQuestions : [],
      studentWorksheet: Array.isArray(studentWorksheet) ? studentWorksheet : [],
      displayOptions: {
        showAnswerKey: false,
        showAnswerExplanations: false,
      },
    };
  }

  return {
    ...base,
    commonMisconceptions: Array.isArray(commonMisconceptions) ? commonMisconceptions : [],
    teacherNotes: Array.isArray(teacherNotes) || typeof teacherNotes === "string" ? teacherNotes : "",
    classroomActivities: Array.isArray(classroomActivities) ? classroomActivities : [],
    differentiatedSupport:
      differentiatedSupport && typeof differentiatedSupport === "object" && !Array.isArray(differentiatedSupport)
        ? differentiatedSupport
        : {},
    extensionQuestions: Array.isArray(extensionQuestions) ? extensionQuestions : [],
    studentWorksheet: Array.isArray(studentWorksheet) ? studentWorksheet : [],
    displayOptions: {
      showAnswerKey: true,
      showAnswerExplanations: Boolean(quizSettings?.includeExplanations),
    },
  };
}

export function exportLessonPackageJson(pkg) {
  const filename = `${safeFilename(pkg.lessonTitle)}-${pkg.packageType || "teacher"}.json`;
  downloadFile(filename, JSON.stringify(pkg, null, 2), "application/json;charset=utf-8");
}

export async function importLessonPackageFile(file) {
  if (!file) {
    throw new Error("No JSON file selected.");
  }
  if (!file.name.toLowerCase().endsWith(".json")) {
    throw new Error("Please select a .json lesson package file.");
  }

  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_err) {
    throw new Error("The JSON file could not be parsed.");
  }

  validateLessonPackage(data);
  return data;
}

export function validateLessonPackage(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid lesson package: file content is not an object.");
  }

  const requiredFields = [
    "lessonTitle",
    "sourceText",
    "targetLanguage",
    "translation",
    "glossary",
    "simplifiedExplanation",
    "quiz",
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Invalid lesson package: missing field "${field}".`);
    }
  }

  if (!Array.isArray(data.glossary) || !Array.isArray(data.quiz)) {
    throw new Error('Invalid lesson package: "glossary" and "quiz" must be arrays.');
  }
}
