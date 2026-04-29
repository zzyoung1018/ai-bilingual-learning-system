import { MODEL_API_CONFIG } from "./api_client.js";
import { countMatches } from "./block_classifier.js";
import {
  ACTIVE_SUPPORT_FIELDS,
  CRITICAL_SUPPORT_FIELDS,
  OPTIONAL_SUPPORT_FIELDS,
  REMOVED_SUPPORT_FIELDS,
  isActiveSupportField,
  isCriticalSupportField,
  isOptionalSupportField,
  isRemovedSupportField,
} from "./support_fields.js";

const PIPELINE_VERSION = "phase-5c-removed-fields-v1";
const TRANSLATION_PROMPT_VERSION = "stage-a-block-translation-v2";
const CACHE_VERSION = "translation-cache-v3";
const ENRICHMENT_PROMPT_VERSION = "stage-b-8-fields-v1";
const ENRICHMENT_QUALITY_VERSION = "phase-5c-8-fields-v1";

const defaultQuizSettings = {
  questionCount: 4,
  difficulty: "medium",
  questionTypes: ["multiple_choice", "true_false"],
  includeAnswerKey: true,
  includeExplanations: false,
};

const DEFAULT_UI_TEXT = {
  untitledLesson: "Untitled Lesson",
  localFallbackLessonGenerated: "Local fallback lesson generated.",
  lessonSupportFailed: "AI lesson support failed.",
  aiEmptyResponse: "AI model returned an empty response.",
  aiNoJson: "AI model response did not contain JSON.",
};

let activeEnrichmentRunContext = {};

function setActiveEnrichmentRunContext(runContext = {}) {
  if (runContext && typeof runContext === "object") {
    activeEnrichmentRunContext = runContext;
  }
}

function getRuntimeUiText(runContext = {}) {
  return runContext?.uiText || activeEnrichmentRunContext?.uiText || DEFAULT_UI_TEXT;
}

function stripModelThinking(content) {
  return String(content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function extractJsonPayload(content, runContext = {}) {
  const t = getRuntimeUiText(runContext);
  let text = stripModelThinking(content);
  if (!text) {
    throw new Error(t.aiEmptyResponse);
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
      throw new Error(t.aiNoJson);
    }
    return JSON.parse(candidate);
  }
}

function throwIfGenerationCancelled(runContext) {
  if (typeof runContext?.throwIfGenerationCancelled === "function") {
    runContext.throwIfGenerationCancelled(runContext);
    return;
  }
  if (runContext?.signal?.aborted) {
    const err = new Error("generation_cancelled");
    err.name = "GenerationCancelledError";
    throw err;
  }
}

function isGenerationCancelledError(err, runContext = {}) {
  if (typeof runContext?.isGenerationCancelledError === "function") {
    return runContext.isGenerationCancelledError(err);
  }
  return err?.name === "GenerationCancelledError" || err?.name === "AbortError";
}

async function callModelChat(messages, options, runContext = {}) {
  const runtime = runContext?.callModelChat ? runContext : activeEnrichmentRunContext;
  if (typeof runtime?.callModelChat !== "function") {
    throw new Error("Enrichment model caller is not configured.");
  }
  return runtime.callModelChat(messages, options);
}

const MODEL_ENRICHMENT_OPTIONS = {
  temperature: 0.6,
  top_p: 0.95,
  top_k: 20,
  min_p: 0,
  num_predict: 2048,
};

const ENRICHMENT_FULL_CONTEXT_MAX_CHARS = 7000;
const ENRICHMENT_EXCERPT_MAX_CHARS = 1100;
const ENRICHMENT_MAX_HEADINGS = 12;

// SUPPORT_FIELD_NAMES is now imported from support_fields.js as ACTIVE_SUPPORT_FIELDS
// Kept for backward compatibility in case old code references it
const SUPPORT_FIELD_NAMES = ACTIVE_SUPPORT_FIELDS;


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

export function createLocalFallbackLesson({
  lessonTitle,
  sourceText,
  targetLanguage,
  mode,
  quizSettings,
}, runContext = {}) {
  setActiveEnrichmentRunContext(runContext);
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
    keyConcepts: [
      {
        title: "Bilingual access",
        explanation: "Students use translated content and key terms to understand the lesson.",
      },
    ],
    commonMisconceptions: [
      {
        misconception: "Translation alone guarantees understanding.",
        correction: "Students also need vocabulary, examples, and practice checks.",
      },
    ],
    teacherNotes: [
      "Use the glossary before reading the translated text.",
      "Ask students to explain one key term in their own words.",
    ],
    classroomActivities: [
      {
        title: "Think-pair-share",
        duration: "8 minutes",
        instructions: "Students compare the source idea and translated explanation with a partner.",
      },
    ],
    extensionQuestions: [
      "How could this idea be applied in a new situation?",
      "Which term is most important for understanding the lesson?",
    ],
    quizSettings,
    quiz: expanded,
    mode,
    meta: {
      usedFallback: true,
      reason: getRuntimeUiText().localFallbackLessonGenerated,
      supportSource: "local-fallback",
      teachingSupportFallbackUsed: true,
      teachingSupportFallbackReason: getRuntimeUiText().localFallbackLessonGenerated,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
      cacheVersion: CACHE_VERSION,
    },
  };
}

function getSafeEnrichmentFallbackExplanation(targetLanguage) {
  if (targetLanguage === "Kazakh") {
    return "Аударма дайын. AI оқу қолдауын жасау сәтсіз болғандықтан, бұл пакет негізгі аударылған мәтінмен берілді.";
  }
  if (targetLanguage === "Russian") {
    return "Перевод готов. Учебная поддержка ИИ не была сгенерирована, поэтому пакет содержит базовый переведенный текст.";
  }
  if (targetLanguage === "Chinese") {
    return "翻译已完成。AI 教学支持未能生成，因此此包仅包含基础翻译内容。";
  }
  return "Translation is complete. AI teaching support could not be generated, so this package includes the translated lesson text with basic empty support sections.";
}

export function createSafeEnrichmentFallbackLesson(
  fallbackInput,
  translation,
  {
    reason = "",
    retryAttempted = false,
    firstAttemptEmpty = false,
    firstAttemptInvalid = false,
    richRetryAttempted = false,
    compactCompleteRetryAttempted = false,
    minimalFallbackAttempted = false,
    kazakhValidationReasons = [],
    enrichmentApiCallCount = 0,
    stageBEnrichmentDurationMs = 0,
  } = {},
  runContext = {}
) {
  setActiveEnrichmentRunContext(runContext);

  // Guard: if no API calls were made and generation wasn't cancelled, this is a bug
  if (enrichmentApiCallCount === 0 && !isGenerationCancelledError(runContext?.cancelledError)) {
    if (typeof console !== "undefined") {
      console.error("[Stage B Bug] Local fallback attempted before any online enrichment call.", {
        reason,
        retryAttempted,
        firstAttemptEmpty,
        firstAttemptInvalid,
      });
    }
  }

  const quizSettings = normalizeQuizSettings(fallbackInput.quizSettings);
  const titleGrounding = getLessonTitleGroundingInfo({
    lessonTitle: fallbackInput.lessonTitle,
    sourceText: fallbackInput.sourceText,
    translation,
  });
  const lessonLike = {
    lessonTitle: fallbackInput.lessonTitle,
    sourceText: fallbackInput.sourceText,
    targetLanguage: fallbackInput.targetLanguage,
    translation: String(translation || "").trim(),
    glossary: [],
    simplifiedExplanation: getSafeEnrichmentFallbackExplanation(fallbackInput.targetLanguage),
    keyConcepts: [],
    commonMisconceptions: [],
    teacherNotes: "",
    classroomActivities: [],
    extensionQuestions: [],
    quizSettings,
    quiz: [],
    mode: fallbackInput.mode,
  };
  const supportSummary = getGeneratedSupportFieldSummary(lessonLike);
  return {
    ...lessonLike,
    meta: {
      usedFallback: false,
      reason: "",
      enrichmentAttempted: true,
      enrichmentApiCallCount: enrichmentApiCallCount,
      stageBEnrichmentDurationMs: stageBEnrichmentDurationMs,
      enrichmentRetryAttempted: Boolean(retryAttempted),
      enrichmentFirstAttemptEmpty: Boolean(firstAttemptEmpty),
      enrichmentFirstAttemptInvalid: Boolean(firstAttemptInvalid),
      enrichmentRichRetryAttempted: Boolean(richRetryAttempted),
      enrichmentCompactCompleteRetryAttempted: Boolean(compactCompleteRetryAttempted || richRetryAttempted),
      enrichmentMinimalFallbackAttempted: Boolean(minimalFallbackAttempted),
      enrichmentUsedFallback: true,
      enrichmentFailureReason: reason || getRuntimeUiText().lessonSupportFailed,
      teachingSupportFallbackUsed: true,
      teachingSupportFallbackReason: reason || getRuntimeUiText().lessonSupportFailed,
      supportSource: "local-fallback",
      kazakhPromptMode: fallbackInput.targetLanguage === "Kazakh" ? "compact-complete" : "",
      supportCompletenessPassed: false,
      supportCompletenessReasons: ["local_teaching_support_fallback"],
      missingCriticalSupportFields: ["glossary", "quiz", "keyConcepts"],
      supportMissingFieldCompletionAttempted: false,
      supportMissingFieldCompletionSucceeded: false,
      kazakhValidationAttempted: fallbackInput.targetLanguage === "Kazakh",
      kazakhValidationPassed: fallbackInput.targetLanguage === "Kazakh" ? false : true,
      kazakhLanguageValidationPassed: fallbackInput.targetLanguage === "Kazakh" ? false : true,
      kazakhValidationReasons: Array.isArray(kazakhValidationReasons) ? kazakhValidationReasons : [],
      lessonTitleWasUserProvided: Boolean(fallbackInput.lessonTitleWasUserProvided),
      lessonTitleDerivedFromFile: Boolean(fallbackInput.lessonTitleDerivedFromFile),
      lessonTitleUsedForGeneration: titleGrounding.lessonTitleUsedForGeneration,
      lessonTitleMismatchSuspected: titleGrounding.lessonTitleMismatchSuspected,
      droppedOffTopicQuizItems: [],
      provider: MODEL_API_CONFIG.provider,
      model: MODEL_API_CONFIG.enrichmentModel,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
      enrichmentQualityVersion: ENRICHMENT_QUALITY_VERSION,
      cacheVersion: CACHE_VERSION,
      generatedSupportFields: supportSummary.generatedSupportFields,
      missingOptionalSupportFields: supportSummary.missingOptionalSupportFields,
      supportFieldCounts: getSupportFieldCounts(lessonLike),
    },
  };
}

export function normalizeQuizSettings(settings) {
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



export function clipText(text, maxChars) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trim()}...`;
}

function selectRepresentativeExcerpts(text, maxChars = ENRICHMENT_EXCERPT_MAX_CHARS) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return [];
  if (value.length <= maxChars * 2) {
    return [{ label: "full", text: clipText(value, maxChars * 2) }];
  }

  const segmentLength = Math.min(maxChars, Math.ceil(value.length / 3));
  const middleStart = Math.max(0, Math.floor(value.length / 2 - segmentLength / 2));
  return [
    { label: "beginning", text: clipText(value.slice(0, segmentLength), maxChars) },
    { label: "middle", text: clipText(value.slice(middleStart, middleStart + segmentLength), maxChars) },
    { label: "end", text: clipText(value.slice(Math.max(0, value.length - segmentLength)), maxChars) },
  ];
}

function extractHeadingCandidates(sourceText, maxItems = ENRICHMENT_MAX_HEADINGS) {
  return String(sourceText || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line.length > 120) return false;
      if (/^[#\d.\-\s]+$/.test(line)) return false;
      return line.length <= 70 || /^[A-Z0-9][^.!?。！？]{2,}$/.test(line);
    })
    .slice(0, maxItems);
}

const GLOSSARY_CANDIDATE_STOPWORDS = new Set([
  "about",
  "after",
  "before",
  "between",
  "chapter",
  "example",
  "important",
  "introduction",
  "lesson",
  "learning",
  "module",
  "section",
  "student",
  "students",
  "teacher",
  "understand",
  "untitled",
  "using",
]);
const LESSON_TITLE_STOPWORDS = new Set([
  ...GLOSSARY_CANDIDATE_STOPWORDS,
  "intro",
  "overview",
  "part",
  "unit",
  "course",
  "class",
  "topic",
]);
const OFF_TOPIC_TERM_EXPANSIONS = {};

function extractGlossaryCandidateTerms(sourceText, maxItems = 16) {
  const source = String(sourceText || "");
  const counts = new Map();
  const candidates = source.match(
    /\b(?:[A-Z][A-Za-z0-9+-]{1,}|[a-z][a-z]+(?:\s+[a-z][a-z]+){1,3}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g
  );
  (candidates || []).forEach((candidate) => {
    const term = candidate.replace(/\s+/g, " ").trim();
    const key = term.toLowerCase();
    if (term.length < 3 || term.length > 60) return;
    if (/^\d+$/.test(term)) return;
    if (GLOSSARY_CANDIDATE_STOPWORDS.has(key)) return;
    counts.set(term, (counts.get(term) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([term]) => term)
    .slice(0, maxItems);
}

function extractSignificantTitleTerms(text) {
  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .match(/\b[a-z][a-z]{2,}\b/g) || []
    )
  ).filter((term) => !LESSON_TITLE_STOPWORDS.has(term));
}

function getLessonTitleGroundingInfo({ lessonTitle, sourceText, translation }) {
  const titleTerms = extractSignificantTitleTerms(lessonTitle);
  const contextText = `${sourceText || ""}\n${translation || ""}`.toLowerCase();
  const unsupportedTitleTerms = titleTerms.filter((term) => !contextText.includes(term));
  const mismatchSuspected =
    titleTerms.length > 0 && unsupportedTitleTerms.length / titleTerms.length >= 0.5;
  return {
    lessonTitleUsedForGeneration: !mismatchSuspected,
    lessonTitleMismatchSuspected: mismatchSuspected,
    unsupportedTitleTerms,
  };
}

function buildTeachingSupportContext({
  lessonTitle,
  sourceText,
  translation,
  targetLanguage,
  sourceType = "text",
  sourceFileName = "",
  targetAudience = "beginner/intermediate students",
  blockKindSummary = null,
}) {
  const source = String(sourceText || "").trim();
  const translated = String(translation || "").trim();
  const titleGrounding = getLessonTitleGroundingInfo({
    lessonTitle,
    sourceText: source,
    translation: translated,
  });
  const totalChars = source.length + translated.length;
  const compact = totalChars > ENRICHMENT_FULL_CONTEXT_MAX_CHARS;
  const headings = extractHeadingCandidates(source);
  const glossaryCandidateTerms = extractGlossaryCandidateTerms(source);
  const summary = {
    lessonTitle,
    targetLanguage,
    sourceType,
    sourceFileName,
    targetAudience,
    sourceCharCount: source.length,
    translationCharCount: translated.length,
    headings,
    glossaryCandidateTerms,
    blockKindSummary: blockKindSummary || {},
    lessonTitleUsedForGeneration: titleGrounding.lessonTitleUsedForGeneration,
    lessonTitleMismatchSuspected: titleGrounding.lessonTitleMismatchSuspected,
    unsupportedTitleTerms: titleGrounding.unsupportedTitleTerms,
  };

  if (!compact) {
    return {
      compact,
      summary,
      sourceContext: source,
      translationContext: translated,
    };
  }

  return {
    compact,
    summary,
    sourceContext: selectRepresentativeExcerpts(source),
    translationContext: selectRepresentativeExcerpts(translated),
  };
}

function getEnrichmentLanguageInstruction(targetLanguage) {
  if (targetLanguage === "Kazakh") {
    return (
      "Use natural educational Kazakh in Cyrillic script. " +
      "Write in clear classroom language suitable for teachers and students. " +
      "Avoid Russian-influenced phrasing and literal word-for-word translations. " +
      "Use natural Kazakh sentence structures and educational terminology. " +
      "Do not write Russian. Do not use Kazakh Latin script. " +
      "For well-known English proper nouns, use common Kazakh transliteration with English in parentheses when useful. " +
      'Glossary terms may preserve the English source term alongside the Kazakh term, using the pattern "source term / Kazakh term" when helpful.'
    );
  }
  if (targetLanguage === "Russian") {
    return (
      "Use standard Russian Cyrillic for explanations, quiz questions, and answers. " +
      "Glossary terms may preserve the English source term alongside the Russian term when useful."
    );
  }
  if (targetLanguage === "English") {
    return "Use natural English for explanations, quiz questions, and answers.";
  }
  return (
    `Use natural ${targetLanguage} for explanations, quiz questions, and answers. ` +
    "Glossary terms may preserve the English source term alongside the translated term when useful."
  );
}

function buildLessonEnrichmentMessages({
  lessonTitle,
  sourceText,
  translation,
  targetLanguage,
  mode,
  quizSettings,
  sourceType,
  sourceFileName,
  targetAudience,
  blockKindSummary,
}) {
  const context = buildTeachingSupportContext({
    lessonTitle,
    sourceText,
    translation,
    targetLanguage,
    sourceType,
    sourceFileName,
    targetAudience,
    blockKindSummary,
  });
  const languageInstruction = getEnrichmentLanguageInstruction(targetLanguage);
  const modeHint =
    mode === "teacher"
      ? "Teacher mode: include classroom facilitation language and slightly more depth."
      : "Student mode: use short, clear, learner-friendly wording.";
  const titleWarning =
    "The lesson title is metadata only. If the lesson title conflicts with the source or translated lesson content, ignore the title and use the lesson excerpts as the source of truth. " +
    (context.summary.lessonTitleMismatchSuspected
      ? "The current lesson title may be inaccurate; keep it as display metadata only and do not generate content from it. "
      : "Use the lesson title only when it is supported by the lesson excerpts. ");

  if (targetLanguage === "Kazakh") {
    return [
      {
        role: "system",
        content:
          "Generate complete Kazakh teaching-support package. Return ONLY strict JSON. No markdown, comments, or text outside JSON. Do not include a translation field. " +
          "Use natural Kazakh in Cyrillic script. Do not write Russian. Do not use Latin-script Kazakh. Preserve English technical terms in parentheses when useful. " +
          titleWarning +
          "Use only the provided source/translation context. Do not invent unrelated topics. Do not use unsupported lesson-title topics in quiz or examples. " +
          "Return all fields in this exact schema: " +
          '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"extensionQuestions":["string"],"meta":{}}. ' +
          "Limits: glossary 5, simplifiedExplanation 2-4 short paragraphs, keyConcepts 3, commonMisconceptions 2, teacherNotes 3 short notes, classroomActivities 1, extensionQuestions 2, quiz respects quiz settings.",
      },
      {
        role: "user",
        content:
          `Display lesson title: ${lessonTitle}\n` +
          `Title grounding: ${JSON.stringify({
            lessonTitleUsedForGeneration: context.summary.lessonTitleUsedForGeneration,
            lessonTitleMismatchSuspected: context.summary.lessonTitleMismatchSuspected,
            unsupportedTitleTerms: context.summary.unsupportedTitleTerms,
          })}\n` +
          `Target language: Kazakh\n` +
          `Language rules: ${languageInstruction}\n` +
          `Learning mode: ${mode}\n` +
          `${modeHint}\n` +
          `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
          `Lesson context:\n${JSON.stringify(context, null, 2)}\n\n` +
          "Generate complete Kazakh JSON. Actual lesson excerpts are the source of truth.",
      },
    ];
  }

  return [
    {
      role: "system",
      content:
        "Generate teaching-support package. Return ONLY strict JSON. No markdown, comments, or text outside JSON. " +
        "Use this exact schema: " +
        '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"extensionQuestions":["string"],"meta":{}}. ' +
        "Do not include a translation field. " +
        titleWarning +
        "Use only the provided lesson context. Do not invent unrelated topics. " +
        "Glossary: 5-8 important terms with concise explanations. " +
        "Simplified explanation: 200-400 words covering overview, why it matters, step-by-step explanation, example, common difficulty, recap. " +
        "Key concepts: 3-5 lesson-specific concepts with explanations. " +
        "Common misconceptions: 2-4 specific misunderstandings with corrections. " +
        "Teacher notes: introduction, struggle points, examples to emphasize, prior knowledge, quick checks. " +
        "Classroom activities: 1-3 executable activities with clear instructions and realistic durations. " +
        "Extension questions: 2-4 open-ended lesson-connected questions. " +
        "Quiz: follow requested settings, be concise and grounded in lesson content. Multiple choice has 4 options with valid answerIndex. True/false has 2 options. Short answer has concise answerText.",
    },
    {
      role: "user",
      content:
        `Lesson title: ${lessonTitle}\n\n` +
        `Target language: ${targetLanguage}\n` +
        `Language rules: ${languageInstruction}\n` +
        `Learning mode: ${mode}\n` +
        `${modeHint}\n` +
        `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
        `Teaching-support context:\n${JSON.stringify(context, null, 2)}\n\n` +
        "Generate teaching-support JSON. Do not include translation.",
    },
  ];
}

function buildMinimalLessonEnrichmentMessages({
  lessonTitle,
  sourceText,
  translation,
  targetLanguage,
  mode,
  quizSettings,
  sourceType,
  sourceFileName,
  targetAudience,
  blockKindSummary,
}) {
  const context = buildTeachingSupportContext({
    lessonTitle,
    sourceText,
    translation,
    targetLanguage,
    sourceType,
    sourceFileName,
    targetAudience,
    blockKindSummary,
  });
  const languageInstruction = getEnrichmentLanguageInstruction(targetLanguage);
  return [
    {
      role: "system",
      content:
        "You generate compact teaching support for a bilingual education app. " +
        "Return ONLY valid strict JSON. No markdown, comments, trailing commas, or text outside JSON. " +
        "Use only the provided lesson context and avoid generic filler or unrelated topics. " +
        "Do not include a translation field. Use only these top-level fields: " +
        '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"keyConcepts":[{"title":"string","explanation":"string"}],"meta":{}}. ' +
        "Keep output small and lesson-specific: glossary 3-5 important terms, keyConcepts 3 items, simplifiedExplanation short but useful, and quiz concise.",
    },
    {
      role: "user",
      content:
        `Lesson title: ${lessonTitle}\n` +
        `Target language: ${targetLanguage}\n` +
        `Language rules: ${languageInstruction}\n` +
        `Learning mode: ${mode}\n` +
        `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
        `Compact context:\n${JSON.stringify(context, null, 2)}\n\n` +
        "Generate the compact teaching-support JSON only. Do not include translation.",
    },
  ];
}

function buildMissingSupportCompletionMessages({
  lessonTitle,
  sourceText,
  translation,
  targetLanguage,
  mode,
  quizSettings,
  sourceType,
  sourceFileName,
  targetAudience,
  blockKindSummary,
  existingSupport,
  missingFields,
}) {
  const context = buildTeachingSupportContext({
    lessonTitle,
    sourceText,
    translation,
    targetLanguage,
    sourceType,
    sourceFileName,
    targetAudience,
    blockKindSummary,
  });
  const languageInstruction = getEnrichmentLanguageInstruction(targetLanguage);
  const fieldList = (Array.isArray(missingFields) ? missingFields : [])
    .map((field) => String(field || "").trim())
    .filter(Boolean)
    .filter((field) => isActiveSupportField(field)); // Only request active fields

  const allowedSchema =
    '{"glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"extensionQuestions":["string"],"meta":{}}';

  if (targetLanguage === "Kazakh") {
    return [
      {
        role: "system",
        content:
          "Complete missing Kazakh teaching-support fields for a bilingual lesson package. Return ONLY strict JSON. No markdown, comments, or text outside JSON. " +
          "Generate ONLY the requested missing top-level fields and optional meta. Do not repeat fields that are not requested. Do not include translation. " +
          "Use natural Kazakh Cyrillic. Do not write Russian. Do not use Latin-script Kazakh for ordinary prose. Preserve English technical terms in parentheses only when useful. " +
          "Use source and translation excerpts as ground truth. The lesson title is metadata only; do not use it as the only source. Do not invent title-only topics. " +
          `Allowed JSON shape: ${allowedSchema}. ` +
          "Kazakh field targets when requested: glossary 3-5 entries, quiz 3-4 questions, keyConcepts 2-3, commonMisconceptions 1-2, teacherNotes 2-3, classroomActivities 1, extensionQuestions 1-2, simplifiedExplanation 1-2 short paragraphs.",
      },
      {
        role: "user",
        content:
          `Display lesson title: ${lessonTitle}\n` +
          `Target language: Kazakh\n` +
          `Language rules: ${languageInstruction}\n` +
          `Learning mode: ${mode}\n` +
          `Missing fields to generate only:\n${JSON.stringify(fieldList, null, 2)}\n\n` +
          `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
          `Existing generated support, do not duplicate:\n${JSON.stringify(existingSupport || {}, null, 2)}\n\n` +
          `Lesson context:\n${JSON.stringify(context, null, 2)}\n\n` +
          "Return strict JSON containing only the missing requested fields and optional meta.",
      },
    ];
  }

  return [
    {
      role: "system",
      content:
        "Complete missing teaching-support fields for a bilingual lesson package. Return ONLY strict JSON. No markdown, comments, trailing commas, or text outside JSON. " +
        "Generate ONLY the requested missing top-level fields and optional meta. Do not repeat fields that are not requested. Do not include translation. " +
        "Use only the provided source/translation excerpts as ground truth. The lesson title is metadata only; do not use title-only topics. " +
        `Language rules: ${languageInstruction} ` +
        `Allowed JSON shape: ${allowedSchema}.`,
    },
    {
      role: "user",
      content:
        `Lesson title: ${lessonTitle}\n` +
        `Target language: ${targetLanguage}\n` +
        `Learning mode: ${mode}\n` +
        `Missing fields to generate only:\n${JSON.stringify(fieldList, null, 2)}\n\n` +
        `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
        `Existing generated support, do not duplicate:\n${JSON.stringify(existingSupport || {}, null, 2)}\n\n` +
        `Lesson context:\n${JSON.stringify(context, null, 2)}\n\n` +
        "Return strict JSON containing only the missing requested fields and optional meta.",
    },
  ];
}

function buildCompactRichLessonEnrichmentMessages({
  lessonTitle,
  sourceText,
  translation,
  targetLanguage,
  mode,
  quizSettings,
  sourceType,
  sourceFileName,
  targetAudience,
  blockKindSummary,
}) {
  const context = buildTeachingSupportContext({
    lessonTitle,
    sourceText,
    translation,
    targetLanguage,
    sourceType,
    sourceFileName,
    targetAudience,
    blockKindSummary,
  });
  const languageInstruction = getEnrichmentLanguageInstruction(targetLanguage);
  const titleWarning =
    "The lesson title is metadata only. If it conflicts with source/translation context, ignore it for content generation. " +
    (context.summary.lessonTitleMismatchSuspected
      ? "The current title appears unsupported; do not use unsupported title topics for quiz or examples. "
      : "Use the title only when supported by context. ");
  if (targetLanguage === "Kazakh") {
    return [
      {
        role: "system",
        content:
          "Return ONLY strict JSON for a complete Kazakh teaching-support package. No markdown. No translation field. " +
          "Use natural educational Kazakh in Cyrillic script. Write in clear classroom language suitable for teachers and students. " +
          "Avoid Russian-influenced phrasing and literal word-for-word translations. Use natural Kazakh sentence structures and educational terminology. " +
          "Do not write Russian. Do not use Latin-script Kazakh. " +
          "For well-known English proper nouns, use common Kazakh transliteration with English in parentheses when useful. " +
          titleWarning +
          "Use source and translation excerpts as the source of truth. Do not generate quiz, glossary, examples from title-only topics. Do not return the full translation. " +
          "Return every schema field: lessonTitle, glossary, simplifiedExplanation, quiz, keyConcepts, commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions, meta. " +
          "Keep it short: glossary exactly 5, simplifiedExplanation exactly 2 short paragraphs, quiz 3-4 questions, keyConcepts exactly 3, commonMisconceptions exactly 2, teacherNotes 2-3 short notes, classroomActivities exactly 1, extensionQuestions exactly 2. Quiz follows settings and must be about the actual lesson context.",
      },
      {
        role: "user",
        content:
          `Display lesson title: ${lessonTitle}\n` +
          `Title grounding: ${JSON.stringify({
            lessonTitleUsedForGeneration: context.summary.lessonTitleUsedForGeneration,
            lessonTitleMismatchSuspected: context.summary.lessonTitleMismatchSuspected,
            unsupportedTitleTerms: context.summary.unsupportedTitleTerms,
          })}\n` +
          `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
          `Context:\n${JSON.stringify(context, null, 2)}\n\n` +
          "Generate complete compact Kazakh JSON only.",
      },
    ];
  }
  return [
    {
      role: "system",
      content:
        "You generate complete but compact teaching support for a bilingual education app. " +
        "Return ONLY valid strict JSON. No markdown, comments, trailing commas, or text outside JSON. " +
        "Use only the provided lesson context. Do not invent unrelated topics or generic filler. Do not include a translation field. " +
        titleWarning +
        "Return all top-level fields in this schema, even when a field must be empty: " +
        '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"extensionQuestions":["string"],"meta":{}}. ' +
        "Limits: glossary 5 entries, keyConcepts 3, commonMisconceptions 2, classroomActivities 1, extensionQuestions 2. Quiz must respect quiz settings.",
    },
    {
      role: "user",
      content:
        `Lesson title: ${lessonTitle}\n` +
        `Target language: ${targetLanguage}\n` +
        `Language rules: ${languageInstruction}\n` +
        `Learning mode: ${mode}\n` +
        `Quiz settings:\n${JSON.stringify(quizSettings, null, 2)}\n\n` +
        `Compact complete context:\n${JSON.stringify(context, null, 2)}\n\n` +
        "Generate complete compact teaching-support JSON with all schema fields. Do not include translation.",
    },
  ];
}

function buildEnrichmentJsonRepairMessages(malformedJson) {
  return [
    {
      role: "system",
      content:
        "You repair malformed JSON for an education app. Return ONLY valid strict JSON. " +
        "Do not use markdown, comments, or explanatory text. Do not add a translation field. " +
        "No trailing commas. All strings must be properly quoted. Arrays must use commas between elements. " +
        "Preserve the semantic content if possible. The allowed top-level fields are lessonTitle, glossary, simplifiedExplanation, quiz, keyConcepts, commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions, and meta.",
    },
    {
      role: "user",
      content:
        "Repair this malformed JSON into valid strict JSON only:\n\n" +
        String(malformedJson || ""),
    },
  ];
}

function isEmptyModelOutputError(err) {
  const message = String(err?.message || "");
  return err?.code === "enrichment_empty_response" || message === getRuntimeUiText().aiEmptyResponse;
}

function createEnrichmentEmptyResponseError() {
  const error = new Error(getRuntimeUiText().aiEmptyResponse);
  error.code = "enrichment_empty_response";
  return error;
}

function parseEnrichmentJsonPayload(content) {
  if (!stripModelThinking(content)) {
    throw createEnrichmentEmptyResponseError();
  }
  return extractJsonPayload(content);
}

function formatEnrichmentFailureReason(err) {
  if (isEmptyModelOutputError(err)) return getRuntimeUiText().aiEmptyResponse;
  return String(err?.message || getRuntimeUiText().lessonSupportFailed).trim();
}

function logEnrichmentRecovery(label, err) {
  if (typeof console !== "undefined" && console.info) {
    console.info(`[AI enrichment] ${label}`, err);
  }
}

function warnEnrichmentParseFailure(label, err) {
  if (typeof console !== "undefined") {
    console.warn(`[AI enrichment] ${label}`, err);
  }
}

async function requestParsedEnrichment(messages, runContext) {
  if (runContext?.enrichmentMetrics) {
    runContext.enrichmentMetrics.apiCallCount =
      Number(runContext.enrichmentMetrics.apiCallCount || 0) + 1;
  }
  const content = await callModelChat(messages, {
    stage: "enrichment",
    options: MODEL_ENRICHMENT_OPTIONS,
    format: "json",
    signal: runContext?.signal,
  });
  throwIfGenerationCancelled(runContext);
  try {
    return {
      content,
      parsed: parseEnrichmentJsonPayload(content),
    };
  } catch (parseErr) {
    parseErr.enrichmentContent = content;
    throw parseErr;
  }
}

function hasSupportValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.values(value).some((item) => hasSupportValue(item));
  return Boolean(String(value || "").trim());
}

function getIncompleteRichSupportFields(parsed) {
  const requiredFields = [
    "commonMisconceptions",
    "teacherNotes",
    "classroomActivities",
    "differentiatedSupport",
    "extensionQuestions",
    "studentWorksheet",
  ];
  return requiredFields.filter((field) => !hasSupportValue(parsed?.[field]));
}

function getMissingCoreEnrichmentFields(parsed) {
  return ["glossary", "simplifiedExplanation", "quiz"].filter(
    (field) => !hasSupportValue(parsed?.[field])
  );
}

function mergeEnrichmentPayloads(primary, supplemental) {
  const result = {
    ...(primary && typeof primary === "object" ? primary : {}),
  };
  if (!supplemental || typeof supplemental !== "object" || Array.isArray(supplemental)) {
    return result;
  }
  // Only merge active support fields
  ["lessonTitle", ...ACTIVE_SUPPORT_FIELDS].forEach((field) => {
    if (!hasSupportValue(result[field]) && hasSupportValue(supplemental[field])) {
      result[field] = supplemental[field];
    }
  });
  const primarySupport = result.differentiatedSupport || {};
  const supplementalSupport = supplemental.differentiatedSupport || {};
  result.differentiatedSupport = {
    strugglingLearners:
      primarySupport.strugglingLearners || supplementalSupport.strugglingLearners || "",
    advancedLearners:
      primarySupport.advancedLearners || supplementalSupport.advancedLearners || "",
    languageSupport: primarySupport.languageSupport || supplementalSupport.languageSupport || "",
  };
  result.meta = {
    ...(supplemental.meta || {}),
    ...(result.meta || {}),
  };
  return result;
}

const KAZAKH_SPECIFIC_LETTER_PATTERN = /[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/g;
const COMMON_RUSSIAN_WORDS = new Set([
  "это",
  "что",
  "как",
  "если",
  "для",
  "или",
  "при",
  "без",
  "над",
  "под",
  "между",
  "который",
  "которая",
  "которые",
  "ученик",
  "ученики",
  "учитель",
  "объясните",
  "выберите",
  "ответ",
  "верно",
  "неверно",
  "пример",
  "задание",
  "понятие",
]);

function collectSupportTextSegments(lessonLike) {
  const segments = [];
  function add(value, path) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => add(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, nested]) => add(nested, `${path}.${key}`));
      return;
    }
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text) segments.push({ path, text });
  }

  [
    "simplifiedExplanation",
    "learningObjectives",
    "keyConcepts",
    "commonMisconceptions",
    "teacherNotes",
    "classroomActivities",
    "differentiatedSupport",
    "extensionQuestions",
    "studentWorksheet",
    "quiz",
  ].forEach((field) => add(lessonLike?.[field], field));
  add(
    (lessonLike?.glossary || []).map((item) => item?.explanation || ""),
    "glossary.explanation"
  );
  return segments;
}

function getScriptStats(text) {
  const value = String(text || "");
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const latin = countMatches(value, /[A-Za-z]/g);
  const kazakhSpecific = countMatches(value, KAZAKH_SPECIFIC_LETTER_PATTERN);
  const letters = cyrillic + latin;
  return {
    cyrillic,
    latin,
    kazakhSpecific,
    letters,
    cyrillicRatio: letters === 0 ? 1 : cyrillic / letters,
    latinRatio: letters === 0 ? 0 : latin / letters,
  };
}

function getRussianWordHitCount(text) {
  const words = String(text || "").toLowerCase().match(/[а-яё]+/gi) || [];
  return words.filter((word) => COMMON_RUSSIAN_WORDS.has(word)).length;
}

function getUnsupportedTitleTopicHits(lessonLike) {
  const titleGrounding = getLessonTitleGroundingInfo({
    lessonTitle: lessonLike?.lessonTitle,
    sourceText: lessonLike?.sourceText,
    translation: lessonLike?.translation,
  });
  if (!titleGrounding.lessonTitleMismatchSuspected) {
    return { ...titleGrounding, hits: [] };
  }

  const contextText = `${lessonLike?.sourceText || ""}\n${lessonLike?.translation || ""}`.toLowerCase();
  const bannedTerms = Array.from(
    new Set(
      titleGrounding.unsupportedTitleTerms.flatMap((term) => [
        term,
        ...(OFF_TOPIC_TERM_EXPANSIONS[term] || []),
      ])
    )
  ).filter((term) => term && !contextText.includes(term.toLowerCase()));
  if (bannedTerms.length === 0) {
    return { ...titleGrounding, hits: [] };
  }

  const supportText = collectSupportTextSegments(lessonLike)
    .map((segment) => segment.text)
    .join(" ")
    .toLowerCase();
  const hits = bannedTerms.filter((term) => supportText.includes(term.toLowerCase()));
  return { ...titleGrounding, hits };
}

export function validateKazakhSupportContent(lesson) {
  if (lesson?.targetLanguage !== "Kazakh") {
    return { valid: true, reasons: [], titleGrounding: getLessonTitleGroundingInfo(lesson || {}) };
  }

  const reasons = [];
  const segments = collectSupportTextSegments(lesson);
  const proseSegments = segments.filter((segment) => {
    const stats = getScriptStats(segment.text);
    return stats.letters >= 16 && !/^(AI|GPT|API|URL|HTML|CSS|SQL|Python|JavaScript)$/i.test(segment.text);
  });

  let lowCyrillicCount = 0;
  let latinKazakhLikeCount = 0;
  let russianLikeCount = 0;
  proseSegments.forEach((segment) => {
    const stats = getScriptStats(segment.text);
    if (stats.cyrillicRatio < 0.45) lowCyrillicCount += 1;
    if (stats.latinRatio > 0.5 && /(?:q|w|ng|gh|sh|ch|zh|ya|yu|kh)/i.test(segment.text)) {
      latinKazakhLikeCount += 1;
    }
    const russianHits = getRussianWordHitCount(segment.text);
    if (russianHits >= 3 && stats.kazakhSpecific === 0) russianLikeCount += 1;
  });

  if (proseSegments.length > 0 && lowCyrillicCount / proseSegments.length > 0.25) {
    reasons.push("kazakh_support_low_cyrillic_ratio");
  }
  if (latinKazakhLikeCount > 0) {
    reasons.push("kazakh_support_latin_kazakh_detected");
  }
  if (russianLikeCount > 0 && russianLikeCount / Math.max(1, proseSegments.length) > 0.15) {
    reasons.push("kazakh_support_appears_russian");
  }

  const titleTopic = getUnsupportedTitleTopicHits(lesson);
  if (titleTopic.hits.length > 0) {
    reasons.push(`off_topic_title_terms:${titleTopic.hits.join(",")}`);
  }

  return {
    valid: reasons.length === 0,
    reasons,
    titleGrounding: titleTopic,
    checkedSegmentCount: proseSegments.length,
  };
}

function buildNormalizedSupportPreview(raw, fallbackInput, translation) {
  const quizSettings = normalizeQuizSettings(raw?.quizSettings || fallbackInput.quizSettings);
  const normalizedQuiz = normalizeQuizItems(raw?.quiz, quizSettings, fallbackInput.targetLanguage);
  const quizGrounding = filterOffTopicQuizItems(normalizedQuiz, {
    lessonTitle: raw?.lessonTitle || fallbackInput.lessonTitle,
    sourceText: fallbackInput.sourceText,
    translation,
  });
  return {
    lessonTitle: String(raw?.lessonTitle || fallbackInput.lessonTitle || getRuntimeUiText().untitledLesson).trim(),
    sourceText: fallbackInput.sourceText,
    targetLanguage: fallbackInput.targetLanguage,
    translation,
    glossary: normalizeGlossaryItems(raw?.glossary),
    simplifiedExplanation: String(raw?.simplifiedExplanation || raw?.explanation || "").trim(),
    learningObjectives: normalizeStringArray(raw?.learningObjectives, 5),
    keyConcepts: normalizeObjectArray(raw?.keyConcepts, ["title", "explanation"], 5),
    commonMisconceptions: normalizeObjectArray(
      raw?.commonMisconceptions,
      ["misconception", "correction"],
      4
    ),
    teacherNotes: normalizeTeacherNotes(raw?.teacherNotes),
    classroomActivities: normalizeObjectArray(
      raw?.classroomActivities,
      ["title", "duration", "instructions"],
      3
    ),
    differentiatedSupport: normalizeDifferentiatedSupport(raw?.differentiatedSupport),
    extensionQuestions: normalizeStringArray(raw?.extensionQuestions, 4),
    studentWorksheet: normalizeObjectArray(raw?.studentWorksheet, ["taskTitle", "instructions"], 4),
    quizSettings,
    quiz: quizGrounding.quiz,
    mode: fallbackInput.mode,
    droppedOffTopicQuizItems: quizGrounding.droppedOffTopicQuizItems,
    lessonTitleUsedForGeneration: quizGrounding.lessonTitleUsedForGeneration,
    lessonTitleMismatchSuspected: quizGrounding.lessonTitleMismatchSuspected,
  };
}

export function getSupportCompletenessIssues(lessonLike) {
  const counts = getSupportFieldCounts(lessonLike);
  const isKazakh = lessonLike?.targetLanguage === "Kazakh";
  const isTeacherMode = String(lessonLike?.mode || "teacher") === "teacher";
  const missingCriticalFields = [];
  const missingOptionalFields = [];
  const incompleteFields = [];
  const incompleteFieldDetails = [];
  const addMissing = (field, kind, reason) => {
    if (kind === "critical") missingCriticalFields.push(field);
    else missingOptionalFields.push(field);
    incompleteFieldDetails.push({ field, kind: "missing", reason });
  };
  const addIncomplete = (field, details) => {
    incompleteFields.push(field);
    incompleteFieldDetails.push({ field, kind: "incomplete", details });
  };

  const criticalMinimums = isKazakh
    ? { glossary: 3, quiz: 3, learningObjectives: 2, keyConcepts: 2 }
    : { glossary: 1, quiz: 1, learningObjectives: 1, keyConcepts: 1 };

  Object.entries(criticalMinimums).forEach(([field, minimum]) => {
    if (Number(counts[field] || 0) < minimum) {
      addMissing(field, "critical", `${field}_below_minimum:${counts[field] || 0}/${minimum}`);
    }
  });

  if (!String(lessonLike?.simplifiedExplanation || "").trim()) {
    addMissing("simplifiedExplanation", "critical", "simplifiedExplanation_empty");
  }

  const glossaryIssues = getIncompleteObjectArrayFields(lessonLike?.glossary, ["term", "explanation"]);
  if (glossaryIssues.length > 0) addIncomplete("glossary", glossaryIssues);
  const keyConceptIssues = getIncompleteObjectArrayFields(lessonLike?.keyConcepts, ["title", "explanation"]);
  if (keyConceptIssues.length > 0) addIncomplete("keyConcepts", keyConceptIssues);

  const teacherMinimums = {
    commonMisconceptions: 1,
    teacherNotes: 1,
    classroomActivities: 1,
    extensionQuestions: 1,
  };
  if (isTeacherMode) {
    Object.entries(teacherMinimums).forEach(([field, minimum]) => {
      if (Number(counts[field] || 0) < minimum) {
        addMissing(field, "optional", `${field}_below_teacher_minimum:${counts[field] || 0}/${minimum}`);
      }
    });
  } else {
    const hasPracticalSupport =
      Number(counts.teacherNotes || 0) > 0 ||
      Number(counts.classroomActivities || 0) > 0;
    if (isKazakh && !hasPracticalSupport) {
      addMissing("teacherNotes", "optional", "kazakh_practical_support_empty");
    }
  }

  const misconceptionIssues = getIncompleteObjectArrayFields(
    lessonLike?.commonMisconceptions,
    ["misconception", "correction"]
  );
  if (misconceptionIssues.length > 0) addIncomplete("commonMisconceptions", misconceptionIssues);
  const activityIssues = getIncompleteObjectArrayFields(
    lessonLike?.classroomActivities,
    ["title", "duration", "instructions"]
  );
  if (activityIssues.length > 0) addIncomplete("classroomActivities", activityIssues);

  return {
    missingCriticalFields: Array.from(new Set(missingCriticalFields)),
    missingOptionalFields: Array.from(new Set(missingOptionalFields)),
    incompleteFields: Array.from(new Set(incompleteFields)),
    incompleteFieldDetails,
  };
}

export function validateSupportCompleteness(lessonLike) {
  const counts = getSupportFieldCounts(lessonLike);
  const issues = getSupportCompletenessIssues(lessonLike);
  const supportCompletenessReasons = issues.incompleteFieldDetails.map((item) =>
    item.kind === "missing" ? item.reason || `${item.field}_missing` : `${item.field}_incomplete`
  );
  const missingCompletionFields = Array.from(
    new Set([
      ...issues.missingCriticalFields,
      ...issues.missingOptionalFields,
      ...issues.incompleteFields,
    ].filter(Boolean))
  );

  return {
    supportCompletenessPassed: missingCompletionFields.length === 0,
    supportCompletenessReasons,
    missingCriticalSupportFields: issues.missingCriticalFields,
    missingOptionalSupportFields: issues.missingOptionalFields,
    missingCompletionFields,
    supportIncompleteFields: issues.incompleteFields,
    incompleteFieldDetails: issues.incompleteFieldDetails,
    supportFieldCounts: counts,
  };
}

function mergeMissingSupportFields(primary, supplemental, fields) {
  const result = {
    ...(primary && typeof primary === "object" ? primary : {}),
  };
  const patch = supplemental && typeof supplemental === "object" && !Array.isArray(supplemental)
    ? supplemental
    : {};
  (Array.isArray(fields) ? fields : [])
    .filter((field) => isActiveSupportField(field)) // Only merge active fields
    .forEach((field) => {
      if (!field || !hasSupportValue(patch[field])) return;
      result[field] = patch[field];
    });
  result.meta = {
    ...(result.meta || {}),
    ...(patch.meta || {}),
  };
  return result;
}

export async function generateTeachingSupportWithModel(fallbackInput, translation, runContext = null) {
  setActiveEnrichmentRunContext(runContext || {});
  throwIfGenerationCancelled(runContext);

  const enrichmentStartedAt = Date.now();
  const metrics = {
    apiCallCount: 0,
    enrichmentFirstAttemptDurationMs: 0,
    enrichmentCompactRetryDurationMs: 0,
    missingFieldCompletionDurationMs: 0,
  };
  if (runContext) runContext.enrichmentMetrics = metrics;

  let titleGrounding;
  let messages;

  try {
    titleGrounding = getLessonTitleGroundingInfo({
      lessonTitle: fallbackInput.lessonTitle,
      sourceText: fallbackInput.sourceText,
      translation,
    });
    messages = buildLessonEnrichmentMessages({
      ...fallbackInput,
      translation,
    });
  } catch (setupErr) {
    // If message building fails, return fallback with clear error
    if (isGenerationCancelledError(setupErr)) throw setupErr;
    return createSafeEnrichmentFallbackLesson(fallbackInput, translation, {
      reason: `enrichment_setup_failed:${setupErr?.message || "unknown"}`,
      retryAttempted: false,
      enrichmentApiCallCount: 0,
      stageBEnrichmentDurationMs: Date.now() - enrichmentStartedAt,
    }, runContext);
  }

  let parsed;
  let malformedContent = "";
  let enrichmentRetryAttempted = false;
  let enrichmentFirstAttemptEmpty = false;
  let enrichmentFirstAttemptInvalid = false;
  let enrichmentRichRetryAttempted = false;
  let enrichmentCompactCompleteRetryAttempted = false;
  let enrichmentMinimalFallbackAttempted = false;
  let minimalFallbackUsed = false;
  let failureReason = "";
  let kazakhValidationResult = { valid: true, reasons: [] };
  let kazakhValidationRetryAttempted = false;
  let supportCompletenessResult = {
    supportCompletenessPassed: false,
    supportCompletenessReasons: [],
    missingCriticalSupportFields: [],
    missingCompletionFields: [],
    supportFieldCounts: {},
  };
  let supportMissingFieldCompletionAttempted = false;
  let supportMissingFieldCompletionSucceeded = false;
  let supportMissingFieldCompletionFields = [];

  async function timedRequestParsedEnrichment(messagesForRequest, durationKey) {
    const startedAt = Date.now();
    try {
      return await requestParsedEnrichment(messagesForRequest, runContext);
    } finally {
      if (durationKey) {
        metrics[durationKey] = Number(metrics[durationKey] || 0) + (Date.now() - startedAt);
      }
    }
  }
  try {
    const result = await timedRequestParsedEnrichment(messages, "enrichmentFirstAttemptDurationMs");
    malformedContent = result.content;
    parsed = result.parsed;
  } catch (err) {
    if (isGenerationCancelledError(err)) throw err;
    malformedContent = err?.enrichmentContent || malformedContent;
    failureReason = formatEnrichmentFailureReason(err);
    enrichmentFirstAttemptEmpty = isEmptyModelOutputError(err);
    enrichmentFirstAttemptInvalid = !enrichmentFirstAttemptEmpty;
    logEnrichmentRecovery("initial output could not be parsed; trying compact-complete retry.", err);
    enrichmentRetryAttempted = true;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    enrichmentRetryAttempted = true;
    enrichmentCompactCompleteRetryAttempted = true;
    try {
      const retryResult = await timedRequestParsedEnrichment(
        buildCompactRichLessonEnrichmentMessages({
          ...fallbackInput,
          translation,
        }),
        "enrichmentCompactRetryDurationMs"
      );
      malformedContent = retryResult.content;
      parsed = mergeEnrichmentPayloads(parsed, retryResult.parsed);
    } catch (retryErr) {
      if (isGenerationCancelledError(retryErr)) throw retryErr;
      malformedContent = retryErr?.enrichmentContent || malformedContent;
      failureReason = formatEnrichmentFailureReason(retryErr);
      logEnrichmentRecovery("complete rich retry output could not be parsed; trying JSON repair.", retryErr);
      if (typeof console !== "undefined" && console.info) {
        console.info("[AI enrichment] JSON repair retry is being used.");
      }
      if (malformedContent) {
        try {
          metrics.apiCallCount = Number(metrics.apiCallCount || 0) + 1;
          const repairedContent = await callModelChat(
            buildEnrichmentJsonRepairMessages(malformedContent),
            {
              stage: "json_repair",
              options: MODEL_ENRICHMENT_OPTIONS,
              format: "json",
              signal: runContext?.signal,
            }
          );
          throwIfGenerationCancelled(runContext);
          parsed = mergeEnrichmentPayloads(parsed, parseEnrichmentJsonPayload(repairedContent));
        } catch (repairErr) {
          if (isGenerationCancelledError(repairErr)) throw repairErr;
          failureReason = formatEnrichmentFailureReason(repairErr);
          logEnrichmentRecovery("rich JSON repair failed; trying minimal fallback.", repairErr);
        }
      }
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    enrichmentMinimalFallbackAttempted = true;
    try {
      const minimalResult = await timedRequestParsedEnrichment(
        buildMinimalLessonEnrichmentMessages({
          ...fallbackInput,
          translation,
        }),
        ""
      );
      parsed = minimalResult.parsed;
      minimalFallbackUsed = true;
      failureReason = failureReason || "complete_rich_enrichment_failed";
    } catch (minimalErr) {
      if (isGenerationCancelledError(minimalErr)) throw minimalErr;
      failureReason = formatEnrichmentFailureReason(minimalErr);
      return createSafeEnrichmentFallbackLesson(fallbackInput, translation, {
        reason: failureReason || getRuntimeUiText().aiNoJson,
        retryAttempted: enrichmentRetryAttempted,
        firstAttemptEmpty: enrichmentFirstAttemptEmpty,
        firstAttemptInvalid: enrichmentFirstAttemptInvalid,
        richRetryAttempted: enrichmentRichRetryAttempted,
        compactCompleteRetryAttempted: enrichmentCompactCompleteRetryAttempted,
        minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
        enrichmentApiCallCount: metrics.apiCallCount,
        stageBEnrichmentDurationMs: Date.now() - enrichmentStartedAt,
      });
    }
  }

  // Early completeness check: if first attempt succeeded and is complete, skip retries
  const missingCoreFields = getMissingCoreEnrichmentFields(parsed);
  let earlyCompletenessCheck = null;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && missingCoreFields.length === 0) {
    earlyCompletenessCheck = validateSupportCompleteness(
      buildNormalizedSupportPreview(parsed, fallbackInput, translation)
    );
    if (earlyCompletenessCheck.supportCompletenessPassed) {
      // First attempt is complete, skip all retries
      supportCompletenessResult = earlyCompletenessCheck;
    }
  }

  const shouldRetryForMissingCore =
    !earlyCompletenessCheck?.supportCompletenessPassed &&
    missingCoreFields.length > 0 &&
    !minimalFallbackUsed;

  if (shouldRetryForMissingCore) {
    enrichmentRetryAttempted = true;
    enrichmentCompactCompleteRetryAttempted = true;
    try {
      const retryResult = await timedRequestParsedEnrichment(
        buildCompactRichLessonEnrichmentMessages({
          ...fallbackInput,
          translation,
        }),
        "enrichmentCompactRetryDurationMs"
      );
      parsed = mergeEnrichmentPayloads(parsed, retryResult.parsed);
      failureReason = failureReason || "complete_enrichment_missing_core_fields";
    } catch (minimalErr) {
      if (isGenerationCancelledError(minimalErr)) throw minimalErr;
      failureReason = formatEnrichmentFailureReason(minimalErr);
      warnEnrichmentParseFailure("minimal enrichment fallback failed; using safe local teaching-support fallback.", minimalErr);
      return createSafeEnrichmentFallbackLesson(fallbackInput, translation, {
        reason: failureReason || getRuntimeUiText().aiNoJson,
        retryAttempted: enrichmentRetryAttempted,
        firstAttemptEmpty: enrichmentFirstAttemptEmpty,
        firstAttemptInvalid: enrichmentFirstAttemptInvalid,
        richRetryAttempted: enrichmentRichRetryAttempted,
        compactCompleteRetryAttempted: enrichmentCompactCompleteRetryAttempted,
        minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
        enrichmentApiCallCount: metrics.apiCallCount,
        stageBEnrichmentDurationMs: Date.now() - enrichmentStartedAt,
      });
    }
  }

  // Only validate completeness if we haven't already done early check
  if (!earlyCompletenessCheck) {
    supportCompletenessResult = validateSupportCompleteness(
      buildNormalizedSupportPreview(parsed, fallbackInput, translation)
    );
  }

  const shouldAttemptMissingFieldCompletion =
    !shouldRetryForMissingCore &&
    !earlyCompletenessCheck?.supportCompletenessPassed &&
    !supportCompletenessResult.supportCompletenessPassed &&
    supportCompletenessResult.missingCompletionFields.length > 0;

  if (shouldAttemptMissingFieldCompletion) {
    supportMissingFieldCompletionAttempted = true;
    supportMissingFieldCompletionFields = supportCompletenessResult.missingCompletionFields;
    enrichmentRetryAttempted = true;
    try {
      const completionResult = await timedRequestParsedEnrichment(
        buildMissingSupportCompletionMessages({
          ...fallbackInput,
          translation,
          existingSupport: buildNormalizedSupportPreview(parsed, fallbackInput, translation),
          missingFields: supportCompletenessResult.missingCompletionFields,
        }),
        "missingFieldCompletionDurationMs"
      );
      parsed = mergeMissingSupportFields(
        parsed,
        completionResult.parsed,
        supportCompletenessResult.missingCompletionFields
      );
      supportCompletenessResult = validateSupportCompleteness(
        buildNormalizedSupportPreview(parsed, fallbackInput, translation)
      );
      supportMissingFieldCompletionSucceeded = supportCompletenessResult.supportCompletenessPassed;
      if (!supportMissingFieldCompletionSucceeded) {
        failureReason = `support_completion_incomplete:${supportCompletenessResult.supportCompletenessReasons.join(",")}`;
      }
    } catch (completionErr) {
      if (isGenerationCancelledError(completionErr)) throw completionErr;
      failureReason = formatEnrichmentFailureReason(completionErr);
      logEnrichmentRecovery("missing-field support completion failed.", completionErr);
    }
  }

  if (fallbackInput.targetLanguage === "Kazakh") {
    const lessonForValidation = {
      ...buildNormalizedSupportPreview(parsed, fallbackInput, translation),
      lessonTitle: titleGrounding.lessonTitleUsedForGeneration
        ? parsed.lessonTitle || fallbackInput.lessonTitle
        : fallbackInput.lessonTitle,
    };
    kazakhValidationResult = validateKazakhSupportContent(lessonForValidation);

    if (!kazakhValidationResult.valid) {
      enrichmentRetryAttempted = true;
      enrichmentCompactCompleteRetryAttempted = true;
      kazakhValidationRetryAttempted = true;
      failureReason = `kazakh_validation_failed:${kazakhValidationResult.reasons.join(",")}`;
      logEnrichmentRecovery("Kazakh support validation failed; trying compact-complete retry.", {
        reasons: kazakhValidationResult.reasons,
      });
      try {
        const retryResult = await timedRequestParsedEnrichment(
          buildCompactRichLessonEnrichmentMessages({
            ...fallbackInput,
            translation,
          }),
          "enrichmentCompactRetryDurationMs"
        );
        parsed = retryResult.parsed;
        supportCompletenessResult = validateSupportCompleteness(
          buildNormalizedSupportPreview(parsed, fallbackInput, translation)
        );
        supportMissingFieldCompletionSucceeded =
          supportMissingFieldCompletionAttempted &&
          supportCompletenessResult.supportCompletenessPassed;
        kazakhValidationResult = validateKazakhSupportContent({
          ...buildNormalizedSupportPreview(parsed, fallbackInput, translation),
          lessonTitle: titleGrounding.lessonTitleUsedForGeneration
            ? parsed.lessonTitle || fallbackInput.lessonTitle
            : fallbackInput.lessonTitle,
        });
        if (!kazakhValidationResult.valid) {
          return createSafeEnrichmentFallbackLesson(fallbackInput, translation, {
            reason: `kazakh_validation_failed_after_retry:${kazakhValidationResult.reasons.join(",")}`,
            retryAttempted: enrichmentRetryAttempted,
            firstAttemptEmpty: enrichmentFirstAttemptEmpty,
            firstAttemptInvalid: enrichmentFirstAttemptInvalid,
            richRetryAttempted: enrichmentRichRetryAttempted,
            compactCompleteRetryAttempted: enrichmentCompactCompleteRetryAttempted,
            minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
            kazakhValidationReasons: kazakhValidationResult.reasons,
            enrichmentApiCallCount: metrics.apiCallCount,
            stageBEnrichmentDurationMs: Date.now() - enrichmentStartedAt,
          });
        }
      } catch (retryErr) {
        if (isGenerationCancelledError(retryErr)) throw retryErr;
        failureReason = formatEnrichmentFailureReason(retryErr);
        return createSafeEnrichmentFallbackLesson(fallbackInput, translation, {
          reason: failureReason || "kazakh_compact_complete_retry_failed",
          retryAttempted: enrichmentRetryAttempted,
          firstAttemptEmpty: enrichmentFirstAttemptEmpty,
          firstAttemptInvalid: enrichmentFirstAttemptInvalid,
          richRetryAttempted: enrichmentRichRetryAttempted,
          compactCompleteRetryAttempted: enrichmentCompactCompleteRetryAttempted,
          minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
          kazakhValidationReasons: kazakhValidationResult.reasons,
          enrichmentApiCallCount: metrics.apiCallCount,
          stageBEnrichmentDurationMs: Date.now() - enrichmentStartedAt,
        });
      }
    }
  }

  // Only re-validate if we haven't already validated or if Kazakh retry happened
  if (!supportCompletenessResult.supportCompletenessPassed || kazakhValidationRetryAttempted) {
    supportCompletenessResult = validateSupportCompleteness(
      buildNormalizedSupportPreview(parsed, fallbackInput, translation)
    );
  }

  if (
    enrichmentCompactCompleteRetryAttempted &&
    (!supportMissingFieldCompletionAttempted || kazakhValidationRetryAttempted) &&
    !supportCompletenessResult.supportCompletenessPassed &&
    supportCompletenessResult.missingCompletionFields.length > 0
  ) {
    supportMissingFieldCompletionAttempted = true;
    supportMissingFieldCompletionFields = supportCompletenessResult.missingCompletionFields;
    enrichmentRetryAttempted = true;
    try {
      const completionResult = await timedRequestParsedEnrichment(
        buildMissingSupportCompletionMessages({
          ...fallbackInput,
          translation,
          existingSupport: buildNormalizedSupportPreview(parsed, fallbackInput, translation),
          missingFields: supportCompletenessResult.missingCompletionFields,
        }),
        "missingFieldCompletionDurationMs"
      );
      parsed = mergeMissingSupportFields(
        parsed,
        completionResult.parsed,
        supportCompletenessResult.missingCompletionFields
      );
      supportCompletenessResult = validateSupportCompleteness(
        buildNormalizedSupportPreview(parsed, fallbackInput, translation)
      );
      supportMissingFieldCompletionSucceeded = supportCompletenessResult.supportCompletenessPassed;
    } catch (completionErr) {
      if (isGenerationCancelledError(completionErr)) throw completionErr;
      failureReason = formatEnrichmentFailureReason(completionErr);
      logEnrichmentRecovery("post-compact missing-field support completion failed.", completionErr);
    }
  }
  if (supportMissingFieldCompletionAttempted) {
    supportMissingFieldCompletionSucceeded = supportCompletenessResult.supportCompletenessPassed;
  }
  const normalizedSupportForSummary = buildNormalizedSupportPreview(parsed, fallbackInput, translation);
  const supportSummary = getGeneratedSupportFieldSummary(normalizedSupportForSummary);
  const teachingSupportFallbackUsed = Boolean(
    !supportCompletenessResult.supportCompletenessPassed
  );
  const unnecessaryRetryPrevented = Boolean(
    !enrichmentRichRetryAttempted &&
      !enrichmentCompactCompleteRetryAttempted &&
      !supportMissingFieldCompletionAttempted &&
      !teachingSupportFallbackUsed
  );
  const supportSource = teachingSupportFallbackUsed
    ? "mixed-online-defaults"
    : supportMissingFieldCompletionAttempted
    ? "mixed-online-completion"
    : "online-api";

  return {
    ...parsed,
    lessonTitle: titleGrounding.lessonTitleUsedForGeneration
      ? parsed.lessonTitle || fallbackInput.lessonTitle
      : fallbackInput.lessonTitle,
    translation,
    quizSettings: parsed.quizSettings || fallbackInput.quizSettings,
    meta: {
      ...(parsed.meta || {}),
      usedFallback: false,
      reason: "",
      enrichmentAttempted: true,
      enrichmentFirstAttemptEmpty,
      enrichmentFirstAttemptInvalid,
      enrichmentRichRetryAttempted,
      enrichmentCompactCompleteRetryAttempted,
      enrichmentMinimalFallbackAttempted,
      enrichmentRetryAttempted,
      enrichmentUsedFallback: Boolean(minimalFallbackUsed && teachingSupportFallbackUsed),
      enrichmentFailureReason: teachingSupportFallbackUsed
        ? failureReason || "teaching_support_partially_generated"
        : "",
      teachingSupportFallbackUsed,
      teachingSupportFallbackReason: teachingSupportFallbackUsed
        ? failureReason || supportCompletenessResult.supportCompletenessReasons.join(",") || "teaching_support_partially_generated"
        : "",
      supportSource,
      supportCompletenessPassed: supportCompletenessResult.supportCompletenessPassed,
      supportCompletenessReasons: supportCompletenessResult.supportCompletenessReasons,
      missingCriticalSupportFields: supportCompletenessResult.missingCriticalSupportFields,
      missingOptionalSupportFields: supportCompletenessResult.missingOptionalSupportFields || [],
      supportIncompleteFields: supportCompletenessResult.supportIncompleteFields || [],
      incompleteFieldDetails: supportCompletenessResult.incompleteFieldDetails || [],
      supportMissingFieldCompletionAttempted,
      supportMissingFieldCompletionSucceeded,
      supportMissingFieldCompletionFields,
      enrichmentApiCallCount: metrics.apiCallCount,
      enrichmentFirstAttemptDurationMs: metrics.enrichmentFirstAttemptDurationMs,
      enrichmentCompactRetryDurationMs: metrics.enrichmentCompactRetryDurationMs,
      missingFieldCompletionDurationMs: metrics.missingFieldCompletionDurationMs,
      stageBEnrichmentDurationMs: Date.now() - enrichmentStartedAt,
      unnecessaryRetryPrevented,
      kazakhPromptMode: fallbackInput.targetLanguage === "Kazakh" ? "compact-complete" : "",
      kazakhValidationAttempted: fallbackInput.targetLanguage === "Kazakh",
      kazakhValidationPassed:
        fallbackInput.targetLanguage === "Kazakh"
          ? Boolean(kazakhValidationResult.valid && supportCompletenessResult.supportCompletenessPassed)
          : true,
      kazakhLanguageValidationPassed:
        fallbackInput.targetLanguage === "Kazakh" ? Boolean(kazakhValidationResult.valid) : true,
      kazakhValidationReasons: kazakhValidationResult.reasons || [],
      kazakhValidationRetryAttempted,
      lessonTitleWasUserProvided: Boolean(fallbackInput.lessonTitleWasUserProvided),
      lessonTitleDerivedFromFile: Boolean(fallbackInput.lessonTitleDerivedFromFile),
      lessonTitleUsedForGeneration: titleGrounding.lessonTitleUsedForGeneration,
      lessonTitleMismatchSuspected: titleGrounding.lessonTitleMismatchSuspected,
      droppedOffTopicQuizItems: [],
      provider: MODEL_API_CONFIG.provider,
      model: MODEL_API_CONFIG.enrichmentModel,
      pipelineVersion: PIPELINE_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
      enrichmentQualityVersion: ENRICHMENT_QUALITY_VERSION,
      generatedSupportFields: supportSummary.generatedSupportFields,
      missingOptionalSupportFields: supportSummary.missingOptionalSupportFields,
      supportFieldCounts: supportCompletenessResult.supportFieldCounts,
    },
  };
}



function normalizeGlossaryItems(rawGlossary) {
  if (!Array.isArray(rawGlossary)) return [];
  const seen = new Set();
  return rawGlossary
    .map((item) =>
      typeof item === "string"
        ? {
            term: item.replace(/\s+/g, " ").trim(),
            explanation: "",
          }
        : {
            term: String(item?.term || "").replace(/\s+/g, " ").trim(),
            explanation: String(item?.explanation || "").replace(/\s+/g, " ").trim(),
          }
    )
    .filter((item) => {
      if (!item.term) return false;
      const key = item.term.toLowerCase();
      const plainTerm = key.replace(/[^\p{L}\p{N}\s+-]/gu, "").trim();
      if (seen.has(key)) return false;
      if (plainTerm.split(/\s+/).length === 1 && GLOSSARY_CANDIDATE_STOPWORDS.has(plainTerm)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function normalizeStringArray(value, maxItems = 8) {
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((item) => item.replace(/^[-*•\d.)\s]+/, "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeObjectArray(value, schema, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.replace(/\s+/g, " ").trim();
        if (!text || !schema[0]) return null;
        return { [schema[0]]: text };
      }
      if (!item || typeof item !== "object") return null;
      const normalized = {};
      schema.forEach((field) => {
        normalized[field] = String(item[field] || "").replace(/\s+/g, " ").trim();
      });
      return normalized;
    })
    .filter((item) => item && Object.values(item).some(Boolean))
    .slice(0, maxItems);
}

function normalizeTeacherNotes(value) {
  if (Array.isArray(value)) return normalizeStringArray(value, 8);
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDifferentiatedSupport(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    strugglingLearners: String(raw.strugglingLearners || "").replace(/\s+/g, " ").trim(),
    advancedLearners: String(raw.advancedLearners || "").replace(/\s+/g, " ").trim(),
    languageSupport: String(raw.languageSupport || "").replace(/\s+/g, " ").trim(),
  };
}

export function getGeneratedSupportFieldSummary(lessonLike) {
  const result = {
    generatedSupportFields: [],
    missingOptionalSupportFields: [],
  };
  SUPPORT_FIELD_NAMES.forEach((field) => {
    const value = lessonLike?.[field];
    let hasValue = false;
    if (Array.isArray(value)) {
      hasValue = value.length > 0;
    } else if (value && typeof value === "object") {
      hasValue = Object.values(value).some((item) => Boolean(String(item || "").trim()));
    } else {
      hasValue = Boolean(String(value || "").trim());
    }
    if (hasValue) {
      result.generatedSupportFields.push(field);
    } else {
      result.missingOptionalSupportFields.push(field);
    }
  });
  return result;
}

export function getSupportFieldCounts(lessonLike) {
  const counts = {
    glossary: Array.isArray(lessonLike?.glossary) ? lessonLike.glossary.length : 0,
    quiz: Array.isArray(lessonLike?.quiz) ? lessonLike.quiz.length : 0,
  };
  SUPPORT_FIELD_NAMES.forEach((field) => {
    const value = lessonLike?.[field];
    if (Array.isArray(value)) {
      counts[field] = value.length;
    } else if (value && typeof value === "object") {
      counts[field] = Object.values(value).filter((item) => Boolean(String(item || "").trim())).length;
    } else {
      counts[field] = String(value || "").trim() ? 1 : 0;
    }
  });
  return counts;
}

function getIncompleteObjectArrayFields(items, schema) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];
  return list
    .map((item, index) => {
      const missing = schema.filter((field) => !String(item?.[field] || "").trim());
      return missing.length > 0 ? { index, missing } : null;
    })
    .filter(Boolean);
}

function getSupportIncompleteFields(lessonLike) {
  const incomplete = [];
  if (getIncompleteObjectArrayFields(lessonLike?.keyConcepts, ["title", "explanation"]).length > 0) {
    incomplete.push("keyConcepts");
  }
  if (
    getIncompleteObjectArrayFields(lessonLike?.commonMisconceptions, ["misconception", "correction"]).length > 0
  ) {
    incomplete.push("commonMisconceptions");
  }
  if (
    getIncompleteObjectArrayFields(lessonLike?.classroomActivities, ["title", "duration", "instructions"]).length > 0
  ) {
    incomplete.push("classroomActivities");
  }
  return Array.from(new Set(incomplete));
}

function dedupeTextOptions(options) {
  const seen = new Set();
  const result = [];
  (Array.isArray(options) ? options : []).forEach((option) => {
    const text = String(option || "").replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

function getTrueFalseOptions(targetLanguage) {
  if (targetLanguage === "Kazakh") return ["Дұрыс", "Бұрыс"];
  if (targetLanguage === "Russian") return ["Верно", "Неверно"];
  return ["True", "False"];
}

function normalizeQuizItems(rawQuiz, quizSettings, targetLanguage) {
  if (!Array.isArray(rawQuiz)) return [];
  const allowedTypes = new Set(quizSettings.questionTypes || ["multiple_choice"]);
  const normalized = [];

  for (const item of rawQuiz) {
    if (!item || typeof item !== "object") continue;
    const type = String(item.type || "multiple_choice").trim().toLowerCase();
    if (!["multiple_choice", "true_false", "short_answer"].includes(type)) continue;
    if (!allowedTypes.has(type)) continue;

    const question = String(item.question || "").replace(/\s+/g, " ").trim();
    const explanation = String(item.explanation || "").replace(/\s+/g, " ").trim();
    if (!question) continue;
    if (/^(explain the topic|what is this about)\??$/i.test(question)) continue;

    if (type === "short_answer") {
      const answerText = clipText(item.answerText || item.answer || "", 220);
      if (!answerText) continue;
      normalized.push({ type, question, answerText, explanation });
      continue;
    }

    if (type === "true_false") {
      const defaults = getTrueFalseOptions(targetLanguage);
      const options = dedupeTextOptions(item.options).slice(0, 2);
      while (options.length < 2) {
        options.push(defaults[options.length]);
      }
      let answerIndex = Number.isInteger(item.answerIndex) ? item.answerIndex : 0;
      answerIndex = answerIndex === 1 ? 1 : 0;
      normalized.push({ type, question, options: options.slice(0, 2), answerIndex, explanation });
      continue;
    }

    const options = dedupeTextOptions(item.options);
    const rawAnswerIndex = Number.isInteger(item.answerIndex) ? item.answerIndex : 0;
    const answerText = String(item.answerText || item.answer || "").trim();
    let answerIndex = rawAnswerIndex;
    if (answerText) {
      const matched = options.findIndex(
        (option) => option.toLowerCase() === answerText.toLowerCase()
      );
      if (matched >= 0) answerIndex = matched;
    }
    if (options.length < 4) continue;
    const trimmedOptions = options.slice(0, 4);
    if (answerIndex < 0 || answerIndex >= trimmedOptions.length) answerIndex = 0;
    normalized.push({
      type,
      question,
      options: trimmedOptions,
      answerIndex,
      explanation,
    });
  }

  return normalized.slice(0, quizSettings.questionCount || defaultQuizSettings.questionCount);
}

function filterOffTopicQuizItems(quiz, { lessonTitle, sourceText, translation }) {
  const titleGrounding = getLessonTitleGroundingInfo({ lessonTitle, sourceText, translation });
  const bannedTerms = titleGrounding.lessonTitleMismatchSuspected
    ? Array.from(
        new Set(
          titleGrounding.unsupportedTitleTerms.flatMap((term) => [
            term,
            ...(OFF_TOPIC_TERM_EXPANSIONS[term] || []),
          ])
        )
      )
    : [];
  if (!Array.isArray(quiz) || bannedTerms.length === 0) {
    return {
      quiz: Array.isArray(quiz) ? quiz : [],
      droppedOffTopicQuizItems: [],
      ...titleGrounding,
    };
  }

  const droppedOffTopicQuizItems = [];
  const filteredQuiz = quiz.filter((item, index) => {
    const itemText = [
      item?.question,
      item?.answerText,
      item?.explanation,
      ...(Array.isArray(item?.options) ? item.options : []),
    ]
      .join(" ")
      .toLowerCase();
    const matchedTerms = bannedTerms.filter((term) => itemText.includes(term));
    if (matchedTerms.length === 0) return true;
    droppedOffTopicQuizItems.push({
      index,
      matchedTerms,
      question: clipText(item?.question || "", 180),
    });
    return false;
  });

  return {
    quiz: filteredQuiz,
    droppedOffTopicQuizItems,
    ...titleGrounding,
  };
}

export function normalizeLessonResult(raw, fallbackInput, fallbackTranslation = "", runContext = {}) {
  setActiveEnrichmentRunContext(runContext);
  if (!raw || typeof raw !== "object") {
    if (String(fallbackTranslation || "").trim()) {
      return createSafeEnrichmentFallbackLesson(fallbackInput, fallbackTranslation, {
        reason: "enrichment_normalization_invalid_payload",
        retryAttempted: true,
        enrichmentApiCallCount: raw?.meta?.enrichmentApiCallCount || 0,
        stageBEnrichmentDurationMs: raw?.meta?.stageBEnrichmentDurationMs || 0,
      });
    }
    return createLocalFallbackLesson(fallbackInput);
  }

  const quizSettings = normalizeQuizSettings(raw.quizSettings || fallbackInput.quizSettings);
  const translation = String(raw.translation || fallbackTranslation || "").trim();
  let simplifiedExplanation = String(
    raw.simplifiedExplanation || raw.explanation || ""
  ).trim();

  const glossary = normalizeGlossaryItems(raw.glossary);
  const normalizedQuiz = normalizeQuizItems(raw.quiz, quizSettings, fallbackInput.targetLanguage);
  const quizGrounding = filterOffTopicQuizItems(normalizedQuiz, {
    lessonTitle: raw.lessonTitle || fallbackInput.lessonTitle,
    sourceText: fallbackInput.sourceText,
    translation,
  });
  const quiz = quizGrounding.quiz;
  const quizMissingBecauseOffTopic =
    normalizedQuiz.length > 0 &&
    quiz.length === 0 &&
    quizGrounding.droppedOffTopicQuizItems.length > 0;
  const learningObjectives = normalizeStringArray(raw.learningObjectives, 5);
  const keyConcepts = normalizeObjectArray(raw.keyConcepts, ["title", "explanation"], 5);
  const commonMisconceptions = normalizeObjectArray(
    raw.commonMisconceptions,
    ["misconception", "correction"],
    4
  );
  const teacherNotes = normalizeTeacherNotes(raw.teacherNotes);
  const classroomActivities = normalizeObjectArray(
    raw.classroomActivities,
    ["title", "duration", "instructions"],
    3
  );
  const differentiatedSupport = normalizeDifferentiatedSupport(raw.differentiatedSupport);
  const extensionQuestions = normalizeStringArray(raw.extensionQuestions, 4);
  const studentWorksheet = normalizeObjectArray(
    raw.studentWorksheet,
    ["taskTitle", "instructions"],
    4
  );

  const enrichmentUsedFallback = Boolean(raw.meta?.enrichmentUsedFallback);
  const enrichmentAttempted = Boolean(raw.meta?.enrichmentAttempted || fallbackTranslation);
  const missingCoreSupport =
    glossary.length === 0 ||
    !simplifiedExplanation ||
    (quiz.length === 0 && !quizMissingBecauseOffTopic);

  if (!translation) {
    return createLocalFallbackLesson(fallbackInput);
  }

  if (!enrichmentAttempted && !enrichmentUsedFallback && missingCoreSupport) {
    return createSafeEnrichmentFallbackLesson(fallbackInput, translation, {
      reason: "enrichment_normalization_missing_core_support",
      retryAttempted: true,
      enrichmentApiCallCount: raw?.meta?.enrichmentApiCallCount || 0,
      stageBEnrichmentDurationMs: raw?.meta?.stageBEnrichmentDurationMs || 0,
    });
  }

  if (!simplifiedExplanation && (enrichmentAttempted || enrichmentUsedFallback)) {
    simplifiedExplanation = getSafeEnrichmentFallbackExplanation(fallbackInput.targetLanguage);
  }

  const supportSummary = getGeneratedSupportFieldSummary({
    glossary,
    quiz,
    learningObjectives,
    keyConcepts,
    commonMisconceptions,
    teacherNotes,
    classroomActivities,
    differentiatedSupport,
    extensionQuestions,
    studentWorksheet,
  });
  const supportCompleteness = validateSupportCompleteness({
    sourceText: fallbackInput.sourceText,
    targetLanguage: fallbackInput.targetLanguage,
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
    quiz,
  });
  const teachingSupportFallbackUsed = Boolean(
    raw.meta?.teachingSupportFallbackUsed ||
      !supportCompleteness.supportCompletenessPassed
  );
  const supportSource =
    raw.meta?.supportSource ||
    (teachingSupportFallbackUsed
      ? raw.meta?.provider === MODEL_API_CONFIG.provider || raw.meta?.provider === "online-api"
        ? "mixed-online-defaults"
        : "local-fallback"
      : "online-api");

  return {
    lessonTitle: String(
      raw.lessonTitle || fallbackInput.lessonTitle || getRuntimeUiText().untitledLesson
    ).trim(),
    sourceText: fallbackInput.sourceText,
    targetLanguage: fallbackInput.targetLanguage,
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
    mode: fallbackInput.mode,
    meta: {
      ...(raw.meta || {}),
      usedFallback: Boolean(raw.meta?.usedFallback),
      reason: raw.meta?.reason || "",
      enrichmentQualityVersion: ENRICHMENT_QUALITY_VERSION,
      enrichmentAttempted,
      enrichmentRetryAttempted: Boolean(raw.meta?.enrichmentRetryAttempted),
      enrichmentFirstAttemptEmpty: Boolean(raw.meta?.enrichmentFirstAttemptEmpty),
      enrichmentFirstAttemptInvalid: Boolean(raw.meta?.enrichmentFirstAttemptInvalid),
      enrichmentRichRetryAttempted: Boolean(raw.meta?.enrichmentRichRetryAttempted),
      enrichmentCompactCompleteRetryAttempted: Boolean(raw.meta?.enrichmentCompactCompleteRetryAttempted),
      enrichmentMinimalFallbackAttempted: Boolean(raw.meta?.enrichmentMinimalFallbackAttempted),
      enrichmentUsedFallback,
      enrichmentFailureReason: raw.meta?.enrichmentFailureReason || "",
      teachingSupportFallbackUsed,
      teachingSupportFallbackReason:
        raw.meta?.teachingSupportFallbackReason ||
        (teachingSupportFallbackUsed
          ? raw.meta?.enrichmentFailureReason ||
            supportCompleteness.supportCompletenessReasons.join(",") ||
            "teaching_support_partially_generated"
          : ""),
      supportSource,
      supportCompletenessPassed:
        raw.meta?.supportCompletenessPassed ?? supportCompleteness.supportCompletenessPassed,
      supportCompletenessReasons:
        raw.meta?.supportCompletenessReasons || supportCompleteness.supportCompletenessReasons,
      missingCriticalSupportFields:
        raw.meta?.missingCriticalSupportFields || supportCompleteness.missingCriticalSupportFields,
      missingOptionalSupportFields:
        raw.meta?.missingOptionalSupportFields || supportCompleteness.missingOptionalSupportFields || [],
      supportIncompleteFields:
        raw.meta?.supportIncompleteFields || supportCompleteness.supportIncompleteFields || [],
      incompleteFieldDetails:
        raw.meta?.incompleteFieldDetails || supportCompleteness.incompleteFieldDetails || [],
      supportMissingFieldCompletionAttempted: Boolean(raw.meta?.supportMissingFieldCompletionAttempted),
      supportMissingFieldCompletionSucceeded: Boolean(raw.meta?.supportMissingFieldCompletionSucceeded),
      supportMissingFieldCompletionFields: raw.meta?.supportMissingFieldCompletionFields || [],
      enrichmentApiCallCount: Number(raw.meta?.enrichmentApiCallCount || 0),
      enrichmentFirstAttemptDurationMs: Number(raw.meta?.enrichmentFirstAttemptDurationMs || 0),
      enrichmentCompactRetryDurationMs: Number(raw.meta?.enrichmentCompactRetryDurationMs || 0),
      missingFieldCompletionDurationMs: Number(raw.meta?.missingFieldCompletionDurationMs || 0),
      stageBEnrichmentDurationMs: Number(raw.meta?.stageBEnrichmentDurationMs || 0),
      unnecessaryRetryPrevented: Boolean(raw.meta?.unnecessaryRetryPrevented),
      kazakhPromptMode: raw.meta?.kazakhPromptMode || "",
      kazakhValidationAttempted: Boolean(raw.meta?.kazakhValidationAttempted),
      kazakhValidationPassed:
        raw.meta?.kazakhValidationPassed ??
        (fallbackInput.targetLanguage === "Kazakh"
          ? Boolean(raw.meta?.kazakhLanguageValidationPassed ?? true) &&
            Boolean(raw.meta?.supportCompletenessPassed ?? supportCompleteness.supportCompletenessPassed)
          : true),
      kazakhLanguageValidationPassed: Boolean(raw.meta?.kazakhLanguageValidationPassed ?? true),
      kazakhValidationReasons: raw.meta?.kazakhValidationReasons || [],
      kazakhValidationRetryAttempted: Boolean(raw.meta?.kazakhValidationRetryAttempted),
      lessonTitleWasUserProvided: Boolean(raw.meta?.lessonTitleWasUserProvided),
      lessonTitleDerivedFromFile: Boolean(raw.meta?.lessonTitleDerivedFromFile),
      lessonTitleUsedForGeneration: quizGrounding.lessonTitleUsedForGeneration,
      lessonTitleMismatchSuspected: quizGrounding.lessonTitleMismatchSuspected,
      droppedOffTopicQuizItems: quizGrounding.droppedOffTopicQuizItems,
      pipelineVersion: PIPELINE_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
      generatedSupportFields: supportSummary.generatedSupportFields,
      missingOptionalSupportFields: supportSummary.missingOptionalSupportFields,
      supportFieldCounts: supportCompleteness.supportFieldCounts,
    },
  };
}
