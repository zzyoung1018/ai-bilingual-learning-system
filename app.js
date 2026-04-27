
import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";
import {
  exportLessonToPdf,
  exportOverlayTranslatedPdf,
  parsePdfForOverlay,
} from "./pdf_tools.js";
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

const html = htm.bind(React.createElement);

// Main navigation preserves the existing app structure, now with clear teacher/student areas.
const navItems = [
  { id: "home", label: "Overview" },
  { id: "teacher", label: "Teacher Workspace" },
  { id: "student", label: "Student Workspace" },
];

const languageOptions = [
  "English",
  "Chinese",
  "Spanish",
  "French",
  "Arabic",
  "Hindi",
  "Swahili",
  "German",
  "Indonesian",
  "Korean",
  "Japanese",
];

const defaultQuizSettings = {
  questionCount: 4,
  difficulty: "medium",
  questionTypes: ["multiple_choice", "true_false"],
  includeAnswerKey: true,
  includeExplanations: false,
};

const DOCX_TRANSLATION_BATCH_MAX_BLOCKS = 6;
const DOCX_TRANSLATION_BATCH_MAX_CHARS = 1800;
const OLLAMA_CONFIG = {
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen3:14b",
};
const OLLAMA_TRANSLATION_OPTIONS = {
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  min_p: 0,
};
const OLLAMA_ENRICHMENT_OPTIONS = {
  temperature: 0.6,
  top_p: 0.95,
  top_k: 20,
  min_p: 0,
};
const PLAIN_TEXT_TRANSLATION_CHUNK_MAX_CHARS = 1800;

const validPages = new Set(navItems.map((item) => item.id));

function pageFromHash() {
  const raw = (window.location.hash || "#/home").replace("#/", "");
  return validPages.has(raw) ? raw : "home";
}

function setHash(page) {
  window.location.hash = `/${page}`;
}

function shuffleOptionsWithAnswer(options, answerIndex) {
  const indexed = options.map((option, index) => ({ option, index }));
  for (let i = indexed.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const shuffled = indexed.map((item) => item.option);
  const newAnswerIndex = indexed.findIndex((item) => item.index === answerIndex);
  return { options: shuffled, answerIndex: newAnswerIndex < 0 ? 0 : newAnswerIndex };
}

function createLocalFallbackLesson({
  lessonTitle,
  sourceText,
  targetLanguage,
  mode,
  quizSettings,
}) {
  const mcBase = shuffleOptionsWithAnswer(
    [
      "Build bilingual access for classroom learning",
      "Replace all teaching support",
      "Avoid concept clarification",
      "Remove student practice checks",
    ],
    0
  );

  const tfBase = shuffleOptionsWithAnswer(["True", "False"], 0);

  const possible = [
    {
      type: "multiple_choice",
      question: "What is the core goal of this AI-supported lesson package?",
      options: mcBase.options,
      answerIndex: mcBase.answerIndex,
      explanation: "The package supports bilingual understanding and classroom accessibility.",
    },
    {
      type: "true_false",
      question: "True or False: Key term review improves comprehension.",
      options: tfBase.options,
      answerIndex: tfBase.answerIndex,
      explanation: "Vocabulary support helps learners understand academic content.",
    },
    {
      type: "short_answer",
      question: "In one sentence, summarize the main idea of the passage.",
      answerText: "A clear sentence describing the central concept of the source text.",
      explanation: "A good answer identifies the main idea without extra unrelated details.",
    },
  ];

  const allowedTypes = new Set(quizSettings.questionTypes || ["multiple_choice"]);
  let quiz = possible.filter((item) => allowedTypes.has(item.type));
  if (quiz.length === 0) {
    quiz = [possible[0]];
  }

  const expanded = [];
  while (expanded.length < (quizSettings.questionCount || 3)) {
    const next = quiz[expanded.length % quiz.length];
    expanded.push({ ...next });
  }

  if (!quizSettings.includeExplanations) {
    expanded.forEach((item) => delete item.explanation);
  }

  const modeText =
    mode === "teacher"
      ? "Teacher-oriented summary: use this output for scaffolding, guided discussion, and quick formative checks."
      : "Student-oriented summary: review key vocabulary first, then use the quiz to confirm your understanding.";

  return {
    lessonTitle,
    sourceText,
    targetLanguage,
    translation: `[Demo translation in ${targetLanguage}] ${sourceText}`,
    glossary: [
      {
        term: "bilingual support",
        explanation: "Using two languages to improve understanding in class.",
      },
      {
        term: "learning accessibility",
        explanation: "Making lesson content easier for all students to follow.",
      },
      {
        term: "comprehension check",
        explanation: "A quick way to confirm if students understood key ideas.",
      },
    ],
    simplifiedExplanation: modeText,
    quizSettings,
    quiz: expanded,
    mode,
    meta: { usedFallback: true, reason: "Local fallback lesson generated." },
  };
}

function normalizeQuizSettings(settings) {
  const merged = { ...defaultQuizSettings, ...(settings || {}) };
  const count = Number.parseInt(merged.questionCount, 10);
  merged.questionCount = Number.isNaN(count) ? 4 : Math.max(1, Math.min(8, count));
  merged.difficulty = ["easy", "medium", "hard"].includes(merged.difficulty)
    ? merged.difficulty
    : "medium";
  merged.questionTypes = Array.isArray(merged.questionTypes)
    ? merged.questionTypes.filter((t) =>
        ["multiple_choice", "true_false", "short_answer"].includes(t)
      )
    : ["multiple_choice"];
  if (merged.questionTypes.length === 0) merged.questionTypes = ["multiple_choice"];
  merged.includeAnswerKey = Boolean(merged.includeAnswerKey);
  merged.includeExplanations = Boolean(merged.includeExplanations);
  return merged;
}

function stripModelThinking(content) {
  return String(content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function extractJsonPayload(content) {
  let text = stripModelThinking(content);
  if (!text) {
    throw new Error("Ollama returned an empty response.");
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
      throw new Error("Ollama response did not contain JSON.");
    }
    return JSON.parse(candidate);
  }
}

async function callOllamaChat(messages, { think, options }) {
  let response;
  try {
    response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        messages,
        stream: false,
        think,
        options,
      }),
    });
  } catch (err) {
    throw new Error(
      `Could not connect to local Ollama at ${OLLAMA_CONFIG.baseUrl}. ${
        err?.message || ""
      }`.trim()
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Ollama HTTP ${response.status}: ${body.slice(0, 400) || response.statusText}`
    );
  }

  const data = await response.json().catch(() => {
    throw new Error("Ollama returned invalid response JSON.");
  });
  const content = data?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Ollama response did not include message.content.");
  }
  return content;
}

function buildLessonEnrichmentMessages({
  lessonTitle,
  sourceText,
  translation,
  targetLanguage,
  mode,
  quizSettings,
}) {
  const modeHint =
    mode === "teacher"
      ? "Teacher mode: include classroom facilitation language and slightly more depth."
      : "Student mode: use short, clear, learner-friendly wording.";

  return [
    {
      role: "system",
      content:
        "You are an assistant for an AI-supported bilingual education product. " +
        "Return ONLY strict JSON. Do not include markdown, comments, or explanatory text outside JSON. " +
        "Use this exact top-level schema: " +
        '{"lessonTitle":"string","translation":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quizSettings":{},"quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}]}. ' +
        "This is the teaching-support generation stage, not the translation stage. Use the completed translation provided by the user and do not retranslate or rewrite it. " +
        "Rules: glossary should have 3-6 key terms. Quiz must follow requested question count, difficulty, and question types. " +
        "For multiple_choice, provide exactly 4 options and a valid answerIndex. For true_false, provide exactly 2 options and a valid answerIndex. For short_answer, provide answerText.",
    },
    {
      role: "user",
      content:
        `Lesson title: ${lessonTitle}\n\n` +
        `Original source text:\n${sourceText}\n\n` +
        `Completed ${targetLanguage} translation that must be returned unchanged in the JSON translation field:\n${translation}\n\n` +
        `Target language: ${targetLanguage}\n` +
        `Learning mode: ${mode}\n` +
        `${modeHint}\n` +
        `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
        "Generate glossary, simplifiedExplanation, and quiz as strict JSON only. Include the completed translation exactly in the translation field.",
    },
  ];
}

async function generateTeachingSupportWithOllama(fallbackInput, translation) {
  const messages = buildLessonEnrichmentMessages({
    ...fallbackInput,
    translation,
  });
  const content = await callOllamaChat(messages, {
    think: true,
    options: OLLAMA_ENRICHMENT_OPTIONS,
  });
  const parsed = extractJsonPayload(content);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Ollama teaching-support response was not a JSON object.");
  }

  return {
    ...parsed,
    lessonTitle: parsed.lessonTitle || fallbackInput.lessonTitle,
    translation: parsed.translation || translation,
    quizSettings: parsed.quizSettings || fallbackInput.quizSettings,
    meta: {
      ...(parsed.meta || {}),
      usedFallback: false,
      reason: "",
      provider: "ollama",
      model: OLLAMA_CONFIG.model,
    },
  };
}

function splitLongTextChunk(text, maxChars = PLAIN_TEXT_TRANSLATION_CHUNK_MAX_CHARS) {
  const value = String(text || "").trim();
  if (!value) return [];
  if (value.length <= maxChars) return [value];

  const sentences = value
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  sentences.forEach((sentence) => {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < sentence.length; index += maxChars) {
        chunks.push(sentence.slice(index, index + maxChars).trim());
      }
      return;
    }

    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function buildPlainTextTranslationBlocks(sourceText) {
  const paragraphs = String(sourceText || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const sourceParts = paragraphs.length > 0 ? paragraphs : [String(sourceText || "").trim()].filter(Boolean);

  return sourceParts.flatMap((part, paragraphIndex) =>
    splitLongTextChunk(part).map((chunk, chunkIndex) => ({
      id: `text-${paragraphIndex + 1}-${chunkIndex + 1}`,
      text: chunk,
      isFormula: false,
      blockType: "paragraph",
      sourceLocation: `manual-text-${paragraphIndex + 1}`,
      styleMetadata: {},
    }))
  );
}

function buildBlockTranslationMessages({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas,
}) {
  return [
    {
      role: "system",
      content:
        "You are a faithful translation engine. Return ONLY strict JSON. " +
        "Do not include markdown, comments, or explanatory text outside JSON. " +
        'Return exactly this schema: {"translations":[{"id":"same id from input","action":"translate or preserve","reason":"short reason","translatedText":"translated text, or original text when preserved"}]}. ' +
        "This is translation only. Do not summarize, omit content, add glossary terms, add explanations, or create quiz content. " +
        "Translate normal natural-language content, including headings, paragraphs, list items, and table cell prose. " +
        "Preserve only URLs, emails, file paths, obvious identifiers, course codes, formulas, symbolic expressions, and non-language tokens. " +
        "Do not preserve text only because it is bold, large, in a heading, in a list, in a table, or specially formatted. " +
        "Return one translation item for every input block, in the same order.",
    },
    {
      role: "user",
      content:
        `Target language: ${targetLanguage}\n` +
        `Mode: ${mode}\n` +
        `Preserve formulas: ${Boolean(preserveFormulas)}\n\n` +
        `Blocks:\n${JSON.stringify(
          blocks.map((block) => ({
            id: block.id,
            text: block.text,
            isFormula: Boolean(block.isFormula),
            blockType: block.blockType || "",
            sourceLocation: block.sourceLocation || block.id || "",
          })),
          null,
          2
        )}`,
    },
  ];
}

async function translateBlocksWithOllama({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas,
}) {
  const messages = buildBlockTranslationMessages({
    blocks,
    targetLanguage,
    mode,
    preserveFormulas,
  });
  const content = await callOllamaChat(messages, {
    think: false,
    options: OLLAMA_TRANSLATION_OPTIONS,
  });
  const parsed = extractJsonPayload(content);
  const list = Array.isArray(parsed?.translations) ? parsed.translations : [];

  if (list.length === 0) {
    throw new Error("Ollama block response did not include translations.");
  }

  const byId = new Map(
    list
      .filter((item) => item && typeof item === "object")
      .map((item) => [String(item.id || ""), item])
  );
  const translationsById = {};
  const debugEntries = [];
  const debugSummary = createEmptyDebugSummary();

  blocks.forEach((block, index) => {
    const raw = byId.get(String(block.id || "")) || list[index];
    if (!raw || typeof raw !== "object") {
      throw new Error(`Ollama did not return translation data for block ${index + 1}.`);
    }

    const sourceText = String(block.text || "");
    const forcePreserve = Boolean(preserveFormulas && block.isFormula);
    const action = forcePreserve
      ? "preserve"
      : String(raw.action || "translate").trim().toLowerCase();
    const translatedText = String(
      raw.translatedText ?? raw.translated_text ?? raw.translation ?? ""
    ).trim();
    const finalText =
      action === "preserve" || forcePreserve ? sourceText : translatedText || sourceText;

    if (action !== "preserve" && !translatedText) {
      throw new Error(`Ollama returned an empty translation for block ${index + 1}.`);
    }

    translationsById[block.id] = finalText;
    debugSummary.total += 1;
    if (action === "preserve" || forcePreserve) {
      debugSummary.preserved += 1;
    } else {
      debugSummary.translated += 1;
      if (finalText === sourceText) {
        debugSummary.unchangedAfterTranslate += 1;
      }
    }

    debugEntries.push({
      index,
      id: block.id,
      blockType: block.blockType || "",
      sourceLocation: block.sourceLocation || block.id || "",
      targetLanguage,
      sourceText,
      apiAction: "ollama",
      action: forcePreserve ? "preserve" : action,
      reason: forcePreserve ? "frontend_formula_preserve" : String(raw.reason || "ollama"),
      translatedText: finalText,
      textPreview: sourceText.slice(0, 140),
      frontendFlagIsFormula: Boolean(block.isFormula),
    });
  });

  return {
    translationsById,
    meta: {
      usedFallback: false,
      reason: "",
      provider: "ollama",
      model: OLLAMA_CONFIG.model,
      debugSummary,
      debugEntries,
    },
  };
}

function normalizeLessonResult(raw, fallbackInput) {
  if (!raw || typeof raw !== "object") {
    return createLocalFallbackLesson(fallbackInput);
  }

  const quizSettings = normalizeQuizSettings(raw.quizSettings || fallbackInput.quizSettings);
  const translation = String(raw.translation || "").trim();
  const simplifiedExplanation = String(
    raw.simplifiedExplanation || raw.explanation || ""
  ).trim();

  const glossary = Array.isArray(raw.glossary)
    ? raw.glossary
        .map((item) => ({
          term: String(item?.term || "").trim(),
          explanation: String(item?.explanation || "").trim(),
        }))
        .filter((item) => item.term && item.explanation)
    : [];

  const quiz = Array.isArray(raw.quiz)
    ? raw.quiz
        .map((item) => {
          const type = String(item?.type || "multiple_choice");
          const question = String(item?.question || "").trim();
          const explanation = String(item?.explanation || "").trim();

          if (type === "short_answer") {
            return {
              type,
              question,
              answerText: String(item?.answerText || "").trim(),
              explanation,
            };
          }

          const options = Array.isArray(item?.options)
            ? item.options.map((x) => String(x)).filter(Boolean)
            : [];
          const answerIndex = Number.isInteger(item?.answerIndex) ? item.answerIndex : 0;

          return { type, question, options, answerIndex, explanation };
        })
        .filter((item) => {
          if (!item.question) return false;
          if (item.type === "short_answer") return Boolean(item.answerText);
          if (item.type === "true_false") {
            return Array.isArray(item.options) && item.options.length >= 2;
          }
          return Array.isArray(item.options) && item.options.length >= 2;
        })
    : [];

  if (!translation || glossary.length === 0 || !simplifiedExplanation || quiz.length === 0) {
    return createLocalFallbackLesson(fallbackInput);
  }

  return {
    lessonTitle: String(raw.lessonTitle || fallbackInput.lessonTitle || "Untitled Lesson").trim(),
    sourceText: fallbackInput.sourceText,
    targetLanguage: fallbackInput.targetLanguage,
    translation,
    glossary,
    simplifiedExplanation,
    quizSettings,
    quiz,
    mode: fallbackInput.mode,
    meta: raw.meta || { usedFallback: false, reason: "" },
  };
}

function buildDocxCombinedTranslation(blocks, translationsById) {
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

function createDocxTranslationBatches(
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

  indexedBlocks.forEach((item) => {
    const nextCount = currentItems.length + 1;
    const nextChars = currentChars + item.charCount;
    const wouldOverflow =
      currentItems.length > 0 && (nextCount > maxBlocks || nextChars > maxChars);

    if (wouldOverflow) {
      batches.push({
        items: currentItems,
        blockCount: currentItems.length,
        charCount: currentChars,
      });
      currentItems = [];
      currentChars = 0;
    }

    currentItems.push(item);
    currentChars += item.charCount;
  });

  if (currentItems.length > 0) {
    batches.push({
      items: currentItems,
      blockCount: currentItems.length,
      charCount: currentChars,
    });
  }

  return batches;
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

function createSingleBlockFallbackDebugEntry(item, reason) {
  const block = item?.block || {};
  const originalIndex = Number.isInteger(item?.originalIndex) ? item.originalIndex : 0;
  const sourceText = String(block.text || "");
  return {
    index: originalIndex,
    id: block.id || `block-${originalIndex}`,
    blockType: block.blockType || "",
    sourceLocation: block.sourceLocation || block.id || `block-${originalIndex}`,
    targetLanguage: "",
    sourceText,
    apiAction: "error",
    action: "fallback_preserve_source",
    reason: reason || "single_block_retry_failed",
    translatedText: sourceText,
    textPreview: sourceText.slice(0, 140),
    frontendFlagIsFormula: Boolean(block.isFormula),
  };
}

function mergeReasonList(reasons) {
  return Array.from(
    new Set(
      (Array.isArray(reasons) ? reasons : [])
        .map((reason) => String(reason || "").trim())
        .filter(Boolean)
    )
  ).join(" | ");
}

function createEmptyDebugSummary() {
  return {
    total: 0,
    translated: 0,
    preserved: 0,
    unchangedAfterTranslate: 0,
  };
}

function accumulateDebugSummary(summary, addition) {
  const next = addition || {};
  summary.total += Number(next.total || 0);
  summary.translated += Number(next.translated || 0);
  summary.preserved += Number(next.preserved || 0);
  summary.unchangedAfterTranslate += Number(next.unchangedAfterTranslate || 0);
  return summary;
}

function logDocumentTranslationDebug(label, meta, translationsById, blocks) {
  const debugEntries = Array.isArray(meta?.debugEntries) ? meta.debugEntries : [];
  const debugSummary = meta?.debugSummary || {};
  if (!debugEntries.length || typeof console === "undefined") return;

  console.groupCollapsed(
    `[${label}] total=${debugSummary.total || blocks.length}, translated=${
      debugSummary.translated ?? "?"
    }, preserved=${debugSummary.preserved ?? "?"}, unchanged=${
      debugSummary.unchangedAfterTranslate ?? "?"
    }`
  );
  console.table(
    debugEntries.map((entry) => ({
      index: entry.index,
      id: entry.id,
      blockType: entry.blockType || "",
      sourceLocation: entry.sourceLocation || "",
      sourceText: String(entry.sourceText || entry.textPreview || "").slice(0, 120),
      apiAction: entry.apiAction || "",
      action: entry.action,
      reason: entry.reason,
      frontendFlagIsFormula: entry.frontendFlagIsFormula,
      translatedText: String(
        entry.translatedText || translationsById?.[entry.id] || ""
      ).slice(0, 120),
    }))
  );
  console.groupEnd();
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
function Header(props) {
  const { page, onPageChange, mode, onModeChange } = props;
  return html`
    <header className="hero">
      <div className="hero__overlay"></div>
      <div className="hero__content">
        <div className="brand">AI-Supported Bilingual Education Tool</div>
        <h1>Classroom Lesson Builder and Student Practice Demo</h1>
        <p>
          A practical prototype for preparing bilingual lesson support packages and delivering
          student-ready learning content with glossary, explanation, and quiz practice.
        </p>
        <div className="toolbar">
          <div className="modeToggle">
            <button
              className=${mode === "teacher" ? "active" : ""}
              onClick=${() => onModeChange("teacher")}
            >
              Teacher Mode
            </button>
            <button
              className=${mode === "student" ? "active" : ""}
              onClick=${() => onModeChange("student")}
            >
              Student Mode
            </button>
          </div>
          <div className="modeHint">
            Active guidance mode:
            <strong>${mode === "teacher" ? "Teacher Preparation" : "Student Learning"}</strong>
          </div>
        </div>
        <nav className="tabs">
          ${navItems.map(
            (item) => html`
              <button
                key=${item.id}
                className=${page === item.id ? "tab active" : "tab"}
                onClick=${() => onPageChange(item.id)}
              >
                ${item.label}
              </button>
            `
          )}
        </nav>
      </div>
    </header>
  `;
}

function HomePage(props) {
  return html`
    <section className="card">
      <h2>Product Overview</h2>
      <p>
        This demo focuses on a reliable DOCX-first teaching workflow: teachers prepare structured
        translated materials, then students import and practice with guided learning content.
      </p>
      <ul className="featureList">
        <li>Paste text quickly, upload DOCX (recommended), or upload PDF (experimental).</li>
        <li>DOCX workflow preserves headings, paragraphs, lists, and tables where practical.</li>
        <li>Generate translation, glossary, simplified explanation, and configurable quiz.</li>
        <li>Export translated DOCX (recommended), learning package JSON, and optional PDF outputs.</li>
        <li>Overlay PDF export remains available for testing, but may be unstable on complex layouts.</li>
        <li>Import prepared packages on the Student side for direct learning practice.</li>
      </ul>
      <div className="buttonRow">
        <button className="primaryBtn" onClick=${props.openTeacher}>
          Open Teacher Workspace
        </button>
        <button className="ghostBtn" onClick=${props.openStudent}>
          Open Student Workspace
        </button>
      </div>
    </section>
  `;
}

function QuizSettingsPanel(props) {
  const { settings, onChange } = props;

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
      <h3>Quiz Settings</h3>
      <p className="sectionDesc">
        Configure quiz complexity and response behavior for your lesson package.
      </p>

      <div className="settingsGrid">
        <label>
          Number of questions
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
          Difficulty level
          <select
            value=${settings.difficulty}
            onChange=${(e) => onChange({ ...settings, difficulty: e.target.value })}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="checkGroup">
        <div className="checkLabel">Question types</div>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.questionTypes.includes("multiple_choice")}
            onChange=${() => toggleQuestionType("multiple_choice")}
          />
          Multiple Choice
        </label>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.questionTypes.includes("true_false")}
            onChange=${() => toggleQuestionType("true_false")}
          />
          True / False
        </label>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.questionTypes.includes("short_answer")}
            onChange=${() => toggleQuestionType("short_answer")}
          />
          Short Answer
        </label>
      </div>

      <div className="checkGroup">
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.includeAnswerKey}
            onChange=${(e) => onChange({ ...settings, includeAnswerKey: e.target.checked })}
          />
          Include answer key in Teacher view
        </label>
        <label className="checkItem">
          <input
            type="checkbox"
            checked=${settings.includeExplanations}
            onChange=${(e) => onChange({ ...settings, includeExplanations: e.target.checked })}
          />
          Include answer explanations
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
      <h3>Generated Lesson Package</h3>
      <p className="sectionDesc">
        Review and adjust content before exporting for teacher or student use.
      </p>
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
          <h3>Translated Lesson Text</h3>
          <p className="sectionDesc">Editable translation preview.</p>
          <textarea
            rows="8"
            value=${lesson.translation}
            onChange=${(e) => onUpdateLesson({ ...lesson, translation: e.target.value })}
          ></textarea>
        </article>

        <article className="resultCard">
          <h3>Glossary and Key Terms</h3>
          <p className="sectionDesc">Core terms for bilingual understanding.</p>
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
          <h3>Simplified Explanation</h3>
          <p className="sectionDesc">Editable explanation adapted to mode.</p>
          <textarea
            rows="8"
            value=${lesson.simplifiedExplanation}
            onChange=${(e) =>
              onUpdateLesson({ ...lesson, simplifiedExplanation: e.target.value })}
          ></textarea>
        </article>

        <article className="resultCard">
          <h3>Quiz Preview</h3>
          <p className="sectionDesc">Practice view with current quiz settings applied.</p>
          ${(lesson.quiz || []).map(
            (q, index) => {
              const answerKey = `q-${index}`;
              return html`
                <div className="quizItem" key=${answerKey}>
                  <p>${index + 1}. [${q.type}] ${q.question}</p>

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
                      placeholder="Write your short answer..."
                      value=${teacherQuizAnswers[answerKey] || ""}
                      onChange=${(e) => onTeacherQuizAnswer(answerKey, e.target.value)}
                    ></textarea>
                  `}

                  ${showAnswerKey &&
                  html`
                    <p className="smallText">
                      Answer:
                      ${q.type === "short_answer"
                        ? q.answerText
                        : (q.options || [])[q.answerIndex] || "N/A"}
                    </p>
                  `}
                  ${showAnswerKey &&
                  q.explanation &&
                  html`<p className="smallText">Why: ${q.explanation}</p>`}
                </div>
              `;
            }
          )}
          <p className="scoreLine">Practice score: ${quizScore}/${(lesson.quiz || []).length}</p>
        </article>
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
    onExportTeacherPdf,
    onExportStudentPdf,
    onExportOverlayPdf,
    onExportDocx,
    teacherQuizAnswers,
    onTeacherQuizAnswer,
    statusMessage,
    statusType,
  } = props;

  return html`
    <section className="card">
      <h2>Teacher Lesson Preparation</h2>
      <p>
        Prepare a bilingual lesson package by using manual text, PDF upload, or DOCX upload,
        then generate AI-supported translation and learning materials.
      </p>

      <div className="subCard">
        <h3>Lesson Input and Document Processing</h3>
        <div className="settingsGrid">
          <label>
            Lesson title
            <input
              type="text"
              value=${lessonTitle}
              onChange=${(e) => setLessonTitle(e.target.value)}
              placeholder="Example: Photosynthesis Introduction"
            />
          </label>
          <label>
            Target language
            <select
              value=${targetLanguage}
              onChange=${(e) => setTargetLanguage(e.target.value)}
            >
              ${languageOptions.map(
                (language) => html`
                  <option key=${language} value=${language}>${language}</option>
                `
              )}
            </select>
          </label>
        </div>

        <div className="settingsGrid">
          <label>
            Guidance mode
            <select disabled value=${generationMode}>
              <option value="teacher">Teacher Mode</option>
              <option value="student">Student Mode</option>
            </select>
          </label>
          <label>
            Upload DOCX (Recommended)
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange=${onDocxFileSelect}
            />
          </label>
        </div>

        <div className="buttonRow">
          <button className="ghostBtn" onClick=${onUseManualText}>
            Paste Text Input
          </button>
          <label className="inlineFile">
            Upload PDF (Experimental)
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange=${onPdfFileSelect}
            />
          </label>
        </div>

        ${documentLoading &&
        html`<div className="statusBanner statusBanner--info">Processing uploaded document...</div>`}
        ${documentStatus && html`<div className="statusBanner statusBanner--info">${documentStatus}</div>`}
        ${documentError && html`<div className="statusBanner statusBanner--error">${documentError}</div>`}
        ${documentSummary && html`<div className="statusBanner statusBanner--info">${documentSummary}</div>`}
        ${lesson?.documentAssets?.sourceType === "pdf" &&
        html`
          <div className="statusBanner statusBanner--error">
            Experimental PDF overlay mode: complex layouts and tables may not align perfectly yet.
          </div>
        `}

        <label>
          Source text preview (editable)
          <textarea
            rows="10"
            value=${sourceText}
            onChange=${(e) => setSourceText(e.target.value)}
            placeholder="Paste lesson text here, or upload a PDF / DOCX and edit extracted content."
          ></textarea>
        </label>
      </div>

      <${QuizSettingsPanel}
        settings=${quizSettings}
        onChange=${(next) => setQuizSettings(normalizeQuizSettings(next))}
      />

      <div className="buttonRow">
        <button className="primaryBtn" disabled=${loading} onClick=${onGenerate}>
          ${loading ? "Generating AI Learning Support..." : "Generate AI Learning Support"}
        </button>
      </div>

      ${lesson &&
      html`
        <div className="teacherActions">
          <button className="ghostBtn" onClick=${onExportDocx}>
            Export Translated DOCX (Recommended)
          </button>
          <button className="ghostBtn" onClick=${onExportTeacherJson}>
            Export Learning Package (Teacher JSON)
          </button>
          <button className="ghostBtn" onClick=${onExportStudentJson}>
            Export Learning Package (Student JSON)
          </button>
          <button className="ghostBtn" onClick=${onExportTeacherPdf}>
            Export Teacher Handout (PDF)
          </button>
          <button className="ghostBtn" onClick=${onExportStudentPdf}>
            Export Student Handout (PDF)
          </button>
          <button className="ghostBtn" onClick=${onExportOverlayPdf}>
            Export Layout-Preserving PDF (Experimental)
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
      <h2>Student Learning Workspace</h2>
      <p>
        Import a teacher-prepared lesson package and complete the guided bilingual learning activities.
      </p>

      <div className="subCard">
        <h3>Import Lesson Package</h3>
        <p className="sectionDesc">
          Choose a JSON package exported from Teacher Workspace.
        </p>
        <div className="buttonRow">
          <input type="file" accept=".json,application/json" onChange=${onImportFile} />
          <button className="ghostBtn" onClick=${onLoadFromTeacher}>
            Load Latest Teacher Draft
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
            Target language: ${studentLesson.targetLanguage} | Package type:
            ${studentLesson.packageType || "student"} | Source type:
            ${studentLesson.metadata?.documentSourceType || "text"}
          </p>

          <div className="resultsGrid">
            <article className="resultCard">
              <h3>Translated Lesson Text</h3>
              <p>${studentLesson.translation}</p>
            </article>
            <article className="resultCard">
              <h3>Glossary</h3>
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
              <h3>Simplified Explanation</h3>
              <p>${studentLesson.simplifiedExplanation}</p>
            </article>
            <article className="resultCard">
              <h3>Practice Quiz</h3>
              ${(studentLesson.quiz || []).map(
                (q, index) => {
                  const key = `q-${index}`;
                  return html`
                    <div className="quizItem" key=${key}>
                      <p>${index + 1}. [${q.type}] ${q.question}</p>

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
                          placeholder="Write your answer..."
                          onChange=${(e) => onStudentAnswer(key, e.target.value)}
                        ></textarea>
                      `}
                    </div>
                  `;
                }
              )}

              <div className="buttonRow">
                <button className="primaryBtn" onClick=${onCheckQuiz}>Check Quiz</button>
              </div>

              ${showStudentScore &&
              html`
                <p className="scoreLine">
                  Score: ${score}/${(studentLesson.quiz || []).length}
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
  const [mode, setMode] = useState("teacher");

  const [lessonTitle, setLessonTitle] = useState("Photosynthesis Introduction");
  const [sourceText, setSourceText] = useState(
    "Photosynthesis is the process by which green plants use sunlight to make food."
  );
  const [targetLanguage, setTargetLanguage] = useState("Chinese");
  const [quizSettings, setQuizSettings] = useState(defaultQuizSettings);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Teacher tip: configure quiz settings first, then generate AI learning support."
  );
  const [statusType, setStatusType] = useState("info");

  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [documentSummary, setDocumentSummary] = useState(
    "Recommended workflow: Upload DOCX for best structure quality. PDF overlay is experimental."
  );
  const [documentContext, setDocumentContext] = useState({
    sourceType: "text",
    fileName: "",
    pdfOverlayData: null,
    docxData: null,
    blockTranslations: {},
    translationDebugEntries: [],
  });

  const [teacherLesson, setTeacherLesson] = useState(null);
  const [teacherQuizAnswers, setTeacherQuizAnswers] = useState({});
  const [teacherMeta, setTeacherMeta] = useState({ usedFallback: true, reason: "" });

  const [studentLesson, setStudentLesson] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [showStudentScore, setShowStudentScore] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    if (!window.location.hash) setHash("home");
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setHash(nextMode === "teacher" ? "teacher" : "student");
  }

  function useManualTextInput() {
    setDocumentContext({
      sourceType: "text",
      fileName: "",
      pdfOverlayData: null,
      docxData: null,
      blockTranslations: {},
      translationDebugEntries: [],
    });
    setDocumentStatus("Manual text mode is active.");
    setDocumentError("");
    setDocumentSummary(
      "Manual text mode: type or paste content directly. For structured documents, DOCX is recommended."
    );
  }

  async function processUploadedDocument(file, expectedType = "any") {
    const lowerName = (file?.name || "").toLowerCase();
    if (!file) return;
    setDocumentLoading(true);
    setDocumentStatus("");
    setDocumentError("");

    try {
      if (expectedType === "docx" && !lowerName.endsWith(".docx")) {
        throw new Error("Please upload a .docx file for the recommended DOCX workflow.");
      }
      if (expectedType === "pdf" && !lowerName.endsWith(".pdf")) {
        throw new Error("Please upload a .pdf file for experimental overlay mode.");
      }

      if (lowerName.endsWith(".pdf")) {
        const parsed = await parsePdfForOverlay(file);
        setSourceText(parsed.fullText || "");
        setDocumentContext({
          sourceType: "pdf",
          fileName: file.name,
          pdfOverlayData: parsed,
          docxData: null,
          blockTranslations: {},
          translationDebugEntries: [],
        });
        setDocumentStatus(`PDF parsed: ${file.name} (${parsed.pageCount} page(s))`);
        setDocumentSummary(
          "PDF experimental mode: overlay export preserves visuals approximately, but complex tables may drift."
        );
      } else if (lowerName.endsWith(".docx")) {
        const parsed = await importDocxFile(file);
        // Preview text is for UI display/debug. DOCX translation uses structured blocks only.
        setSourceText(parsed.fullText || "");
        setDocumentContext({
          sourceType: "docx",
          fileName: file.name,
          pdfOverlayData: null,
          docxData: parsed,
          blockTranslations: {},
          translationDebugEntries: [],
        });
        const totalBlocks = parsed?.traversalSummary?.totalBlocks || 0;
        setDocumentStatus(`DOCX parsed: ${file.name} (${totalBlocks} text blocks found)`);
        logDocxExtractionAudit(parsed);
        const quick = getDocxExtractionQuickCounts(parsed);
        setDocumentSummary(
          `DOCX extraction audit: paragraphs=${quick.paragraph}, headings=${quick.heading}, lists=${quick.listItem}, tableCells=${quick.tableCell}, textBoxes=${quick.textBox}, shapeText=${quick.drawingText}, headerFooter=${quick.headerFooter}, skipped=${quick.skipped}.`
        );
      } else {
        throw new Error("Unsupported file type. Please upload .pdf or .docx.");
      }
    } catch (err) {
      setDocumentError(err?.message || "Document processing failed.");
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

  async function translateBlocksForDocument(blocks, preserveFormulas = true) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return { translationsById: {}, meta: { usedFallback: false, reason: "" } };
    }
    const requestPayload = buildTranslateBlocksRequestPayload({
      blocks,
      targetLanguage,
      mode,
      preserveFormulas,
    });
    const result = await translateBlocksWithOllama(requestPayload);

    logDocumentTranslationDebug(
      "Document Translation Debug",
      result.meta,
      result.translationsById,
      blocks
    );

    return result;
  }

  async function translateDocxBlocksInBatches(blocks, preserveFormulas = true) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return { translationsById: {}, meta: { usedFallback: false, reason: "" } };
    }

    const batches = createDocxTranslationBatches(blocks);
    const translationsById = {};
    const aggregatedDebugEntries = [];
    const aggregatedReasons = [];
    const aggregatedSummary = createEmptyDebugSummary();
    let usedFallback = false;
    let retriedBlocks = 0;
    let failedBlocks = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const batchBlocks = batch.items.map((item) => item.block);
      setStatusType("info");
      setStatusMessage(
        `DOCX translation in progress: batch ${batchIndex + 1}/${batches.length}...`
      );

      if (typeof console !== "undefined") {
        console.info(
          `[DOCX Batch] Translating batch ${batchIndex + 1}/${batches.length}. blocks=${
            batch.blockCount
          }, chars=${batch.charCount}`
        );
      }

      try {
        const batchResult = await translateBlocksForDocument(batchBlocks, preserveFormulas);
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
        );
        aggregatedDebugEntries.push(...normalizedEntries);
        accumulateDebugSummary(aggregatedSummary, batchResult.meta?.debugSummary);

        if (batchResult.meta?.usedFallback) {
          usedFallback = true;
          if (batchResult.meta?.reason) {
            aggregatedReasons.push(
              `Batch ${batchIndex + 1}/${batches.length}: ${batchResult.meta.reason}`
            );
          }
        }
      } catch (batchErr) {
        usedFallback = true;
        aggregatedReasons.push(
          `Batch ${batchIndex + 1}/${batches.length} failed: ${
            batchErr?.message || "Unknown batch error."
          }`
        );

        if (typeof console !== "undefined") {
          console.warn(
            `[DOCX Batch Retry] Batch ${batchIndex + 1}/${batches.length} failed. Retrying blocks individually.`,
            batchErr
          );
        }

        for (let blockIndex = 0; blockIndex < batch.items.length; blockIndex += 1) {
          const item = batch.items[blockIndex];
          retriedBlocks += 1;
          setStatusType("info");
          setStatusMessage(
            `DOCX retry mode: block ${blockIndex + 1}/${batch.items.length} in batch ${
              batchIndex + 1
            }/${batches.length}...`
          );

          try {
            const singleResult = await translateBlocksForDocument([item.block], preserveFormulas);
            const translated = String(
              singleResult.translationsById?.[item.block.id] || item.block.text || ""
            ).trim();
            translationsById[item.block.id] = translated || item.block.text;

            const normalizedEntries = normalizeDebugEntries(
              singleResult.meta,
              [item],
              singleResult.translationsById
            );
            aggregatedDebugEntries.push(...normalizedEntries);
            accumulateDebugSummary(aggregatedSummary, singleResult.meta?.debugSummary);

            if (singleResult.meta?.usedFallback) {
              usedFallback = true;
              if (singleResult.meta?.reason) {
                aggregatedReasons.push(
                  `Batch ${batchIndex + 1}/${batches.length} block ${blockIndex + 1}/${
                    batch.items.length
                  }: ${singleResult.meta.reason}`
                );
              }
            }
          } catch (singleErr) {
            failedBlocks += 1;
            translationsById[item.block.id] = item.block.text;
            aggregatedDebugEntries.push(
              createSingleBlockFallbackDebugEntry(
                item,
                singleErr?.message || "single_block_retry_failed"
              )
            );
            accumulateDebugSummary(aggregatedSummary, {
              total: 1,
              translated: 0,
              preserved: 1,
              unchangedAfterTranslate: 1,
            });
            aggregatedReasons.push(
              `Batch ${batchIndex + 1}/${batches.length} block ${blockIndex + 1}/${
                batch.items.length
              } failed: ${singleErr?.message || "Unknown block error."}`
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

    const meta = {
      usedFallback,
      reason: mergeReasonList(aggregatedReasons),
      debugEntries: aggregatedDebugEntries,
      debugSummary: aggregatedSummary,
      batchSummary: {
        totalBatches: batches.length,
        retriedBlocks,
        failedBlocks,
        maxBlocksPerBatch: DOCX_TRANSLATION_BATCH_MAX_BLOCKS,
        maxCharsPerBatch: DOCX_TRANSLATION_BATCH_MAX_CHARS,
      },
    };

    logDocumentTranslationDebug("DOCX Translation Debug", meta, translationsById, blocks);

    return {
      translationsById,
      meta,
    };
  }

  async function handleGenerate() {
    const trimmedText = sourceText.trim();
    if (!trimmedText) {
      setStatusType("error");
      setStatusMessage("Please enter lesson text or upload a PDF / DOCX before generating.");
      return;
    }

    setLoading(true);
    setStatusType("info");
    setStatusMessage("Generating AI learning support package...");
    setTeacherQuizAnswers({});

    const fallbackInput = {
      lessonTitle: lessonTitle.trim() || "Untitled Lesson",
      sourceText: trimmedText,
      targetLanguage,
      mode,
      quizSettings: normalizeQuizSettings(quizSettings),
    };

    if (documentContext.sourceType === "docx" && documentContext.docxData) {
      setStatusType("info");
      setStatusMessage(
        "DOCX batched mode: translating structured DOCX blocks in smaller requests. Preview text is display/debug only."
      );
      if (typeof console !== "undefined") {
        console.info(
          "[DOCX Batched Path] Preview text is not used as translation input. Lesson support uses local Ollama."
        );
      }
      try {
        const docxBlocks = buildDocxTranslationBlocks(documentContext.docxData);
        if (!Array.isArray(docxBlocks) || docxBlocks.length === 0) {
          throw new Error("No structured DOCX blocks were found for translation.");
        }

        const translationResult = await translateDocxBlocksInBatches(docxBlocks, true);
        const combinedTranslation = buildDocxCombinedTranslation(
          docxBlocks,
          translationResult.translationsById
        );

        let aiLessonBase;
        let aiLessonMeta = { usedFallback: false, reason: "" };
        try {
          setStatusType("info");
          setStatusMessage("Generating glossary, explanation, and quiz with local Ollama...");
          const aiPayload = await generateTeachingSupportWithOllama(
            fallbackInput,
            combinedTranslation
          );
          aiLessonBase = normalizeLessonResult(aiPayload, fallbackInput);
          aiLessonMeta = aiPayload.meta || aiLessonBase.meta || aiLessonMeta;
        } catch (lessonErr) {
          aiLessonBase = createLocalFallbackLesson(fallbackInput);
          aiLessonMeta = {
            usedFallback: true,
            reason: lessonErr?.message || "Local Ollama lesson support failed.",
          };
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
            sourceType: "docx",
            fileName: documentContext.fileName,
            pdfOverlayData: null,
            docxData: documentContext.docxData,
            blockTranslations: translationResult.translationsById || {},
            translationDebugEntries: Array.isArray(translationResult.meta?.debugEntries)
              ? translationResult.meta.debugEntries
              : [],
            formulaPreservation:
              "DOCX translation uses structured block decisions only; preview text is not used.",
          },
        };

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
        });

        if (usedFallback) {
          setStatusType("error");
          setStatusMessage(
            `DOCX generation fallback used. ${
              fallbackReason || "Local Ollama DOCX generation did not fully complete."
            }`
          );
        } else {
          setStatusType("info");
          setStatusMessage(
            `DOCX block translation completed in batches. translated=${
              summary.translated ?? "?"
            }, preserved=${summary.preserved ?? "?"}, unchanged=${
              summary.unchangedAfterTranslate ?? "?"
            }.`
          );
        }
      } catch (docxErr) {
        const fallback = createLocalFallbackLesson(fallbackInput);
        setTeacherLesson({
          ...fallback,
          sourceText: fallbackInput.sourceText,
          documentAssets: {
            sourceType: "docx",
            fileName: documentContext.fileName,
            pdfOverlayData: null,
            docxData: documentContext.docxData || null,
            blockTranslations: {},
            translationDebugEntries: [],
            formulaPreservation:
              "DOCX batched translation mode active; fallback lesson loaded after block translation failure.",
          },
        });
        setTeacherMeta({ usedFallback: true, reason: docxErr?.message || "DOCX block failure." });
        setStatusType("error");
        setStatusMessage(
          `DOCX batched translation failed. Local fallback loaded. ${
            docxErr?.message || ""
          }`.trim()
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (typeof console !== "undefined") {
        console.info(
          `[Non-DOCX Path] sourceType=${documentContext.sourceType || "text"} using local Ollama.`
        );
      }
      setStatusType("info");
      setStatusMessage("Translating lesson content with local Ollama...");

      const translationBlocks =
        documentContext.sourceType === "pdf" && documentContext.pdfOverlayData?.allBlocks
          ? documentContext.pdfOverlayData.allBlocks
          : buildPlainTextTranslationBlocks(fallbackInput.sourceText);
      if (!Array.isArray(translationBlocks) || translationBlocks.length === 0) {
        throw new Error("No translation chunks were available.");
      }

      const translationResult = await translateBlocksForDocument(
        translationBlocks,
        documentContext.sourceType === "pdf"
      );
      const completedTranslation = buildDocxCombinedTranslation(
        translationBlocks,
        translationResult.translationsById
      );

      setStatusType("info");
      setStatusMessage("Generating glossary, explanation, and quiz with local Ollama...");
      const payload = await generateTeachingSupportWithOllama(
        fallbackInput,
        completedTranslation
      );

      const lessonBase = normalizeLessonResult(payload, fallbackInput);
      const lessonMeta = payload.meta || lessonBase.meta || { usedFallback: false, reason: "" };
      const nextLesson = {
        ...lessonBase,
        sourceText: fallbackInput.sourceText,
        translation: completedTranslation || lessonBase.translation,
        documentAssets: {
          sourceType: documentContext.sourceType,
          fileName: documentContext.fileName,
          pdfOverlayData: documentContext.pdfOverlayData,
          docxData: documentContext.docxData || null,
          blockTranslations:
            documentContext.sourceType === "pdf" ? translationResult.translationsById || {} : {},
          translationDebugEntries:
            documentContext.sourceType === "pdf" &&
            Array.isArray(translationResult.meta?.debugEntries)
              ? translationResult.meta.debugEntries
              : [],
          formulaPreservation: "Formula-like blocks are kept unchanged during document translation.",
        },
      };

      let documentMessage = "";
      const documentMeta =
        documentContext.sourceType === "pdf"
          ? translationResult.meta || { usedFallback: false, reason: "" }
          : { usedFallback: false, reason: "" };
      if (documentContext.sourceType === "pdf" && documentContext.pdfOverlayData?.allBlocks) {
        documentMessage =
          " Experimental PDF overlay blocks translated. Verify complex layouts/tables manually.";
      }

      setTeacherLesson(nextLesson);
      setTeacherMeta({
        usedFallback: Boolean(lessonMeta.usedFallback || documentMeta.usedFallback),
        reason: [lessonMeta.reason, documentMeta.reason].filter(Boolean).join(" | "),
      });

      if (lessonMeta?.usedFallback || documentMeta?.usedFallback) {
        setStatusType("error");
        setStatusMessage(
          `Local Ollama fallback used for stability. ${(lessonMeta.reason || "")} ${(documentMeta.reason || "")}`.trim()
        );
      } else {
        setStatusType("info");
        setStatusMessage(`AI learning support package generated successfully.${documentMessage}`);
      }
    } catch (err) {
      const fallback = createLocalFallbackLesson(fallbackInput);
      setTeacherLesson({
        ...fallback,
        sourceText: fallbackInput.sourceText,
        documentAssets: {
          sourceType: documentContext.sourceType,
          fileName: documentContext.fileName,
          pdfOverlayData: documentContext.pdfOverlayData,
          docxData: documentContext.docxData || null,
          blockTranslations: {},
          translationDebugEntries: [],
          formulaPreservation: "Formula-like blocks are kept unchanged in fallback mode.",
        },
      });
      setTeacherMeta(fallback.meta || { usedFallback: true, reason: "Local fallback used." });
      setStatusType("error");
      setStatusMessage(
        `Could not reach local Ollama. Local fallback content loaded. ${err?.message || ""}`.trim()
      );
    } finally {
      setLoading(false);
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
      quizSettings: teacherLesson.quizSettings || quizSettings,
      quiz: teacherLesson.quiz,
      mode: teacherLesson.mode || mode,
      packageType,
      documentSourceType: teacherLesson.documentAssets?.sourceType || "text",
      documentFileName: teacherLesson.documentAssets?.fileName || "",
      meta: teacherMeta,
    });
  }

  function exportTeacherJson() {
    const pkg = buildPackage("teacher");
    if (!pkg) return;
    exportLessonPackageJson(pkg);
    setStatusType("info");
    setStatusMessage("Teacher JSON package exported.");
  }

  function exportStudentJson() {
    const pkg = buildPackage("student");
    if (!pkg) return;
    exportLessonPackageJson(pkg);
    setStatusType("info");
    setStatusMessage("Student JSON package exported.");
  }

  async function exportTeacherPdf() {
    const pkg = buildPackage("teacher");
    if (!pkg) return;
    try {
      await exportLessonToPdf(pkg, { includeAnswerKey: true, audienceLabel: "Teacher" });
      setStatusType("info");
      setStatusMessage("Teacher PDF exported.");
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || "PDF export failed.");
    }
  }

  async function exportStudentPdf() {
    const pkg = buildPackage("student");
    if (!pkg) return;
    try {
      await exportLessonToPdf(pkg, { includeAnswerKey: false, audienceLabel: "Student" });
      setStatusType("info");
      setStatusMessage("Student PDF exported.");
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || "PDF export failed.");
    }
  }

  async function exportOverlayPdf() {
    if (!teacherLesson) return;
    const assets = teacherLesson.documentAssets || {};
    if (assets.sourceType !== "pdf" || !assets.pdfOverlayData) {
      setStatusType("error");
      setStatusMessage("Overlay PDF export requires an uploaded PDF source document.");
      return;
    }
    try {
      await exportOverlayTranslatedPdf({
        lessonTitle: teacherLesson.lessonTitle || lessonTitle,
        targetLanguage: teacherLesson.targetLanguage || targetLanguage,
        mode,
        pdfOverlayData: assets.pdfOverlayData,
        blockTranslations: assets.blockTranslations || {},
        audienceLabel: "Teacher",
      });
      setStatusType("info");
      setStatusMessage("Experimental overlay PDF exported. Verify complex tables manually.");
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || "Overlay PDF export failed.");
    }
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
        quiz: teacherLesson.quiz || [],
        includeAnswerKey: Boolean(quizSettings.includeAnswerKey),
      });
      setStatusType("info");
      setStatusMessage("Translated DOCX exported (recommended output).");
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || "DOCX export failed.");
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setImportError("");
    setImportStatus("Importing lesson package...");
    setShowStudentScore(false);
    setStudentAnswers({});

    try {
      const pkg = await importLessonPackageFile(file);
      setStudentLesson(pkg);
      setImportStatus(`Imported lesson package: ${pkg.lessonTitle}`);
    } catch (err) {
      setImportError(err?.message || "Could not import lesson package.");
      setImportStatus("");
    } finally {
      event.target.value = "";
    }
  }

  function loadLatestTeacherDraft() {
    const pkg = buildPackage("student");
    if (!pkg) {
      setImportError("No teacher lesson is available yet. Generate a lesson first.");
      setImportStatus("");
      return;
    }
    setStudentLesson(pkg);
    setStudentAnswers({});
    setShowStudentScore(false);
    setImportError("");
    setImportStatus("Loaded latest teacher draft into Student Workspace.");
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
      />

      <main className="container">
        ${page === "home" &&
        html`
          <${HomePage}
            openTeacher=${() => setHash("teacher")}
            openStudent=${() => setHash("student")}
          />
        `}

        ${page === "teacher" &&
        html`
          <${TeacherWorkspace}
            lessonTitle=${lessonTitle}
            setLessonTitle=${setLessonTitle}
            sourceText=${sourceText}
            setSourceText=${setSourceText}
            targetLanguage=${targetLanguage}
            setTargetLanguage=${setTargetLanguage}
            quizSettings=${quizSettings}
            setQuizSettings=${setQuizSettings}
            generationMode=${mode}
            onGenerate=${handleGenerate}
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
            onExportTeacherPdf=${exportTeacherPdf}
            onExportStudentPdf=${exportStudentPdf}
            onExportOverlayPdf=${exportOverlayPdf}
            onExportDocx=${exportDocx}
            teacherQuizAnswers=${teacherQuizAnswers}
            onTeacherQuizAnswer=${handleTeacherQuizAnswer}
            statusMessage=${statusMessage}
            statusType=${statusType}
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
          />
        `}
      </main>
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
