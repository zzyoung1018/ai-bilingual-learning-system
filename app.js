
import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";
import {
  buildLessonPackage,
  exportLessonPackageJson,
  importLessonPackageFile,
} from "./lesson_package.js";
import {
  buildDocxTranslationBlocks,
  exportTranslatedDocx,
  importDocxFile,
} from "./docx_tools.js";
import { UI_LANGUAGE_STORAGE_KEY, UI_TEXT } from "./ui_text.js";
import { convertPdfToDocx, MODEL_API_CONFIG, postModelChat } from "./api_client.js";
import {
  buildBlockTranslationPrompt,
  buildStrictRetryInstruction,
  classifyTranslationBlock,
  countMatches,
  getContactOrIdentifierJustification,
  getTargetLanguageConfig,
  getValidationSeverity,
  isLikelyFormulaOrCodeBlock,
  isMostlyNonTranslatableText,
  isOrdinaryProse,
  looksMostlyEnglish,
  normalizeForComparison,
  shouldPreserveBeforeTranslation,
  shouldTranslateBlock,
  validateTranslatedBlock,
} from "./block_classifier.js";
import {
  ENRICHMENT_PROMPT_VERSION,
  ENRICHMENT_QUALITY_VERSION,
  clipText,
  createLocalFallbackLesson,
  createSafeEnrichmentFallbackLesson,
  generateTeachingSupportWithModel,
  getGeneratedSupportFieldSummary,
  getSupportFieldCounts,
  normalizeLessonResult,
  normalizeQuizSettings,
} from "./enrichment_pipeline.js";
import {
  accumulateDebugSummary,
  buildDocxCombinedTranslation,
  buildTranslationCacheKey,
  clearTranslationCacheStorage,
  createDocxTranslationBatches,
  createEmptyDebugSummary,
  createGenerationCancelledError,
  DOCX_TRANSLATION_BATCH_MAX_BLOCKS,
  DOCX_TRANSLATION_BATCH_MAX_CHARS,
  DOCX_TRANSLATION_LONG_BLOCK_MIN_CHARS,
  DOCX_TRANSLATION_SHORT_BATCH_MAX_BLOCKS,
  DOCX_TRANSLATION_SHORT_BLOCK_MAX_CHARS,
  getTranslationFailureThresholdInfo,
  isGenerationCancelledError,
  logDocumentTranslationDebug,
  mergeReasonList,
  readTranslationCache,
  throwIfGenerationCancelled,
  translateBlocksForDocument,
  translateDocxBlocksInBatches,
  writeTranslationCache,
} from "./translation_orchestrator.js";

const html = htm.bind(React.createElement);

let runtimeUiLanguage = "en";

const navItems = [
  { id: "home" },
  { id: "teacher" },
  { id: "student" },
];

const languageOptions = [
  { value: "English" },
  { value: "Chinese" },
  { value: "Russian" },
  { value: "Kazakh" },
  { value: "Spanish" },
  { value: "French" },
  { value: "Arabic" },
  { value: "Hindi" },
  { value: "Swahili" },
  { value: "German" },
  { value: "Indonesian" },
  { value: "Korean" },
  { value: "Japanese" },
];

const defaultQuizSettings = {
  questionCount: 4,
  difficulty: "medium",
  questionTypes: ["multiple_choice", "true_false"],
  includeAnswerKey: true,
  includeExplanations: false,
};

const defaultGenerationProgress = {
  active: false,
  stage: "idle",
  current: 0,
  total: 0,
  percent: 0,
  label: "",
};

const PIPELINE_VERSION = "phase-4a-online-api-proxy-v1";
const TRANSLATION_PROMPT_VERSION = "stage-a-block-translation-v2";
const CACHE_VERSION = "translation-cache-v3";
const MODEL_TRANSLATION_OPTIONS = {
  temperature: 0.3,
  top_p: 0.8,
  top_k: 20,
  min_p: 0,
};
const PLAIN_TEXT_TRANSLATION_CHUNK_MAX_CHARS = 1800;
const DOCUMENT_FATAL_FALLBACK_RATIO = 0.2;
const DOCUMENT_MIN_TRANSLATED_RATIO = 0.25;
const ENRICHMENT_REQUEST_TIMEOUT_MS = 180000;


const validPages = new Set(navItems.map((item) => item.id));

function pageFromHash() {
  const raw = (window.location.hash || "#/home").replace("#/", "");
  return validPages.has(raw) ? raw : "home";
}

function setHash(page) {
  window.location.hash = `/${page}`;
}

function getUiText(language) {
  return UI_TEXT[language] || UI_TEXT.en;
}

function getRuntimeUiText() {
  return getUiText(runtimeUiLanguage);
}

function getTargetLanguageLabel(value, uiLanguage) {
  const text = getUiText(uiLanguage);
  return text.targetLanguageLabels?.[value] || value;
}

function getQuizTypeLabel(type, uiLanguage) {
  const text = getUiText(uiLanguage);
  return text.quizTypeLabels?.[type] || type;
}

function getPackageTypeLabel(value, uiLanguage) {
  const text = getUiText(uiLanguage);
  if (value === "teacher") return text.packageTypeTeacher;
  if (value === "student") return text.packageTypeStudent;
  return value || text.packageTypeStudent;
}

function getDocumentSourceLabel(value, uiLanguage) {
  const text = getUiText(uiLanguage);
  if (value === "pdf-converted-docx") return text.sourceTypePdfConvertedDocx;
  if (value === "pdf") return text.sourceTypePdf;
  if (value === "docx") return text.sourceTypeDocx;
  return text.sourceTypeText;
}

function clampPercent(value) {
  const next = Number(value);
  if (Number.isNaN(next)) return 0;
  return Math.max(0, Math.min(100, Math.round(next)));
}

function buildProgressUpdate({ stage, current = 0, total = 0, percent = 0, label = "" }) {
  return {
    active: true,
    stage,
    current,
    total,
    percent: clampPercent(percent),
    label,
  };
}



function getDocxExtractionQuickCounts(parsed) {
  const audit = parsed?.extractionAudit || {};
  const containerCounts = audit?.counts?.byContainerType || {};
  const sourceCounts = audit?.counts?.bySourceType || {};
  const skipped = Array.isArray(audit?.skipped) ? audit.skipped.length : 0;

  return {
    total: Number(audit?.counts?.totalExtracted || 0),
    paragraph: Number(containerCounts.paragraph || 0),
    heading: Number(containerCounts.heading || 0),
    listItem: Number(containerCounts.list_item || 0),
    tableCell: Number(containerCounts.table_cell || 0),
    textBox: Number(containerCounts.textbox_paragraph || 0),
    drawingText:
      Number(containerCounts.drawing_text || 0) +
      Number(containerCounts.vml_textpath || 0) +
      Number(containerCounts.chart_text || 0),
    headerFooter: Number(sourceCounts.header || 0) + Number(sourceCounts.footer || 0),
    skipped,
  };
}

function logDocxExtractionAudit(parsed) {
  if (typeof console === "undefined") return;
  const summary = parsed?.traversalSummary || {};
  const audit = parsed?.extractionAudit || {};
  const extractedEntries = Array.isArray(audit.entries) ? audit.entries : [];
  const skippedEntries = Array.isArray(audit.skipped) ? audit.skipped : [];
  const counts = audit.counts || {};

  console.groupCollapsed(
    `[DOCX Extraction Audit] extracted=${extractedEntries.length}, skipped=${skippedEntries.length}`
  );
  console.table(summary.blockTypeCounts || {});
  console.table(summary.containerTypeCounts || {});
  console.table(summary.sourceTypeCounts || {});

  // Required per-block debug visibility for extraction coverage checks.
  console.table(
    extractedEntries.map((entry) => ({
      blockId: entry.blockId,
      sourceType: entry.sourceType,
      sourceLocation: entry.sourceLocation,
      containerType: entry.containerType,
      willEnterTranslation: Boolean(entry.willEnterTranslation),
      extractedText: String(entry.extractedText || "").slice(0, 140),
    }))
  );

  if (skippedEntries.length > 0) {
    console.warn("[DOCX Extraction Audit] Some containers were skipped.");
    console.table(
      skippedEntries.map((entry) => ({
        sourceType: entry.sourceType,
        sourceLocation: entry.sourceLocation,
        containerType: entry.containerType,
        willEnterTranslation: Boolean(entry.willEnterTranslation),
        reason: entry.reason || "unspecified",
      }))
    );
  }

  console.info("[DOCX Extraction Audit] Counts", {
    totalExtracted: counts.totalExtracted || 0,
    totalSkipped: counts.totalSkipped || 0,
    byContainerType: counts.byContainerType || {},
    bySourceType: counts.bySourceType || {},
    skippedByContainerType: counts.skippedByContainerType || {},
    skippedByReason: counts.skippedByReason || {},
    paragraphScans: {
      scanned: counts.paragraphsScanned || 0,
      noRuns: counts.paragraphsSkippedNoRuns || 0,
      emptyText: counts.paragraphsSkippedEmptyText || 0,
    },
    drawingScans: {
      scanned: counts.drawingTextScanned || 0,
      empty: counts.drawingTextSkippedEmpty || 0,
    },
    chartScans: {
      scanned: counts.chartTextScanned || 0,
      empty: counts.chartTextSkippedEmpty || 0,
    },
    vmlScans: {
      scanned: counts.vmlTextScanned || 0,
      empty: counts.vmlTextSkippedEmpty || 0,
    },
    xmlFiles: {
      scanned: counts.xmlFilesScanned || 0,
      parseErrors: counts.xmlFilesSkippedParseError || 0,
    },
  });
  console.groupEnd();
}

function safeDownloadName(value, fallback = "debug-report") {
  return String(value || fallback).replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || fallback;
}

function deriveLessonTitleFromFilename(fileName) {
  const base = String(fileName || "")
    .replace(/\.[^.]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  return base
    .split(" ")
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildDebugReport({
  lesson,
  teacherMeta,
  statusMessage,
  statusType,
  generationProgress,
}) {
  const assets = lesson?.documentAssets || {};
  const translationMeta = teacherMeta?.translationMeta || {};
  const enrichmentMeta = teacherMeta?.enrichmentMeta || {};
  const debugSummary = translationMeta.debugSummary || {};
  const cacheSummary = translationMeta.cacheSummary || {};
  const retrySummary = translationMeta.retrySummary || {};
  const suspiciousBlocks = Array.isArray(translationMeta.suspiciousBlocks)
    ? translationMeta.suspiciousBlocks
    : [];
  const debugEntries = Array.isArray(translationMeta.debugEntries)
    ? translationMeta.debugEntries
    : Array.isArray(assets.translationDebugEntries)
    ? assets.translationDebugEntries
    : [];

  const totalSourceBlocks =
    Number(debugSummary.total || 0) ||
    debugEntries.length ||
    Number(assets.docxData?.traversalSummary?.totalBlocks || 0) ||
    0;
  const detailById = {};
  debugEntries.forEach((entry) => {
    const id = String(entry?.id || entry?.blockId || "").trim();
    if (!id) return;
    if (!detailById[id]) {
      detailById[id] = {
        id,
        blockId: id,
        index: entry.index,
        batchIndex: entry.batchIndex,
        sourceTextExcerpt: clipText(entry.sourceText || entry.textPreview || "", 180),
        translatedTextExcerpt: clipText(entry.translatedText || "", 180),
        reason: "",
        reasons: [],
        retryAttempted: false,
        retryFixed: false,
        preserved: false,
        preserveJustification: entry.preserveJustification || null,
        severity: entry.severity || "",
        validationSeverity: entry.validationSeverity || entry.severity || "accepted",
        blockKind: entry.blockKind || classifyTranslationBlock(entry.sourceText || entry.textPreview || "", lesson?.targetLanguage).blockKind,
        expectedAction: entry.expectedAction || classifyTranslationBlock(entry.sourceText || entry.textPreview || "", lesson?.targetLanguage).expectedAction,
        classificationConfidence: entry.classificationConfidence || 0,
      };
    }
    const detail = detailById[id];
    if (entry.preserveJustification) detail.preserveJustification = entry.preserveJustification;
    if (entry.severity && !detail.severity) detail.severity = entry.severity;
    if (entry.validationSeverity) detail.validationSeverity = entry.validationSeverity;
    if (entry.blockKind) detail.blockKind = entry.blockKind;
    if (entry.expectedAction) detail.expectedAction = entry.expectedAction;
    if (entry.classificationConfidence) detail.classificationConfidence = entry.classificationConfidence;
    if (Number.isInteger(entry.index)) detail.index = entry.index;
    if (entry.batchIndex) detail.batchIndex = entry.batchIndex;
    if (!detail.sourceTextExcerpt && (entry.sourceText || entry.textPreview)) {
      detail.sourceTextExcerpt = clipText(entry.sourceText || entry.textPreview || "", 180);
    }
    if (entry.translatedText) {
      detail.translatedTextExcerpt = clipText(entry.translatedText, 180);
    }
    const validationReasons = Array.isArray(entry.validationReasons)
      ? entry.validationReasons
      : [];
    validationReasons.forEach((reason) => {
      if (!detail.reasons.includes(reason)) detail.reasons.push(reason);
    });
    if (entry.reason && !detail.reasons.includes(entry.reason)) {
      detail.reasons.push(entry.reason);
    }
    if (entry.retryAttempted || String(entry.apiAction || "").includes("retry")) {
      detail.retryAttempted = true;
      if (
        entry.retryFixed ||
        (String(entry.reason || "").includes("success") && validationReasons.length === 0)
      ) {
        detail.retryFixed = true;
        detail.preserved = false;
      }
    }
    const sameText =
      normalizeForComparison(entry.sourceText) &&
      normalizeForComparison(entry.sourceText) === normalizeForComparison(entry.translatedText);
    if (
      entry.action === "preserve" ||
      entry.action === "fallback_preserve_source" ||
      entry.preserved ||
      (sameText && !detail.retryFixed)
    ) {
      detail.preserved = true;
    }
    detail.reason = detail.reasons.join(" | ");
  });
  suspiciousBlocks.forEach((item) => {
    const id = String(item?.id || item?.blockId || "").trim();
    if (!id) return;
    if (!detailById[id]) {
      detailById[id] = {
        id,
        blockId: id,
        index: item.index,
        batchIndex: item.batchIndex,
        sourceTextExcerpt: "",
        translatedTextExcerpt: "",
        reason: "",
        reasons: [],
        retryAttempted: false,
        retryFixed: false,
        preserved: false,
        preserveJustification: null,
        severity: item.severity || "",
        validationSeverity: item.validationSeverity || item.severity || "warning",
        blockKind: item.blockKind || "",
        expectedAction: item.expectedAction || "",
        classificationConfidence: item.classificationConfidence || 0,
      };
    }
    if (item.severity && !detailById[id].severity) detailById[id].severity = item.severity;
    if (item.validationSeverity && !detailById[id].validationSeverity) {
      detailById[id].validationSeverity = item.validationSeverity;
    }
    if (item.blockKind && !detailById[id].blockKind) detailById[id].blockKind = item.blockKind;
    if (item.expectedAction && !detailById[id].expectedAction) {
      detailById[id].expectedAction = item.expectedAction;
    }
    if (item.classificationConfidence && !detailById[id].classificationConfidence) {
      detailById[id].classificationConfidence = item.classificationConfidence;
    }
    if (item.preserveJustification && !detailById[id].preserveJustification) {
      detailById[id].preserveJustification = item.preserveJustification;
    }
    (Array.isArray(item.reasons) ? item.reasons : []).forEach((reason) => {
      if (!detailById[id].reasons.includes(reason)) detailById[id].reasons.push(reason);
    });
    detailById[id].reason = detailById[id].reasons.join(" | ");
  });
  const blockDetails = Object.values(detailById);
  const suspiciousBlockDetails = blockDetails.filter(
    (item) =>
      item.reasons.some((reason) =>
        /suspicious|english|cyrillic|arabic|chinese|script|identical|preserve|short|empty|missing|similar/i.test(reason)
      ) || (item.preserved && looksMostlyEnglish(item.sourceTextExcerpt))
  );
  const preservedBlockDetails = blockDetails.filter((item) => item.preserved);

  return {
    timestamp: new Date().toISOString(),
    pipelineVersion: PIPELINE_VERSION,
    translationPromptVersion: TRANSLATION_PROMPT_VERSION,
    enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
    cacheVersion: CACHE_VERSION,
    provider: MODEL_API_CONFIG.provider,
    translationModel: MODEL_API_CONFIG.translationModel,
    enrichmentModel: MODEL_API_CONFIG.enrichmentModel,
    repairModel: MODEL_API_CONFIG.repairModel,
    backendApiBaseUrl: MODEL_API_CONFIG.baseUrl || window.location.origin,
    lessonTitle: lesson?.lessonTitle || "",
    targetLanguage: lesson?.targetLanguage || "",
    sourceType: assets.sourceType || "text",
    documentFileName: assets.fileName || "",
    originalFileName: assets.originalFileName || "",
    convertedDocxFileName: assets.convertedDocxFileName || assets.docxData?.convertedDocxFileName || "",
    counts: {
      totalSourceBlocks,
      translatedBlockCount: Number(debugSummary.translated || 0),
      preservedBlockCount: Number(debugSummary.preserved || 0),
      unchangedAfterTranslateCount: Number(debugSummary.unchangedAfterTranslate || 0),
      cacheHitCount: Number(cacheSummary.hits || 0),
      dedupeReuseCount: Number(cacheSummary.dedupeReused || 0),
      uniqueBlockCount: Number(cacheSummary.uniqueRequested || 0),
      retryCount:
        Number(retrySummary.attempted || 0) +
        Number(translationMeta.batchSummary?.retriedBlocks || 0),
      retryFixedCount: Number(retrySummary.fixed || 0),
      failedBlockCount:
        Number(retrySummary.preservedAfterRetry || 0) +
        Number(translationMeta.batchSummary?.failedBlocks || 0),
      suspiciousBlockCount:
        Number(debugSummary.suspicious || 0) || suspiciousBlocks.length,
      blockKindCounts: debugSummary.blockKindCounts || {},
      warningSuspiciousCount: Number(debugSummary.warningSuspiciousCount || 0),
      fatalSuspiciousCount: Number(debugSummary.fatalSuspiciousCount || 0),
      preserveAcceptedCount: Number(debugSummary.preserveAcceptedCount || 0),
      preserveWarningCount: Number(debugSummary.preserveWarningCount || 0),
      documentFallbackThresholdTriggered: Boolean(translationMeta.documentFallbackThresholdTriggered),
    },
    fallback: {
      usedFallback: Boolean(teacherMeta?.usedFallback),
      reason: teacherMeta?.reason || "",
      documentTranslationFallbackUsed: Boolean(translationMeta.usedFallback),
      documentTranslationFallbackReason: translationMeta.reason || "",
      documentFallbackThreshold: translationMeta.documentFallbackThreshold || null,
      partialTranslationWarning: Boolean(translationMeta.partialTranslationWarning),
      teachingSupportFallbackUsed: Boolean(enrichmentMeta.teachingSupportFallbackUsed),
      teachingSupportFallbackReason: enrichmentMeta.teachingSupportFallbackReason || "",
      supportSource:
        enrichmentMeta.supportSource ||
        lesson?.meta?.supportSource ||
        (enrichmentMeta.enrichmentAttempted ? "online-api" : ""),
    },
    generationStageSummary: {
      currentStage: generationProgress?.stage || "",
      progressPercent: generationProgress?.percent || 0,
      progressLabel: generationProgress?.label || "",
      translationProvider: translationMeta.provider || "",
      enrichmentProvider: enrichmentMeta.provider || lesson?.meta?.provider || "",
      enrichmentModel: enrichmentMeta.model || lesson?.meta?.model || MODEL_API_CONFIG.enrichmentModel,
      enrichmentQualityVersion:
        enrichmentMeta.enrichmentQualityVersion ||
        lesson?.meta?.enrichmentQualityVersion ||
        ENRICHMENT_QUALITY_VERSION,
      enrichmentAttempted: Boolean(enrichmentMeta.enrichmentAttempted),
      enrichmentFirstAttemptEmpty: Boolean(enrichmentMeta.enrichmentFirstAttemptEmpty),
      enrichmentFirstAttemptInvalid: Boolean(enrichmentMeta.enrichmentFirstAttemptInvalid),
      enrichmentRichRetryAttempted: Boolean(enrichmentMeta.enrichmentRichRetryAttempted),
      enrichmentCompactCompleteRetryAttempted: Boolean(enrichmentMeta.enrichmentCompactCompleteRetryAttempted),
      enrichmentMinimalFallbackAttempted: Boolean(enrichmentMeta.enrichmentMinimalFallbackAttempted),
      enrichmentRetryAttempted: Boolean(enrichmentMeta.enrichmentRetryAttempted),
      enrichmentUsedFallback: Boolean(enrichmentMeta.enrichmentUsedFallback),
      enrichmentFailureReason: enrichmentMeta.enrichmentFailureReason || "",
      teachingSupportFallbackUsed: Boolean(enrichmentMeta.teachingSupportFallbackUsed),
      teachingSupportFallbackReason: enrichmentMeta.teachingSupportFallbackReason || "",
      supportCompletenessPassed: Boolean(
        enrichmentMeta.supportCompletenessPassed ?? lesson?.meta?.supportCompletenessPassed
      ),
      supportCompletenessReasons:
        enrichmentMeta.supportCompletenessReasons || lesson?.meta?.supportCompletenessReasons || [],
      missingCriticalSupportFields:
        enrichmentMeta.missingCriticalSupportFields || lesson?.meta?.missingCriticalSupportFields || [],
      missingOptionalSupportFields:
        enrichmentMeta.missingOptionalSupportFields || lesson?.meta?.missingOptionalSupportFields || [],
      supportIncompleteFields:
        enrichmentMeta.supportIncompleteFields || lesson?.meta?.supportIncompleteFields || [],
      incompleteFieldDetails:
        enrichmentMeta.incompleteFieldDetails || lesson?.meta?.incompleteFieldDetails || [],
      supportMissingFieldCompletionAttempted: Boolean(
        enrichmentMeta.supportMissingFieldCompletionAttempted ??
          lesson?.meta?.supportMissingFieldCompletionAttempted
      ),
      supportMissingFieldCompletionSucceeded: Boolean(
        enrichmentMeta.supportMissingFieldCompletionSucceeded ??
          lesson?.meta?.supportMissingFieldCompletionSucceeded
      ),
      supportMissingFieldCompletionFields:
        enrichmentMeta.supportMissingFieldCompletionFields ||
        lesson?.meta?.supportMissingFieldCompletionFields ||
        [],
      enrichmentApiCallCount: Number(
        enrichmentMeta.enrichmentApiCallCount ?? lesson?.meta?.enrichmentApiCallCount ?? 0
      ),
      enrichmentFirstAttemptDurationMs: Number(
        enrichmentMeta.enrichmentFirstAttemptDurationMs ??
          lesson?.meta?.enrichmentFirstAttemptDurationMs ??
          0
      ),
      enrichmentCompactRetryDurationMs: Number(
        enrichmentMeta.enrichmentCompactRetryDurationMs ??
          lesson?.meta?.enrichmentCompactRetryDurationMs ??
          0
      ),
      missingFieldCompletionDurationMs: Number(
        enrichmentMeta.missingFieldCompletionDurationMs ??
          lesson?.meta?.missingFieldCompletionDurationMs ??
          0
      ),
      totalGenerationDurationMs: Number(teacherMeta?.totalGenerationDurationMs || 0),
      stageATranslationDurationMs: Number(translationMeta.stageATranslationDurationMs || 0),
      translationBatchDurationsMs:
        translationMeta.translationBatchDurationsMs ||
        translationMeta.batchSummary?.translationBatchDurationsMs ||
        [],
      translationBatchApiCallCount: Number(
        translationMeta.translationBatchApiCallCount ??
          translationMeta.batchSummary?.translationBatchApiCallCount ??
          0
      ),
      translationSlowestBatchIndex: Number(
        translationMeta.translationSlowestBatchIndex ??
          translationMeta.batchSummary?.translationSlowestBatchIndex ??
          0
      ),
      translationSlowestBatchDurationMs: Number(
        translationMeta.translationSlowestBatchDurationMs ??
          translationMeta.batchSummary?.translationSlowestBatchDurationMs ??
          0
      ),
      stageBEnrichmentDurationMs: Number(
        enrichmentMeta.stageBEnrichmentDurationMs || lesson?.meta?.stageBEnrichmentDurationMs || 0
      ),
      unnecessaryRetryPrevented: Boolean(
        enrichmentMeta.unnecessaryRetryPrevented ?? lesson?.meta?.unnecessaryRetryPrevented
      ),
      supportSource:
        enrichmentMeta.supportSource ||
        lesson?.meta?.supportSource ||
        (enrichmentMeta.enrichmentAttempted ? "online-api" : ""),
      kazakhPromptMode: enrichmentMeta.kazakhPromptMode || lesson?.meta?.kazakhPromptMode || "",
      kazakhValidationAttempted: Boolean(
        enrichmentMeta.kazakhValidationAttempted ?? lesson?.meta?.kazakhValidationAttempted
      ),
      kazakhValidationPassed: Boolean(
        enrichmentMeta.kazakhValidationPassed ?? lesson?.meta?.kazakhValidationPassed
      ),
      kazakhLanguageValidationPassed: Boolean(
        enrichmentMeta.kazakhLanguageValidationPassed ?? lesson?.meta?.kazakhLanguageValidationPassed
      ),
      kazakhValidationRetryAttempted: Boolean(
        enrichmentMeta.kazakhValidationRetryAttempted ?? lesson?.meta?.kazakhValidationRetryAttempted
      ),
      kazakhValidationReasons:
        enrichmentMeta.kazakhValidationReasons || lesson?.meta?.kazakhValidationReasons || [],
      kazakhLatinValidation:
        enrichmentMeta.kazakhLatinValidation || lesson?.meta?.kazakhLatinValidation || null,
      lessonTitleWasUserProvided: Boolean(
        enrichmentMeta.lessonTitleWasUserProvided ?? lesson?.meta?.lessonTitleWasUserProvided
      ),
      lessonTitleDerivedFromFile: Boolean(
        enrichmentMeta.lessonTitleDerivedFromFile ?? lesson?.meta?.lessonTitleDerivedFromFile
      ),
      lessonTitleUsedForGeneration: Boolean(
        enrichmentMeta.lessonTitleUsedForGeneration ?? lesson?.meta?.lessonTitleUsedForGeneration
      ),
      lessonTitleMismatchSuspected: Boolean(
        enrichmentMeta.lessonTitleMismatchSuspected ?? lesson?.meta?.lessonTitleMismatchSuspected
      ),
      droppedOffTopicQuizItems:
        enrichmentMeta.droppedOffTopicQuizItems || lesson?.meta?.droppedOffTopicQuizItems || [],
      supportFieldCounts:
        lesson?.meta?.supportFieldCounts ||
        enrichmentMeta.supportFieldCounts ||
        getSupportFieldCounts(lesson),
      generatedSupportFields:
        lesson?.meta?.generatedSupportFields ||
        enrichmentMeta.generatedSupportFields ||
        getGeneratedSupportFieldSummary(lesson).generatedSupportFields,
      missingOptionalSupportFields:
        lesson?.meta?.missingOptionalSupportFields ||
        enrichmentMeta.missingOptionalSupportFields ||
        getGeneratedSupportFieldSummary(lesson).missingOptionalSupportFields,
      batchSummary: translationMeta.batchSummary || null,
    },
    status: {
      type: statusType || "",
      message: statusMessage || "",
    },
    suspiciousBlocks: suspiciousBlockDetails,
    preservedBlocks: preservedBlockDetails,
  };
}

function Header(props) {
  const { page, onPageChange, mode, onModeChange, t, uiLanguage, onToggleUiLanguage } = props;
  const navLabels = {
    home: t.navOverview,
    teacher: t.navTeacherWorkspace,
    student: t.navStudentWorkspace,
  };
  return html`
    <header className="hero">
      <div className="hero__overlay"></div>
      <div className="hero__content">
        <div className="brand">${t.brand}</div>
        <h1>${t.headerTitle}</h1>
        <p>${t.headerDescription}</p>
        <div className="toolbar">
          <div className="modeToggle">
            <button
              className=${mode === "teacher" ? "active" : ""}
              onClick=${() => onModeChange("teacher")}
            >
              ${t.teacherMode}
            </button>
            <button
              className=${mode === "student" ? "active" : ""}
              onClick=${() => onModeChange("student")}
            >
              ${t.studentMode}
            </button>
          </div>
          <div className="modeHint">
            ${t.activeGuidanceMode}
            <strong>${mode === "teacher" ? t.teacherPreparation : t.studentLearning}</strong>
          </div>
          <button className="ghostBtn" onClick=${onToggleUiLanguage}>
            ${uiLanguage === "en" ? t.languageToggleKazakh : t.languageToggleEnglish}
          </button>
        </div>
        <nav className="tabs">
          ${navItems.map(
            (item) => html`
              <button
                key=${item.id}
                className=${page === item.id ? "tab active" : "tab"}
                onClick=${() => onPageChange(item.id)}
              >
                ${navLabels[item.id]}
              </button>
            `
          )}
        </nav>
      </div>
    </header>
  `;
}

function EmptySupportMessage({ text }) {
  return html`<p className="smallText emptySupportText">${text}</p>`;
}

function StringListSection({ title, items, emptyText }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${list.length === 0
        ? html`<${EmptySupportMessage} text=${emptyText} />`
        : html`
            <ul className="supportList">
              ${list.map((item, index) => html`<li key=${`${title}-${index}`}>${item}</li>`)}
            </ul>
          `}
    </article>
  `;
}

function KeyConceptSection({ title, items, emptyText }) {
  const list = Array.isArray(items) ? items : [];
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${list.length === 0
        ? html`<${EmptySupportMessage} text=${emptyText} />`
        : list.map(
            (item, index) => html`
              <div className="supportItem" key=${`${title}-${index}`}>
                <strong>${item.title}</strong>
                <p>${item.explanation}</p>
              </div>
            `
          )}
    </article>
  `;
}

function MisconceptionSection({ title, items, emptyText }) {
  const list = Array.isArray(items) ? items : [];
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${list.length === 0
        ? html`<${EmptySupportMessage} text=${emptyText} />`
        : list.map(
            (item, index) => html`
              <div className="supportItem" key=${`${title}-${index}`}>
                <p><strong>${item.misconception}</strong></p>
                <p>${item.correction}</p>
              </div>
            `
          )}
    </article>
  `;
}

function ActivitiesSection({ title, items, t, emptyText }) {
  const list = Array.isArray(items) ? items : [];
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${list.length === 0
        ? html`<${EmptySupportMessage} text=${emptyText} />`
        : list.map(
            (item, index) => html`
              <div className="supportItem" key=${`${title}-${index}`}>
                <strong>${item.title || t.notAvailable}</strong>
                ${item.duration && html`<p className="smallText">${t.durationLabel} ${item.duration}</p>`}
                <p className=${item.instructions ? "" : "smallText"}>
                  ${item.instructions || "Instructions not generated."}
                </p>
              </div>
            `
          )}
    </article>
  `;
}

function TeacherNotesSection({ title, notes, emptyText }) {
  const list = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const text = !Array.isArray(notes) ? String(notes || "").trim() : "";
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${list.length === 0 && !text
        ? html`<${EmptySupportMessage} text=${emptyText} />`
        : list.length > 0
        ? html`<ul className="supportList">${list.map((item, index) => html`<li key=${index}>${item}</li>`)}</ul>`
        : html`<p>${text}</p>`}
    </article>
  `;
}

function LessonSupportSections({ lesson, t, audience = "teacher" }) {
  if (!lesson) return null;
  return html`
    <${KeyConceptSection}
      title=${t.keyConcepts}
      items=${lesson.keyConcepts}
      emptyText=${t.noKeyConceptsGenerated}
    />
    ${audience === "teacher" &&
    html`
      <${MisconceptionSection}
        title=${t.commonMisconceptions}
        items=${lesson.commonMisconceptions}
        emptyText=${t.noCommonMisconceptionsGenerated}
      />
      <${TeacherNotesSection}
        title=${t.teacherNotes}
        notes=${lesson.teacherNotes}
        emptyText=${t.noTeacherNotesGenerated}
      />
      <${ActivitiesSection}
        title=${t.classroomActivities}
        items=${lesson.classroomActivities}
        t=${t}
        emptyText=${t.noClassroomActivitiesGenerated}
      />
    `}
    <${StringListSection}
      title=${t.extensionQuestions}
      items=${lesson.extensionQuestions}
      emptyText=${t.noExtensionQuestionsGenerated}
    />
  `;
}

function HomePage(props) {
  const { t } = props;
  return html`
    <section className="card">
      <h2>${t.productOverview}</h2>
      <p>${t.homeDescription}</p>
      <ul className="featureList">
        <li>${t.featureDocxPdf}</li>
        <li>${t.featureDocxWorkflow}</li>
        <li>${t.featureGeneration}</li>
        <li>${t.featureExport}</li>
        <li>${t.featureOverlay}</li>
        <li>${t.featureImport}</li>
      </ul>
      <div className="buttonRow">
        <button className="primaryBtn" onClick=${props.openTeacher}>
          ${t.openTeacherWorkspace}
        </button>
        <button className="ghostBtn" onClick=${props.openStudent}>
          ${t.openStudentWorkspace}
        </button>
      </div>
    </section>
  `;
}

function QuizSettingsPanel(props) {
  const { settings, onChange, t } = props;

  function toggleQuestionType(type) {
    const current = new Set(settings.questionTypes);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    const updated = Array.from(current);
    onChange({ ...settings, questionTypes: updated.length ? updated : ["multiple_choice"] });
  }

  return html`
    <div className="subCard">
      <h3>${t.quizSettings}</h3>
      <p className="sectionDesc">${t.quizSettingsDescription}</p>

      <div className="settingsGrid">
        <label>
          ${t.numberOfQuestions}
          <input
            type="number"
            min="1"
            max="8"
            value=${settings.questionCount}
            onChange=${(e) =>
              onChange({ ...settings, questionCount: Number.parseInt(e.target.value || "1", 10) })}
          />
        </label>
        <label>
          ${t.difficultyLevel}
          <select
            value=${settings.difficulty}
            onChange=${(e) => onChange({ ...settings, difficulty: e.target.value })}
          >
            <option value="easy">${t.easy}</option>
            <option value="medium">${t.medium}</option>
            <option value="hard">${t.hard}</option>
          </select>
        </label>
      </div>

      <div className="checkGroup">
        <div className="checkLabel">${t.questionTypes}</div>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.questionTypes.includes("multiple_choice")}
            onChange=${() => toggleQuestionType("multiple_choice")}
          />
          ${t.multipleChoice}
        </label>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.questionTypes.includes("true_false")}
            onChange=${() => toggleQuestionType("true_false")}
          />
          ${t.trueFalse}
        </label>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.questionTypes.includes("short_answer")}
            onChange=${() => toggleQuestionType("short_answer")}
          />
          ${t.shortAnswer}
        </label>
      </div>

      <div className="checkGroup">
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.includeAnswerKey}
            onChange=${(e) => onChange({ ...settings, includeAnswerKey: e.target.checked })}
          />
          ${t.includeAnswerKey}
        </label>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.includeExplanations}
            onChange=${(e) => onChange({ ...settings, includeExplanations: e.target.checked })}
          />
          ${t.includeExplanations}
        </label>
      </div>
    </div>
  `;
}
function LessonResults(props) {
  const {
    lesson,
    onUpdateLesson,
    teacherQuizAnswers,
    onTeacherQuizAnswer,
    showAnswerKey,
    statusMessage,
    statusType,
    t,
    uiLanguage,
  } = props;

  const quizScore = useMemo(() => {
    let score = 0;
    (lesson.quiz || []).forEach((q, index) => {
      const key = `q-${index}`;
      if ((q.type === "multiple_choice" || q.type === "true_false") && teacherQuizAnswers[key] === q.answerIndex) {
        score += 1;
      }
      if (q.type === "short_answer") {
        const studentText = String(teacherQuizAnswers[key] || "").trim().toLowerCase();
        const answerText = String(q.answerText || "").trim().toLowerCase();
        if (studentText && answerText && studentText === answerText) {
          score += 1;
        }
      }
    });
    return score;
  }, [lesson.quiz, teacherQuizAnswers]);

  return html`
    <div className="subCard">
      <h3>${t.generatedLessonPackage}</h3>
      <p className="sectionDesc">${t.reviewAdjustContent}</p>
      ${statusMessage &&
      html`
        <div
          className=${`statusBanner ${
            statusType === "error" ? "statusBanner--error" : "statusBanner--info"
          }`}
        >
          ${statusMessage}
        </div>
      `}

      <div className="resultsGrid">
        <article className="resultCard">
          <h3>${t.translatedLessonText}</h3>
          <p className="sectionDesc">${t.editableTranslationPreview}</p>
          <textarea
            rows="8"
            value=${lesson.translation}
            onChange=${(e) => onUpdateLesson({ ...lesson, translation: e.target.value })}
          ></textarea>
        </article>

        <article className="resultCard">
          <h3>${t.glossaryAndKeyTerms}</h3>
          <p className="sectionDesc">${t.coreTermsForUnderstanding}</p>
          <ul className="glossaryList">
            ${(lesson.glossary || []).map(
              (item) => html`
                <li key=${item.term}>
                  <strong>${item.term}</strong> - ${item.explanation}
                </li>
              `
            )}
          </ul>
        </article>

        <article className="resultCard">
          <h3>${t.simplifiedExplanation}</h3>
          <p className="sectionDesc">${t.editableExplanation}</p>
          <textarea
            rows="8"
            value=${lesson.simplifiedExplanation}
            onChange=${(e) =>
              onUpdateLesson({ ...lesson, simplifiedExplanation: e.target.value })}
          ></textarea>
        </article>

        <${LessonSupportSections} lesson=${lesson} t=${t} audience="teacher" />

        <article className="resultCard">
          <h3>${t.quizPreview}</h3>
          <p className="sectionDesc">${t.practiceViewDescription}</p>
          ${(lesson.quiz || []).map(
            (q, index) => {
              const answerKey = `q-${index}`;
              return html`
                <div className="quizItem" key=${answerKey}>
                  <p>${index + 1}. [${getQuizTypeLabel(q.type, uiLanguage)}] ${q.question}</p>

                  ${(q.type === "multiple_choice" || q.type === "true_false") &&
                  html`
                    <div className="choiceRow">
                      ${(q.options || []).map(
                        (opt, optionIndex) => html`
                          <button
                            key=${`${answerKey}-${optionIndex}`}
                            className=${
                              teacherQuizAnswers[answerKey] === optionIndex
                                ? "choiceBtn selected"
                                : "choiceBtn"
                            }
                            onClick=${() => onTeacherQuizAnswer(answerKey, optionIndex)}
                          >
                            ${opt}
                          </button>
                        `
                      )}
                    </div>
                  `}

                  ${q.type === "short_answer" &&
                  html`
                    <textarea
                      rows="3"
                      placeholder=${t.writeShortAnswer}
                      value=${teacherQuizAnswers[answerKey] || ""}
                      onChange=${(e) => onTeacherQuizAnswer(answerKey, e.target.value)}
                    ></textarea>
                  `}

                  ${showAnswerKey &&
                  html`
                    <p className="smallText">
                      ${t.answerLabel}
                      ${q.type === "short_answer"
                        ? q.answerText
                        : (q.options || [])[q.answerIndex] || t.notAvailable}
                    </p>
                  `}
                  ${showAnswerKey &&
                  q.explanation &&
                  html`<p className="smallText">${t.whyLabel} ${q.explanation}</p>`}
                </div>
              `;
            }
          )}
          <p className="scoreLine">${t.practiceScore}: ${quizScore}/${(lesson.quiz || []).length}</p>
        </article>
      </div>
    </div>
  `;
}

function GenerationProgress(props) {
  const { progress, t } = props;
  if (!progress?.active) return null;
  const percent = clampPercent(progress.percent);
  const isIndeterminate = progress.stage !== "done" && progress.total <= 0;
  const label = progress.label || t.preparingTranslation;

  return html`
    <div className="generationProgress" role="status" aria-live="polite">
      <div className="generationProgress__meta">
        <span>${t.translationProgress}</span>
        <strong>${label}</strong>
        <span>${percent}%</span>
      </div>
      <div
        className=${isIndeterminate
          ? "generationProgress__track generationProgress__track--indeterminate"
          : "generationProgress__track"}
        aria-label=${t.translationProgress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${percent}
        role="progressbar"
      >
        <div
          className="generationProgress__bar"
          style=${{ width: `${isIndeterminate ? 35 : percent}%` }}
        ></div>
      </div>
    </div>
  `;
}

function TeacherWorkspace(props) {
  const {
    lessonTitle,
    setLessonTitle,
    sourceText,
    setSourceText,
    targetLanguage,
    setTargetLanguage,
    quizSettings,
    setQuizSettings,
    generationMode,
    onGenerate,
    onCancelGeneration,
    onClearTranslationCache,
    loading,
    documentLoading,
    documentStatus,
    documentError,
    documentSummary,
    onDocxFileSelect,
    onPdfFileSelect,
    onUseManualText,
    lesson,
    onUpdateLesson,
    onExportTeacherJson,
    onExportStudentJson,
    onExportDocx,
    onExportDebugReport,
    teacherQuizAnswers,
    onTeacherQuizAnswer,
    statusMessage,
    statusType,
    generationProgress,
    t,
    uiLanguage,
  } = props;

  return html`
    <section className="card">
      <h2>${t.teacherLessonPreparation}</h2>
      <p>${t.teacherPreparationDescription}</p>

      <div className="subCard">
        <h3>${t.lessonInputAndDocumentProcessing}</h3>
        <div className="settingsGrid">
          <label>
            ${t.lessonTitle}
            <input
              type="text"
              value=${lessonTitle}
              onChange=${(e) => setLessonTitle(e.target.value)}
              placeholder=${t.lessonTitlePlaceholder}
            />
          </label>
          <label>
            ${t.targetLanguage}
            <select
              value=${targetLanguage}
              onChange=${(e) => setTargetLanguage(e.target.value)}
            >
              ${languageOptions.map(
                (language) => html`
                  <option key=${language.value} value=${language.value}>
                    ${getTargetLanguageLabel(language.value, uiLanguage)}
                  </option>
                `
              )}
            </select>
          </label>
        </div>

        <div className="settingsGrid">
          <label>
            ${t.guidanceMode}
            <select disabled value=${generationMode}>
              <option value="teacher">${t.teacherMode}</option>
              <option value="student">${t.studentMode}</option>
            </select>
          </label>
          <label>
            ${t.uploadDocxRecommended}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange=${onDocxFileSelect}
            />
          </label>
        </div>

        <div className="buttonRow">
          <button className="ghostBtn" onClick=${onUseManualText}>
            ${t.pasteTextInput}
          </button>
          <label className="inlineFile">
            ${t.uploadPdfConvert}
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange=${onPdfFileSelect}
            />
          </label>
        </div>

        ${documentLoading &&
        html`<div className="statusBanner statusBanner--info">${t.processingUploadedDocument}</div>`}
        ${documentStatus && html`<div className="statusBanner statusBanner--info">${documentStatus}</div>`}
        ${documentError && html`<div className="statusBanner statusBanner--error">${documentError}</div>`}
        ${documentSummary && html`<div className="statusBanner statusBanner--info">${documentSummary}</div>`}
        <label>
          ${t.sourceTextPreviewEditable}
          <textarea
            rows="10"
            value=${sourceText}
            onChange=${(e) => setSourceText(e.target.value)}
            placeholder=${t.sourceTextPlaceholder}
          ></textarea>
        </label>
      </div>

      <${QuizSettingsPanel}
        settings=${quizSettings}
        onChange=${(next) => setQuizSettings(normalizeQuizSettings(next))}
        t=${t}
      />

      <div className="buttonRow">
        <button className="primaryBtn" disabled=${loading} onClick=${onGenerate}>
          ${loading ? t.generatingAiLearningSupport : t.generateAiLearningSupport}
        </button>
        ${loading &&
        html`
          <button className="ghostBtn" onClick=${onCancelGeneration}>
            ${t.cancelGeneration}
          </button>
        `}
        <button className="ghostBtn" disabled=${loading} onClick=${onClearTranslationCache}>
          ${t.clearTranslationCache}
        </button>
      </div>

      <${GenerationProgress} progress=${generationProgress} t=${t} />

      ${lesson &&
      html`
        <div className="teacherActions">
          <button className="ghostBtn" onClick=${onExportDocx}>
            ${t.exportFullLessonDocx}
          </button>
          <button className="ghostBtn" onClick=${onExportTeacherJson}>
            ${t.exportLearningPackageTeacherJson}
          </button>
          <button className="ghostBtn" onClick=${onExportStudentJson}>
            ${t.exportLearningPackageStudentJson}
          </button>
          <button className="ghostBtn" onClick=${onExportDebugReport}>
            ${t.exportDebugReport}
          </button>
        </div>
      `}

      ${lesson &&
      html`
        <${LessonResults}
          lesson=${lesson}
          onUpdateLesson=${onUpdateLesson}
          teacherQuizAnswers=${teacherQuizAnswers}
          onTeacherQuizAnswer=${onTeacherQuizAnswer}
          showAnswerKey=${quizSettings.includeAnswerKey}
          statusMessage=${statusMessage}
          statusType=${statusType}
          t=${t}
          uiLanguage=${uiLanguage}
        />
      `}
    </section>
  `;
}
function StudentWorkspace(props) {
  const {
    studentLesson,
    importStatus,
    importError,
    onImportFile,
    onLoadFromTeacher,
    onStudentAnswer,
    studentAnswers,
    showStudentScore,
    onCheckQuiz,
    t,
    uiLanguage,
  } = props;

  const score = useMemo(() => {
    if (!studentLesson) return 0;
    let total = 0;
    (studentLesson.quiz || []).forEach((q, index) => {
      const key = `q-${index}`;
      if (q.type === "short_answer") {
        const given = String(studentAnswers[key] || "").trim().toLowerCase();
        const expected = String(q.answerText || "").trim().toLowerCase();
        if (given && expected && given === expected) total += 1;
        return;
      }
      if (studentAnswers[key] === q.answerIndex) total += 1;
    });
    return total;
  }, [studentLesson, studentAnswers]);

  return html`
    <section className="card">
      <h2>${t.studentLearningWorkspace}</h2>
      <p>${t.studentWorkspaceDescription}</p>

      <div className="subCard">
        <h3>${t.importLessonPackage}</h3>
        <p className="sectionDesc">${t.importLessonPackageDescription}</p>
        <div className="buttonRow">
          <input type="file" accept=".json,application/json" onChange=${onImportFile} />
          <button className="ghostBtn" onClick=${onLoadFromTeacher}>
            ${t.loadLatestTeacherDraft}
          </button>
        </div>
        ${importStatus && html`<div className="statusBanner statusBanner--info">${importStatus}</div>`}
        ${importError && html`<div className="statusBanner statusBanner--error">${importError}</div>`}
      </div>

      ${studentLesson &&
      html`
        <div className="subCard">
          <h3>${studentLesson.lessonTitle}</h3>
          <p className="smallText">
            ${t.targetLanguage}: ${getTargetLanguageLabel(studentLesson.targetLanguage, uiLanguage)} |
            ${t.packageType}: ${getPackageTypeLabel(studentLesson.packageType, uiLanguage)} |
            ${t.sourceType}: ${getDocumentSourceLabel(
              studentLesson.metadata?.documentSourceType,
              uiLanguage
            )}
          </p>

          <div className="resultsGrid">
            <article className="resultCard">
              <h3>${t.translatedLessonText}</h3>
              <p>${studentLesson.translation}</p>
            </article>
            <article className="resultCard">
              <h3>${t.glossary}</h3>
              <ul className="glossaryList">
                ${(studentLesson.glossary || []).map(
                  (item) => html`
                    <li key=${item.term}>
                      <strong>${item.term}</strong> - ${item.explanation}
                    </li>
                  `
                )}
              </ul>
            </article>
            <article className="resultCard">
              <h3>${t.simplifiedExplanation}</h3>
              <p className="preLineText">${studentLesson.simplifiedExplanation}</p>
            </article>
            <${LessonSupportSections} lesson=${studentLesson} t=${t} audience="student" />
            <article className="resultCard">
              <h3>${t.practiceQuiz}</h3>
              ${(studentLesson.quiz || []).map(
                (q, index) => {
                  const key = `q-${index}`;
                  return html`
                    <div className="quizItem" key=${key}>
                      <p>${index + 1}. [${getQuizTypeLabel(q.type, uiLanguage)}] ${q.question}</p>

                      ${(q.type === "multiple_choice" || q.type === "true_false") &&
                      html`
                        <div className="choiceRow">
                          ${(q.options || []).map(
                            (opt, optionIndex) => html`
                              <button
                                key=${`${key}-${optionIndex}`}
                                className=${
                                  studentAnswers[key] === optionIndex
                                    ? "choiceBtn selected"
                                    : "choiceBtn"
                                }
                                onClick=${() => onStudentAnswer(key, optionIndex)}
                              >
                                ${opt}
                              </button>
                            `
                          )}
                        </div>
                      `}

                      ${q.type === "short_answer" &&
                      html`
                        <textarea
                          rows="3"
                          value=${studentAnswers[key] || ""}
                          placeholder=${t.writeYourAnswer}
                          onChange=${(e) => onStudentAnswer(key, e.target.value)}
                        ></textarea>
                      `}
                    </div>
                  `;
                }
              )}

              <div className="buttonRow">
                <button className="primaryBtn" onClick=${onCheckQuiz}>${t.checkQuiz}</button>
              </div>

              ${showStudentScore &&
              html`
                <p className="scoreLine">
                  ${t.score}: ${score}/${(studentLesson.quiz || []).length}
                </p>
              `}
            </article>
          </div>
        </div>
      `}
    </section>
  `;
}

function App() {
  const [page, setPage] = useState(pageFromHash());
  const [uiLanguage, setUiLanguage] = useState(() => {
    try {
      const saved = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
      return saved === "kk" ? "kk" : "en";
    } catch (_err) {
      return "en";
    }
  });
  const [mode, setMode] = useState("teacher");
  const t = getUiText(uiLanguage);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonTitleWasUserProvided, setLessonTitleWasUserProvided] = useState(false);
  const [lessonTitleDerivedFromFile, setLessonTitleDerivedFromFile] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Chinese");
  const [quizSettings, setQuizSettings] = useState(defaultQuizSettings);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(t.teacherTip);
  const [statusType, setStatusType] = useState("info");
  const [generationProgress, setGenerationProgress] = useState(defaultGenerationProgress);

  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [documentSummary, setDocumentSummary] = useState(t.recommendedWorkflow);
  const [documentContext, setDocumentContext] = useState({
    sourceType: "text",
    fileName: "",
    docxData: null,
    blockTranslations: {},
    translationDebugEntries: [],
  });

  const [teacherLesson, setTeacherLesson] = useState(null);
  const [teacherQuizAnswers, setTeacherQuizAnswers] = useState({});
  const [teacherMeta, setTeacherMeta] = useState({
    usedFallback: true,
    reason: "",
    pipelineVersion: PIPELINE_VERSION,
    translationPromptVersion: TRANSLATION_PROMPT_VERSION,
    enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
    cacheVersion: CACHE_VERSION,
  });

  const [studentLesson, setStudentLesson] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [showStudentScore, setShowStudentScore] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const generationRunRef = useRef({ id: 0, controller: null });
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (!window.location.hash) setHash("home");
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    return () => {
      generationRunRef.current.controller?.abort();
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    runtimeUiLanguage = uiLanguage;
    try {
      window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, uiLanguage);
    } catch (_err) {
      // Ignore localStorage write failures.
    }
  }, [uiLanguage]);

  useEffect(() => {
    if (!teacherLesson && !loading) {
      setStatusMessage(t.teacherTip);
    }
    if (!documentLoading && documentContext.sourceType === "text") {
      setDocumentSummary(documentStatus ? t.manualTextModeSummary : t.recommendedWorkflow);
    }
  }, [uiLanguage]);

  function toggleUiLanguage() {
    setUiLanguage((prev) => (prev === "en" ? "kk" : "en"));
  }

  function beginGenerationRun() {
    generationRunRef.current.controller?.abort();
    const controller = new AbortController();
    const nextRun = {
      id: generationRunRef.current.id + 1,
      controller,
    };
    generationRunRef.current = nextRun;
    return {
      id: nextRun.id,
      signal: controller.signal,
    };
  }

  function isActiveGenerationRun(runContext) {
    return (
      Boolean(runContext) &&
      generationRunRef.current.id === runContext.id &&
      !runContext.signal?.aborted
    );
  }

  function assertActiveGenerationRun(runContext) {
    if (runContext && !isActiveGenerationRun(runContext)) {
      throw createGenerationCancelledError();
    }
  }

  function isTranslationTimeoutError(err) {
    return err?.name === "TranslationRequestTimeoutError" || err?.code === "translation_request_timeout";
  }

  async function callModelChatForEnrichment(messages, options = {}) {
    const requestBody = {
      stage: options.stage || "enrichment",
      messages: Array.isArray(messages) ? messages : [],
      format: options.format || "json",
      options: options.options || {},
    };

    throwIfGenerationCancelled({ signal: options.signal });
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ENRICHMENT_REQUEST_TIMEOUT_MS);
    const abortFromParent = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) {
        globalThis.clearTimeout(timeoutId);
        throw createGenerationCancelledError();
      }
      options.signal.addEventListener("abort", abortFromParent, { once: true });
    }
    let response;
    try {
      response = await postModelChat(requestBody, { signal: controller.signal });
    } catch (err) {
      if (timedOut) {
        throw new Error("Enrichment request timed out after 180 seconds.");
      }
      if (isGenerationCancelledError(err)) {
        throw createGenerationCancelledError();
      }
      throw new Error(t.aiConnectionFailed(err?.message || ""));
    } finally {
      globalThis.clearTimeout(timeoutId);
      if (options.signal) options.signal.removeEventListener("abort", abortFromParent);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(t.aiHttpError(response.status, body.slice(0, 400) || response.statusText));
    }

    const data = await response.json().catch(() => {
      throw new Error(t.aiInvalidJson);
    });
    const content = data?.content;
    if (typeof content !== "string") {
      throw new Error(t.aiNoContent);
    }
    return content;
  }

  function buildEnrichmentRunContext(runContext = null) {
    return {
      ...(runContext || {}),
      uiText: t,
      callModelChat: callModelChatForEnrichment,
      isGenerationCancelledError,
      throwIfGenerationCancelled,
    };
  }

  function finishGenerationRun(runContext) {
    if (generationRunRef.current.id === runContext?.id) {
      generationRunRef.current.controller = null;
    }
  }

  function setGenerationStatus(type, message, runContext = null) {
    if (runContext && !isActiveGenerationRun(runContext)) return;
    setStatusType(type);
    setStatusMessage(message);
  }

  function updateGenerationProgress(next, runContext = null) {
    if (runContext && !isActiveGenerationRun(runContext)) return;
    setGenerationProgress(buildProgressUpdate(next));
  }

  function markGenerationProgressError(runContext = null) {
    if (runContext && !isActiveGenerationRun(runContext)) return;
    setGenerationProgress((prev) => ({
      ...prev,
      active: true,
      stage: "error",
      label: prev.label || t.preparingTranslation,
    }));
  }

  function showToast(message) {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimeoutRef.current = null;
    }, 2600);
  }

  function cancelGeneration() {
    const current = generationRunRef.current;
    if (!current.controller) return;
    current.controller.abort();
    current.controller = null;
    setLoading(false);
    setGenerationStatus("info", t.generationCancelled);
    setGenerationProgress((prev) => ({
      ...prev,
      active: true,
      stage: "cancelled",
      label: t.generationCancelled,
    }));
  }

  function handleClearTranslationCache() {
    clearTranslationCacheStorage();
    setGenerationStatus("info", t.translationCacheCleared);
    showToast(t.translationCacheCleared);
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setHash(nextMode === "teacher" ? "teacher" : "student");
  }

  function handleLessonTitleChange(nextTitle) {
    setLessonTitle(nextTitle);
    setLessonTitleWasUserProvided(Boolean(String(nextTitle || "").trim()));
    setLessonTitleDerivedFromFile(false);
  }

  function deriveTitleFromUploadIfNeeded(fileName) {
    if (lessonTitle.trim()) return;
    const derivedTitle = deriveLessonTitleFromFilename(fileName);
    if (!derivedTitle) return;
    setLessonTitle(derivedTitle);
    setLessonTitleWasUserProvided(false);
    setLessonTitleDerivedFromFile(true);
  }

  function useManualTextInput() {
    if (lessonTitleDerivedFromFile && !lessonTitleWasUserProvided) {
      setLessonTitle("");
      setLessonTitleDerivedFromFile(false);
    }
    setDocumentContext({
      sourceType: "text",
      fileName: "",
      docxData: null,
      blockTranslations: {},
      translationDebugEntries: [],
    });
    setDocumentStatus(t.manualTextModeIsActive);
    setDocumentError("");
    setDocumentSummary(t.manualTextModeSummary);
  }

  async function convertPdfToDocxFile(file) {
    const converted = await convertPdfToDocx(file, {
      fallbackErrorMessage: t.pdfConversionFailed,
      outputBaseName: safeDownloadName(file.name.replace(/\.pdf$/i, ""), "converted"),
    });
    return new File([converted.blob], converted.fileName, { type: converted.type });
  }

  async function processUploadedDocument(file, expectedType = "any") {
    const lowerName = (file?.name || "").toLowerCase();
    if (!file) return;
    setDocumentLoading(true);
    setDocumentStatus("");
    setDocumentError("");

    try {
      if (expectedType === "docx" && !lowerName.endsWith(".docx")) {
        throw new Error(t.pleaseUploadDocx);
      }
      if (expectedType === "pdf" && !lowerName.endsWith(".pdf")) {
        throw new Error(t.pleaseUploadPdf);
      }

      if (lowerName.endsWith(".pdf")) {
        setDocumentStatus(t.convertingPdfToDocx);
        setDocumentSummary(t.pdfConversionSummary);
        const convertedFile = await convertPdfToDocxFile(file);
        const parsed = await importDocxFile(convertedFile);
        deriveTitleFromUploadIfNeeded(file.name);
        setSourceText(parsed.fullText || "");
        setDocumentContext({
          sourceType: "pdf-converted-docx",
          fileName: file.name,
          originalFileName: file.name,
          convertedDocxFileName: convertedFile.name,
          docxData: {
            ...parsed,
            originalPdfFileName: file.name,
            convertedDocxFileName: convertedFile.name,
          },
          blockTranslations: {},
          translationDebugEntries: [],
        });
        logDocxExtractionAudit(parsed);
        const quick = getDocxExtractionQuickCounts(parsed);
        const totalBlocks = parsed?.traversalSummary?.totalBlocks || 0;
        setDocumentStatus(
          `${t.pdfParsed(file.name, convertedFile.name)} ${t.docxParsed(convertedFile.name, totalBlocks)}`
        );
        setDocumentSummary(`${t.pdfConvertedToDocx} ${t.docxExtractionAudit(quick)}`);
      } else if (lowerName.endsWith(".docx")) {
        const parsed = await importDocxFile(file);
        // Preview text is for UI display/debug. DOCX translation uses structured blocks only.
        deriveTitleFromUploadIfNeeded(file.name);
        setSourceText(parsed.fullText || "");
        setDocumentContext({
          sourceType: "docx",
          fileName: file.name,
          docxData: parsed,
          blockTranslations: {},
          translationDebugEntries: [],
        });
        const totalBlocks = parsed?.traversalSummary?.totalBlocks || 0;
        setDocumentStatus(t.docxParsed(file.name, totalBlocks));
        logDocxExtractionAudit(parsed);
        const quick = getDocxExtractionQuickCounts(parsed);
        setDocumentSummary(t.docxExtractionAudit(quick));
      } else {
        throw new Error(t.unsupportedFileType);
      }
    } catch (err) {
      const fallbackMessage =
        expectedType === "pdf" || lowerName.endsWith(".pdf")
          ? t.pdfConversionFailed
          : t.documentProcessingFailed;
      setDocumentError(err?.message || fallbackMessage);
      setDocumentStatus("");
    } finally {
      setDocumentLoading(false);
    }
  }

  async function handleDocxFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    try {
      await processUploadedDocument(file, "docx");
    } finally {
      event.target.value = "";
    }
  }

  async function handlePdfFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    try {
      await processUploadedDocument(file, "pdf");
    } finally {
      event.target.value = "";
    }
  }

  async function translateBlocksForDocumentWrapper(blocks, preserveFormulas = true, runContext = null) {
    return await translateBlocksForDocument({
      blocks,
      targetLanguage,
      mode,
      preserveFormulas,
      runContext,
      uiText: t,
      progressCallbacks: {
        assertActiveRun: assertActiveGenerationRun,
        setStatus: setGenerationStatus,
        updateProgress: updateGenerationProgress,
      },
    });
  }

  async function translateDocxBlocksInBatchesWrapper(blocks, preserveFormulas = true, runContext = null) {
    return await translateDocxBlocksInBatches({
      blocks,
      targetLanguage,
      mode,
      preserveFormulas,
      runContext,
      uiText: t,
      progressCallbacks: {
        assertActiveRun: assertActiveGenerationRun,
        setStatus: setGenerationStatus,
        updateProgress: updateGenerationProgress,
      },
    });
  }

  async function handleGenerate() {
    const generationStartedAt = Date.now();
    const trimmedText = sourceText.trim();
    if (!trimmedText) {
      setStatusType("error");
      setStatusMessage(t.pleaseEnterLessonText);
      return;
    }

    const runContext = beginGenerationRun();
    setLoading(true);
    setGenerationStatus("info", t.generatingLessonSupport, runContext);
    updateGenerationProgress({
      stage: "translation",
      current: 0,
      total: 0,
      percent: 2,
      label: t.preparingTranslation,
    }, runContext);
    setTeacherQuizAnswers({});

    const fallbackInput = {
      lessonTitle: lessonTitle.trim() || t.untitledLesson,
      sourceText: trimmedText,
      targetLanguage,
      mode,
      quizSettings: normalizeQuizSettings(quizSettings),
      sourceType: documentContext.sourceType || "text",
      sourceFileName:
        documentContext.originalFileName ||
        documentContext.fileName ||
        documentContext.convertedDocxFileName ||
        "",
      targetAudience: "beginner/intermediate students",
      lessonTitleWasUserProvided,
      lessonTitleDerivedFromFile,
    };

    if (
      ["docx", "pdf-converted-docx"].includes(documentContext.sourceType) &&
      documentContext.docxData
    ) {
      setGenerationStatus("info", t.docxBatchedMode, runContext);
      if (typeof console !== "undefined") {
        console.info(
          "[DOCX Batched Path] Preview text is not used as translation input. Lesson support uses the backend AI API."
        );
      }
      try {
        assertActiveGenerationRun(runContext);
        const docxBlocks = buildDocxTranslationBlocks(documentContext.docxData);
        if (!Array.isArray(docxBlocks) || docxBlocks.length === 0) {
          throw new Error(t.noStructuredDocxBlocks);
        }

        const stageAStartedAt = Date.now();
        const translationResult = await translateDocxBlocksInBatchesWrapper(docxBlocks, true, runContext);
        if (translationResult?.meta) {
          translationResult.meta.stageATranslationDurationMs = Date.now() - stageAStartedAt;
        }
        assertActiveGenerationRun(runContext);
        const combinedTranslation = buildDocxCombinedTranslation(
          docxBlocks,
          translationResult.translationsById
        );

        let aiLessonBase;
        let aiLessonMeta = { usedFallback: false, reason: "" };
        try {
          setGenerationStatus("info", t.generatingTeachingSupport, runContext);
          updateGenerationProgress({
            stage: "enrichment",
            current: 1,
            total: 1,
            percent: 88,
            label: t.generatingGlossaryQuiz,
          }, runContext);
          const enrichmentInput = {
            ...fallbackInput,
            blockKindSummary: translationResult.meta?.debugSummary?.blockKindCounts || {},
          };
          const aiPayload = await generateTeachingSupportWithModel(
            enrichmentInput,
            combinedTranslation,
            buildEnrichmentRunContext(runContext)
          );
          assertActiveGenerationRun(runContext);
          aiLessonBase = normalizeLessonResult(aiPayload, fallbackInput, combinedTranslation, buildEnrichmentRunContext(runContext));
          aiLessonMeta = aiLessonBase.meta || aiPayload.meta || aiLessonMeta;
        } catch (lessonErr) {
          if (isGenerationCancelledError(lessonErr)) throw lessonErr;
          aiLessonBase = createSafeEnrichmentFallbackLesson(fallbackInput, combinedTranslation, {
            reason: lessonErr?.message || t.lessonSupportFailed,
            retryAttempted: true,
          }, buildEnrichmentRunContext(runContext));
          aiLessonMeta = aiLessonBase.meta;
        }

        const nextLesson = {
          ...aiLessonBase,
          lessonTitle: fallbackInput.lessonTitle,
          sourceText: fallbackInput.sourceText,
          targetLanguage: fallbackInput.targetLanguage,
          translation: combinedTranslation || aiLessonBase.translation,
          mode: fallbackInput.mode,
          quizSettings: fallbackInput.quizSettings,
          documentAssets: {
            sourceType: documentContext.sourceType,
            fileName: documentContext.fileName,
            originalFileName: documentContext.originalFileName || "",
            convertedDocxFileName: documentContext.convertedDocxFileName || "",
            docxData: documentContext.docxData,
            blockTranslations: translationResult.translationsById || {},
            translationDebugEntries: Array.isArray(translationResult.meta?.debugEntries)
              ? translationResult.meta.debugEntries
              : [],
            formulaPreservation:
              "DOCX translation uses structured block decisions only; preview text is not used.",
          },
        };

        assertActiveGenerationRun(runContext);
        const summary = translationResult.meta?.debugSummary || {};
        const usedFallback = Boolean(
          translationResult.meta?.usedFallback || aiLessonMeta?.usedFallback
        );
        const fallbackReason = [translationResult.meta?.reason, aiLessonMeta?.reason]
          .map((reason) => String(reason || "").trim())
          .filter(Boolean)
          .join(" | ");

        setTeacherLesson(nextLesson);
        setTeacherMeta({
          usedFallback,
          reason: fallbackReason,
          pipelineVersion: PIPELINE_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
          cacheVersion: CACHE_VERSION,
          translationMeta: translationResult.meta || {},
          enrichmentMeta: aiLessonMeta || {},
          totalGenerationDurationMs: Date.now() - generationStartedAt,
        });

        if (usedFallback) {
          setGenerationStatus("error", t.docxGenerationFallbackUsed(fallbackReason), runContext);
          markGenerationProgressError(runContext);
        } else if (aiLessonMeta?.teachingSupportFallbackUsed) {
          setGenerationStatus(
            "info",
            aiLessonMeta?.supportSource === "local-fallback"
              ? t.teachingSupportFallbackUsed
              : t.teachingSupportPartiallyGenerated,
            runContext
          );
          updateGenerationProgress({
            stage: "done",
            current: 1,
            total: 1,
            percent: 100,
            label: t.progressComplete,
          }, runContext);
        } else {
          setGenerationStatus("info", t.docxBatchCompleted(summary), runContext);
          updateGenerationProgress({
            stage: "done",
            current: 1,
            total: 1,
            percent: 100,
            label: t.progressComplete,
          }, runContext);
        }
      } catch (docxErr) {
        if (isGenerationCancelledError(docxErr)) {
          if (generationRunRef.current.id === runContext.id) {
            setGenerationStatus("info", t.generationCancelled);
            setGenerationProgress((prev) => ({
              ...prev,
              active: true,
              stage: "cancelled",
              label: t.generationCancelled,
            }));
          }
          return;
        }
        if (isTranslationTimeoutError(docxErr)) {
          if (isActiveGenerationRun(runContext)) {
            setGenerationStatus("error", docxErr?.message || t.docxBlockFailure, runContext);
            markGenerationProgressError(runContext);
          }
          return;
        }
        const fallback = createLocalFallbackLesson(fallbackInput, buildEnrichmentRunContext(runContext));
        if (!isActiveGenerationRun(runContext)) return;
        setTeacherLesson({
          ...fallback,
          sourceText: fallbackInput.sourceText,
          documentAssets: {
            sourceType: documentContext.sourceType,
            fileName: documentContext.fileName,
            originalFileName: documentContext.originalFileName || "",
            convertedDocxFileName: documentContext.convertedDocxFileName || "",
            docxData: documentContext.docxData || null,
            blockTranslations: {},
            translationDebugEntries: [],
            formulaPreservation:
              "DOCX batched translation mode active; fallback lesson loaded after block translation failure.",
          },
        });
        setTeacherMeta({
          usedFallback: true,
          reason: docxErr?.message || t.docxBlockFailure,
          pipelineVersion: PIPELINE_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
          cacheVersion: CACHE_VERSION,
          totalGenerationDurationMs: Date.now() - generationStartedAt,
        });
        setGenerationStatus("error", t.docxBatchedTranslationFailed(docxErr?.message || ""), runContext);
        markGenerationProgressError(runContext);
      } finally {
        if (generationRunRef.current.id === runContext.id) {
          finishGenerationRun(runContext);
          setLoading(false);
        }
      }
      return;
    }

    try {
      assertActiveGenerationRun(runContext);
      if (typeof console !== "undefined") {
        console.info(
          `[Non-DOCX Path] sourceType=${documentContext.sourceType || "text"} using the backend AI API.`
        );
      }
      setGenerationStatus("info", t.translatingLessonContent, runContext);

      const translationBlocks = buildPlainTextTranslationBlocks(fallbackInput.sourceText);
      if (!Array.isArray(translationBlocks) || translationBlocks.length === 0) {
        throw new Error(t.noTranslationChunks);
      }
      updateGenerationProgress({
        stage: "translation",
        current: Math.min(1, translationBlocks.length),
        total: translationBlocks.length,
        percent: 10,
        label: t.translatingBatchProgress(Math.min(1, translationBlocks.length), translationBlocks.length),
      }, runContext);

      const stageAStartedAt = Date.now();
      const translationResult = await translateBlocksForDocumentWrapper(
        translationBlocks,
        true,
        runContext
      );
      if (translationResult?.meta) {
        translationResult.meta.stageATranslationDurationMs = Date.now() - stageAStartedAt;
      }
      assertActiveGenerationRun(runContext);
      updateGenerationProgress({
        stage: "translation",
        current: translationBlocks.length,
        total: translationBlocks.length,
        percent: 75,
        label: t.translatingBatchProgress(translationBlocks.length, translationBlocks.length),
      }, runContext);
      const completedTranslation = buildDocxCombinedTranslation(
        translationBlocks,
        translationResult.translationsById
      );

      setGenerationStatus("info", t.generatingTeachingSupport, runContext);
      updateGenerationProgress({
        stage: "enrichment",
        current: 1,
        total: 1,
        percent: 88,
        label: t.generatingGlossaryQuiz,
      }, runContext);
      let lessonBase;
      let lessonMeta = { usedFallback: false, reason: "" };
      try {
        const enrichmentInput = {
          ...fallbackInput,
          blockKindSummary: translationResult.meta?.debugSummary?.blockKindCounts || {},
        };
        const payload = await generateTeachingSupportWithModel(
          enrichmentInput,
          completedTranslation,
          buildEnrichmentRunContext(runContext)
        );
        assertActiveGenerationRun(runContext);
        lessonBase = normalizeLessonResult(payload, fallbackInput, completedTranslation, buildEnrichmentRunContext(runContext));
        lessonMeta = lessonBase.meta || payload.meta || lessonMeta;
      } catch (lessonErr) {
        if (isGenerationCancelledError(lessonErr)) throw lessonErr;
        lessonBase = createSafeEnrichmentFallbackLesson(fallbackInput, completedTranslation, {
          reason: lessonErr?.message || t.lessonSupportFailed,
          retryAttempted: true,
        }, buildEnrichmentRunContext(runContext));
        lessonMeta = lessonBase.meta;
      }
      const nextLesson = {
        ...lessonBase,
        sourceText: fallbackInput.sourceText,
        translation: completedTranslation || lessonBase.translation,
        documentAssets: {
          sourceType: documentContext.sourceType,
          fileName: documentContext.fileName,
          docxData: documentContext.docxData || null,
          originalFileName: documentContext.originalFileName || "",
          convertedDocxFileName: documentContext.convertedDocxFileName || "",
          blockTranslations: {},
          translationDebugEntries: Array.isArray(translationResult.meta?.debugEntries)
            ? translationResult.meta.debugEntries
            : [],
          formulaPreservation: "Formula-like blocks are kept unchanged during document translation.",
        },
      };

      let documentMessage = "";
      const documentMeta = translationResult.meta || { usedFallback: false, reason: "" };

      assertActiveGenerationRun(runContext);
      setTeacherLesson(nextLesson);
      setTeacherMeta({
        usedFallback: Boolean(lessonMeta.usedFallback || documentMeta.usedFallback),
        reason: [lessonMeta.reason, documentMeta.reason].filter(Boolean).join(" | "),
        pipelineVersion: PIPELINE_VERSION,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
        cacheVersion: CACHE_VERSION,
        translationMeta: documentMeta,
        enrichmentMeta: lessonMeta || {},
        totalGenerationDurationMs: Date.now() - generationStartedAt,
      });

      if (lessonMeta?.usedFallback || documentMeta?.usedFallback) {
        setGenerationStatus(
          "error",
          t.aiModelFallbackUsed(lessonMeta.reason || "", documentMeta.reason || ""),
          runContext
        );
        markGenerationProgressError(runContext);
      } else if (lessonMeta?.teachingSupportFallbackUsed) {
        setGenerationStatus(
          "info",
          lessonMeta?.supportSource === "local-fallback"
            ? t.teachingSupportFallbackUsed
            : t.teachingSupportPartiallyGenerated,
          runContext
        );
        updateGenerationProgress({
          stage: "done",
          current: 1,
          total: 1,
          percent: 100,
          label: t.progressComplete,
        }, runContext);
      } else {
        setGenerationStatus("info", t.aiLearningSupportGenerated(documentMessage), runContext);
        updateGenerationProgress({
          stage: "done",
          current: 1,
          total: 1,
          percent: 100,
          label: t.progressComplete,
        }, runContext);
      }
    } catch (err) {
      if (isGenerationCancelledError(err)) {
        if (generationRunRef.current.id === runContext.id) {
          setGenerationStatus("info", t.generationCancelled);
          setGenerationProgress((prev) => ({
            ...prev,
            active: true,
            stage: "cancelled",
            label: t.generationCancelled,
          }));
        }
        return;
      }
      if (isTranslationTimeoutError(err)) {
        if (isActiveGenerationRun(runContext)) {
          setGenerationStatus("error", err?.message || t.docxBlockFailure, runContext);
          markGenerationProgressError(runContext);
        }
        return;
      }
      const fallback = createLocalFallbackLesson(fallbackInput, buildEnrichmentRunContext(runContext));
      if (!isActiveGenerationRun(runContext)) return;
      setTeacherLesson({
        ...fallback,
        sourceText: fallbackInput.sourceText,
        documentAssets: {
          sourceType: documentContext.sourceType,
          fileName: documentContext.fileName,
          docxData: documentContext.docxData || null,
          originalFileName: documentContext.originalFileName || "",
          convertedDocxFileName: documentContext.convertedDocxFileName || "",
          blockTranslations: {},
          translationDebugEntries: [],
          formulaPreservation: "Formula-like blocks are kept unchanged in fallback mode.",
        },
      });
      setTeacherMeta({
        ...(fallback.meta || { usedFallback: true, reason: t.localFallbackUsedReason }),
        pipelineVersion: PIPELINE_VERSION,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
        cacheVersion: CACHE_VERSION,
        totalGenerationDurationMs: Date.now() - generationStartedAt,
      });
      setGenerationStatus("error", t.couldNotReachBackendAi(err?.message || ""), runContext);
      markGenerationProgressError(runContext);
    } finally {
      if (generationRunRef.current.id === runContext.id) {
        finishGenerationRun(runContext);
        setLoading(false);
      }
    }
  }
  function buildPackage(packageType) {
    if (!teacherLesson) return null;
    return buildLessonPackage({
      lessonTitle: teacherLesson.lessonTitle || lessonTitle,
      sourceText: teacherLesson.sourceText || sourceText,
      targetLanguage: teacherLesson.targetLanguage || targetLanguage,
      translation: teacherLesson.translation,
      glossary: teacherLesson.glossary,
      simplifiedExplanation: teacherLesson.simplifiedExplanation,
      keyConcepts: teacherLesson.keyConcepts,
      commonMisconceptions: teacherLesson.commonMisconceptions,
      teacherNotes: teacherLesson.teacherNotes,
      classroomActivities: teacherLesson.classroomActivities,
      extensionQuestions: teacherLesson.extensionQuestions,
      quizSettings: teacherLesson.quizSettings || quizSettings,
      quiz: teacherLesson.quiz,
      mode: teacherLesson.mode || mode,
      packageType,
      documentSourceType: teacherLesson.documentAssets?.sourceType || "text",
      documentFileName: teacherLesson.documentAssets?.fileName || "",
      originalFileName: teacherLesson.documentAssets?.originalFileName || "",
      convertedDocxFileName: teacherLesson.documentAssets?.convertedDocxFileName || "",
      meta: teacherMeta,
    });
  }

  function exportTeacherJson() {
    const pkg = buildPackage("teacher");
    if (!pkg) return;
    exportLessonPackageJson(pkg);
    setStatusType("info");
    setStatusMessage(t.teacherJsonExported);
  }

  function exportStudentJson() {
    const pkg = buildPackage("student");
    if (!pkg) return;
    exportLessonPackageJson(pkg);
    setStatusType("info");
    setStatusMessage(t.studentJsonExported);
  }

  async function exportDocx() {
    if (!teacherLesson) return;
    try {
      const assets = teacherLesson.documentAssets || {};
      await exportTranslatedDocx({
        lessonTitle: teacherLesson.lessonTitle || lessonTitle,
        targetLanguage: teacherLesson.targetLanguage || targetLanguage,
        docxData: assets.docxData || documentContext.docxData || null,
        translationsById: assets.blockTranslations || {},
        translationDebugEntries: assets.translationDebugEntries || [],
        fallbackTranslatedText: teacherLesson.translation || sourceText,
        glossary: teacherLesson.glossary || [],
        simplifiedExplanation: teacherLesson.simplifiedExplanation || "",
        keyConcepts: teacherLesson.keyConcepts || [],
        commonMisconceptions: teacherLesson.commonMisconceptions || [],
        teacherNotes: teacherLesson.teacherNotes || "",
        classroomActivities: teacherLesson.classroomActivities || [],
        extensionQuestions: teacherLesson.extensionQuestions || [],
        quiz: teacherLesson.quiz || [],
        quizSettings: teacherLesson.quizSettings || quizSettings,
        includeAnswerKey: Boolean((teacherLesson.quizSettings || quizSettings).includeAnswerKey),
        includeExplanations: Boolean((teacherLesson.quizSettings || quizSettings).includeExplanations),
      });
      setStatusType("info");
      setStatusMessage(t.fullLessonDocxExported);
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || t.docxExportFailed);
    }
  }

  function exportDebugReport() {
    if (!teacherLesson) return;
    const report = buildDebugReport({
      lesson: teacherLesson,
      teacherMeta,
      statusMessage,
      statusType,
      generationProgress,
    });
    const filename = `${safeDownloadName(teacherLesson.lessonTitle, "lesson")}-debug-report.json`;
    downloadJsonFile(filename, report);
    setStatusType("info");
    setStatusMessage(t.debugReportExported);
    showToast(t.debugReportExported);
  }

  async function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setImportError("");
    setImportStatus(t.importingLessonPackage);
    setShowStudentScore(false);
    setStudentAnswers({});

    try {
      const pkg = await importLessonPackageFile(file);
      setStudentLesson(pkg);
      setImportStatus(t.importedLessonPackage(pkg.lessonTitle));
    } catch (err) {
      setImportError(err?.message || t.importLessonPackageFailed);
      setImportStatus("");
    } finally {
      event.target.value = "";
    }
  }

  function loadLatestTeacherDraft() {
    const pkg = buildPackage("student");
    if (!pkg) {
      setImportError(t.noTeacherLessonAvailable);
      setImportStatus("");
      return;
    }
    setStudentLesson(pkg);
    setStudentAnswers({});
    setShowStudentScore(false);
    setImportError("");
    setImportStatus(t.loadedLatestTeacherDraft);
  }

  function handleTeacherQuizAnswer(questionKey, value) {
    setTeacherQuizAnswers((prev) => ({ ...prev, [questionKey]: value }));
  }

  function handleStudentAnswer(questionKey, value) {
    setStudentAnswers((prev) => ({ ...prev, [questionKey]: value }));
  }

  return html`
    <div className="app">
      <${Header}
        page=${page}
        onPageChange=${setHash}
        mode=${mode}
        onModeChange=${handleModeChange}
        t=${t}
        uiLanguage=${uiLanguage}
        onToggleUiLanguage=${toggleUiLanguage}
      />

      <main className="container">
        ${page === "home" &&
        html`
          <${HomePage}
            openTeacher=${() => setHash("teacher")}
            openStudent=${() => setHash("student")}
            t=${t}
          />
        `}

        ${page === "teacher" &&
        html`
          <${TeacherWorkspace}
            lessonTitle=${lessonTitle}
            setLessonTitle=${handleLessonTitleChange}
            sourceText=${sourceText}
            setSourceText=${setSourceText}
            targetLanguage=${targetLanguage}
            setTargetLanguage=${setTargetLanguage}
            quizSettings=${quizSettings}
            setQuizSettings=${setQuizSettings}
            generationMode=${mode}
            onGenerate=${handleGenerate}
            onCancelGeneration=${cancelGeneration}
            onClearTranslationCache=${handleClearTranslationCache}
            loading=${loading}
            documentLoading=${documentLoading}
            documentStatus=${documentStatus}
            documentError=${documentError}
            documentSummary=${documentSummary}
            onDocxFileSelect=${handleDocxFileSelect}
            onPdfFileSelect=${handlePdfFileSelect}
            onUseManualText=${useManualTextInput}
            lesson=${teacherLesson}
            onUpdateLesson=${setTeacherLesson}
            onExportTeacherJson=${exportTeacherJson}
            onExportStudentJson=${exportStudentJson}
            onExportDocx=${exportDocx}
            onExportDebugReport=${exportDebugReport}
            teacherQuizAnswers=${teacherQuizAnswers}
            onTeacherQuizAnswer=${handleTeacherQuizAnswer}
            statusMessage=${statusMessage}
            statusType=${statusType}
            generationProgress=${generationProgress}
            t=${t}
            uiLanguage=${uiLanguage}
          />
        `}

        ${page === "student" &&
        html`
          <${StudentWorkspace}
            studentLesson=${studentLesson}
            importStatus=${importStatus}
            importError=${importError}
            onImportFile=${handleImportFile}
            onLoadFromTeacher=${loadLatestTeacherDraft}
            onStudentAnswer=${handleStudentAnswer}
            studentAnswers=${studentAnswers}
            showStudentScore=${showStudentScore}
            onCheckQuiz=${() => setShowStudentScore(true)}
            t=${t}
            uiLanguage=${uiLanguage}
          />
        `}
      </main>

      ${toastMessage &&
      html`
        <div className="toast" role="status" aria-live="polite">
          ${toastMessage}
        </div>
      `}
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
