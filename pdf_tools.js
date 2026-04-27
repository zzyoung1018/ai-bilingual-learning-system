/**
 * PDF tools for this demo.
 *
 * 1) `extractTextFromPdf(file)` - parse uploaded PDF into plain text
 * 2) `parsePdfForOverlay(file)` - parse pages/blocks for layout-preserving overlay export
 * 3) `exportLessonToPdf(packageData, options)` - export lesson package as a PDF handout
 * 4) `exportOverlayTranslatedPdf(...)` - overlay translated text onto source-page background
 */

import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const PDF_WORKER_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const PDFJS_MODULE_URL = "https://esm.sh/pdfjs-dist@3.11.174";
const FONT_CONFIG = {
  Chinese: {
    family: "NotoSansCJKsc",
    fileName: "NotoSansCJKsc-VF.ttf",
    urls: [
      "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/NotoSansCJKsc-VF.ttf",
      "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/NotoSansCJKsc-VF.ttf",
    ],
  },
  Japanese: {
    family: "NotoSansCJKjp",
    fileName: "NotoSansCJKjp-VF.ttf",
    urls: [
      "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/NotoSansCJKjp-VF.ttf",
      "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/NotoSansCJKjp-VF.ttf",
    ],
  },
  Korean: {
    family: "NotoSansCJKkr",
    fileName: "NotoSansCJKkr-VF.ttf",
    urls: [
      "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/NotoSansCJKkr-VF.ttf",
      "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/NotoSansCJKkr-VF.ttf",
    ],
  },
};

// Keep a separate cache per font family so languages do not reuse the wrong font file.
const fontBase64Cache = {};

function resolvePdfJsApi(moduleValue) {
  if (!moduleValue) return null;
  // Some CDN bundles expose PDF.js on `default`, others on the module root.
  if (typeof moduleValue.getDocument === "function") {
    return moduleValue;
  }
  if (moduleValue.default && typeof moduleValue.default.getDocument === "function") {
    return moduleValue.default;
  }
  return null;
}

let pdfJsApiPromise = null;
async function getPdfJsApi() {
  if (!pdfJsApiPromise) {
    pdfJsApiPromise = import(PDFJS_MODULE_URL)
      .then((moduleValue) => resolvePdfJsApi(moduleValue))
      .catch(() => null);
  }
  return pdfJsApiPromise;
}

function initializePdfWorker(pdfjsApi) {
  // Guarded initialization: do not crash app startup if PDF.js is unavailable.
  try {
    if (pdfjsApi && pdfjsApi.GlobalWorkerOptions) {
      pdfjsApi.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    }
  } catch (_err) {
    // Ignore worker initialization errors; handled when PDF features are used.
  }
}

function hasCjkCharacters(text) {
  // Han + Hiragana + Katakana + Hangul ranges.
  return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\uf900-\ufaff]/.test(text || "");
}

function collectPackageText(packageData) {
  const quizText = (packageData.quiz || [])
    .map((q) => {
      const optionsText = Array.isArray(q.options) ? q.options.join(" ") : "";
      return `${q.question || ""} ${optionsText} ${q.answerText || ""} ${q.explanation || ""}`;
    })
    .join(" ");

  const glossaryText = (packageData.glossary || [])
    .map((item) => `${item.term || ""} ${item.explanation || ""}`)
    .join(" ");

  return [
    packageData.lessonTitle,
    packageData.sourceText,
    packageData.translation,
    packageData.simplifiedExplanation,
    glossaryText,
    quizText,
  ]
    .filter(Boolean)
    .join(" ");
}

function getLanguageFontConfig(packageData) {
  const lang = String(packageData?.targetLanguage || "").trim();
  if (lang === "Chinese") return FONT_CONFIG.Chinese;
  if (lang === "Japanese") return FONT_CONFIG.Japanese;
  if (lang === "Korean") return FONT_CONFIG.Korean;
  return null;
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function loadFontBase64(fontConfig) {
  if (!fontConfig) {
    throw new Error("Missing PDF font configuration.");
  }
  if (fontBase64Cache[fontConfig.family]) return fontBase64Cache[fontConfig.family];

  for (const url of fontConfig.urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      fontBase64Cache[fontConfig.family] = arrayBufferToBase64(buffer);
      return fontBase64Cache[fontConfig.family];
    } catch (_err) {
      // Try next mirror URL.
    }
  }

  throw new Error(
    `Could not load PDF font for ${fontConfig.family}. Please check network and try again.`
  );
}

async function configurePdfFont(doc, packageData) {
  const allText = collectPackageText(packageData);
  if (!hasCjkCharacters(allText)) {
    // English/Latin-only export keeps existing default behavior.
    doc.setFont("helvetica", "normal");
    return "helvetica";
  }

  const fontConfig =
    getLanguageFontConfig(packageData) ||
    FONT_CONFIG.Chinese;

  const fontBase64 = await loadFontBase64(fontConfig);
  doc.addFileToVFS(fontConfig.fileName, fontBase64);
  // Use Identity-H so Unicode CJK glyphs are encoded correctly in PDF.
  try {
    doc.addFont(fontConfig.fileName, fontConfig.family, "normal", "Identity-H");
  } catch (_err) {
    // Fallback for jsPDF builds that only accept the 3-argument signature.
    doc.addFont(fontConfig.fileName, fontConfig.family, "normal");
  }
  doc.setFont(fontConfig.family, "normal");
  return fontConfig.family;
}

export async function extractTextFromPdf(file) {
  const pdfjsApi = await getPdfJsApi();
  if (!pdfjsApi || typeof pdfjsApi.getDocument !== "function") {
    throw new Error("PDF support is currently unavailable. Please paste text manually.");
  }
  initializePdfWorker(pdfjsApi);

  if (!file) {
    throw new Error("No PDF file selected.");
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please upload a .pdf file.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsApi.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push(text.replace(/\s+/g, " ").trim());
  }

  const merged = pages.join("\n\n").trim();
  if (!merged) {
    throw new Error("The PDF was parsed, but no readable text was found.");
  }
  return merged;
}

function drawWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text || "", maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensurePageSpace(doc, y, required, marginBottom) {
  if (y + required <= 297 - marginBottom) {
    return y;
  }
  doc.addPage();
  return 18;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function looksLikeFormula(text) {
  const value = normalizeText(text);
  if (!value) return false;
  if (/[=∑∫√≤≥≈∞πθλμ∆±]/.test(value)) return true;
  const compact = value.replace(/\s+/g, "");
  const letters = (compact.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  const mathish = (compact.match(/[0-9+\-*/^=(){}\[\]<>%]/g) || []).length;
  return mathish >= 4 && letters <= mathish / 2;
}

function groupTextItemsToLines(rawItems) {
  const sorted = [...rawItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 2) return a.y - b.y;
    return a.x - b.x;
  });

  const lines = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    const tolerance = Math.max(3, item.fontSize * 0.35);
    if (!last || Math.abs(last.y - item.y) > tolerance) {
      lines.push({ y: item.y, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return lines.map((line) => {
    const items = line.items.sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd = null;
    for (const item of items) {
      if (text) {
        const gap = prevEnd === null ? 0 : item.x - prevEnd;
        if (gap > item.fontSize * 0.22) {
          text += " ";
        }
      }
      text += item.text;
      prevEnd = item.x + item.width;
    }

    const minX = Math.min(...items.map((item) => item.x));
    const maxX = Math.max(...items.map((item) => item.x + item.width));
    const maxFontSize = Math.max(...items.map((item) => item.fontSize));
    const topY = Math.min(...items.map((item) => item.y - item.fontSize * 0.82));
    const height = Math.max(maxFontSize * 1.25, 10);

    return {
      text: normalizeText(text),
      x: minX,
      y: topY,
      width: Math.max(20, maxX - minX),
      height,
      fontSize: Math.max(8, maxFontSize),
    };
  });
}

export async function parsePdfForOverlay(file) {
  const pdfjsApi = await getPdfJsApi();
  if (!pdfjsApi || typeof pdfjsApi.getDocument !== "function") {
    throw new Error("PDF support is currently unavailable. Please paste text manually.");
  }
  initializePdfWorker(pdfjsApi);

  if (!file) {
    throw new Error("No PDF file selected.");
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please upload a .pdf file.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsApi.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pages = [];
  const fullTextParts = [];
  const allBlocks = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    if (!context) {
      throw new Error("Could not create canvas for PDF rendering.");
    }

    await page.render({ canvasContext: context, viewport }).promise;
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);

    const textContent = await page.getTextContent();
    const rawItems = [];
    for (const item of textContent.items || []) {
      const value = normalizeText(item.str);
      if (!value) continue;
      const tx = pdfjsApi.Util.transform(viewport.transform, item.transform);
      const x = tx[4];
      const yFromBottom = tx[5];
      const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]) || 10;
      const width = Math.max(4, (item.width || value.length * 4) * viewport.scale);
      // jsPDF uses top-left origin; convert from PDF bottom-left coordinates.
      const y = viewport.height - yFromBottom;
      rawItems.push({ text: value, x, y, width, fontSize });
    }

    const lineBlocks = groupTextItemsToLines(rawItems)
      .filter((block) => block.text)
      .map((block, idx) => {
        const id = `p${pageNumber}-b${idx}`;
        const isFormula = looksLikeFormula(block.text);
        if (!isFormula) fullTextParts.push(block.text);
        allBlocks.push({
          id,
          text: block.text,
          isFormula,
          pageNumber,
        });
        return {
          ...block,
          id,
          pageNumber,
          isFormula,
        };
      });

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      imageDataUrl,
      blocks: lineBlocks,
    });
  }

  const fullText = normalizeText(fullTextParts.join(" "));
  return {
    fileName: file.name,
    fullText,
    pageCount: pages.length,
    pages,
    allBlocks,
  };
}

export async function exportLessonToPdf(packageData, options = {}) {
  if (typeof jsPDF !== "function") {
    throw new Error("PDF export is currently unavailable.");
  }

  const includeAnswerKey = options.includeAnswerKey ?? true;
  const audienceLabel = options.audienceLabel || "Teacher";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = 210 - marginLeft - marginRight;
  const lineHeight = 6;
  const sectionGap = 8;
  let y = 16;

  // Apply Unicode-capable CJK font when needed; otherwise keep default font.
  const activeFontFamily = await configurePdfFont(doc, packageData);

  const title = packageData.lessonTitle || "Untitled Lesson";
  doc.setFont(activeFontFamily, "normal");
  doc.setFontSize(16);
  y = drawWrappedText(doc, title, marginLeft, y, contentWidth, 7);

  doc.setFont(activeFontFamily, "normal");
  doc.setFontSize(10);
  y += 2;
  y = drawWrappedText(
    doc,
    `AI-Supported Bilingual Learning Package (${audienceLabel} Version)`,
    marginLeft,
    y,
    contentWidth,
    5
  );
  y = drawWrappedText(
    doc,
    `Target language: ${packageData.targetLanguage || "N/A"} | Mode: ${packageData.mode || "N/A"}`,
    marginLeft,
    y,
    contentWidth,
    5
  );

  const sections = [
    { title: "Source Text", text: packageData.sourceText || "" },
    { title: "Translated Text", text: packageData.translation || "" },
    {
      title: "Glossary",
      text: (packageData.glossary || [])
        .map((item, index) => `${index + 1}. ${item.term}: ${item.explanation}`)
        .join("\n"),
    },
    { title: "Simplified Explanation", text: packageData.simplifiedExplanation || "" },
  ];

  doc.setFontSize(11);
  for (const section of sections) {
    y += sectionGap;
    y = ensurePageSpace(doc, y, 24, 16);
    doc.setFont(activeFontFamily, "normal");
    y = drawWrappedText(doc, section.title, marginLeft, y, contentWidth, lineHeight);
    doc.setFont(activeFontFamily, "normal");
    y = drawWrappedText(doc, section.text || "-", marginLeft, y + 1, contentWidth, 5);
  }

  y += sectionGap;
  y = ensurePageSpace(doc, y, 24, 16);
  doc.setFont(activeFontFamily, "normal");
  y = drawWrappedText(doc, "Quiz", marginLeft, y, contentWidth, lineHeight);
  doc.setFont(activeFontFamily, "normal");

  (packageData.quiz || []).forEach((q, index) => {
    y = ensurePageSpace(doc, y, 26, 16);
    y = drawWrappedText(doc, `${index + 1}. (${q.type || "question"}) ${q.question}`, marginLeft, y + 2, contentWidth, 5);

    if (Array.isArray(q.options) && q.options.length > 0) {
      q.options.forEach((opt, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        y = ensurePageSpace(doc, y, 10, 16);
        y = drawWrappedText(doc, `   ${letter}. ${opt}`, marginLeft, y, contentWidth, 5);
      });
    }

    if (includeAnswerKey) {
      let answerLine = "";
      if (q.type === "short_answer") {
        answerLine = `Answer: ${q.answerText || "-"}`;
      } else {
        const answerIndex = Number.isInteger(q.answerIndex) ? q.answerIndex : 0;
        const answerText =
          Array.isArray(q.options) && q.options[answerIndex] ? q.options[answerIndex] : "";
        answerLine = `Answer: ${answerText || `Option ${answerIndex + 1}`}`;
      }
      y = ensurePageSpace(doc, y, 10, 16);
      y = drawWrappedText(doc, `   ${answerLine}`, marginLeft, y, contentWidth, 5);

      if (q.explanation) {
        y = ensurePageSpace(doc, y, 10, 16);
        y = drawWrappedText(doc, `   Why: ${q.explanation}`, marginLeft, y, contentWidth, 5);
      }
    }
  });

  const safeName = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "lesson-package";
  const suffix = includeAnswerKey ? "teacher" : "student";
  doc.save(`${safeName}-${suffix}.pdf`);
}

export async function exportOverlayTranslatedPdf({
  lessonTitle,
  targetLanguage,
  mode,
  pdfOverlayData,
  blockTranslations,
  audienceLabel = "Teacher",
}) {
  if (typeof jsPDF !== "function") {
    throw new Error("PDF export is currently unavailable.");
  }
  if (!pdfOverlayData || !Array.isArray(pdfOverlayData.pages) || pdfOverlayData.pages.length === 0) {
    throw new Error("No PDF overlay data is available. Upload a PDF first.");
  }

  const translationMap = blockTranslations || {};
  const firstPage = pdfOverlayData.pages[0];
  const doc = new jsPDF({
    unit: "pt",
    format: [firstPage.width, firstPage.height],
    orientation: firstPage.width > firstPage.height ? "landscape" : "portrait",
  });

  const fontProbe = {
    lessonTitle: lessonTitle || "Untitled Lesson",
    targetLanguage: targetLanguage || "Chinese",
    translation: Object.values(translationMap).join(" "),
    simplifiedExplanation: "",
    glossary: [],
    quiz: [],
    mode,
  };
  const activeFontFamily = await configurePdfFont(doc, fontProbe);

  for (let pageIdx = 0; pageIdx < pdfOverlayData.pages.length; pageIdx += 1) {
    const page = pdfOverlayData.pages[pageIdx];
    if (pageIdx > 0) {
      doc.addPage(
        [page.width, page.height],
        page.width > page.height ? "landscape" : "portrait"
      );
    }

    // Step 1: preserve original page visuals.
    doc.addImage(page.imageDataUrl, "JPEG", 0, 0, page.width, page.height);

    // Step 2: overlay translated text while leaving formula blocks untouched.
    for (const block of page.blocks || []) {
      if (block.isFormula) continue;
      const translated = normalizeText(translationMap[block.id] || block.text);
      if (!translated) continue;

      const padding = 1.5;
      const x = block.x - padding;
      const y = block.y - padding;
      const width = Math.max(12, block.width + padding * 2);
      const baseHeight = Math.max(9, block.height + padding * 2);

      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, width, baseHeight, "F");

      doc.setTextColor(18, 40, 66);
      doc.setFont(activeFontFamily, "normal");
      const fontSize = Math.max(8, Math.min(16, block.fontSize * 0.9));
      doc.setFontSize(fontSize);

      const lines = doc.splitTextToSize(translated, Math.max(20, block.width));
      const lineHeight = Math.max(9, fontSize * 1.12);
      const maxLines = Math.max(1, Math.floor((baseHeight + 6) / lineHeight));
      const clipped = lines.slice(0, maxLines);
      doc.text(clipped, block.x, block.y + fontSize * 0.85);
    }
  }

  const base = (lessonTitle || "translated-overlay").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  const audience = String(audienceLabel || "teacher").toLowerCase();
  doc.save(`${base}-overlay-${audience}.pdf`);
}
