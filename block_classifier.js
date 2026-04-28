const TARGET_LANGUAGE_CONFIG = {
  English: {
    prompt:
      "Translate into natural English. Preserve names, formulas, URLs, codes, and technical identifiers only when appropriate.",
    retryPrompt:
      "Translate this block completely into natural English. Preserve names, formulas, URLs, codes, and technical identifiers only when appropriate.",
    expectedScript: "",
  },
  Russian: {
    prompt:
      "Translate into standard Russian using Cyrillic script. Preserve names, formulas, URLs, codes, and technical identifiers only when appropriate.",
    retryPrompt:
      "Translate this block completely into standard Russian Cyrillic. Do not leave ordinary English prose untranslated. Preserve only names, formulas, URLs, numbers, and code-like identifiers.",
    expectedScript: "cyrillic",
  },
  Kazakh: {
    prompt:
      "Translate into natural Kazakh using Cyrillic script. Do not write in Russian. Do not use Kazakh Latin script. Preserve names, formulas, URLs, codes, and technical identifiers only when appropriate.",
    retryPrompt:
      "Translate this block completely into natural Kazakh using Cyrillic script. Do not answer in Russian. Do not use Latin script. Do not leave ordinary English prose untranslated. Preserve only names, formulas, URLs, numbers, and code-like identifiers.",
    expectedScript: "cyrillic",
  },
};


export function getTargetLanguageConfig(targetLanguage) {
  return (
    TARGET_LANGUAGE_CONFIG[targetLanguage] || {
      prompt:
        `Translate into natural ${targetLanguage}. Preserve names, formulas, URLs, codes, and technical identifiers only when appropriate.`,
      retryPrompt:
        `Translate this block completely into natural ${targetLanguage}. Preserve names, formulas, URLs, codes, and technical identifiers only when appropriate.`,
      expectedScript: "",
    }
  );
}


export function normalizeForComparison(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

const PRESERVABLE_ACRONYM_WORDS = new Set([
  "ACT",
  "AI",
  "API",
  "C++",
  "C#",
  "CET-4",
  "CET-6",
  "CFA",
  "CPA",
  "CSS",
  "GMAT",
  "GPA",
  "GPT",
  "GRE",
  "HADOOP",
  "HTML",
  "IELTS",
  "IOT",
  "JAVA",
  "JAVASCRIPT",
  "JS",
  "MAPREDUCE",
  "MATLAB",
  "ML",
  "NLP",
  "PYTHON",
  "R",
  "SAT",
  "SQL",
  "TYPESCRIPT",
  "TOEFL",
]);

const TRANSLATABLE_LABEL_WORDS = new Set([
  "academic",
  "application",
  "background",
  "certificate",
  "certification",
  "code",
  "course",
  "credit",
  "data",
  "date",
  "description",
  "education",
  "email",
  "experience",
  "honor",
  "honors",
  "major",
  "mark",
  "mathematical",
  "modelling",
  "module",
  "name",
  "period",
  "phone",
  "practice",
  "lecture",
  "project",
  "qualification",
  "score",
  "skill",
  "skills",
  "summary",
  "title",
  "tool",
  "tools",
]);

const PRESERVABLE_ENTITY_WORDS = new Set([
  "GITHUB",
  "LINKEDIN",
  "OPENAI",
  "MICROSOFT",
  "GOOGLE",
]);

function getLatinWordTokens(text) {
  return normalizeForComparison(text).match(/[A-Za-z][A-Za-z0-9+#.+-]*/g) || [];
}

function normalizeAcronymToken(token) {
  return String(token || "").replace(/[._]/g, "").toUpperCase();
}

function isKnownAcronymOrExamName(text) {
  const words = getLatinWordTokens(text);
  if (!words.length || words.length > 3) return false;
  if (words.length > 1) {
    return words.every((word) => PRESERVABLE_ACRONYM_WORDS.has(normalizeAcronymToken(word)));
  }
  return words.every((word) => {
    const normalized = normalizeAcronymToken(word);
    return (
      PRESERVABLE_ACRONYM_WORDS.has(normalized) ||
      (/^[A-Z0-9.+-]{2,12}$/.test(word) && !/[a-z]/.test(word))
    );
  });
}

function isKnownEntityName(text) {
  const words = getLatinWordTokens(text);
  if (!words.length || words.length > 3) return false;
  return words.every((word) => PRESERVABLE_ENTITY_WORDS.has(normalizeAcronymToken(word)));
}

function hasTranslatableLabelWords(text) {
  return getLatinWordTokens(text).some((word) =>
    TRANSLATABLE_LABEL_WORDS.has(word.toLowerCase())
  );
}

function hasNaturalLanguageWords(text) {
  return getLatinWordTokens(text).filter((word) => /[aeiou]/i.test(word) && word.length >= 3).length >= 2;
}

function hasAllCapsMultiWordPhrase(text) {
  const words = getLatinWordTokens(text);
  if (words.length < 2) return false;
  const upperWords = words.filter((word) => /^[A-Z][A-Z0-9+#.+-]*$/.test(word));
  return upperWords.length === words.length;
}

function isPureContactOrUrl(text) {
  const value = normalizeForComparison(text);
  if (!value) return false;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (/^\+?\d[\d\s().-]{6,}\d$/.test(value)) return true;
  return false;
}

function hasContactOrUrlValue(text) {
  const value = normalizeForComparison(text);
  return /https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+|\+?\d[\d\s().-]{6,}\d/i.test(value);
}

function looksLikeMixedLabelIdentifier(text) {
  const value = normalizeForComparison(text);
  if (!value) return false;
  if (hasContactOrUrlValue(value)) return true;
  if (/^[A-Za-z][A-Za-z\s/.-]{1,30}:\s*[\dA-Z][\w\s/.,:+-]*$/i.test(value)) return true;
  return false;
}

function looksLikeEntityOnly(text) {
  const value = normalizeForComparison(text);
  if (!value || hasTranslatableLabelWords(value) || hasContactOrUrlValue(value)) return false;
  if (/[.!?。！？:;|/@]/.test(value)) return false;
  const words = getLatinWordTokens(value);
  if (words.length < 2 || words.length > 5) return false;
  if (/\b(University|College|Institute|School|Laboratory|Lab|Ltd|LLC|Inc|Corporation|Corp)\b/.test(value)) {
    return true;
  }
  return words.every((word) => /^[A-Z][A-Za-z.'-]*$/.test(word) || /^[A-Z]{2,}$/.test(word));
}

function looksLikeTableHeaderOrShortLabel(text, context = {}) {
  const value = normalizeForComparison(text);
  if (!value || hasContactOrUrlValue(value) || isKnownAcronymOrExamName(value)) return false;
  const words = getLatinWordTokens(value);
  if (words.length < 1 || words.length > 5) return false;
  if (context?.blockType === "table_cell" && words.length <= 4) return true;
  const strongShortLabels = new Set([
    "code",
    "credit",
    "date",
    "email",
    "major",
    "mark",
    "module",
    "name",
    "period",
    "phone",
    "score",
    "title",
  ]);
  return (
    hasTranslatableLabelWords(value) &&
    (words.length <= 2 || words.some((word) => strongShortLabels.has(word.toLowerCase())))
  );
}

function looksLikeTranslatableHeading(text, context = {}) {
  const value = normalizeForComparison(text);
  if (!value || hasContactOrUrlValue(value) || isKnownAcronymOrExamName(value)) return false;
  const words = getLatinWordTokens(value);
  if (words.length < 2 || words.length > 10) return false;
  if (hasAllCapsMultiWordPhrase(value) && (hasTranslatableLabelWords(value) || words.length >= 3)) {
    return true;
  }
  if (context?.blockType === "heading") return true;
  if (hasTranslatableLabelWords(value)) return true;
  return words.length >= 4 && words.some((word) => /[a-z]/.test(word));
}

function hasFormulaSignal(text) {
  const value = normalizeForComparison(text);
  return /[=≈≠≤≥∑∫∞π√^²³]|[A-Za-z]\([^)]+\)|\b\d+(?:\.\d+)?\s*[+\-*/]\s*\d+|\b[a-z]\s*[=<>]\s*/i.test(value);
}

function looksLikeFormulaOrEquationOnly(text) {
  const value = normalizeForComparison(text);
  if (!value || !hasFormulaSignal(value)) return false;
  const words = getLatinWordTokens(value).filter((word) => !/^[a-zA-Z]$/.test(word));
  const naturalWords = words.filter((word) => /[aeiou]/i.test(word) && word.length >= 3);
  return naturalWords.length <= 1 && !/[.!?。！？]/.test(value);
}

function looksLikeFormulaWithExplanation(text) {
  const value = normalizeForComparison(text);
  return hasFormulaSignal(value) && (hasNaturalLanguageWords(value) || isOrdinaryProse(value));
}

function looksLikeCodeOrIdentifierOnly(text) {
  const value = normalizeForComparison(text);
  if (!value) return false;
  if (/^(npm|yarn|pnpm|pip|python|node|uvicorn)\s+[\w@./:-]+(?:\s+[\w@./:-]+)*$/i.test(value)) return true;
  if (/^(function|const|let|var|class|def)\s+[A-Za-z_$][\w$]*(?:\([^)]*\))?/.test(value)) return true;
  if (/^[A-Z_][A-Z0-9_]{2,}$/.test(value)) return true;
  if (/^[\w.-]+\.(py|js|ts|jsx|tsx|json|html|css|docx|pdf|txt|md)$/i.test(value)) return true;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*|\([^)]*\))+$/.test(value)) return true;
  return false;
}

function looksLikeListItem(text, context = {}) {
  const value = normalizeForComparison(text);
  if (context?.blockType === "list_item") return true;
  return /^(\(?[A-Za-z0-9]{1,3}\)?[.)]|[-•*✓✔])\s*\S+/.test(value);
}

function looksLikeWorksheetQuestion(text) {
  const value = normalizeForComparison(text);
  return /^(Question|Q)\s*\d+[:.)]/i.test(value) ||
    /^(Choose|Explain|Find|Calculate|Solve|True\s+or\s+False|Fill\s+in|Select)\b/i.test(value);
}

function makeBlockClassification({
  kind,
  confidence,
  expectedAction,
  validationSeverity,
  preserveJustification = null,
}) {
  return {
    kind,
    blockKind: kind,
    confidence,
    expectedAction,
    validationSeverity,
    preserveJustification,
  };
}

export function classifyTranslationBlock(text, targetLanguage = "", context = {}) {
  const value = normalizeForComparison(text);
  if (!value) {
    return makeBlockClassification({
      kind: "code_or_identifier",
      confidence: 1,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "empty",
    });
  }

  if (isPureContactOrUrl(value)) {
    return makeBlockClassification({
      kind: "contact_or_url_only",
      confidence: 1,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: value.includes("@") ? "email" : /https?:\/\/|www\./i.test(value) ? "url" : "phone",
    });
  }

  if (looksLikeMixedLabelIdentifier(value)) {
    return makeBlockClassification({
      kind: "mixed_label_identifier",
      confidence: 0.9,
      expectedAction: "translate_labels",
      validationSeverity: "warning",
      preserveJustification: "contact_or_identifier",
    });
  }

  if (looksLikeWorksheetQuestion(value)) {
    return makeBlockClassification({
      kind: "worksheet_or_question",
      confidence: 0.9,
      expectedAction: "translate_with_preserved_fragments",
      validationSeverity: "fatal",
    });
  }

  if (looksLikeListItem(value, context)) {
    return makeBlockClassification({
      kind: "list_item",
      confidence: context?.blockType === "list_item" ? 0.95 : 0.85,
      expectedAction: "translate_with_preserved_fragments",
      validationSeverity: "fatal",
    });
  }

  if (looksLikeFormulaWithExplanation(value)) {
    return makeBlockClassification({
      kind: "formula_with_explanation",
      confidence: 0.9,
      expectedAction: "translate_with_preserved_fragments",
      validationSeverity: "fatal",
    });
  }

  if (looksLikeFormulaOrEquationOnly(value)) {
    return makeBlockClassification({
      kind: "formula_or_equation",
      confidence: 0.95,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "formula_or_equation",
    });
  }

  if (looksLikeCodeOrIdentifierOnly(value)) {
    return makeBlockClassification({
      kind: "code_or_identifier",
      confidence: 0.95,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "code_or_identifier",
    });
  }

  if (isKnownAcronymOrExamName(value)) {
    return makeBlockClassification({
      kind: "acronym_or_exam_name",
      confidence: 0.95,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "acronym",
    });
  }

  if (looksLikeTableHeaderOrShortLabel(value, context)) {
    return makeBlockClassification({
      kind: "table_header_or_short_label",
      confidence: context?.blockType === "table_cell" ? 0.85 : 0.75,
      expectedAction: "translate",
      validationSeverity: context?.blockType === "table_cell" ? "warning" : "fatal",
    });
  }

  if (looksLikeTranslatableHeading(value, context)) {
    return makeBlockClassification({
      kind: "translatable_heading",
      confidence: context?.blockType === "heading" ? 0.9 : 0.82,
      expectedAction: "translate",
      validationSeverity: "fatal",
    });
  }

  if (isKnownEntityName(value)) {
    return makeBlockClassification({
      kind: "entity_only",
      confidence: 0.92,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "entity_name",
    });
  }

  if (looksLikeEntityOnly(value)) {
    return makeBlockClassification({
      kind: "entity_only",
      confidence: 0.82,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "name",
    });
  }

  if (isOrdinaryProse(value)) {
    return makeBlockClassification({
      kind: "ordinary_prose",
      confidence: 0.95,
      expectedAction: "translate",
      validationSeverity: "fatal",
    });
  }

  if (isLikelyFormulaOrCodeBlock(value) || isMostlyNonTranslatableText(value)) {
    return makeBlockClassification({
      kind: "code_or_identifier",
      confidence: 0.75,
      expectedAction: "preserve",
      validationSeverity: "accepted",
      preserveJustification: "code_or_identifier",
    });
  }

  const fallbackKind = getLatinWordTokens(value).length <= 5
    ? "table_header_or_short_label"
    : "ordinary_prose";
  return makeBlockClassification({
    kind: fallbackKind,
    confidence: 0.6,
    expectedAction: "translate",
    validationSeverity: fallbackKind === "ordinary_prose" ? "fatal" : "warning",
  });
}

export function buildStrictRetryInstruction(blocks, targetLanguage) {
  const block = Array.isArray(blocks) ? blocks[0] : null;
  const classification = classifyTranslationBlock(block?.text || "", targetLanguage, block || {});
  return buildBlockTranslationPrompt(block || {}, targetLanguage, classification);
}

export function buildBlockTranslationPrompt(block, targetLanguage, blockClassification = null) {
  const classification =
    blockClassification || classifyTranslationBlock(block?.text || "", targetLanguage, block || {});
  if (classification.blockKind === "mixed_label_identifier") {
    return `Translate only the human-readable labels into ${targetLanguage}; preserve emails, phone numbers, URLs, IDs, names, numbers, and code-like identifiers exactly.`;
  }
  if (["translatable_heading", "table_header_or_short_label"].includes(classification.blockKind)) {
    return `Translate this heading or label into ${targetLanguage}. Preserve acronyms, names, URLs, emails, numbers, and code-like identifiers, but translate ordinary English words.`;
  }
  if (classification.blockKind === "formula_with_explanation") {
    return `Translate the explanatory prose into ${targetLanguage}; preserve formulas, variables, mathematical notation, units, and symbols exactly.`;
  }
  if (["worksheet_or_question", "list_item"].includes(classification.blockKind)) {
    return `Translate the list item or question into ${targetLanguage}; preserve bullets, numbering, option labels, formulas, variables, and symbols.`;
  }
  return `Translate this block completely into ${targetLanguage}. Do not leave ordinary English prose untranslated. Preserve only names, formulas, URLs, numbers, and code-like identifiers.`;
}

export function isMostlyNonTranslatableText(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  const letters = countMatches(value, /[A-Za-z\u0400-\u04FF\u0600-\u06FF\u3400-\u9FFF]/g);
  if (letters === 0) return true;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (value.length <= 3 && letters <= 2) return true;
  if (/^[A-Z0-9._:/@#%+\-=()[\]{}<>^|,;]+$/.test(value) && value.length <= 80) {
    return true;
  }
  if (
    /^[A-Z0-9._:/@#%+\-=()[\]{}<>^|,;\s]+$/.test(value) &&
    value.length <= 24 &&
    !/[A-Z]{2,}\s+[A-Z]{2,}/.test(value)
  ) {
    return true;
  }
  return false;
}

function isLikelyNonTranslatableBlock(text) {
  return ["entity_only", "contact_or_url_only", "acronym_or_exam_name", "formula_or_equation", "code_or_identifier"].includes(
    classifyTranslationBlock(text).blockKind
  );
}

export function isOrdinaryProse(text) {
  const value = normalizeForComparison(text);
  if (!value) return false;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;

  const letterRuns = value.match(/[A-Za-z\u0400-\u04FF\u0600-\u06FF\u3400-\u9FFF]+/g) || [];
  const wordCount = letterRuns.filter((word) => word.length >= 2).length;
  const letters = letterRuns.join("").length;
  const hasSentencePunctuation = /[.!?。！？]/.test(value);
  const hasNaturalSpacing = /\S+\s+\S+/.test(value);
  const hasLowercase = /[a-z\u0430-\u044f\u0451]/.test(value);

  if (wordCount >= 5 && hasNaturalSpacing) return true;
  if (wordCount >= 3 && hasSentencePunctuation) return true;
  if (value.length >= 45 && letters >= 24 && (hasLowercase || hasNaturalSpacing)) return true;
  return false;
}

export function getContactOrIdentifierJustification(text) {
  const value = normalizeForComparison(text);
  if (!value) return "";
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return "url";
  if (/https?:\/\/|www\./i.test(value)) return "url";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) return "contact_or_identifier";
  if (/(?:\+?\d[\d\s().-]{6,}\d)/.test(value)) return "contact_or_identifier";
  if (/^[A-Z0-9][A-Z0-9.+-]{1,12}$/.test(value)) return "acronym";
  if (/^(IELTS|TOEFL|GPA|SAT|GRE|GMAT|ACT|CET-?4|CET-?6|CPA|CFA|API|SQL|HTML|CSS|JS|AI|ML|NLP)$/i.test(value)) {
    return "acronym";
  }
  if (
    /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(value) &&
    !/[.!?。！？:;|/@]/.test(value)
  ) {
    return "name";
  }
  if (/^[A-Z][A-Za-z0-9_$]*(?:[._/-][A-Za-z0-9_$]+)+$/.test(value)) {
    return "code_like_identifier";
  }
  if (/^[\d\s().,+\-*/:|#%]+$/.test(value)) return "mostly_symbols_or_numbers";
  return "";
}

function isLikelyContactOrIdentifierBlock(text) {
  return Boolean(getContactOrIdentifierJustification(text));
}

function isMostlyEntityOrContactInfo(text) {
  const value = normalizeForComparison(text);
  if (!value) return false;
  const justification = getContactOrIdentifierJustification(value);
  if (!justification) return false;
  if (justification === "url" || justification === "email") return true;
  const letters = countMatches(value, /[A-Za-z\u0400-\u04FF\u0600-\u06FF\u3400-\u9FFF]/g);
  const contactChars = countMatches(value, /[\d@:/._|+\-()#%]/g);
  return value.length <= 140 || contactChars >= letters * 0.25;
}

function shouldAllowPreservedForTarget(text, targetLanguage) {
  if (targetLanguage === "English") return true;
  return [
    "entity_only",
    "contact_or_url_only",
    "mixed_label_identifier",
    "acronym_or_exam_name",
    "formula_or_equation",
    "code_or_identifier",
  ].includes(classifyTranslationBlock(text, targetLanguage).blockKind);
}

export function isLikelyFormulaOrCodeBlock(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  if (isOrdinaryProse(value)) return false;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;

  const letters = countMatches(value, /[A-Za-z\u0400-\u04FF\u0600-\u06FF\u3400-\u9FFF]/g);
  const digits = countMatches(value, /\d/g);
  const mathSymbols = countMatches(value, /[=+\-*/^_<>≤≥≈±√∑∫π∞%]/g);
  const naturalWords = (value.match(/[A-Za-z\u0400-\u04FF\u0600-\u06FF]{2,}/g) || []).length;

  if (letters === 0) return true;
  if (value.length <= 3 && letters <= 2) return true;
  if (mathSymbols >= 2 && naturalWords <= 2) return true;
  if (/[=<>≤≥≈]/.test(value) && naturalWords <= 3 && digits + mathSymbols >= 2) return true;
  if (/^[A-Z0-9._:/@#%+\-=()[\]{}<>^|,;]+$/.test(value) && value.length <= 80) {
    return true;
  }
  if (
    /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*|\([^)]*\))+$/.test(value) &&
    naturalWords <= 3
  ) {
    return true;
  }
  return false;
}

export function shouldPreserveBeforeTranslation(block, preserveFormulas, targetLanguage = "") {
  const text = String(block?.text || "");
  if (!normalizeForComparison(text)) return false;
  if (!preserveFormulas || !block?.isFormula) return false;
  if (targetLanguage !== "English" && looksLikeOrdinaryEnglishProse(text)) return false;
  return isLikelyFormulaOrCodeBlock(text);
}

export function looksMostlyEnglish(text) {
  const value = String(text || "");
  const latin = countMatches(value, /[A-Za-z]/g);
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const arabic = countMatches(value, /[\u0600-\u06FF]/g);
  const cjk = countMatches(value, /[\u3400-\u9FFF]/g);
  const letters = latin + cyrillic + arabic + cjk;
  if (letters < 8) return false;
  return latin / letters >= 0.55 && latin >= 8;
}

function looksLikeOrdinaryEnglishProse(text) {
  const value = normalizeForComparison(text);
  if (!value) return false;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const latin = countMatches(value, /[A-Za-z]/g);
  if (latin < 8) return false;
  if (!/[aeiou]/i.test(value)) return false;
  return isOrdinaryProse(value) || /[a-z].*\s+[a-z]/.test(value);
}

function getTextSimilarity(a, b) {
  const left = normalizeForComparison(a).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const right = normalizeForComparison(b).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftWords = left.split(/\s+/).filter(Boolean);
  const rightWords = right.split(/\s+/).filter(Boolean);
  if (!leftWords.length || !rightWords.length) return 0;
  const rightSet = new Set(rightWords);
  const overlap = leftWords.filter((word) => rightSet.has(word)).length;
  return overlap / Math.max(leftWords.length, rightWords.length);
}

function hasEnoughCyrillic(text) {
  const value = String(text || "");
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const latin = countMatches(value, /[A-Za-z]/g);
  const letters = cyrillic + latin;
  if (letters < 8) return true;
  return cyrillic / letters >= 0.45;
}

function hasTargetScriptSignals(text, targetLanguage) {
  const value = String(text || "");
  if (targetLanguage === "Chinese") {
    return countMatches(value, /[\u3400-\u9FFF]/g) >= 1;
  }
  if (targetLanguage === "Kazakh" || targetLanguage === "Russian") {
    return hasEnoughCyrillic(value);
  }
  if (targetLanguage === "Arabic") {
    const arabic = countMatches(value, /[\u0600-\u06FF]/g);
    const latin = countMatches(value, /[A-Za-z]/g);
    const letters = arabic + latin;
    return letters < 8 || arabic / letters >= 0.35;
  }
  return true;
}

function isSuspiciousTranslation(sourceText, translatedText, targetLanguage, context = {}) {
  if (targetLanguage === "English") return [];
  const classification = classifyTranslationBlock(sourceText, targetLanguage, context);
  if (
    ["entity_only", "contact_or_url_only", "acronym_or_exam_name", "formula_or_equation", "code_or_identifier"].includes(
      classification.blockKind
    )
  ) {
    return [];
  }
  const reasons = [];
  const source = normalizeForComparison(sourceText);
  const translated = normalizeForComparison(translatedText);
  const sourceIsEnglishProse = looksLikeOrdinaryEnglishProse(source);
  const isMixedLabel = classification.blockKind === "mixed_label_identifier";
  const isHeadingOrLabel = ["table_header_or_short_label", "translatable_heading"].includes(
    classification.blockKind
  );
  const isFragmentTranslation = ["formula_with_explanation", "worksheet_or_question", "list_item"].includes(
    classification.blockKind
  );
  const needsTargetScript = sourceIsEnglishProse || isHeadingOrLabel || isMixedLabel || isFragmentTranslation;

  if (!translated) reasons.push("empty_translated_text");
  if (source && source === translated) {
    if (isMixedLabel) {
      reasons.push("mixed_label_identifier_unchanged");
    } else if (isHeadingOrLabel) {
      reasons.push(`${classification.blockKind}_left_untranslated`);
    } else if (isFragmentTranslation) {
      reasons.push(`${classification.blockKind}_left_untranslated`);
    } else if (sourceIsEnglishProse) {
      reasons.push("ordinary_english_left_untranslated");
    }
  }
  if ((sourceIsEnglishProse || isHeadingOrLabel || isFragmentTranslation) && looksMostlyEnglish(translated)) {
    reasons.push("translated_text_still_mostly_english");
  }
  if ((sourceIsEnglishProse || isHeadingOrLabel || isFragmentTranslation) && getTextSimilarity(source, translated) >= 0.72) {
    reasons.push("translated_text_too_similar_to_source");
  }
  if (needsTargetScript && !hasTargetScriptSignals(translated, targetLanguage)) {
    reasons.push(`missing_${String(targetLanguage || "target").toLowerCase()}_script_signal`);
  }
  if (
    ["Kazakh", "Russian"].includes(targetLanguage) &&
    (sourceIsEnglishProse || isHeadingOrLabel || isFragmentTranslation) &&
    !hasEnoughCyrillic(translated)
  ) {
    reasons.push("insufficient_cyrillic_for_target");
  }
  return reasons;
}

export function shouldTranslateBlock(block, targetLanguage = "") {
  if (shouldPreserveBeforeTranslation(block, true, targetLanguage)) return false;
  const classification = classifyTranslationBlock(block?.text, targetLanguage, block);
  if (targetLanguage && targetLanguage !== "English") {
    return classification.expectedAction !== "preserve";
  }
  return classification.expectedAction !== "preserve";
}

function getCyrillicRatio(text) {
  const value = String(text || "");
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const latin = countMatches(value, /[A-Za-z]/g);
  const denominator = cyrillic + latin;
  return denominator === 0 ? 1 : cyrillic / denominator;
}

export function validateTranslatedBlock({ block, translatedText, action, targetLanguage }) {
  const reasons = [];
  const sourceText = String(block?.text || "");
  const finalText = String(translatedText || "").trim();
  const needsTranslation = shouldTranslateBlock(block, targetLanguage);
  const normalizedSource = normalizeForComparison(sourceText);
  const normalizedTranslation = normalizeForComparison(finalText);
  const languageConfig = getTargetLanguageConfig(targetLanguage);

  if (!needsTranslation) return reasons;
  if (!finalText) reasons.push("empty_translated_text");
  if (String(action || "").toLowerCase() === "preserve") reasons.push("unexpected_preserve");
  if (
    targetLanguage !== "English" &&
    normalizedSource &&
    normalizedSource === normalizedTranslation
  ) {
    reasons.push("identical_to_source");
  }
  if (
    targetLanguage !== "Chinese" &&
    sourceText.length >= 80 &&
    finalText.length < sourceText.length * 0.25
  ) {
    reasons.push("suspiciously_short");
  }
  if (
    languageConfig.expectedScript === "cyrillic" &&
    countMatches(finalText, /[A-Za-z\u0400-\u04FF]/g) >= 8 &&
    !hasEnoughCyrillic(finalText)
  ) {
    reasons.push("low_cyrillic_ratio");
  }

  isSuspiciousTranslation(sourceText, finalText, targetLanguage, block).forEach((reason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  });

  return reasons;
}

export function getValidationSeverity({ block, translatedText, targetLanguage, validationReasons }) {
  if (!Array.isArray(validationReasons) || validationReasons.length === 0) return "";
  const sourceText = String(block?.text || "");
  const classification = classifyTranslationBlock(sourceText, targetLanguage, block);
  if (classification.blockKind === "mixed_label_identifier") return "warning";
  if (shouldAllowPreservedForTarget(sourceText, targetLanguage)) return "warning";
  if (
    ["ordinary_prose", "formula_with_explanation", "worksheet_or_question", "list_item"].includes(
      classification.blockKind
    )
  ) {
    return "fatal";
  }
  if (["translatable_heading", "table_header_or_short_label"].includes(classification.blockKind)) {
    return classification.validationSeverity || (classification.confidence >= 0.8 ? "fatal" : "warning");
  }
  return classification.validationSeverity || "fatal";
}
