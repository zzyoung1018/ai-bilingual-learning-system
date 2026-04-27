/**
 * PDF tools for this demo.
 *
 * `exportLessonToPdf(packageData, options)` exports teacher/student lesson
 * packages as PDF handouts. PDF uploads are converted to DOCX by the backend
 * and then processed through the DOCX workflow.
 */

import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

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
