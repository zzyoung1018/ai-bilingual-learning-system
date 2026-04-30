// translation_orchestrator.js
// Stage A translation orchestration module
// Extracted from app.js during Phase 5B modularization

import { MODEL_API_CONFIG, postModelChat } from "./api_client.js";
import {
  buildBlockTranslationPrompt,
  buildStrictRetryInstruction,
  classifyTranslationBlock,
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

// Constants
const PIPELINE_VERSION = "phase-4a-online-api-proxy-v1";
const TRANSLATION_PROMPT_VERSION = "stage-a-block-translation-v2";
const CACHE_VERSION = "translation-cache-v3";
const TRANSLATION_CACHE_STORAGE_KEY = "aiBilingual.translationCache.v3";
const TRANSLATION_CACHE_MAX_ENTRIES = 600;
const MODEL_TRANSLATION_OPTIONS = {
  temperature: 0.3,
  top_p: 0.8,
  top_k: 20,
  min_p: 0,
};
const PLAIN_TEXT_TRANSLATION_CHUNK_MAX_CHARS = 1800;
const DOCUMENT_FATAL_FALLBACK_RATIO = 0.2;
const DOCUMENT_MIN_TRANSLATED_RATIO = 0.25;
const TRANSLATION_REQUEST_TIMEOUT_MS = 120000;

export const DOCX_TRANSLATION_BATCH_MAX_BLOCKS = 10;
export const DOCX_TRANSLATION_BATCH_MAX_CHARS = 2400;
export const DOCX_TRANSLATION_SHORT_BLOCK_MAX_CHARS = 180;
export const DOCX_TRANSLATION_SHORT_BATCH_MAX_BLOCKS = 18;
export const DOCX_TRANSLATION_LONG_BLOCK_MIN_CHARS = 1200;

// Cancellation helpers
export function createGenerationCancelledError() {
  const err = new Error("generation_cancelled");
  err.name = "GenerationCancelledError";
  return err;
}

export function isGenerationCancelledError(err) {
  return err?.name === "GenerationCancelledError" || err?.name === "AbortError";
}

function createTranslationTimeoutError(timeoutMs) {
  const err = new Error(`Translation request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
  err.name = "TranslationRequestTimeoutError";
  err.code = "translation_request_timeout";
  return err;
}

function isTranslationTimeoutError(err) {
  return err?.name === "TranslationRequestTimeoutError" || err?.code === "translation_request_timeout";
}

export function throwIfGenerationCancelled(runContext) {
  if (runContext?.signal?.aborted) {
    throw createGenerationCancelledError();
  }
}

// Translation cache management
export function readTranslationCache() {
  try {
    const raw = window.localStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

export function writeTranslationCache(cache) {
  try {
    const entries = Object.entries(cache || {});
    entries.sort((a, b) => Number(b[1]?.createdAt || 0) - Number(a[1]?.createdAt || 0));
    const trimmed = Object.fromEntries(entries.slice(0, TRANSLATION_CACHE_MAX_ENTRIES));
    window.localStorage.setItem(TRANSLATION_CACHE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (_err) {
    // localStorage may be unavailable or full. Translation still continues.
  }
}

export function clearTranslationCacheStorage() {
  try {
    window.localStorage.removeItem(TRANSLATION_CACHE_STORAGE_KEY);
  } catch (_err) {
    // Ignore localStorage failures.
  }
}

function getTranslationPreserveFlag(block, preserveFormulas, targetLanguage = "") {
  if (shouldPreserveBeforeTranslation(block, preserveFormulas, targetLanguage)) {
    return preserveFormulas ? "formula_preserved" : "formula_translatable";
  }
  const classification = classifyTranslationBlock(block?.text, targetLanguage, block);
  return shouldTranslateBlock(block, targetLanguage)
    ? `translate:${classification.blockKind}`
    : `preserve:${classification.blockKind}`;
}

export function buildTranslationCacheKey({ block, targetLanguage, preserveFormulas }) {
  const normalizedText = normalizeForComparison(block?.text);
  if (!normalizedText) return "";
  return JSON.stringify({
    cacheVersion: CACHE_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    translationPromptVersion: TRANSLATION_PROMPT_VERSION,
    model: MODEL_API_CONFIG.translationModel,
    targetLanguage,
    preserveFlag: getTranslationPreserveFlag(block, preserveFormulas, targetLanguage),
    sourceText: normalizedText,
  });
}

function isValidTranslationCacheEntry(entry) {
  return Boolean(
    entry &&
    typeof entry === "object" &&
    entry.cacheVersion === CACHE_VERSION &&
    entry.translationPromptVersion === TRANSLATION_PROMPT_VERSION &&
    entry.model === MODEL_API_CONFIG.translationModel &&
    entry.action === "translate" &&
    typeof entry.translatedText === "string" &&
    entry.translatedText.trim()
  );
}

function isCacheableTranslationResult({ block, translatedText, action, validationReasons, targetLanguage }) {
  const finalText = String(translatedText || "").trim();
  if (String(action || "").toLowerCase() === "preserve") return false;
  if (!finalText) return false;
  if (!shouldTranslateBlock(block, targetLanguage)) return false;
  if (Array.isArray(validationReasons) && validationReasons.length > 0) return false;
  if (
    targetLanguage !== "English" &&
    normalizeForComparison(block?.text) === normalizeForComparison(finalText)
  ) {
    return false;
  }
  return true;
}

// Debug entry creation and management
function createTranslationDebugEntry({
  block,
  index = 0,
  targetLanguage,
  apiAction,
  action,
  reason,
  translatedText,
  validationReasons = [],
  retryAttempted = false,
  retryFixed = false,
  preserved,
  preserveJustification = null,
  severity = "",
  blockKind = "",
  expectedAction = "",
  validationSeverity = "",
}) {
  const sourceText = String(block?.text || "");
  const classification = classifyTranslationBlock(sourceText, targetLanguage, block);
  const sameText =
    normalizeForComparison(sourceText) &&
    normalizeForComparison(sourceText) === normalizeForComparison(translatedText);
  const isPreserved =
    typeof preserved === "boolean"
      ? preserved
      : action === "preserve" || action === "fallback_preserve_source" || sameText;
  return {
    index,
    id: block?.id || `block-${index}`,
    blockId: block?.id || `block-${index}`,
    blockType: block?.blockType || "",
    sourceLocation: block?.sourceLocation || block?.id || `block-${index}`,
    targetLanguage,
    sourceText,
    apiAction,
    action,
    reason,
    validationReasons,
    needsRetry: validationReasons.length > 0,
    translatedText: String(translatedText || ""),
    textPreview: sourceText.slice(0, 140),
    frontendFlagIsFormula: Boolean(block?.isFormula),
    retryAttempted,
    retryFixed,
    preserved: isPreserved,
    preserveJustification,
    severity,
    blockKind: blockKind || classification.blockKind,
    expectedAction: expectedAction || classification.expectedAction,
    classificationConfidence: classification.confidence,
    validationSeverity:
      validationSeverity ||
      severity ||
      (validationReasons.length > 0 ? classification.validationSeverity : "accepted"),
  };
}

function buildDebugEntryIndex(entries) {
  const map = {};
  if (!Array.isArray(entries)) return map;
  entries.forEach((entry) => {
    const id = String(entry?.id || "").trim();
    if (id) map[id] = entry;
  });
  return map;
}

function addTranslationDebugCount(summary, entry) {
  summary.total += 1;
  const blockKind = entry.blockKind || "unknown";
  summary.blockKindCounts[blockKind] = (summary.blockKindCounts[blockKind] || 0) + 1;
  if (entry.action === "preserve") {
    summary.preserved += 1;
    if (entry.validationSeverity === "warning" || entry.severity === "warning") {
      summary.preserveWarningCount += 1;
    } else {
      summary.preserveAcceptedCount += 1;
    }
  } else {
    summary.translated += 1;
    if (normalizeForComparison(entry.sourceText) === normalizeForComparison(entry.translatedText)) {
      summary.unchangedAfterTranslate += 1;
    }
  }
  if (Array.isArray(entry.validationReasons) && entry.validationReasons.length > 0) {
    summary.suspicious += 1;
    if (entry.validationSeverity === "warning" || entry.severity === "warning") {
      summary.warningSuspiciousCount += 1;
    } else {
      summary.fatalSuspiciousCount += 1;
    }
  }
}

export function createEmptyDebugSummary() {
  return {
    total: 0,
    translated: 0,
    preserved: 0,
    unchangedAfterTranslate: 0,
    suspicious: 0,
    blockKindCounts: {},
    warningSuspiciousCount: 0,
    fatalSuspiciousCount: 0,
    preserveAcceptedCount: 0,
    preserveWarningCount: 0,
  };
}

export function accumulateDebugSummary(summary, addition) {
  const next = addition || {};
  summary.total += Number(next.total || 0);
  summary.translated += Number(next.translated || 0);
  summary.preserved += Number(next.preserved || 0);
  summary.unchangedAfterTranslate += Number(next.unchangedAfterTranslate || 0);
  summary.suspicious += Number(next.suspicious || 0);
  summary.warningSuspiciousCount += Number(next.warningSuspiciousCount || 0);
  summary.fatalSuspiciousCount += Number(next.fatalSuspiciousCount || 0);
  summary.preserveAcceptedCount += Number(next.preserveAcceptedCount || 0);
  summary.preserveWarningCount += Number(next.preserveWarningCount || 0);
  Object.entries(next.blockKindCounts || {}).forEach(([kind, count]) => {
    summary.blockKindCounts[kind] = (summary.blockKindCounts[kind] || 0) + Number(count || 0);
  });
  return summary;
}

export function mergeReasonList(reasons) {
  return Array.from(
    new Set(
      (Array.isArray(reasons) ? reasons : [])
        .map((reason) => String(reason || "").trim())
        .filter(Boolean)
    )
  ).join(" | ");
}

export function logDocumentTranslationDebug(label, meta, translationsById, blocks) {
  const debugEntries = Array.isArray(meta?.debugEntries) ? meta.debugEntries : [];
  const debugSummary = meta?.debugSummary || {};
  if (!debugEntries.length || typeof console === "undefined") return;

  console.groupCollapsed(
    `[${label}] total=${debugSummary.total || blocks.length}, translated=${
      debugSummary.translated ?? "?"
    }, preserved=${debugSummary.preserved ?? "?"}, unchanged=${
      debugSummary.unchangedAfterTranslate ?? "?"
    }, suspicious=${debugSummary.suspicious ?? 0}`
  );
  console.table(
    debugEntries.map((entry) => ({
      index: entry.index,
      id: entry.id,
      blockType: entry.blockType || "",
      sourceLocation: entry.sourceLocation || "",
      sourceText: String(entry.sourceText || entry.textPreview || "").slice(0, 120),
      blockKind: entry.blockKind || "",
      expectedAction: entry.expectedAction || "",
      validationSeverity: entry.validationSeverity || entry.severity || "",
      apiAction: entry.apiAction || "",
      action: entry.action,
      reason: entry.reason,
      validationReasons: Array.isArray(entry.validationReasons)
        ? entry.validationReasons.join(", ")
        : "",
      frontendFlagIsFormula: entry.frontendFlagIsFormula,
      translatedText: String(
        entry.translatedText || translationsById?.[entry.id] || ""
      ).slice(0, 120),
    }))
  );
  console.groupEnd();
}

function normalizeDebugEntries(meta, batchItems, translationsById = {}) {
  const rawEntries = Array.isArray(meta?.debugEntries) ? meta.debugEntries : [];
  const batchItemsById = new Map(
    batchItems.map((item, localIndex) => [String(item?.block?.id || localIndex), { item, localIndex }])
  );

  return rawEntries.map((entry, localIndex) => {
    const entryId = String(entry?.id || "");
    const matched = batchItemsById.get(entryId) || { item: batchItems[localIndex], localIndex };
    const block = matched?.item?.block || {};
    const originalIndex = Number.isInteger(matched?.item?.originalIndex)
      ? matched.item.originalIndex
      : localIndex;

    return {
      ...entry,
      index: originalIndex,
      batchIndex: entry?.batchIndex,
      id: entry?.id || block.id || `block-${originalIndex}`,
      blockType: entry?.blockType || block.blockType || "",
      sourceLocation: entry?.sourceLocation || block.sourceLocation || block.id || "",
      sourceText: entry?.sourceText || block.text || "",
      textPreview: entry?.textPreview || String(block.text || "").slice(0, 140),
      translatedText:
        entry?.translatedText ||
        String(translationsById?.[block.id] || block.text || "").trim(),
    };
  });
}

function createSingleBlockFallbackDebugEntry(item, reason, targetLanguage = "") {
  const block = item?.block || {};
  const originalIndex = Number.isInteger(item?.originalIndex) ? item.originalIndex : 0;
  const sourceText = String(block.text || "");
  const classification = classifyTranslationBlock(sourceText, targetLanguage, block);
  return {
    index: originalIndex,
    batchIndex: item?.batchIndex,
    id: block.id || `block-${originalIndex}`,
    blockId: block.id || `block-${originalIndex}`,
    blockType: block.blockType || "",
    sourceLocation: block.sourceLocation || block.id || `block-${originalIndex}`,
    targetLanguage,
    sourceText,
    apiAction: "error",
    action: "fallback_preserve_source",
    reason: reason || "single_block_retry_failed",
    validationReasons: [reason || "single_block_retry_failed"],
    retryAttempted: true,
    retryFixed: false,
    preserved: true,
    severity: "fatal",
    validationSeverity: "fatal",
    blockKind: classification.blockKind,
    expectedAction: classification.expectedAction,
    classificationConfidence: classification.confidence,
    preserveJustification: classification.preserveJustification || null,
    translatedText: sourceText,
    textPreview: sourceText.slice(0, 140),
    frontendFlagIsFormula: Boolean(block.isFormula),
  };
}

// Translation options and estimation
function estimateTranslationNumPredict(blocks) {
  const inputChars = (Array.isArray(blocks) ? blocks : []).reduce(
    (sum, block) => sum + String(block?.text || "").length,
    0
  );
  return Math.min(4096, Math.max(1024, Math.ceil(inputChars * 1.8)));
}

function buildTranslationOptions(blocks, overrides = {}) {
  return {
    ...MODEL_TRANSLATION_OPTIONS,
    num_predict: estimateTranslationNumPredict(blocks),
    ...overrides,
  };
}

// Model communication helpers
function stripModelThinking(content) {
  return String(content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function extractJsonPayload(content, uiText) {
  let text = stripModelThinking(content);
  if (!text) {
    throw new Error(uiText.aiEmptyResponse);
  }

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  try {
    return JSON.parse(text);
  } catch (_err) {
    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");
    const objectCandidate =
      objectStart >= 0 && objectEnd > objectStart ? text.slice(objectStart, objectEnd + 1) : "";
    const arrayCandidate =
      arrayStart >= 0 && arrayEnd > arrayStart ? text.slice(arrayStart, arrayEnd + 1) : "";
    const candidate =
      objectCandidate &&
      (!arrayCandidate || objectStart < arrayStart)
        ? objectCandidate
        : arrayCandidate;

    if (!candidate) {
      throw new Error(uiText.aiNoJson);
    }
    return JSON.parse(candidate);
  }
}

async function callModelChat(messages, { stage, options, format, signal, timeoutMs = TRANSLATION_REQUEST_TIMEOUT_MS }, uiText) {
  throwIfGenerationCancelled({ signal });
  const requestBody = {
    stage,
    messages,
    format: format === "json" ? "json" : "text",
    options,
  };
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromParent = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      globalThis.clearTimeout(timeoutId);
      throw createGenerationCancelledError();
    }
    signal.addEventListener("abort", abortFromParent, { once: true });
  }
  let response;
  try {
    response = await postModelChat(requestBody, { signal: controller.signal });
  } catch (err) {
    if (timedOut) {
      throw createTranslationTimeoutError(timeoutMs);
    }
    if (isGenerationCancelledError(err)) {
      throw createGenerationCancelledError();
    }
    throw new Error(uiText.aiConnectionFailed(err?.message || ""));
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", abortFromParent);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(uiText.aiHttpError(response.status, body.slice(0, 400) || response.statusText));
  }

  const data = await response.json().catch(() => {
    throw new Error(uiText.aiInvalidJson);
  });
  const content = data?.content;
  if (typeof content !== "string") {
    throw new Error(uiText.aiNoContent);
  }
  return content;
}

// Translation prompt building
function buildBlockTranslationMessages({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas,
  strictRetry = false,
}) {
  const languageConfig = getTargetLanguageConfig(targetLanguage);
  const languageInstruction = strictRetry
    ? languageConfig.retryPrompt
    : languageConfig.prompt;
  const strictRetryInstruction = strictRetry
    ? buildStrictRetryInstruction(blocks, targetLanguage)
    : "";
  return [
    {
      role: "system",
      content:
        "You are a faithful translation engine. Return ONLY strict JSON. " +
        "Do not include markdown, comments, or explanatory text outside JSON. " +
        'Return exactly this schema: {"translations":[{"id":"same id from input","action":"translate or preserve","reason":"short reason","translatedText":"translated text, or original text when preserved"}]}. ' +
        "This is translation only. Do not summarize, omit content, add glossary terms, add explanations, or create quiz content. " +
        `${languageInstruction} ` +
        "Translate normal natural-language content, including headings, paragraphs, list items, and table cell prose. " +
        "For blockKind mixed_label_identifier, translate only human-readable labels and preserve emails, phone numbers, URLs, IDs, and names exactly. " +
        "For blockKind table_header_or_short_label or translatable_heading, translate ordinary English words while preserving acronyms such as AI, GPT, GPA, and IELTS when appropriate. " +
        "For blockKind formula_with_explanation, translate explanatory prose and preserve formulas, variables, mathematical notation, units, and symbols. " +
        "For blockKind list_item or worksheet_or_question, translate the content while preserving numbering, option labels, formulas, variables, and symbols. " +
        "Preserve only pure URLs, emails, file paths, obvious identifiers, course codes, pure formulas/equations, symbolic expressions, and non-language tokens. " +
        "Do not preserve text only because it is bold, large, in a heading, in a list, in a table, or specially formatted. " +
        (strictRetry
          ? `This is a strict retry for one incomplete block: return the exact same id. ${strictRetryInstruction} `
          : "") +
        "Return one translation item for every input block, in the same order.",
    },
    {
      role: "user",
      content:
        `Target language: ${targetLanguage}\n` +
        `Language instruction: ${languageInstruction}\n` +
        `Mode: ${mode}\n` +
        `Preserve formulas: ${Boolean(preserveFormulas)}\n\n` +
        `Blocks:\n${JSON.stringify(
          blocks.map((block) => ({
            ...(() => {
              const classification = classifyTranslationBlock(block.text, targetLanguage, block);
              return {
                id: block.id,
                text: block.text,
                isFormula: Boolean(block.isFormula),
                blockKind: classification.blockKind,
                expectedAction: classification.expectedAction,
                typedInstruction: buildBlockTranslationPrompt(block, targetLanguage, classification),
                blockType: block.blockType || "",
                sourceLocation: block.sourceLocation || block.id || "",
              };
            })(),
          })),
          null,
          2
        )}`,
    },
  ];
}

// Translation work plan and result merging
function buildTranslationWorkPlan({ blocks, targetLanguage, preserveFormulas, cache }) {
  const translationsById = {};
  const debugEntries = [];
  const debugSummary = createEmptyDebugSummary();
  const groups = [];
  const groupsByKey = new Map();
  const retryableIds = new Set();
  let cacheHits = 0;
  let dedupeReused = 0;
  let locallyPreserved = 0;

  blocks.forEach((block, index) => {
    const sourceText = String(block?.text || "");
    const normalizedText = normalizeForComparison(sourceText);
    const classification = classifyTranslationBlock(sourceText, targetLanguage, block);
    const forcePreserve = shouldPreserveBeforeTranslation(block, preserveFormulas, targetLanguage);
    const preserveJustification =
      classification.preserveJustification ||
      getContactOrIdentifierJustification(sourceText) ||
      (forcePreserve ? "formula_or_equation" : isMostlyNonTranslatableText(sourceText) ? "non_language" : "");
    const localPreserve = !normalizedText || forcePreserve || !shouldTranslateBlock(block, targetLanguage);

    if (localPreserve) {
      const preserveValidationSeverity = !normalizedText
        ? "accepted"
        : classification.validationSeverity || "accepted";
      const preserveReason = !normalizedText
        ? "empty_block"
        : forcePreserve
        ? isOrdinaryProse(sourceText)
          ? "preserve_overridden_ordinary_prose"
          : "frontend_formula_preserve"
        : "frontend_identifier_preserve";
      const entry = createTranslationDebugEntry({
        block,
        index,
        targetLanguage,
        apiAction: !normalizedText ? "frontend_empty" : "frontend_preserve",
        action: "preserve",
        reason: preserveReason,
        translatedText: sourceText,
        preserveJustification: forcePreserve
          ? {
              formulaFlagFromDocument: Boolean(block?.isFormula),
              formulaOrCodeLike: isLikelyFormulaOrCodeBlock(sourceText),
              ordinaryProse: isOrdinaryProse(sourceText),
              charCount: sourceText.length,
            }
          : preserveJustification || null,
        severity: preserveValidationSeverity === "warning" ? "warning" : "",
        blockKind: classification.blockKind,
        expectedAction: classification.expectedAction,
        validationSeverity: preserveValidationSeverity,
      });
      translationsById[block.id] = sourceText;
      debugEntries.push(entry);
      addTranslationDebugCount(debugSummary, entry);
      locallyPreserved += 1;
      return;
    }

    const cacheKey = buildTranslationCacheKey({ block, targetLanguage, preserveFormulas });
    const cached = cacheKey ? cache?.[cacheKey] : null;
    if (isValidTranslationCacheEntry(cached)) {
      const translatedText = String(cached.translatedText || "").trim();
      const validationReasons = validateTranslatedBlock({
        block,
        translatedText,
        action: "translate",
        targetLanguage,
      });
      if (validationReasons.length === 0) {
        const entry = createTranslationDebugEntry({
          block,
          index,
          targetLanguage,
          apiAction: "cache",
          action: "translate",
          reason: "translation_cache_hit",
          translatedText,
        });
        translationsById[block.id] = translatedText;
        debugEntries.push(entry);
        addTranslationDebugCount(debugSummary, entry);
        cacheHits += 1;
        return;
      }
    }

    let group = groupsByKey.get(cacheKey);
    if (!group) {
      group = {
        cacheKey,
        primaryBlock: block,
        primaryIndex: index,
        members: [],
      };
      groupsByKey.set(cacheKey, group);
      groups.push(group);
    } else {
      dedupeReused += 1;
    }
    group.members.push({ block, index });
    retryableIds.add(String(block.id || ""));
  });

  return {
    translationsById,
    debugEntries,
    debugSummary,
    groups,
    uniqueBlocks: groups.map((group) => group.primaryBlock),
    retryableIds,
    cacheHits,
    dedupeReused,
    locallyPreserved,
  };
}

function mergeTranslationWorkResult({
  plan,
  apiResult,
  targetLanguage,
  cache,
  cacheChangedRef,
}) {
  const translationsById = { ...plan.translationsById };
  const debugEntries = [...plan.debugEntries];
  const debugSummary = createEmptyDebugSummary();
  accumulateDebugSummary(debugSummary, plan.debugSummary);
  const suspiciousBlocks = [];
  const apiDebugById = buildDebugEntryIndex(apiResult.meta?.debugEntries);

  plan.groups.forEach((group) => {
    const primaryBlock = group.primaryBlock;
    const primaryEntry = apiDebugById[primaryBlock.id] || {};
    const translatedText = String(
      apiResult.translationsById?.[primaryBlock.id] || primaryBlock.text || ""
    ).trim();
    const action = String(primaryEntry.action || "translate").trim().toLowerCase();
    const reason = String(primaryEntry.reason || "online_api");

    group.members.forEach((member) => {
      const classification = classifyTranslationBlock(member.block?.text, targetLanguage, member.block);
      const validationReasons = validateTranslatedBlock({
        block: member.block,
        translatedText,
        action,
        targetLanguage,
      });
      if (Array.isArray(primaryEntry.validationReasons)) {
        primaryEntry.validationReasons.forEach((item) => {
          if (!validationReasons.includes(item)) validationReasons.push(item);
        });
      }
      const severity = getValidationSeverity({
        block: member.block,
        translatedText,
        targetLanguage,
        validationReasons,
      });
      if (validationReasons.length > 0) {
        suspiciousBlocks.push({
          id: member.block.id,
          index: member.index,
          reasons: validationReasons,
          severity,
          validationSeverity: severity || "accepted",
          blockKind: classification.blockKind,
          expectedAction: classification.expectedAction,
          classificationConfidence: classification.confidence,
          preserveJustification: classification.preserveJustification || "",
        });
      }

      const isPrimary = member.block.id === primaryBlock.id;
      const entry = createTranslationDebugEntry({
        block: member.block,
        index: member.index,
        targetLanguage,
        apiAction: isPrimary ? "online_api" : "dedupe_reuse",
        action,
        reason: isPrimary ? reason : `dedupe_reuse:${reason}`,
        translatedText,
        validationReasons,
        severity,
        validationSeverity: severity || "accepted",
        blockKind: classification.blockKind,
        expectedAction: classification.expectedAction,
        preserveJustification:
          severity === "warning"
            ? classification.preserveJustification || null
            : null,
      });
      translationsById[member.block.id] = translatedText || member.block.text;
      debugEntries.push(entry);
      addTranslationDebugCount(debugSummary, entry);
    });

    if (
      group.cacheKey &&
      isCacheableTranslationResult({
        block: primaryBlock,
        translatedText,
        action,
        validationReasons: primaryEntry.validationReasons || [],
        targetLanguage,
      })
    ) {
      cache[group.cacheKey] = {
        cacheVersion: CACHE_VERSION,
        pipelineVersion: PIPELINE_VERSION,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        model: MODEL_API_CONFIG.translationModel,
        targetLanguage,
        action: "translate",
        reason,
        translatedText,
        createdAt: Date.now(),
      };
      cacheChangedRef.changed = true;
    }
  });

  return {
    translationsById,
    meta: {
      usedFallback: false,
      reason: "",
      provider: MODEL_API_CONFIG.provider,
      model: MODEL_API_CONFIG.translationModel,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      responseItemCount: apiResult.meta?.responseItemCount || 0,
      expectedItemCount: plan.uniqueBlocks.length,
      returnedIds: apiResult.meta?.returnedIds || [],
      missingIds: apiResult.meta?.missingIds || [],
      itemCountMismatch: Boolean(apiResult.meta?.itemCountMismatch),
      suspiciousBlocks,
      debugSummary,
      debugEntries,
      cacheSummary: {
        hits: plan.cacheHits,
        dedupeReused: plan.dedupeReused,
        locallyPreserved: plan.locallyPreserved,
        uniqueRequested: plan.uniqueBlocks.length,
      },
    },
  };
}

// Failure threshold calculation
export function getTranslationFailureThresholdInfo(blocks, meta = {}) {
  const sourceBlocks = Array.isArray(blocks) ? blocks : [];
  const translatableCount = sourceBlocks.filter((block) => shouldTranslateBlock(block, meta.targetLanguage || "")).length;
  const retrySummary = meta.retrySummary || {};
  const debugSummary = meta.debugSummary || {};
  const unresolved = Array.isArray(meta.suspiciousBlocks) ? meta.suspiciousBlocks : [];
  const fatalFromUnresolved = unresolved.filter(
    (item) => item?.validationSeverity === "fatal" || item?.severity === "fatal"
  ).length;
  const fatalFailures =
    unresolved.length > 0 ? fatalFromUnresolved : Number(retrySummary.preservedAfterRetry || 0);
  const translatedCount = Number(debugSummary.translated || 0);
  const fatalRatio = translatableCount > 0 ? fatalFailures / translatableCount : 0;
  const translatedRatio = translatableCount > 0 ? translatedCount / translatableCount : 1;
  const triggered =
    translatableCount > 0 &&
    fatalFailures > 0 &&
    (fatalRatio > DOCUMENT_FATAL_FALLBACK_RATIO || translatedRatio < DOCUMENT_MIN_TRANSLATED_RATIO);

  return {
    triggered,
    fatalFailures,
    translatableCount,
    translatedCount,
    fatalRatio,
    translatedRatio,
    fatalRatioThreshold: DOCUMENT_FATAL_FALLBACK_RATIO,
    minTranslatedRatio: DOCUMENT_MIN_TRANSLATED_RATIO,
  };
}

// Core translation with model
async function translateBlocksWithModel({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas,
  strictRetry = false,
  signal,
  uiText,
}) {
  throwIfGenerationCancelled({ signal });
  const messages = buildBlockTranslationMessages({
    blocks,
    targetLanguage,
    mode,
    preserveFormulas,
    strictRetry,
  });
  const content = await callModelChat(messages, {
    stage: "translation",
    options: buildTranslationOptions(blocks, strictRetry ? { temperature: 0.2 } : {}),
    format: "json",
    signal,
  }, uiText);
  throwIfGenerationCancelled({ signal });
  const parsed = extractJsonPayload(content, uiText);
  const list = Array.isArray(parsed?.translations) ? parsed.translations : [];

  if (list.length === 0) {
    throw new Error(uiText.aiNoJson);
  }

  const byId = new Map(
    list
      .filter((item) => item && typeof item === "object")
      .map((item) => [String(item.id || ""), item])
  );
  const translationsById = {};
  const debugEntries = [];
  const debugSummary = createEmptyDebugSummary();
  const suspiciousBlocks = [];
  const expectedIds = new Set(blocks.map((block) => String(block.id || "")));
  const returnedIds = new Set(list.map((item) => String(item?.id || "")));
  const responseItemCount = list.length;

  blocks.forEach((block, index) => {
    const blockId = String(block.id || "");
    const raw = byId.get(blockId);
    const idMatched = Boolean(raw);

    const sourceText = String(block.text || "");
    const classification = classifyTranslationBlock(sourceText, targetLanguage, block);
    const forcePreserve = shouldPreserveBeforeTranslation(block, preserveFormulas, targetLanguage);
    const action = !raw
      ? "preserve"
      : forcePreserve
      ? "preserve"
      : String(raw.action || "translate").trim().toLowerCase();
    const translatedText = String(
      raw?.translatedText ?? raw?.translated_text ?? raw?.translation ?? ""
    ).trim();
    const finalText =
      action === "preserve" || forcePreserve ? sourceText : translatedText || sourceText;

    if (raw && action !== "preserve" && !translatedText) {
      throw new Error(uiText.aiEmptyResponse);
    }

    const validationReasons = validateTranslatedBlock({
      block,
      translatedText: finalText,
      action,
      targetLanguage,
    });
    if (!idMatched) {
      if (shouldTranslateBlock(block, targetLanguage)) {
        validationReasons.push("missing_translation_item");
      }
    } else if (String(raw.id || "") !== blockId) {
      validationReasons.push("missing_or_mismatched_id");
    }
    const severity = getValidationSeverity({
      block,
      translatedText: finalText,
      targetLanguage,
      validationReasons,
    });
    if (validationReasons.length > 0) {
      suspiciousBlocks.push({
        id: block.id,
        index,
        reasons: validationReasons,
        severity,
        validationSeverity: severity || "accepted",
        blockKind: classification.blockKind,
        expectedAction: classification.expectedAction,
        classificationConfidence: classification.confidence,
        preserveJustification: classification.preserveJustification || "",
      });
    }

    translationsById[block.id] = finalText;
    const debugEntry = {
      index,
      id: block.id,
      blockType: block.blockType || "",
      sourceLocation: block.sourceLocation || block.id || "",
      targetLanguage,
      sourceText,
      apiAction: "online_api",
      action: forcePreserve ? "preserve" : action,
      reason: forcePreserve
        ? "frontend_formula_preserve"
        : raw
        ? String(raw.reason || "online_api")
        : "missing_translation_item",
      validationReasons,
      needsRetry: validationReasons.length > 0,
      translatedText: finalText,
      textPreview: sourceText.slice(0, 140),
      frontendFlagIsFormula: Boolean(block.isFormula),
      severity,
      validationSeverity: severity || "accepted",
      blockKind: classification.blockKind,
      expectedAction: classification.expectedAction,
      preserveJustification:
        severity === "warning"
          ? classification.preserveJustification || null
          : null,
    };
    debugEntries.push(debugEntry);
    addTranslationDebugCount(debugSummary, debugEntry);
  });

  return {
    translationsById,
    meta: {
      usedFallback: false,
      reason: "",
      provider: MODEL_API_CONFIG.provider,
      model: MODEL_API_CONFIG.translationModel,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      responseItemCount,
      expectedItemCount: blocks.length,
      returnedIds: Array.from(returnedIds),
      missingIds: Array.from(expectedIds).filter((id) => id && !returnedIds.has(id)),
      itemCountMismatch: responseItemCount !== blocks.length || returnedIds.size !== expectedIds.size,
      suspiciousBlocks,
      debugSummary,
      debugEntries,
    },
  };
}

// DOCX translation helpers
export function buildDocxCombinedTranslation(blocks, translationsById) {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return blocks
    .map((block) => String(translationsById?.[block.id] || block.text || "").trim())
    .join("\n")
    .trim();
}

function buildTranslateBlocksRequestPayload({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas,
}) {
  return {
    targetLanguage,
    mode,
    preserveFormulas,
    blocks: blocks.map((block) => ({
      id: block.id,
      text: block.text,
      isFormula: Boolean(block.isFormula),
      blockType: block.blockType || "",
      sourceLocation: block.sourceLocation || block.id || "",
      styleMetadata: block.styleMetadata || {},
    })),
  };
}

export function createDocxTranslationBatches(
  blocks,
  maxBlocks = DOCX_TRANSLATION_BATCH_MAX_BLOCKS,
  maxChars = DOCX_TRANSLATION_BATCH_MAX_CHARS
) {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  const indexedBlocks = blocks.map((block, originalIndex) => ({
    block,
    originalIndex,
    charCount: String(block?.text || "").length,
  }));

  const batches = [];
  let currentItems = [];
  let currentChars = 0;

  function currentBatchBlockLimit(nextItem) {
    const combined = [...currentItems, nextItem];
    const allShort = combined.every(
      (item) => item.charCount <= DOCX_TRANSLATION_SHORT_BLOCK_MAX_CHARS
    );
    const hasLong = combined.some(
      (item) => item.charCount >= DOCX_TRANSLATION_LONG_BLOCK_MIN_CHARS
    );
    if (hasLong) return Math.min(2, maxBlocks);
    return allShort ? DOCX_TRANSLATION_SHORT_BATCH_MAX_BLOCKS : maxBlocks;
  }

  function flushCurrent() {
    if (currentItems.length === 0) return;
    batches.push({
      items: currentItems,
      blockCount: currentItems.length,
      charCount: currentChars,
    });
    currentItems = [];
    currentChars = 0;
  }

  indexedBlocks.forEach((item) => {
    if (item.charCount >= maxChars) {
      flushCurrent();
      batches.push({
        items: [item],
        blockCount: 1,
        charCount: item.charCount,
      });
      return;
    }

    const nextCount = currentItems.length + 1;
    const nextChars = currentChars + item.charCount;
    const dynamicMaxBlocks = currentBatchBlockLimit(item);
    const wouldOverflow =
      currentItems.length > 0 &&
      (nextCount > dynamicMaxBlocks ||
        nextChars > maxChars ||
        item.charCount >= DOCX_TRANSLATION_LONG_BLOCK_MIN_CHARS);

    if (wouldOverflow) {
      flushCurrent();
    }

    currentItems.push(item);
    currentChars += item.charCount;
  });

  flushCurrent();

  return batches;
}

// Main document translation orchestration
// This is the core Stage A translation function that orchestrates:
// - cache lookup and deduplication
// - API translation calls
// - validation and retry logic
// - fallback threshold checking
export async function translateBlocksForDocument({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas = true,
  runContext = null,
  uiText,
  progressCallbacks = {},
}) {
  const { assertActiveRun, setStatus, updateProgress } = progressCallbacks;

  if (assertActiveRun) assertActiveRun(runContext);
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { translationsById: {}, meta: { usedFallback: false, reason: "" } };
  }

  const requestPayload = buildTranslateBlocksRequestPayload({
    blocks,
    targetLanguage,
    mode,
    preserveFormulas,
  });
  const cache = readTranslationCache();
  const cacheChangedRef = { changed: false };
  const plan = buildTranslationWorkPlan({
    blocks: requestPayload.blocks,
    targetLanguage,
    preserveFormulas,
    cache,
  });

  if (plan.cacheHits > 0 && setStatus && updateProgress) {
    setStatus("info", uiText.usingCachedTranslations(plan.cacheHits, blocks.length), runContext);
    updateProgress({
      stage: "translation",
      current: plan.cacheHits,
      total: blocks.length,
      percent: Math.min(70, Math.max(10, (plan.cacheHits / blocks.length) * 70)),
      label: uiText.usingCachedTranslations(plan.cacheHits, blocks.length),
    }, runContext);
  }

  if (plan.uniqueBlocks.length > 0 && plan.uniqueBlocks.length < blocks.length && setStatus && updateProgress) {
    setStatus(
      "info",
      uiText.translatingUniqueBlocks(plan.uniqueBlocks.length, blocks.length),
      runContext
    );
    updateProgress({
      stage: "translation",
      current: plan.uniqueBlocks.length,
      total: blocks.length,
      percent: Math.min(72, Math.max(12, ((blocks.length - plan.cacheHits) / blocks.length) * 60)),
      label: uiText.translatingUniqueBlocks(plan.uniqueBlocks.length, blocks.length),
    }, runContext);
  }

  let result;
  let forceRetryAll = false;

  if (plan.uniqueBlocks.length === 0) {
    result = {
      translationsById: { ...plan.translationsById },
      meta: {
        usedFallback: false,
        reason: "",
        provider: "cache",
        model: MODEL_API_CONFIG.translationModel,
        pipelineVersion: PIPELINE_VERSION,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        debugSummary: plan.debugSummary,
        debugEntries: plan.debugEntries,
        suspiciousBlocks: [],
        cacheSummary: {
          hits: plan.cacheHits,
          dedupeReused: plan.dedupeReused,
          locallyPreserved: plan.locallyPreserved,
          uniqueRequested: 0,
        },
      },
    };
  } else {
    try {
      if (assertActiveRun) assertActiveRun(runContext);
      const apiResult = await translateBlocksWithModel({
        ...requestPayload,
        blocks: plan.uniqueBlocks,
        signal: runContext?.signal,
        uiText,
      });
      if (assertActiveRun) assertActiveRun(runContext);
      result = mergeTranslationWorkResult({
        plan,
        apiResult,
        targetLanguage,
        cache,
        cacheChangedRef,
      });
    } catch (initialErr) {
      if (isGenerationCancelledError(initialErr)) throw initialErr;
      if (isTranslationTimeoutError(initialErr)) throw initialErr;
      forceRetryAll = true;
      result = {
        translationsById: { ...plan.translationsById },
        meta: {
          usedFallback: false,
          reason: `batch_translation_failed:${initialErr?.message || uiText.unknownBatchError}`,
          provider: MODEL_API_CONFIG.provider,
          model: MODEL_API_CONFIG.translationModel,
          pipelineVersion: PIPELINE_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          debugSummary: plan.debugSummary,
          debugEntries: [...plan.debugEntries],
          suspiciousBlocks: [],
          cacheSummary: {
            hits: plan.cacheHits,
            dedupeReused: plan.dedupeReused,
            locallyPreserved: plan.locallyPreserved,
            uniqueRequested: plan.uniqueBlocks.length,
          },
        },
      };
    }
  }

  const retryIds = new Set(
    (Array.isArray(result.meta?.suspiciousBlocks) ? result.meta.suspiciousBlocks : [])
      .filter(
        (item) =>
          item?.severity !== "warning" ||
          (item?.expectedAction && item.expectedAction !== "preserve")
      )
      .map((item) => String(item.id || ""))
      .filter(Boolean)
  );
  if (forceRetryAll || result.meta?.itemCountMismatch) {
    plan.retryableIds.forEach((id) => retryIds.add(id));
  }

  if (retryIds.size > 0) {
    if (setStatus && updateProgress) {
      setStatus("info", uiText.retryingIncompleteBlocks(retryIds.size), runContext);
      updateProgress({
        stage: "retry",
        current: 0,
        total: retryIds.size,
        percent: 75,
        label: uiText.retryingIncompleteBlocksProgress,
      }, runContext);
    }
    result.meta.reason = mergeReasonList([
      result.meta.reason,
      result.meta.itemCountMismatch ? "translation_item_count_mismatch" : "",
      "strict_retry_for_incomplete_blocks",
    ]);
    result.meta.retrySummary = {
      attempted: retryIds.size,
      fixed: 0,
      preservedAfterRetry: 0,
    };
    const unresolvedSuspiciousBlocks = [];
    let retryIndex = 0;

    for (const block of blocks) {
      if (assertActiveRun) assertActiveRun(runContext);
      if (!retryIds.has(String(block.id || ""))) continue;
      retryIndex += 1;
      if (updateProgress) {
        updateProgress({
          stage: "retry",
          current: retryIndex,
          total: retryIds.size,
          percent: 75 + (retryIndex / retryIds.size) * 10,
          label: uiText.retryingIncompleteBlocksProgress,
        }, runContext);
      }
      try {
        const retryResult = await translateBlocksWithModel({
          ...requestPayload,
          blocks: [block],
          strictRetry: true,
          signal: runContext?.signal,
          uiText,
        });
        if (assertActiveRun) assertActiveRun(runContext);
        if (
          Array.isArray(retryResult.meta?.suspiciousBlocks) &&
          retryResult.meta.suspiciousBlocks.length > 0
        ) {
          const fatalRetryIssues = retryResult.meta.suspiciousBlocks.filter(
            (item) => item?.severity !== "warning"
          );
          if (fatalRetryIssues.length === 0) {
            console.warn(
              "[Translation retry] Warning-level issue accepted after retry",
              retryResult.meta.suspiciousBlocks
            );
          } else {
            throw new Error(
              fatalRetryIssues
                .map((item) => `${item.id}: ${item.reasons.join(",")}`)
                .join(" | ")
            );
          }
        }

        result.translationsById[block.id] =
          retryResult.translationsById?.[block.id] || result.translationsById[block.id];
        result.meta.retrySummary.fixed += 1;
        const retryEntry = Array.isArray(retryResult.meta?.debugEntries)
          ? retryResult.meta.debugEntries[0]
          : null;
        if (
          retryEntry &&
          isCacheableTranslationResult({
            block,
            translatedText: result.translationsById[block.id],
            action: retryEntry.action,
            validationReasons: retryEntry.validationReasons || [],
            targetLanguage,
          })
        ) {
          const cacheKey = buildTranslationCacheKey({ block, targetLanguage, preserveFormulas });
          if (cacheKey) {
            cache[cacheKey] = {
              cacheVersion: CACHE_VERSION,
              pipelineVersion: PIPELINE_VERSION,
              translationPromptVersion: TRANSLATION_PROMPT_VERSION,
              model: MODEL_API_CONFIG.translationModel,
              targetLanguage,
              action: "translate",
              reason: retryEntry.reason || "online_api_strict_retry",
              translatedText: result.translationsById[block.id],
              createdAt: Date.now(),
            };
            cacheChangedRef.changed = true;
          }
        }
        if (forceRetryAll) {
          accumulateDebugSummary(result.meta.debugSummary, retryResult.meta?.debugSummary);
        }
        const retryEntries = Array.isArray(retryResult.meta?.debugEntries)
          ? retryResult.meta.debugEntries
          : [];
        result.meta.debugEntries.push(
          ...retryEntries.map((entry) => ({
            ...entry,
            apiAction: "online_api_strict_retry",
            reason: `strict_retry_success: ${entry.reason || "online_api"}`,
            retryAttempted: true,
            retryFixed: true,
            preserved: false,
          }))
        );
      } catch (retryErr) {
        if (isGenerationCancelledError(retryErr)) throw retryErr;
        if (isTranslationTimeoutError(retryErr)) throw retryErr;
        const classification = classifyTranslationBlock(block.text, targetLanguage, block);
        result.translationsById[block.id] = block.text;
        result.meta.retrySummary.preservedAfterRetry += 1;
        unresolvedSuspiciousBlocks.push({
          id: block.id,
          reasons: [retryErr?.message || "strict_retry_failed"],
          severity: classification.validationSeverity || "fatal",
          validationSeverity: classification.validationSeverity || "fatal",
          blockKind: classification.blockKind,
          expectedAction: classification.expectedAction,
          classificationConfidence: classification.confidence,
          preserveJustification: classification.preserveJustification || "",
        });
        result.meta.reason = mergeReasonList([
          result.meta.reason,
          `strict_retry_failed:${block.id}:${retryErr?.message || uiText.unknownBlockError}`,
        ]);
        const fallbackEntry = createSingleBlockFallbackDebugEntry(
          { block, originalIndex: blocks.indexOf(block) },
          retryErr?.message || "strict_retry_failed",
          targetLanguage
        );
        result.meta.debugEntries.push(fallbackEntry);
        if (forceRetryAll) {
          result.meta.debugSummary.total += 1;
        }
        result.meta.debugSummary.blockKindCounts[fallbackEntry.blockKind] =
          (result.meta.debugSummary.blockKindCounts[fallbackEntry.blockKind] || 0) + 1;
        result.meta.debugSummary.preserved += 1;
        if (fallbackEntry.validationSeverity === "warning") {
          result.meta.debugSummary.warningSuspiciousCount += 1;
          result.meta.debugSummary.preserveWarningCount += 1;
        } else {
          result.meta.debugSummary.fatalSuspiciousCount += 1;
          result.meta.debugSummary.preserveWarningCount += 1;
        }
        result.meta.debugSummary.unchangedAfterTranslate += 1;
        result.meta.debugSummary.suspicious += 1;
      }
    }
    result.meta.suspiciousBlocks = unresolvedSuspiciousBlocks;
    const thresholdInfo = getTranslationFailureThresholdInfo(blocks, {
      ...result.meta,
      targetLanguage,
    });
    result.meta.documentFallbackThreshold = thresholdInfo;
    result.meta.documentFallbackThresholdTriggered = thresholdInfo.triggered;
    result.meta.partialTranslationWarning =
      Number(result.meta.retrySummary.preservedAfterRetry || 0) > 0 && !thresholdInfo.triggered;
    result.meta.usedFallback = thresholdInfo.triggered;
    if (!result.meta.usedFallback) {
      result.meta.reason = result.meta.partialTranslationWarning
        ? mergeReasonList([
            "partial_block_translation_warning",
            `${thresholdInfo.fatalFailures}/${thresholdInfo.translatableCount} translatable blocks preserved after retry`,
          ])
        : "";
    }
  }

  logDocumentTranslationDebug(
    "Document Translation Debug",
    result.meta,
    result.translationsById,
    blocks
  );

  if (cacheChangedRef.changed) {
    writeTranslationCache(cache);
  }

  return result;
}

// DOCX batch translation orchestration
export async function translateDocxBlocksInBatches({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas = true,
  runContext = null,
  uiText,
  progressCallbacks = {},
}) {
  const { assertActiveRun, setStatus, updateProgress } = progressCallbacks;

  if (assertActiveRun) assertActiveRun(runContext);
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { translationsById: {}, meta: { usedFallback: false, reason: "" } };
  }

  const batches = createDocxTranslationBatches(blocks);
  const translationsById = {};
  const aggregatedDebugEntries = [];
  const aggregatedReasons = [];
  const aggregatedSummary = createEmptyDebugSummary();
  const aggregatedCacheSummary = {
    hits: 0,
    dedupeReused: 0,
    locallyPreserved: 0,
    uniqueRequested: 0,
  };
  let usedFallback = false;
  let partialTranslationWarning = false;
  let preservedAfterRetry = 0;
  let retriedBlocks = 0;
  let failedBlocks = 0;
  const translationBatchDurationsMs = [];
  let translationBatchApiCallCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    if (assertActiveRun) assertActiveRun(runContext);
    const batch = batches[batchIndex];
    const batchBlocks = batch.items.map((item) => item.block);
    if (setStatus) {
      setStatus("info", uiText.docxTranslationBatchProgress(batchIndex + 1, batches.length), runContext);
    }
    if (updateProgress) {
      updateProgress({
        stage: "translation",
        current: batchIndex + 1,
        total: batches.length,
        percent: ((batchIndex + 1) / batches.length) * 75,
        label: uiText.translatingBatchProgress(batchIndex + 1, batches.length),
      }, runContext);
    }

    if (typeof console !== "undefined") {
      console.info(
        `[DOCX Batch] Translating batch ${batchIndex + 1}/${batches.length}. blocks=${
          batch.blockCount
        }, chars=${batch.charCount}`
      );
    }

    const batchStartedAt = Date.now();
    let batchDurationRecorded = false;
    function recordBatchDuration() {
      if (batchDurationRecorded) return;
      translationBatchDurationsMs[batchIndex] = Date.now() - batchStartedAt;
      batchDurationRecorded = true;
    }

    try {
      translationBatchApiCallCount += 1;
      const batchResult = await translateBlocksForDocument({
        blocks: batchBlocks,
        targetLanguage,
        mode,
        preserveFormulas,
        runContext,
        uiText,
        progressCallbacks: {}, // Don't pass progress callbacks for nested calls
      });
      recordBatchDuration();
      batch.items.forEach((item) => {
        const translated = String(
          batchResult.translationsById?.[item.block.id] || item.block.text || ""
        ).trim();
        translationsById[item.block.id] = translated || item.block.text;
      });

      const normalizedEntries = normalizeDebugEntries(
        batchResult.meta,
        batch.items,
        batchResult.translationsById
      ).map((entry) => ({ ...entry, batchIndex: batchIndex + 1 }));
      aggregatedDebugEntries.push(...normalizedEntries);
      accumulateDebugSummary(aggregatedSummary, batchResult.meta?.debugSummary);
      const cacheSummary = batchResult.meta?.cacheSummary || {};
      aggregatedCacheSummary.hits += Number(cacheSummary.hits || 0);
      aggregatedCacheSummary.dedupeReused += Number(cacheSummary.dedupeReused || 0);
      aggregatedCacheSummary.locallyPreserved += Number(cacheSummary.locallyPreserved || 0);
      aggregatedCacheSummary.uniqueRequested += Number(cacheSummary.uniqueRequested || 0);

      if (batchResult.meta?.usedFallback) {
        usedFallback = true;
        if (batchResult.meta?.reason) {
          aggregatedReasons.push(
            uiText.docxBatchReason(
              batchIndex + 1,
              batches.length,
              batchResult.meta.reason
            )
          );
        }
      }
      if (batchResult.meta?.partialTranslationWarning) {
        partialTranslationWarning = true;
        if (batchResult.meta?.reason) {
          aggregatedReasons.push(
            uiText.docxBatchReason(
              batchIndex + 1,
              batches.length,
              batchResult.meta.reason
            )
          );
        }
      }
      preservedAfterRetry += Number(batchResult.meta?.retrySummary?.preservedAfterRetry || 0);
    } catch (batchErr) {
      recordBatchDuration();
      if (isGenerationCancelledError(batchErr)) throw batchErr;
      if (isTranslationTimeoutError(batchErr)) throw batchErr;
      partialTranslationWarning = true;
      aggregatedReasons.push(
        uiText.docxBatchFailedReason(
          batchIndex + 1,
          batches.length,
          batchErr?.message || uiText.unknownBatchError
        )
      );

      if (typeof console !== "undefined") {
        console.warn(
          `[DOCX Batch Retry] Batch ${batchIndex + 1}/${batches.length} failed. Retrying blocks individually.`,
          batchErr
        );
      }

      for (let blockIndex = 0; blockIndex < batch.items.length; blockIndex += 1) {
        if (assertActiveRun) assertActiveRun(runContext);
        const item = batch.items[blockIndex];
        retriedBlocks += 1;
        if (setStatus) {
          setStatus(
            "info",
            uiText.docxRetryModeProgress(
              blockIndex + 1,
              batch.items.length,
              batchIndex + 1,
              batches.length
            ),
            runContext
          );
        }

        try {
          const singleResult = await translateBlocksForDocument({
            blocks: [item.block],
            targetLanguage,
            mode,
            preserveFormulas,
            runContext,
            uiText,
            progressCallbacks: {},
          });
          const translated = String(
            singleResult.translationsById?.[item.block.id] || item.block.text || ""
          ).trim();
          translationsById[item.block.id] = translated || item.block.text;

          const normalizedEntries = normalizeDebugEntries(
            singleResult.meta,
            [{ ...item, batchIndex: batchIndex + 1 }],
            singleResult.translationsById
          ).map((entry) => ({ ...entry, batchIndex: batchIndex + 1 }));
          aggregatedDebugEntries.push(...normalizedEntries);
          accumulateDebugSummary(aggregatedSummary, singleResult.meta?.debugSummary);
          const cacheSummary = singleResult.meta?.cacheSummary || {};
          aggregatedCacheSummary.hits += Number(cacheSummary.hits || 0);
          aggregatedCacheSummary.dedupeReused += Number(cacheSummary.dedupeReused || 0);
          aggregatedCacheSummary.locallyPreserved += Number(cacheSummary.locallyPreserved || 0);
          aggregatedCacheSummary.uniqueRequested += Number(cacheSummary.uniqueRequested || 0);

          if (singleResult.meta?.usedFallback) {
            usedFallback = true;
            if (singleResult.meta?.reason) {
              aggregatedReasons.push(
                uiText.docxBatchBlockReason(
                  batchIndex + 1,
                  batches.length,
                  blockIndex + 1,
                  batch.items.length,
                  singleResult.meta.reason
                )
              );
            }
          }
          if (singleResult.meta?.partialTranslationWarning) {
            partialTranslationWarning = true;
            if (singleResult.meta?.reason) {
              aggregatedReasons.push(
                uiText.docxBatchBlockReason(
                  batchIndex + 1,
                  batches.length,
                  blockIndex + 1,
                  batch.items.length,
                  singleResult.meta.reason
                )
              );
            }
          }
          preservedAfterRetry += Number(singleResult.meta?.retrySummary?.preservedAfterRetry || 0);
        } catch (singleErr) {
          if (isGenerationCancelledError(singleErr)) throw singleErr;
          if (isTranslationTimeoutError(singleErr)) throw singleErr;
          failedBlocks += 1;
          preservedAfterRetry += 1;
          translationsById[item.block.id] = item.block.text;
          aggregatedDebugEntries.push(
            createSingleBlockFallbackDebugEntry(
              { ...item, batchIndex: batchIndex + 1 },
              singleErr?.message || "single_block_retry_failed",
              targetLanguage
            )
          );
          accumulateDebugSummary(aggregatedSummary, {
            total: 1,
            translated: 0,
            preserved: 1,
            unchangedAfterTranslate: 1,
            suspicious: 1,
          });
          aggregatedReasons.push(
            uiText.docxBatchBlockFailedReason(
              batchIndex + 1,
              batches.length,
              blockIndex + 1,
              batch.items.length,
              singleErr?.message || uiText.unknownBlockError
            )
          );

          if (typeof console !== "undefined") {
            console.warn(
              `[DOCX Block Fallback] Using source text for block ${blockIndex + 1}/${
                batch.items.length
              } in batch ${batchIndex + 1}/${batches.length}.`,
              singleErr
            );
          }
        }
      }
    }
  }

  const thresholdInfo = getTranslationFailureThresholdInfo(blocks, {
    targetLanguage,
    debugSummary: aggregatedSummary,
    retrySummary: { preservedAfterRetry },
    suspiciousBlocks: aggregatedDebugEntries
      .filter((entry) => Array.isArray(entry.validationReasons) && entry.validationReasons.length > 0)
      .map((entry) => ({
        id: entry.id,
        severity: entry.severity,
        validationSeverity: entry.validationSeverity,
      })),
  });
  usedFallback = usedFallback || thresholdInfo.triggered;
  partialTranslationWarning = partialTranslationWarning || (preservedAfterRetry > 0 && !usedFallback);
  const translationSlowestBatchDurationMs = translationBatchDurationsMs.reduce(
    (max, duration) => Math.max(max, Number(duration || 0)),
    0
  );
  const translationSlowestBatchIndex =
    translationSlowestBatchDurationMs > 0
      ? translationBatchDurationsMs.findIndex((duration) => duration === translationSlowestBatchDurationMs) + 1
      : 0;

  const meta = {
    usedFallback,
    reason: mergeReasonList(aggregatedReasons),
    provider: MODEL_API_CONFIG.provider,
    model: MODEL_API_CONFIG.translationModel,
    pipelineVersion: PIPELINE_VERSION,
    translationPromptVersion: TRANSLATION_PROMPT_VERSION,
    debugEntries: aggregatedDebugEntries,
    debugSummary: aggregatedSummary,
    cacheSummary: aggregatedCacheSummary,
    partialTranslationWarning,
    documentFallbackThreshold: thresholdInfo,
    documentFallbackThresholdTriggered: thresholdInfo.triggered,
    translationBatchDurationsMs,
    translationBatchApiCallCount,
    translationSlowestBatchIndex,
    translationSlowestBatchDurationMs,
    batchSummary: {
      totalBatches: batches.length,
      retriedBlocks,
      failedBlocks,
      preservedAfterRetry,
      translationBatchDurationsMs,
      translationBatchApiCallCount,
      translationSlowestBatchIndex,
      translationSlowestBatchDurationMs,
      maxBlocksPerBatch: DOCX_TRANSLATION_BATCH_MAX_BLOCKS,
      maxCharsPerBatch: DOCX_TRANSLATION_BATCH_MAX_CHARS,
      shortBlockMaxChars: DOCX_TRANSLATION_SHORT_BLOCK_MAX_CHARS,
      shortBatchMaxBlocks: DOCX_TRANSLATION_SHORT_BATCH_MAX_BLOCKS,
    },
  };

  logDocumentTranslationDebug("DOCX Translation Debug", meta, translationsById, blocks);

  return {
    translationsById,
    meta,
  };
}
