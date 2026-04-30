/**
 * DOCX tools (structure-preserving version).
 *
 * Main idea:
 * - Keep the original .docx package (OOXML zip) intact.
 * - Translate paragraph text blocks.
 * - Write translated text back into original XML text nodes.
 *
 * This preserves much more of the original document:
 * - images
 * - headings
 * - lists/numbering
 * - tables
 * - most style/layout hierarchy
 *
 * Note: `.docx` is supported. Legacy `.doc` is not supported in this version.
 */

const MAMMOTH_MODULE_URL = "https://esm.sh/mammoth@1.8.0";
const DOCX_MODULE_URL = "https://esm.sh/docx@8.5.0";
const JSZIP_MODULE_URL = "https://esm.sh/jszip@3.10.1";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const CHART_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const VML_NS = "urn:schemas-microsoft-com:vml";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

let mammothPromise = null;
let docxLibPromise = null;
let jszipPromise = null;

function resolveMammoth(moduleValue) {
  if (!moduleValue) return null;
  if (typeof moduleValue.convertToHtml === "function") return moduleValue;
  if (moduleValue.default && typeof moduleValue.default.convertToHtml === "function") {
    return moduleValue.default;
  }
  return null;
}

function resolveDocx(moduleValue) {
  if (!moduleValue) return null;
  if (typeof moduleValue.Document === "function") return moduleValue;
  if (moduleValue.default && typeof moduleValue.default.Document === "function") {
    return moduleValue.default;
  }
  return null;
}

function resolveJSZip(moduleValue) {
  if (!moduleValue) return null;
  if (moduleValue.default && typeof moduleValue.default.loadAsync === "function") {
    return moduleValue.default;
  }
  if (typeof moduleValue.loadAsync === "function") {
    return moduleValue;
  }
  return null;
}

async function getMammoth() {
  if (!mammothPromise) {
    mammothPromise = import(MAMMOTH_MODULE_URL)
      .then((mod) => resolveMammoth(mod))
      .catch(() => null);
  }
  return mammothPromise;
}

async function getDocxLib() {
  if (!docxLibPromise) {
    docxLibPromise = import(DOCX_MODULE_URL)
      .then((mod) => resolveDocx(mod))
      .catch(() => null);
  }
  return docxLibPromise;
}

async function getJSZip() {
  if (!jszipPromise) {
    jszipPromise = import(JSZIP_MODULE_URL)
      .then((mod) => resolveJSZip(mod))
      .catch(() => null);
  }
  return jszipPromise;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getDocxSupportLabels(targetLanguage) {
  const english = {
    learningSupportAppendix: "Learning Support Appendix",
    lesson: "Lesson",
    targetLanguage: "Target Language",
    glossary: "Glossary",
    simplifiedExplanation: "Simplified Explanation",
    keyConcepts: "Key Concepts",
    commonMisconceptions: "Common Misconceptions",
    teacherNotes: "Teacher Notes",
    classroomActivities: "Classroom Activities",
    extensionQuestions: "Extension Questions",
    quiz: "Practice Quiz",
    answer: "Answer",
    explanation: "Explanation",
    duration: "Duration",
    instructions: "Instructions",
    misconception: "Misconception",
    correction: "Correction",
    activity: "Activity",
  };

  if (targetLanguage === "Kazakh") {
    return {
      ...english,
      learningSupportAppendix: "Оқу қолдауы қосымшасы",
      lesson: "Сабақ",
      targetLanguage: "Мақсатты тіл",
      glossary: "Глоссарий",
      simplifiedExplanation: "Қарапайым түсіндірме",
      keyConcepts: "Негізгі ұғымдар",
      commonMisconceptions: "Жиі кездесетін қате түсініктер",
      teacherNotes: "Мұғалімге арналған ескертпелер",
      classroomActivities: "Сыныптағы әрекеттер",
      extensionQuestions: "Кеңейту сұрақтары",
      quiz: "Тест",
      answer: "Жауап",
      explanation: "Түсіндірме",
      duration: "Ұзақтығы",
      instructions: "Нұсқаулық",
      misconception: "Қате түсінік",
      correction: "Түзету",
      activity: "Әрекет",
    };
  }

  if (targetLanguage === "Russian") {
    return {
      ...english,
      learningSupportAppendix: "Приложение учебной поддержки",
      lesson: "Урок",
      targetLanguage: "Целевой язык",
      glossary: "Глоссарий",
      simplifiedExplanation: "Упрощенное объяснение",
      keyConcepts: "Ключевые понятия",
      commonMisconceptions: "Распространенные заблуждения",
      teacherNotes: "Заметки для учителя",
      classroomActivities: "Классные задания",
      extensionQuestions: "Вопросы для расширения",
      quiz: "Тест",
      answer: "Ответ",
      explanation: "Объяснение",
      duration: "Продолжительность",
      instructions: "Инструкции",
      misconception: "Заблуждение",
      correction: "Исправление",
      activity: "Задание",
    };
  }

  if (targetLanguage === "Chinese") {
    return {
      ...english,
      learningSupportAppendix: "学习支持附录",
      lesson: "课程",
      targetLanguage: "目标语言",
      glossary: "术语表",
      simplifiedExplanation: "简明解释",
      keyConcepts: "关键概念",
      commonMisconceptions: "常见误解",
      teacherNotes: "教师备注",
      classroomActivities: "课堂活动",
      extensionQuestions: "拓展问题",
      quiz: "测验",
      answer: "答案",
      explanation: "解释",
      duration: "时长",
      instructions: "说明",
      misconception: "误解",
      correction: "纠正",
      activity: "活动",
    };
  }

  return english;
}

function hasSupportContent(value) {
  if (Array.isArray(value)) return value.some((item) => hasSupportContent(item));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasSupportContent(item));
  }
  return Boolean(normalizeText(value));
}

function asSupportList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }
  return hasSupportContent(value) ? [value] : [];
}

function buildPlainSupportAppendixLines({
  lessonTitle,
  targetLanguage,
  glossary,
  simplifiedExplanation,
  keyConcepts,
  commonMisconceptions,
  teacherNotes,
  classroomActivities,
  extensionQuestions,
  quiz,
  includeAnswerKey,
  includeExplanations,
}) {
  const labels = getDocxSupportLabels(targetLanguage);
  const lines = [
    "",
    labels.learningSupportAppendix,
    `${labels.lesson}: ${lessonTitle || "Untitled"}`,
    `${labels.targetLanguage}: ${targetLanguage || "N/A"}`,
    "",
  ];

  function section(number, title, render) {
    lines.push(`${number}. ${title}`);
    render();
    lines.push("");
  }

  if (hasSupportContent(glossary)) {
    section(1, labels.glossary, () => {
      asSupportList(glossary).forEach((item) => {
        if (typeof item === "string") {
          lines.push(`• ${normalizeText(item)}`);
          return;
        }
        const term = normalizeText(item?.term || item?.title || "");
        const explanation = normalizeText(item?.explanation || item?.definition || "");
        lines.push(`• ${term && explanation ? `${term}: ${explanation}` : term || explanation}`);
      });
    });
  }

  if (hasSupportContent(simplifiedExplanation)) {
    section(2, labels.simplifiedExplanation, () => {
      asSupportList(simplifiedExplanation).forEach((item) => lines.push(normalizeText(item)));
    });
  }

  if (hasSupportContent(keyConcepts)) {
    section(3, labels.keyConcepts, () => {
      asSupportList(keyConcepts).forEach((item) => {
        if (typeof item === "string") {
          lines.push(`• ${normalizeText(item)}`);
          return;
        }
        const title = normalizeText(item?.title || item?.term || "");
        const explanation = normalizeText(item?.explanation || item?.description || "");
        lines.push(`• ${title}${explanation ? `: ${explanation}` : ""}`);
      });
    });
  }

  if (hasSupportContent(commonMisconceptions)) {
    section(4, labels.commonMisconceptions, () => {
      asSupportList(commonMisconceptions).forEach((item) => {
        if (typeof item === "string") {
          lines.push(`• ${normalizeText(item)}`);
          return;
        }
        const misconception = normalizeText(item?.misconception || item?.title || "");
        const correction = normalizeText(item?.correction || item?.explanation || "");
        if (misconception) lines.push(`${labels.misconception}: ${misconception}`);
        if (correction) lines.push(`${labels.correction}: ${correction}`);
      });
    });
  }

  if (hasSupportContent(teacherNotes)) {
    section(5, labels.teacherNotes, () => {
      asSupportList(teacherNotes).forEach((item) => lines.push(`• ${normalizeText(item)}`));
    });
  }

  if (hasSupportContent(classroomActivities)) {
    section(6, labels.classroomActivities, () => {
      asSupportList(classroomActivities).forEach((activity, idx) => {
        if (typeof activity === "string") {
          lines.push(`${labels.activity} ${idx + 1}: ${normalizeText(activity)}`);
          return;
        }
        lines.push(`${labels.activity} ${idx + 1}: ${normalizeText(activity?.title || "")}`);
        if (activity?.duration) lines.push(`${labels.duration}: ${normalizeText(activity.duration)}`);
        if (activity?.instructions || activity?.description) {
          lines.push(`${labels.instructions}: ${normalizeText(activity.instructions || activity.description)}`);
        }
      });
    });
  }

  if (hasSupportContent(extensionQuestions)) {
    section(7, labels.extensionQuestions, () => {
      asSupportList(extensionQuestions).forEach((question, idx) => {
        const text =
          typeof question === "string"
            ? question
            : question?.question || Object.values(question || {}).join(" ");
        lines.push(`${idx + 1}. ${normalizeText(text)}`);
      });
    });
  }

  if (hasSupportContent(quiz)) {
    section(8, labels.quiz, () => {
      asSupportList(quiz).forEach((q, idx) => {
        if (typeof q === "string") {
          lines.push(`${idx + 1}. ${normalizeText(q)}`);
          return;
        }
        lines.push(`${idx + 1}. ${normalizeText(q.question)}`);
        if (Array.isArray(q.options)) {
          q.options.forEach((option, optionIdx) => {
            lines.push(`${String.fromCharCode(65 + optionIdx)}. ${normalizeText(option)}`);
          });
        }
        if (includeAnswerKey) {
          const answer =
            q.type === "short_answer"
              ? normalizeText(q.answerText || q.answer || "")
              : normalizeText(
                  Array.isArray(q.options) && Number.isInteger(q.answerIndex)
                    ? q.options[q.answerIndex]
                    : q.answerText || q.answer || ""
                );
          if (answer) lines.push(`${labels.answer}: ${answer}`);
        }
        if (includeExplanations && q.explanation) {
          lines.push(`${labels.explanation}: ${normalizeText(q.explanation)}`);
        }
      });
    });
  }

  return lines.filter((line, index, all) => line || all[index - 1] !== "");
}

function hasEnglishWords(value) {
  return /\b[A-Za-z]{3,}\b/.test(String(value || ""));
}

function buildDebugEntryIndex(entries) {
  const map = {};
  if (!Array.isArray(entries)) return map;
  entries.forEach((entry) => {
    const id = String(entry?.id || "").trim();
    if (!id) return;
    map[id] = entry;
  });
  return map;
}

function looksLikeNaturalLanguage(text) {
  const value = normalizeText(text);
  if (!value) return false;
  const compact = value.replace(/\s+/g, "");
  const letters = (compact.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  return letters >= 3;
}

function looksLikeFormulaOrCode(text) {
  const value = normalizeText(text);
  if (!value) return false;

  const compact = value.replace(/\s+/g, "");
  const letters = (compact.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  const digits = (compact.match(/[0-9]/g) || []).length;
  const symbols = (compact.match(/[+\-*/^=(){}\[\]<>%]/g) || []).length;

  // Keep obvious URL/email/path-like strings unchanged.
  if (/https?:\/\/|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return true;
  if (/^(?:[A-Za-z]:\\|\\\\|\/)\S+$/.test(value)) return true;

  // Keep obvious code-like identifiers unchanged.
  if (/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(value)) return true;
  if (/^[A-Za-z_][A-Za-z0-9_]*\([^)]*\)$/.test(value)) return true;
  if (/^([A-Za-z_][A-Za-z0-9_]*\.)+[A-Za-z_][A-Za-z0-9_]*\([^)]*\)$/.test(value)) return true;
  if (/[{}<>;]/.test(value) && /[A-Za-z_]/.test(value)) return true;

  // Strong formula signals.
  if (/[≈≠≤≥∑∫∞]/.test(value)) return true;
  if (/[=]/.test(value) && digits >= 1) return true;
  if ((compact.match(/[+\-*/^]/g) || []).length >= 2 && digits >= 1) return true;

  // Mostly symbols/digits with very little language is likely non-translatable.
  if (!looksLikeNaturalLanguage(value) && (digits >= 3 || symbols >= 4)) return true;
  if (digits >= 3 && letters <= 2) return true;
  if (symbols >= 3 && letters <= symbols) return true;
  return false;
}

function textFromElement(element) {
  return normalizeText(element?.textContent || "");
}

function parseHtmlToStructuredNodes(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "", "text/html");
  const body = doc.body;
  const nodes = [];

  for (const child of body.children) {
    const tag = child.tagName.toLowerCase();
    if (tag === "p") {
      const text = textFromElement(child);
      if (text) nodes.push({ type: "paragraph", text });
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      const text = textFromElement(child);
      if (!text) continue;
      const level = Number.parseInt(tag.replace("h", ""), 10) || 1;
      nodes.push({ type: "heading", level, text });
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      const items = Array.from(child.querySelectorAll(":scope > li"))
        .map((li) => textFromElement(li))
        .filter(Boolean);
      if (items.length) nodes.push({ type: "list", ordered, items });
      continue;
    }
    if (tag === "table") {
      const parsedRows = Array.from(child.querySelectorAll("tr"))
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("th,td"));
          const texts = cells.map((cell) => textFromElement(cell));
          const hasHeaderCells = cells.some((cell) => cell.tagName.toLowerCase() === "th");
          return { texts, hasHeaderCells };
        })
        .filter((row) => row.texts.some((cell) => cell));
      if (parsedRows.length) {
        const columnCount = Math.max(...parsedRows.map((row) => row.texts.length));
        const rows = parsedRows.map((row) => {
          const cloned = [...row.texts];
          while (cloned.length < columnCount) cloned.push("");
          return cloned;
        });
        const headerRows = parsedRows
          .map((row, index) => (row.hasHeaderCells ? index : -1))
          .filter((index) => index >= 0);
        nodes.push({ type: "table", rows, headerRows, columnCount });
      }
      continue;
    }
  }

  if (nodes.length === 0) {
    const fallbackText = textFromElement(body);
    if (fallbackText) nodes.push({ type: "paragraph", text: fallbackText });
  }
  return nodes;
}

function parseXmlOrThrow(xmlText, filePath) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError && parseError.length > 0) {
    throw new Error(`Could not parse OOXML in ${filePath}.`);
  }
  return xmlDoc;
}

function getWVal(element, localName) {
  if (!element) return "";
  const node = element.getElementsByTagNameNS(WORD_NS, localName)[0];
  if (!node) return "";
  return String(node.getAttributeNS(WORD_NS, "val") || node.getAttribute("w:val") || "").trim();
}

function hasAncestorWithLocalName(node, localName) {
  let current = node?.parentNode || null;
  while (current) {
    if (current.namespaceURI === WORD_NS && current.localName === localName) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function getSourceTypeFromPath(filePath) {
  if (/^word\/document\.xml$/i.test(filePath)) return "main_document";
  if (/^word\/header\d+\.xml$/i.test(filePath)) return "header";
  if (/^word\/footer\d+\.xml$/i.test(filePath)) return "footer";
  if (/^word\/footnotes\.xml$/i.test(filePath)) return "footnotes";
  if (/^word\/endnotes\.xml$/i.test(filePath)) return "endnotes";
  if (/^word\/comments\.xml$/i.test(filePath)) return "comments";
  if (/^word\/drawings\/.+\.xml$/i.test(filePath)) return "drawing_part";
  if (/^word\/charts\/.+\.xml$/i.test(filePath)) return "chart_part";
  if (/^word\/diagrams\/.+\.xml$/i.test(filePath)) return "diagram_part";
  return "other_xml";
}

function createExtractionAudit() {
  return {
    entries: [],
    skipped: [],
    counts: {
      totalExtracted: 0,
      totalSkipped: 0,
      byContainerType: {},
      bySourceType: {},
      skippedByContainerType: {},
      skippedByReason: {},
      paragraphsScanned: 0,
      paragraphsSkippedNoRuns: 0,
      paragraphsSkippedEmptyText: 0,
      drawingTextScanned: 0,
      drawingTextSkippedEmpty: 0,
      chartTextScanned: 0,
      chartTextSkippedEmpty: 0,
      vmlTextScanned: 0,
      vmlTextSkippedEmpty: 0,
      xmlFilesScanned: 0,
      xmlFilesSkippedParseError: 0,
    },
  };
}

function incrementCount(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function auditExtractedBlock(audit, block) {
  if (!audit) return;
  const entry = {
    blockId: block.id,
    extractedText: block.text,
    sourceType: block.sourceType || "unknown",
    sourceLocation: block.sourceLocation || block.id,
    containerType: block.containerType || block.blockType || block.kind || "unknown",
    willEnterTranslation: true,
  };
  audit.entries.push(entry);
  audit.counts.totalExtracted += 1;
  incrementCount(audit.counts.byContainerType, entry.containerType);
  incrementCount(audit.counts.bySourceType, entry.sourceType);
}

function auditSkipped(audit, payload) {
  if (!audit) return;
  const entry = {
    blockId: payload?.blockId || "",
    extractedText: payload?.extractedText || "",
    sourceType: payload?.sourceType || "unknown",
    sourceLocation: payload?.sourceLocation || "",
    containerType: payload?.containerType || "unknown",
    willEnterTranslation: false,
    reason: payload?.reason || "unspecified",
  };
  audit.skipped.push(entry);
  audit.counts.totalSkipped += 1;
  incrementCount(audit.counts.skippedByContainerType, entry.containerType);
  incrementCount(audit.counts.skippedByReason, entry.reason);
}

function classifyParagraphStructure(paragraph) {
  const pPr = paragraph.getElementsByTagNameNS(WORD_NS, "pPr")[0] || null;
  const styleId = getWVal(pPr, "pStyle");
  const hasNumbering = Boolean(
    pPr && pPr.getElementsByTagNameNS(WORD_NS, "numPr").length > 0
  );
  const inTable = hasAncestorWithLocalName(paragraph, "tc");
  const inTextBox = hasAncestorWithLocalName(paragraph, "txbxContent");
  const hasHyperlink = paragraph.getElementsByTagNameNS(WORD_NS, "hyperlink").length > 0;
  const hasBoldRun = paragraph.getElementsByTagNameNS(WORD_NS, "b").length > 0;
  const hasItalicRun = paragraph.getElementsByTagNameNS(WORD_NS, "i").length > 0;

  let blockType = "paragraph";
  let containerType = "paragraph";

  if (inTextBox) {
    containerType = "textbox_paragraph";
  } else if (inTable) {
    containerType = "table_cell";
  } else if (hasNumbering) {
    containerType = "list_item";
  } else if (hasHyperlink) {
    containerType = "hyperlink_paragraph";
  } else if (/^heading/i.test(styleId)) {
    containerType = "heading";
  }

  if (/^heading/i.test(styleId)) {
    blockType = "heading";
  } else if (hasNumbering) {
    blockType = "list_item";
  } else if (inTable) {
    blockType = "table_cell";
  }

  return {
    blockType,
    containerType,
    styleId,
    hasNumbering,
    inTable,
    inTextBox,
    hasHyperlink,
    hasBoldRun,
    hasItalicRun,
  };
}

function buildTraversalSummary(blocks) {
  const byType = {};
  const bySourceType = {};
  const byContainerType = {};
  blocks.forEach((block) => {
    const key = String(block.blockType || block.kind || "unknown");
    byType[key] = (byType[key] || 0) + 1;
    const sourceKey = String(block.sourceType || "unknown");
    bySourceType[sourceKey] = (bySourceType[sourceKey] || 0) + 1;
    const containerKey = String(block.containerType || block.blockType || block.kind || "unknown");
    byContainerType[containerKey] = (byContainerType[containerKey] || 0) + 1;
  });
  return {
    totalBlocks: blocks.length,
    blockTypeCounts: byType,
    sourceTypeCounts: bySourceType,
    containerTypeCounts: byContainerType,
  };
}

function collectRunsInParagraph(paragraph) {
  // Keep only run nodes that belong to this paragraph, not nested paragraphs
  // inside shapes/textboxes. This avoids duplicate/incorrect block extraction.
  const runNodes = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, "r")).filter((runNode) => {
    let current = runNode.parentNode;
    while (current && current !== paragraph) {
      if (current.namespaceURI === WORD_NS && current.localName === "p") {
        return false;
      }
      current = current.parentNode;
    }
    return true;
  });
  const runs = [];
  runNodes.forEach((runNode) => {
    const textNodes = Array.from(runNode.getElementsByTagNameNS(WORD_NS, "t"));
    if (textNodes.length === 0) return;
    const originalText = textNodes.map((node) => node.textContent || "").join("");
    if (!originalText) return;
    runs.push({ runNode, textNodes, originalText });
  });
  return runs;
}

function collectOOXMLParagraphBlocks(xmlDoc, filePath, audit) {
  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, "p"));
  const blocks = [];
  const sourceType = getSourceTypeFromPath(filePath);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (audit) audit.counts.paragraphsScanned += 1;
    const structure = classifyParagraphStructure(paragraph);
    const sourceLocation = `${filePath}::p${paragraphIndex}`;
    const runs = collectRunsInParagraph(paragraph);
    if (runs.length === 0) {
      if (audit) audit.counts.paragraphsSkippedNoRuns += 1;
      auditSkipped(audit, {
        sourceType,
        sourceLocation,
        containerType: structure.containerType || "paragraph",
        reason: "no_text_runs",
      });
      return;
    }

    const combinedText = normalizeText(runs.map((run) => run.originalText).join(""));
    if (!combinedText) {
      if (audit) audit.counts.paragraphsSkippedEmptyText += 1;
      auditSkipped(audit, {
        sourceType,
        sourceLocation,
        containerType: structure.containerType || "paragraph",
        reason: "empty_text_after_normalize",
      });
      return;
    }

    const block = {
      id: sourceLocation,
      kind: "paragraph",
      blockType: structure.blockType,
      containerType: structure.containerType,
      sourceType,
      filePath,
      paragraphIndex,
      sourceLocation,
      text: combinedText,
      isFormula: looksLikeFormulaOrCode(combinedText),
      styleMetadata: {
        styleId: structure.styleId,
        hasNumbering: structure.hasNumbering,
        inTable: structure.inTable,
        inTextBox: structure.inTextBox,
        hasHyperlink: structure.hasHyperlink,
        hasBoldRun: structure.hasBoldRun,
        hasItalicRun: structure.hasItalicRun,
        runCount: runs.length,
      },
    };
    blocks.push(block);
    auditExtractedBlock(audit, block);
  });
  return blocks;
}

function collectPotentiallyUnsupportedContainers(xmlDoc, filePath, audit) {
  if (!audit) return;
  const sourceType = getSourceTypeFromPath(filePath);
  const altChunks = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, "altChunk"));
  altChunks.forEach((_node, index) => {
    auditSkipped(audit, {
      sourceType,
      sourceLocation: `${filePath}::altChunk${index}`,
      containerType: "alt_chunk",
      reason: "unsupported_alt_chunk_reference",
    });
  });

  const embeddedObjects = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, "object"));
  embeddedObjects.forEach((_node, index) => {
    auditSkipped(audit, {
      sourceType,
      sourceLocation: `${filePath}::object${index}`,
      containerType: "embedded_object",
      reason: "embedded_object_text_not_extracted",
    });
  });
}

function collectDrawingTextBlocks(xmlDoc, filePath, audit) {
  const nodes = Array.from(xmlDoc.getElementsByTagNameNS(DRAWING_NS, "t"));
  const blocks = [];
  const sourceType = getSourceTypeFromPath(filePath);
  nodes.forEach((node, drawingTextIndex) => {
    if (audit) audit.counts.drawingTextScanned += 1;
    const text = normalizeText(node.textContent || "");
    if (!text) {
      if (audit) audit.counts.drawingTextSkippedEmpty += 1;
      auditSkipped(audit, {
        sourceType,
        sourceLocation: `${filePath}::a${drawingTextIndex}`,
        containerType: "drawing_text",
        reason: "empty_text",
      });
      return;
    }
    const sourceLocation = `${filePath}::a${drawingTextIndex}`;
    const block = {
      id: sourceLocation,
      kind: "drawing_text",
      blockType: "drawing_text",
      containerType: "drawing_text",
      sourceType,
      filePath,
      drawingTextIndex,
      sourceLocation,
      text,
      isFormula: looksLikeFormulaOrCode(text),
      styleMetadata: {
        styleId: "",
        hasNumbering: false,
        inTable: false,
        hasHyperlink: false,
        hasBoldRun: false,
        hasItalicRun: false,
        runCount: 1,
      },
    };
    blocks.push(block);
    auditExtractedBlock(audit, block);
  });
  return blocks;
}

function collectChartValueTextBlocks(xmlDoc, filePath, audit) {
  const nodes = Array.from(xmlDoc.getElementsByTagNameNS(CHART_NS, "v"));
  const blocks = [];
  const sourceType = getSourceTypeFromPath(filePath);
  nodes.forEach((node, chartValueIndex) => {
    if (audit) audit.counts.chartTextScanned += 1;
    const text = normalizeText(node.textContent || "");
    if (!text) {
      if (audit) audit.counts.chartTextSkippedEmpty += 1;
      auditSkipped(audit, {
        sourceType,
        sourceLocation: `${filePath}::c${chartValueIndex}`,
        containerType: "chart_text",
        reason: "empty_text",
      });
      return;
    }
    const sourceLocation = `${filePath}::c${chartValueIndex}`;
    const block = {
      id: sourceLocation,
      kind: "chart_text",
      blockType: "chart_text",
      containerType: "chart_text",
      sourceType,
      filePath,
      chartValueIndex,
      sourceLocation,
      text,
      isFormula: looksLikeFormulaOrCode(text),
      styleMetadata: {
        styleId: "",
        hasNumbering: false,
        inTable: false,
        inTextBox: false,
        hasHyperlink: false,
        hasBoldRun: false,
        hasItalicRun: false,
        runCount: 1,
      },
    };
    blocks.push(block);
    auditExtractedBlock(audit, block);
  });
  return blocks;
}

function collectVmlTextPathBlocks(xmlDoc, filePath, audit) {
  const nodes = Array.from(xmlDoc.getElementsByTagNameNS(VML_NS, "textpath"));
  const blocks = [];
  const sourceType = getSourceTypeFromPath(filePath);
  nodes.forEach((node, vmlIndex) => {
    if (audit) audit.counts.vmlTextScanned += 1;
    const raw = String(node.getAttribute("string") || "").trim();
    const text = normalizeText(raw);
    if (!text) {
      if (audit) audit.counts.vmlTextSkippedEmpty += 1;
      auditSkipped(audit, {
        sourceType,
        sourceLocation: `${filePath}::v${vmlIndex}`,
        containerType: "vml_textpath",
        reason: "empty_text",
      });
      return;
    }
    const sourceLocation = `${filePath}::v${vmlIndex}`;
    const block = {
      id: sourceLocation,
      kind: "vml_textpath",
      blockType: "vml_textpath",
      containerType: "vml_textpath",
      sourceType,
      filePath,
      vmlIndex,
      sourceLocation,
      text,
      isFormula: looksLikeFormulaOrCode(text),
      styleMetadata: {
        styleId: "",
        hasNumbering: false,
        inTable: false,
        inTextBox: false,
        hasHyperlink: false,
        hasBoldRun: false,
        hasItalicRun: false,
        runCount: 1,
      },
    };
    blocks.push(block);
    auditExtractedBlock(audit, block);
  });
  return blocks;
}

async function parseOOXMLTranslationBlocks(arrayBuffer) {
  // PASS 1 (Traversal): scan OOXML parts and collect structure-aware text blocks.
  const JSZip = await getJSZip();
  if (!JSZip || typeof JSZip.loadAsync !== "function") {
    throw new Error("DOCX ZIP processing is unavailable.");
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const extractionAudit = createExtractionAudit();
  const targetPaths = Object.keys(zip.files).filter((path) =>
    /^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/i.test(path) ||
    /^word\/(drawings|charts|diagrams)\/.+\.xml$/i.test(path)
  );

  const blocks = [];
  for (const path of targetPaths) {
    const fileEntry = zip.file(path);
    if (!fileEntry) continue;
    extractionAudit.counts.xmlFilesScanned += 1;
    try {
      const xmlText = await fileEntry.async("string");
      const xmlDoc = parseXmlOrThrow(xmlText, path);
      blocks.push(...collectOOXMLParagraphBlocks(xmlDoc, path, extractionAudit));
      blocks.push(...collectDrawingTextBlocks(xmlDoc, path, extractionAudit));
      blocks.push(...collectChartValueTextBlocks(xmlDoc, path, extractionAudit));
      blocks.push(...collectVmlTextPathBlocks(xmlDoc, path, extractionAudit));
      collectPotentiallyUnsupportedContainers(xmlDoc, path, extractionAudit);
    } catch (err) {
      extractionAudit.counts.xmlFilesSkippedParseError += 1;
      auditSkipped(extractionAudit, {
        sourceType: getSourceTypeFromPath(path),
        sourceLocation: path,
        containerType: "xml_file",
        reason: `parse_error:${String(err?.message || "unknown")}`,
      });
    }
  }

  const fullText = normalizeText(
    blocks.filter((block) => !block.isFormula).map((block) => block.text).join(" ")
  );
  const traversalSummary = buildTraversalSummary(blocks);

  return {
    translationBlocks: blocks,
    targetXmlFiles: targetPaths,
    fullText,
    traversalSummary,
    extractionAudit,
  };
}

export async function importDocxFile(file) {
  if (!file) throw new Error("No DOCX file selected.");
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Please upload a .docx file. Legacy .doc is not supported in this version.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const ooxmlResult = await parseOOXMLTranslationBlocks(arrayBuffer);

  // Mammoth preview is optional and only used for quick visual/source preview in UI.
  let previewNodes = [];
  try {
    const mammoth = await getMammoth();
    if (mammoth && typeof mammoth.convertToHtml === "function") {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      previewNodes = parseHtmlToStructuredNodes(htmlResult.value || "");
    }
  } catch (_err) {
    // Keep DOCX workflow alive even if preview conversion fails.
    previewNodes = [];
  }

  if (!ooxmlResult.fullText) {
    throw new Error("Could not extract readable content from this DOCX file.");
  }

  return {
    fileName: file.name,
    arrayBuffer,
    fullText: ooxmlResult.fullText,
    translationBlocks: ooxmlResult.translationBlocks,
    targetXmlFiles: ooxmlResult.targetXmlFiles,
    traversalSummary: ooxmlResult.traversalSummary,
    extractionAudit: ooxmlResult.extractionAudit,
    previewNodes,
  };
}

export function buildDocxTranslationBlocks(docxDataOrNodes) {
  if (docxDataOrNodes && Array.isArray(docxDataOrNodes.translationBlocks)) {
    return docxDataOrNodes.translationBlocks.map((block) => ({
      id: block.id,
      text: block.text,
      isFormula: Boolean(block.isFormula),
      blockType: block.blockType || block.kind || "paragraph",
      containerType: block.containerType || block.blockType || block.kind || "paragraph",
      sourceType: block.sourceType || "unknown",
      sourceLocation: block.sourceLocation || block.id,
      styleMetadata: block.styleMetadata || {},
    }));
  }

  // Backward-compatible fallback for old node-based shape.
  if (!Array.isArray(docxDataOrNodes)) return [];
  const nodes = docxDataOrNodes;
  const blocks = [];
  nodes.forEach((node, nodeIndex) => {
    if (node.type === "heading" || node.type === "paragraph") {
      const text = normalizeText(node.text);
      blocks.push({
        id: `node-${nodeIndex}`,
        text,
        isFormula: looksLikeFormulaOrCode(text),
      });
      return;
    }
    if (node.type === "list" && Array.isArray(node.items)) {
      node.items.forEach((item, itemIndex) => {
        const text = normalizeText(item);
        blocks.push({
          id: `node-${nodeIndex}-item-${itemIndex}`,
          text,
          isFormula: looksLikeFormulaOrCode(text),
        });
      });
      return;
    }
    if (node.type === "table" && Array.isArray(node.rows)) {
      node.rows.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
          const text = normalizeText(cell);
          blocks.push({
            id: `node-${nodeIndex}-cell-${rowIndex}-${cellIndex}`,
            text,
            isFormula: looksLikeFormulaOrCode(text),
          });
        });
      });
    }
  });
  return blocks.filter((block) => block.text);
}

export function applyDocxTranslations(nodes, translationsById) {
  // Backward-compatible helper for preview-mode node data.
  const result = JSON.parse(JSON.stringify(nodes || []));
  result.forEach((node, nodeIndex) => {
    if (node.type === "heading" || node.type === "paragraph") {
      const id = `node-${nodeIndex}`;
      if (translationsById[id]) node.text = translationsById[id];
      return;
    }
    if (node.type === "list" && Array.isArray(node.items)) {
      node.items = node.items.map((item, itemIndex) => {
        const id = `node-${nodeIndex}-item-${itemIndex}`;
        return translationsById[id] || item;
      });
      return;
    }
    if (node.type === "table" && Array.isArray(node.rows)) {
      node.rows = node.rows.map((row, rowIndex) =>
        row.map((cell, cellIndex) => {
          const id = `node-${nodeIndex}-cell-${rowIndex}-${cellIndex}`;
          return translationsById[id] || cell;
        })
      );
    }
  });
  return result;
}

function setRunText(textNodes, text) {
  if (!textNodes || textNodes.length === 0) return;
  const first = textNodes[0];
  first.textContent = text;
  for (let idx = 1; idx < textNodes.length; idx += 1) {
    textNodes[idx].textContent = "";
  }
  if (/^\s|\s$/.test(text)) {
    first.setAttributeNS(XML_NS, "xml:space", "preserve");
  } else {
    first.removeAttributeNS(XML_NS, "space");
    first.removeAttribute("xml:space");
  }
}

function distributeTextAcrossRuns(translatedText, runs) {
  const chars = Array.from(translatedText || "");
  if (runs.length === 0) return;
  if (runs.length === 1) {
    setRunText(runs[0].textNodes, chars.join(""));
    return;
  }

  const originalLengths = runs.map((run) => Array.from(run.originalText).length || 1);
  let remainingChars = chars.length;
  let remainingWeight = originalLengths.reduce((sum, value) => sum + value, 0);
  let offset = 0;

  runs.forEach((run, index) => {
    if (index === runs.length - 1) {
      const segment = chars.slice(offset).join("");
      setRunText(run.textNodes, segment);
      return;
    }
    const currentWeight = originalLengths[index];
    const share = remainingWeight > 0 ? currentWeight / remainingWeight : 0;
    let takeCount = Math.round(remainingChars * share);
    const minReserve = 0;
    takeCount = Math.max(0, Math.min(remainingChars - minReserve, takeCount));
    const segment = chars.slice(offset, offset + takeCount).join("");
    setRunText(run.textNodes, segment);
    offset += takeCount;
    remainingChars -= takeCount;
    remainingWeight -= currentWeight;
  });
}

function writeParagraphTextForCompleteness(translatedText, runs) {
  // Phase priority: complete translated coverage over perfect run-level fidelity.
  // We place full translated text in the first text run, then clear remaining run text.
  if (!Array.isArray(runs) || runs.length === 0) return;
  const value = String(translatedText || "");
  runs.forEach((run, index) => {
    setRunText(run.textNodes, index === 0 ? value : "");
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function safeFileName(value) {
  return (value || "translated-document").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

function findBlockById(blocks, id) {
  for (const block of blocks) {
    if (block.id === id) return block;
  }
  return null;
}

function groupBlocksByFilePath(blocks) {
  const grouped = {};
  blocks.forEach((block) => {
    if (!grouped[block.filePath]) grouped[block.filePath] = [];
    grouped[block.filePath].push(block);
  });
  return grouped;
}

async function applyTranslationsToOOXML(
  zip,
  translationBlocks,
  translationsById,
  translationDebugEntries = []
) {
  // PASS 4 (Write-back): write translated strings into original OOXML nodes.
  const byFile = groupBlocksByFilePath(translationBlocks);
  const serializer = new XMLSerializer();
  const debugById = buildDebugEntryIndex(translationDebugEntries);
  const report = {
    totalBlocks: Array.isArray(translationBlocks) ? translationBlocks.length : 0,
    applied: 0,
    skipped: 0,
    writebackFailures: 0,
    translationLayerLikelyIssues: 0,
    entries: [],
  };

  for (const filePath of Object.keys(byFile)) {
    const fileEntry = zip.file(filePath);
    if (!fileEntry) {
      byFile[filePath].forEach((block) => {
        const sourceText = String(block.text || "").trim();
        const classification = debugById[block.id] || {};
        const classificationAction = String(classification.action || "unknown");
        const classificationReason = String(classification.reason || "unknown");
        report.writebackFailures += 1;
        report.skipped += 1;
        report.entries.push({
          id: block.id,
          filePath,
          blockType: block.blockType || block.kind || "unknown",
          sourceLocation: block.sourceLocation || block.id,
          sourceText,
          translatedText: String(translationsById[block.id] || sourceText || "").trim(),
          classificationAction,
          classificationReason,
          writebackMode: "none",
          oldRunsDiscarded: false,
          runReuse: "none",
          finalText: "",
          translationLayerStatus:
            classificationAction === "preserve"
              ? "intentionally_preserved"
              : "translated_or_pending",
          writebackStatus: "writeback_failure",
          action: "skipped",
          reason: "missing_xml_file",
        });
      });
      continue;
    }

    const xmlText = await fileEntry.async("string");
    const xmlDoc = parseXmlOrThrow(xmlText, filePath);
    const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, "p"));
    const drawingTextNodes = Array.from(xmlDoc.getElementsByTagNameNS(DRAWING_NS, "t"));

    byFile[filePath].forEach((block) => {
      const sourceText = String(block.text || "").trim();
      const translated = String(translationsById[block.id] || sourceText || "").trim();
      const classification = debugById[block.id] || {};
      const classificationAction = String(classification.action || "unknown");
      const classificationReason = String(classification.reason || "unknown");
      const isPreservedBlock = classificationAction === "preserve";

      if (!translated) {
        report.skipped += 1;
        report.entries.push({
          id: block.id,
          filePath,
          blockType: block.blockType || block.kind || "unknown",
          sourceLocation: block.sourceLocation || block.id,
          sourceText,
          translatedText: translated,
          classificationAction,
          classificationReason,
          writebackMode: "none",
          oldRunsDiscarded: false,
          runReuse: "none",
          finalText: "",
          translationLayerStatus: "empty_translation",
          writebackStatus: "skipped",
          action: "skipped",
          reason: "empty_translation",
        });
        return;
      }

      if (block.kind === "drawing_text") {
        const drawingText = drawingTextNodes[block.drawingTextIndex];
        if (!drawingText) {
          report.writebackFailures += 1;
          report.skipped += 1;
          report.entries.push({
            id: block.id,
            filePath,
            blockType: block.blockType || block.kind || "unknown",
            sourceLocation: block.sourceLocation || block.id,
            sourceText,
            translatedText: translated,
            classificationAction,
            classificationReason,
            writebackMode: "drawing_text_replace",
            oldRunsDiscarded: false,
            runReuse: "not_applicable",
            finalText: "",
            translationLayerStatus: isPreservedBlock
              ? "intentionally_preserved"
              : "translated_or_pending",
            writebackStatus: "writeback_failure",
            action: "skipped",
            reason: "missing_drawing_text_node",
          });
          return;
        }
        drawingText.textContent = translated;
        const finalText = normalizeText(drawingText.textContent || "");
        const expectedText = normalizeText(translated);
        const writebackStatus = finalText === expectedText ? "ok" : "writeback_failure";
        if (writebackStatus !== "ok") report.writebackFailures += 1;

        const modelUnchangedEnglish =
          !isPreservedBlock &&
          normalizeText(translated) === normalizeText(sourceText) &&
          hasEnglishWords(sourceText);
        if (modelUnchangedEnglish) report.translationLayerLikelyIssues += 1;

        report.applied += 1;
        report.entries.push({
          id: block.id,
          filePath,
          blockType: block.blockType || block.kind || "unknown",
          sourceLocation: block.sourceLocation || block.id,
          sourceText,
          translatedText: translated,
          classificationAction,
          classificationReason,
          writebackMode: "drawing_text_replace",
          oldRunsDiscarded: false,
          runReuse: "not_applicable",
          finalText,
          translationLayerStatus: isPreservedBlock
            ? "intentionally_preserved"
            : modelUnchangedEnglish
            ? "model_returned_unchanged_english"
            : "translated",
          writebackStatus,
          action: translated === sourceText ? "applied_unchanged" : "applied",
          reason: translated === sourceText ? "same_as_source" : "written",
        });
        return;
      }

      const paragraph = paragraphs[block.paragraphIndex];
      if (!paragraph) {
        report.writebackFailures += 1;
        report.skipped += 1;
        report.entries.push({
          id: block.id,
          filePath,
          blockType: block.blockType || block.kind || "unknown",
          sourceLocation: block.sourceLocation || block.id,
          sourceText,
          translatedText: translated,
          classificationAction,
          classificationReason,
          writebackMode: "paragraph_replace_first_run",
          oldRunsDiscarded: false,
          runReuse: "none",
          finalText: "",
          translationLayerStatus: isPreservedBlock
            ? "intentionally_preserved"
            : "translated_or_pending",
          writebackStatus: "writeback_failure",
          action: "skipped",
          reason: "missing_paragraph_node",
        });
        return;
      }
      const runs = collectRunsInParagraph(paragraph);
      if (runs.length === 0) {
        report.writebackFailures += 1;
        report.skipped += 1;
        report.entries.push({
          id: block.id,
          filePath,
          blockType: block.blockType || block.kind || "unknown",
          sourceLocation: block.sourceLocation || block.id,
          sourceText,
          translatedText: translated,
          classificationAction,
          classificationReason,
          writebackMode: "paragraph_replace_first_run",
          oldRunsDiscarded: false,
          runReuse: "none",
          finalText: "",
          translationLayerStatus: isPreservedBlock
            ? "intentionally_preserved"
            : "translated_or_pending",
          writebackStatus: "writeback_failure",
          action: "skipped",
          reason: "paragraph_has_no_text_runs",
        });
        return;
      }

      const oldRunCount = runs.length;
      writeParagraphTextForCompleteness(translated, runs);
      const finalRuns = collectRunsInParagraph(paragraph);
      const finalText = normalizeText(finalRuns.map((run) => run.originalText).join(""));
      const expectedText = normalizeText(translated);
      const writebackStatus = finalText === expectedText ? "ok" : "writeback_failure";
      if (writebackStatus !== "ok") report.writebackFailures += 1;

      const modelUnchangedEnglish =
        !isPreservedBlock &&
        normalizeText(translated) === normalizeText(sourceText) &&
        hasEnglishWords(sourceText);
      if (modelUnchangedEnglish) report.translationLayerLikelyIssues += 1;

      report.applied += 1;
      report.entries.push({
        id: block.id,
        filePath,
        blockType: block.blockType || block.kind || "unknown",
        sourceLocation: block.sourceLocation || block.id,
        sourceText,
        translatedText: translated,
        classificationAction,
        classificationReason,
        writebackMode: "paragraph_replace_first_run_clear_rest",
        oldRunsDiscarded: oldRunCount > 1,
        runReuse: oldRunCount > 1 ? "reuse_first_run_clear_remaining_runs" : "single_run_reused",
        finalText,
        translationLayerStatus: isPreservedBlock
          ? "intentionally_preserved"
          : modelUnchangedEnglish
          ? "model_returned_unchanged_english"
          : "translated",
        writebackStatus,
        action: translated === sourceText ? "applied_unchanged" : "applied",
        reason: translated === sourceText ? "same_as_source" : "written",
      });
    });

    const updatedXml = serializer.serializeToString(xmlDoc);
    zip.file(filePath, updatedXml);
  }

  return report;
}

async function appendLearningSupportSection({
  zip,
  lessonTitle,
  targetLanguage,
  glossary,
  simplifiedExplanation,
  keyConcepts,
  commonMisconceptions,
  teacherNotes,
  classroomActivities,
  extensionQuestions,
  quiz,
  includeAnswerKey,
  includeExplanations,
}) {
  const fileEntry = zip.file("word/document.xml");
  if (!fileEntry) return;

  const xmlText = await fileEntry.async("string");
  const xmlDoc = parseXmlOrThrow(xmlText, "word/document.xml");
  const body = xmlDoc.getElementsByTagNameNS(WORD_NS, "body")[0];
  if (!body) return;

  function createParagraph(text, isBold = false, isHeading = false) {
    const p = xmlDoc.createElementNS(WORD_NS, "w:p");
    if (isHeading) {
      const pPr = xmlDoc.createElementNS(WORD_NS, "w:pPr");
      const pStyle = xmlDoc.createElementNS(WORD_NS, "w:pStyle");
      pStyle.setAttributeNS(WORD_NS, "w:val", "Heading2");
      pPr.appendChild(pStyle);
      p.appendChild(pPr);
    }
    const r = xmlDoc.createElementNS(WORD_NS, "w:r");
    if (isBold && !isHeading) {
      const rPr = xmlDoc.createElementNS(WORD_NS, "w:rPr");
      const b = xmlDoc.createElementNS(WORD_NS, "w:b");
      rPr.appendChild(b);
      r.appendChild(rPr);
    }
    const t = xmlDoc.createElementNS(WORD_NS, "w:t");
    const value = normalizeText(text);
    t.textContent = value;
    if (/^\s|\s$/.test(value)) {
      t.setAttributeNS(XML_NS, "xml:space", "preserve");
    }
    r.appendChild(t);
    p.appendChild(r);
    return p;
  }

  const labels = getDocxSupportLabels(targetLanguage);

  function appendSection(number, title, renderContent) {
    body.appendChild(createParagraph(`${number}. ${title}`, true));
    renderContent();
    body.appendChild(createParagraph(""));
  }

  function appendTextParagraphs(value, prefix = "   ") {
    asSupportList(value).forEach((item) => {
      if (typeof item === "string") {
        body.appendChild(createParagraph(`${prefix}${item}`));
      } else if (hasSupportContent(item)) {
        body.appendChild(createParagraph(`${prefix}${normalizeText(Object.values(item).join(" "))}`));
      }
    });
  }

  function appendBullet(text, prefix = "   • ") {
    const value = normalizeText(text);
    if (value) body.appendChild(createParagraph(`${prefix}${value}`));
  }

  function appendLabeledLine(label, value, prefix = "   ") {
    const text = normalizeText(value);
    if (text) body.appendChild(createParagraph(`${prefix}${label}: ${text}`));
  }

  body.appendChild(createParagraph(""));
  body.appendChild(createParagraph(""));
  body.appendChild(createParagraph(labels.learningSupportAppendix, true, true));
  body.appendChild(createParagraph(`${labels.lesson}: ${lessonTitle || "Untitled"}`));
  body.appendChild(createParagraph(`${labels.targetLanguage}: ${targetLanguage || "N/A"}`));
  body.appendChild(createParagraph(""));

  if (hasSupportContent(glossary)) {
    appendSection(1, labels.glossary, () => {
      asSupportList(glossary).forEach((item) => {
        if (typeof item === "string") {
          appendBullet(item);
          return;
        }
        const term = normalizeText(item?.term || item?.title || "");
        const explanation = normalizeText(item?.explanation || item?.definition || "");
        appendBullet(term && explanation ? `${term}: ${explanation}` : term || explanation);
      });
    });
  }

  if (hasSupportContent(simplifiedExplanation)) {
    appendSection(2, labels.simplifiedExplanation, () => {
      appendTextParagraphs(simplifiedExplanation);
    });
  }

  if (hasSupportContent(keyConcepts)) {
    appendSection(3, labels.keyConcepts, () => {
      asSupportList(keyConcepts).forEach((concept) => {
        if (typeof concept === "string") {
          appendBullet(concept);
          return;
        }
        appendBullet(concept?.title || concept?.term || "");
        appendBullet(concept?.explanation || concept?.description || "", "     ");
      });
    });
  }

  if (hasSupportContent(commonMisconceptions)) {
    appendSection(4, labels.commonMisconceptions, () => {
      asSupportList(commonMisconceptions).forEach((item) => {
        if (typeof item === "string") {
          appendBullet(item);
          return;
        }
        appendLabeledLine(labels.misconception, item?.misconception || item?.title || "");
        appendLabeledLine(labels.correction, item?.correction || item?.explanation || "");
        body.appendChild(createParagraph(""));
      });
    });
  }

  if (hasSupportContent(teacherNotes)) {
    appendSection(5, labels.teacherNotes, () => {
      appendTextParagraphs(teacherNotes, "   • ");
    });
  }

  if (hasSupportContent(classroomActivities)) {
    appendSection(6, labels.classroomActivities, () => {
      asSupportList(classroomActivities).forEach((activity, idx) => {
        if (typeof activity === "string") {
          body.appendChild(createParagraph(`   ${labels.activity} ${idx + 1}: ${activity}`));
          return;
        }
        body.appendChild(
          createParagraph(`   ${labels.activity} ${idx + 1}: ${normalizeText(activity?.title || "")}`)
        );
        appendLabeledLine(labels.duration, activity?.duration || "");
        appendLabeledLine(labels.instructions, activity?.instructions || activity?.description || "");
        body.appendChild(createParagraph(""));
      });
    });
  }

  if (hasSupportContent(extensionQuestions)) {
    appendSection(7, labels.extensionQuestions, () => {
      asSupportList(extensionQuestions).forEach((question, idx) => {
        if (typeof question === "string") {
          appendBullet(`${idx + 1}. ${question}`, "   ");
          return;
        }
        appendBullet(`${idx + 1}. ${normalizeText(question?.question || Object.values(question).join(" "))}`, "   ");
      });
    });
  }

  if (hasSupportContent(quiz)) {
    appendSection(8, labels.quiz, () => {
      asSupportList(quiz).forEach((q, idx) => {
        if (typeof q === "string") {
          body.appendChild(createParagraph(`${idx + 1}. ${normalizeText(q)}`));
          return;
        }
        body.appendChild(createParagraph(`${idx + 1}. ${normalizeText(q.question)}`));

        if (Array.isArray(q.options)) {
          q.options.forEach((option, optionIdx) => {
            const letter = String.fromCharCode(65 + optionIdx);
            body.appendChild(createParagraph(`   ${letter}. ${normalizeText(option)}`));
          });
        }

        if (includeAnswerKey) {
          const answer =
            q.type === "short_answer"
              ? normalizeText(q.answerText || q.answer || "")
              : normalizeText(
                  Array.isArray(q.options) && Number.isInteger(q.answerIndex)
                    ? q.options[q.answerIndex]
                    : q.answerText || q.answer || ""
                );
          appendLabeledLine(labels.answer, answer);
        }

        if (includeExplanations && q.explanation) {
          appendLabeledLine(labels.explanation, q.explanation);
        }

        body.appendChild(createParagraph(""));
      });
    });
  }

  const serializer = new XMLSerializer();
  const updatedXml = serializer.serializeToString(xmlDoc);
  zip.file("word/document.xml", updatedXml);
}

export async function exportTranslatedDocx({
  lessonTitle,
  targetLanguage,
  docxData,
  translationsById,
  translationDebugEntries = [],
  fallbackTranslatedText,
  glossary,
  simplifiedExplanation,
  keyConcepts,
  commonMisconceptions,
  teacherNotes,
  classroomActivities,
  extensionQuestions,
  quiz,
  quizSettings = null,
  includeAnswerKey = null,
  includeExplanations = null,
  includeLearningAppendix = true,
}) {
  const JSZip = await getJSZip();
  if (!JSZip || typeof JSZip.loadAsync !== "function") {
    throw new Error("DOCX export is unavailable right now.");
  }

  const resolvedIncludeAnswerKey = Boolean(includeAnswerKey ?? quizSettings?.includeAnswerKey);
  const resolvedIncludeExplanations = Boolean(includeExplanations ?? quizSettings?.includeExplanations);

  if (!docxData || !docxData.arrayBuffer || !Array.isArray(docxData.translationBlocks)) {
    // Fallback path for robustness: create a simple new docx if source docx context is missing.
    const docx = await getDocxLib();
    if (!docx || typeof docx.Document !== "function") {
      throw new Error("DOCX export is unavailable right now.");
    }
    const appendixLines = includeLearningAppendix
      ? buildPlainSupportAppendixLines({
          lessonTitle,
          targetLanguage,
          glossary,
          simplifiedExplanation,
          keyConcepts,
          commonMisconceptions,
          teacherNotes,
          classroomActivities,
          extensionQuestions,
          quiz,
          includeAnswerKey: resolvedIncludeAnswerKey,
          includeExplanations: resolvedIncludeExplanations,
        })
      : [];
    const document = new docx.Document({
      sections: [
        {
          children: [
            new docx.Paragraph({
              text: normalizeText(lessonTitle || "Translated Document"),
              heading: docx.HeadingLevel.TITLE,
            }),
            new docx.Paragraph({
              text: normalizeText(fallbackTranslatedText || ""),
            }),
            ...appendixLines.map(
              (line) =>
                new docx.Paragraph({
                  text: normalizeText(line),
                })
            ),
          ],
        },
      ],
    });
    const blob = await docx.Packer.toBlob(document);
    downloadBlob(blob, `${safeFileName(lessonTitle)}-translated.docx`);
    return;
  }

  const zip = await JSZip.loadAsync(docxData.arrayBuffer);
  const translationMap = translationsById || {};
  const writebackReport = await applyTranslationsToOOXML(
    zip,
    docxData.translationBlocks,
    translationMap,
    translationDebugEntries
  );
  if (typeof console !== "undefined") {
    const entries = Array.isArray(writebackReport.entries) ? writebackReport.entries : [];
    const summary = `${writebackReport.applied}/${writebackReport.totalBlocks} blocks written, writebackFailures=${writebackReport.writebackFailures}, translationLayerLikelyIssues=${writebackReport.translationLayerLikelyIssues}`;
    console.groupCollapsed(`[DOCX Writeback Debug] ${summary}`);
    console.table(entries.map((entry) => ({
      id: entry.id,
      filePath: entry.filePath,
      blockType: entry.blockType,
      sourceLocation: entry.sourceLocation,
      classificationAction: entry.classificationAction,
      classificationReason: entry.classificationReason,
      writebackMode: entry.writebackMode,
      oldRunsDiscarded: entry.oldRunsDiscarded,
      runReuse: entry.runReuse,
      translationLayerStatus: entry.translationLayerStatus,
      writebackStatus: entry.writebackStatus,
      action: entry.action,
      reason: entry.reason,
    })));
    const suspectedWritebackFailures = entries.filter(
      (entry) => entry.writebackStatus === "writeback_failure"
    );
    const suspectedTranslationFailures = entries.filter(
      (entry) => entry.translationLayerStatus === "model_returned_unchanged_english"
    );
    if (suspectedWritebackFailures.length > 0) {
      console.warn(
        `[DOCX Debug] Write-back failures detected: ${suspectedWritebackFailures.length}.`
      );
      console.table(
        suspectedWritebackFailures.map((entry) => ({
          id: entry.id,
          blockType: entry.blockType,
          sourceLocation: entry.sourceLocation,
          sourceText: entry.sourceText,
          translatedText: entry.translatedText,
          finalText: entry.finalText,
          reason: entry.reason,
        }))
      );
    }
    if (suspectedTranslationFailures.length > 0) {
      console.warn(
        `[DOCX Debug] Translation layer returned unchanged English for ${suspectedTranslationFailures.length} block(s).`
      );
      console.table(
        suspectedTranslationFailures.map((entry) => ({
          id: entry.id,
          blockType: entry.blockType,
          sourceLocation: entry.sourceLocation,
          sourceText: entry.sourceText,
          classificationAction: entry.classificationAction,
          classificationReason: entry.classificationReason,
        }))
      );
    }
    console.groupEnd();
  }

  if (includeLearningAppendix) {
    await appendLearningSupportSection({
      zip,
      lessonTitle,
      targetLanguage,
      glossary,
      simplifiedExplanation,
      keyConcepts,
      commonMisconceptions,
      teacherNotes,
      classroomActivities,
      extensionQuestions,
      quiz,
      includeAnswerKey: resolvedIncludeAnswerKey,
      includeExplanations: resolvedIncludeExplanations,
    });
  }

  // Images/styles/media are preserved automatically because we only edit XML text parts.
  const blob = await zip.generateAsync({ type: "blob" });
  const fileName = `${safeFileName(lessonTitle)}-translated.docx`;
  downloadBlob(blob, fileName);
}
