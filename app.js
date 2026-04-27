
import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";
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

const UI_LANGUAGE_STORAGE_KEY = "uiLanguage";
const UI_TEXT = {
  en: {
    navOverview: "Overview",
    navTeacherWorkspace: "Teacher Workspace",
    navStudentWorkspace: "Student Workspace",
    brand: "AI-Supported Bilingual Education Tool",
    headerTitle: "Classroom Lesson Builder and Student Practice Demo",
    headerDescription:
      "A practical prototype for preparing bilingual lesson support packages and delivering student-ready learning content with glossary, explanation, and quiz practice.",
    teacherMode: "Teacher Mode",
    studentMode: "Student Mode",
    activeGuidanceMode: "Active guidance mode:",
    teacherPreparation: "Teacher Preparation",
    studentLearning: "Student Learning",
    productOverview: "Product Overview",
    homeDescription:
      "This demo focuses on a reliable DOCX-first teaching workflow: teachers prepare structured translated materials, then students import and practice with guided learning content.",
    featureDocxPdf: "Paste text quickly, upload DOCX (recommended), or upload PDF (experimental).",
    featureDocxWorkflow:
      "DOCX workflow preserves headings, paragraphs, lists, and tables where practical.",
    featureGeneration:
      "Generate translation, glossary, simplified explanation, and configurable quiz.",
    featureExport:
      "Export translated DOCX (recommended), learning package JSON, and optional PDF outputs.",
    featureOverlay:
      "Overlay PDF export remains available for testing, but may be unstable on complex layouts.",
    featureImport:
      "Import prepared packages on the Student side for direct learning practice.",
    openTeacherWorkspace: "Open Teacher Workspace",
    openStudentWorkspace: "Open Student Workspace",
    quizSettings: "Quiz Settings",
    quizSettingsDescription:
      "Configure quiz complexity and response behavior for your lesson package.",
    numberOfQuestions: "Number of questions",
    difficultyLevel: "Difficulty level",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    questionTypes: "Question types",
    multipleChoice: "Multiple Choice",
    trueFalse: "True / False",
    shortAnswer: "Short Answer",
    includeAnswerKey: "Include answer key in Teacher view",
    includeExplanations: "Include answer explanations",
    generatedLessonPackage: "Generated Lesson Package",
    reviewAdjustContent: "Review and adjust content before exporting for teacher or student use.",
    translatedLessonText: "Translated Lesson Text",
    editableTranslationPreview: "Editable translation preview.",
    glossaryAndKeyTerms: "Glossary and Key Terms",
    coreTermsForUnderstanding: "Core terms for bilingual understanding.",
    simplifiedExplanation: "Simplified Explanation",
    editableExplanation: "Editable explanation adapted to mode.",
    quizPreview: "Quiz Preview",
    practiceViewDescription: "Practice view with current quiz settings applied.",
    writeShortAnswer: "Write your short answer...",
    answerLabel: "Answer:",
    whyLabel: "Why:",
    notAvailable: "N/A",
    practiceScore: "Practice score",
    teacherLessonPreparation: "Teacher Lesson Preparation",
    teacherPreparationDescription:
      "Prepare a bilingual lesson package by using manual text, PDF upload, or DOCX upload, then generate AI-supported translation and learning materials.",
    lessonInputAndDocumentProcessing: "Lesson Input and Document Processing",
    lessonTitle: "Lesson title",
    lessonTitlePlaceholder: "Example: Photosynthesis Introduction",
    targetLanguage: "Target language",
    guidanceMode: "Guidance mode",
    uploadDocxRecommended: "Upload DOCX (Recommended)",
    uploadPdfExperimental: "Upload PDF (Experimental)",
    pasteTextInput: "Paste Text Input",
    processingUploadedDocument: "Processing uploaded document...",
    pdfExperimentalWarning:
      "Experimental PDF overlay mode: complex layouts and tables may not align perfectly yet.",
    sourceTextPreviewEditable: "Source text preview (editable)",
    sourceTextPlaceholder:
      "Paste lesson text here, or upload a PDF / DOCX and edit extracted content.",
    generateAiLearningSupport: "Generate AI Learning Support",
    generatingAiLearningSupport: "Generating AI Learning Support...",
    cancelGeneration: "Cancel",
    clearTranslationCache: "Clear Translation Cache",
    translationProgress: "Translation progress",
    preparingTranslation: "Preparing translation...",
    translatingBatchProgress: (current, total) => `Translating batch ${current}/${total}`,
    translatingUniqueBlocks: (unique, total) =>
      `Translating ${unique}/${total} unique block(s)`,
    usingCachedTranslations: (count, total) =>
      `Using cached translations for ${count}/${total} block(s)`,
    retryingIncompleteBlocksProgress: "Retrying incomplete blocks...",
    generatingGlossaryQuiz: "Generating glossary and quiz...",
    progressComplete: "Complete",
    generationCancelled: "Generation cancelled.",
    translationCacheCleared: "Translation cache cleared.",
    exportTranslatedDocxRecommended: "Export Translated DOCX (Recommended)",
    exportLearningPackageTeacherJson: "Export Learning Package (Teacher JSON)",
    exportLearningPackageStudentJson: "Export Learning Package (Student JSON)",
    exportTeacherHandoutPdf: "Export Teacher Handout (PDF)",
    exportStudentHandoutPdf: "Export Student Handout (PDF)",
    exportLayoutPreservingPdfExperimental: "Export Layout-Preserving PDF (Experimental)",
    exportDebugReport: "Export Debug Report",
    debugReportExported: "Debug report exported.",
    studentLearningWorkspace: "Student Learning Workspace",
    studentWorkspaceDescription:
      "Import a teacher-prepared lesson package and complete the guided bilingual learning activities.",
    importLessonPackage: "Import Lesson Package",
    importLessonPackageDescription:
      "Choose a JSON package exported from Teacher Workspace.",
    loadLatestTeacherDraft: "Load Latest Teacher Draft",
    packageType: "Package type",
    sourceType: "Source type",
    sourceTypeText: "Text",
    sourceTypePdf: "PDF",
    sourceTypeDocx: "DOCX",
    glossary: "Glossary",
    practiceQuiz: "Practice Quiz",
    writeYourAnswer: "Write your answer...",
    checkQuiz: "Check Quiz",
    score: "Score",
    packageTypeTeacher: "Teacher",
    packageTypeStudent: "Student",
    languageToggleEnglish: "English",
    languageToggleKazakh: "Қазақша",
    untitledLesson: "Untitled Lesson",
    targetLanguageLabels: {
      English: "English",
      Chinese: "Chinese",
      Russian: "Russian",
      Kazakh: "Kazakh",
      Spanish: "Spanish",
      French: "French",
      Arabic: "Arabic",
      Hindi: "Hindi",
      Swahili: "Swahili",
      German: "German",
      Indonesian: "Indonesian",
      Korean: "Korean",
      Japanese: "Japanese",
    },
    quizTypeLabels: {
      multiple_choice: "Multiple Choice",
      true_false: "True / False",
      short_answer: "Short Answer",
    },
    teacherTip:
      "Teacher tip: configure quiz settings first, then generate AI learning support.",
    recommendedWorkflow:
      "Recommended workflow: Upload DOCX for best structure quality. PDF overlay is experimental.",
    manualTextModeIsActive: "Manual text mode is active.",
    manualTextModeSummary:
      "Manual text mode: type or paste content directly. For structured documents, DOCX is recommended.",
    pleaseUploadDocx: "Please upload a .docx file for the recommended DOCX workflow.",
    pleaseUploadPdf: "Please upload a .pdf file for experimental overlay mode.",
    pdfParsed: (fileName, pageCount) => `PDF parsed: ${fileName} (${pageCount} page(s))`,
    pdfExperimentalSummary:
      "PDF experimental mode: overlay export preserves visuals approximately, but complex tables may drift.",
    docxParsed: (fileName, totalBlocks) =>
      `DOCX parsed: ${fileName} (${totalBlocks} text blocks found)`,
    docxExtractionAudit: (quick) =>
      `DOCX extraction audit: paragraphs=${quick.paragraph}, headings=${quick.heading}, lists=${quick.listItem}, tableCells=${quick.tableCell}, textBoxes=${quick.textBox}, shapeText=${quick.drawingText}, headerFooter=${quick.headerFooter}, skipped=${quick.skipped}.`,
    unsupportedFileType: "Unsupported file type. Please upload .pdf or .docx.",
    documentProcessingFailed: "Document processing failed.",
    pleaseEnterLessonText:
      "Please enter lesson text or upload a PDF / DOCX before generating.",
    generatingLessonSupport: "Generating AI learning support package...",
    docxBatchedMode:
      "DOCX batched mode: translating structured DOCX blocks in smaller requests. Preview text is display/debug only.",
    generatingTeachingSupport:
      "Stage 2/2: Generating glossary, explanation, and quiz with local Ollama...",
    noStructuredDocxBlocks: "No structured DOCX blocks were found for translation.",
    docxGenerationFallbackUsed: (reason) =>
      `DOCX generation fallback used. ${reason || "Local Ollama DOCX generation did not fully complete."}`,
    docxBatchCompleted: (summary) =>
      `DOCX block translation completed in batches. translated=${summary.translated ?? "?"}, preserved=${summary.preserved ?? "?"}, unchanged=${summary.unchangedAfterTranslate ?? "?"}.`,
    docxBatchedTranslationFailed: (reason) =>
      `DOCX batched translation failed. Local fallback loaded. ${reason || ""}`.trim(),
    docxTranslationBatchProgress: (batch, total) =>
      `Stage 1/2: Translating document... Batch ${batch}/${total}`,
    docxRetryModeProgress: (block, blockTotal, batch, batchTotal) =>
      `Retrying incomplete blocks... Block ${block}/${blockTotal} in batch ${batch}/${batchTotal}`,
    retryingIncompleteBlocks: (count) =>
      `Retrying incomplete blocks... ${count} block(s) need a stricter translation pass.`,
    translatingLessonContent: "Stage 1/2: Translating document with local Ollama...",
    noTranslationChunks: "No translation chunks were available.",
    experimentalPdfOverlayTranslated:
      " Experimental PDF overlay blocks translated. Verify complex layouts/tables manually.",
    localOllamaFallbackUsed: (lessonReason, documentReason) =>
      `Local Ollama fallback used for stability. ${lessonReason || ""} ${documentReason || ""}`.trim(),
    aiLearningSupportGenerated: (documentMessage) =>
      `AI learning support package generated successfully.${documentMessage || ""}`,
    couldNotReachLocalOllama: (reason) =>
      `Could not reach local Ollama. Local fallback content loaded. ${reason || ""}`.trim(),
    teacherJsonExported: "Teacher JSON package exported.",
    studentJsonExported: "Student JSON package exported.",
    teacherPdfExported: "Teacher PDF exported.",
    studentPdfExported: "Student PDF exported.",
    pdfExportFailed: "PDF export failed.",
    overlayPdfRequiresSource:
      "Overlay PDF export requires an uploaded PDF source document.",
    overlayPdfExported:
      "Experimental overlay PDF exported. Verify complex tables manually.",
    overlayPdfExportFailed: "Overlay PDF export failed.",
    translatedDocxExported: "Translated DOCX exported (recommended output).",
    docxExportFailed: "DOCX export failed.",
    importingLessonPackage: "Importing lesson package...",
    importedLessonPackage: (lessonTitle) => `Imported lesson package: ${lessonTitle}`,
    importLessonPackageFailed: "Could not import lesson package.",
    noTeacherLessonAvailable:
      "No teacher lesson is available yet. Generate a lesson first.",
    loadedLatestTeacherDraft:
      "Loaded latest teacher draft into Student Workspace.",
    localFallbackLessonGenerated: "Local fallback lesson generated.",
    localFallbackUsedReason: "Local fallback used.",
    lessonSupportFailed: "Local Ollama lesson support failed.",
    docxBlockFailure: "DOCX block failure.",
    unknownBatchError: "Unknown batch error.",
    unknownBlockError: "Unknown block error.",
    docxBatchReason: (batch, total, reason) =>
      `Batch ${batch}/${total}: ${reason}`,
    docxBatchFailedReason: (batch, total, reason) =>
      `Batch ${batch}/${total} failed: ${reason}`,
    docxBatchBlockReason: (batch, total, block, blockTotal, reason) =>
      `Batch ${batch}/${total} block ${block}/${blockTotal}: ${reason}`,
    docxBatchBlockFailedReason: (batch, total, block, blockTotal, reason) =>
      `Batch ${batch}/${total} block ${block}/${blockTotal} failed: ${reason}`,
    ollamaEmptyResponse: "Ollama returned an empty response.",
    ollamaNoJson: "Ollama response did not contain JSON.",
    ollamaInvalidJson: "Ollama returned invalid response JSON.",
    ollamaNoContent: "Ollama response did not include message.content.",
    ollamaConnectionFailed: (reason) =>
      `Could not connect to local Ollama at ${OLLAMA_CONFIG.baseUrl}. ${reason || ""}`.trim(),
    ollamaHttpError: (status, body) =>
      `Ollama HTTP ${status}: ${body || ""}`.trim(),
  },
  kk: {
    navOverview: "Шолу",
    navTeacherWorkspace: "Мұғалімнің жұмыс аймағы",
    navStudentWorkspace: "Оқушының жұмыс аймағы",
    brand: "AI қолдайтын екітілді білім беру құралы",
    headerTitle: "Сабақ құрастыру және оқушы тәжірибесіне арналған демо",
    headerDescription:
      "Глоссарий, түсіндірме және тест арқылы сабаққа қолдау пакеттерін дайындауға және оқушыға дайын оқу мазмұнын ұсынуға арналған практикалық прототип.",
    teacherMode: "Мұғалім режимі",
    studentMode: "Оқушы режимі",
    activeGuidanceMode: "Белсенді нұсқаулық режимі:",
    teacherPreparation: "Мұғалімге дайындық",
    studentLearning: "Оқушының оқуы",
    productOverview: "Өнімге шолу",
    homeDescription:
      "Бұл демо сенімді DOCX-негізді мұғалім жұмыс үдерісіне бағытталған: мұғалімдер құрылымды аударылған материал дайындайды, ал оқушылар оны импорттап, бағытталған оқу мазмұнымен жұмыс істейді.",
    featureDocxPdf:
      "Мәтінді тез енгізіңіз, DOCX жүктеңіз (ұсынылады) немесе PDF жүктеңіз (эксперименттік).",
    featureDocxWorkflow:
      "DOCX жұмыс үдерісі мүмкіндігінше тақырыптарды, абзацтарды, тізімдерді және кестелерді сақтайды.",
    featureGeneration:
      "Аударма, глоссарий, жеңілдетілген түсіндірме және бапталатын тест жасауға болады.",
    featureExport:
      "Аударылған DOCX файлын (ұсынылады), сабақ пакетінің JSON нұсқасын және қосымша PDF нәтижелерін экспорттауға болады.",
    featureOverlay:
      "PDF қабаттастырылған экспорты тестілеу үшін қолжетімді, бірақ күрделі макеттерде тұрақсыз болуы мүмкін.",
    featureImport:
      "Дайындалған пакеттерді оқушы жағында импорттап, тікелей оқу жаттығуларын орындауға болады.",
    openTeacherWorkspace: "Мұғалімнің жұмыс аймағын ашу",
    openStudentWorkspace: "Оқушының жұмыс аймағын ашу",
    quizSettings: "Тест параметрлері",
    quizSettingsDescription:
      "Сабақ пакетіңіз үшін тесттің күрделілігі мен жауап беру тәртібін баптаңыз.",
    numberOfQuestions: "Сұрақтар саны",
    difficultyLevel: "Қиындық деңгейі",
    easy: "Оңай",
    medium: "Орташа",
    hard: "Қиын",
    questionTypes: "Сұрақ түрлері",
    multipleChoice: "Бірнеше жауап нұсқасы",
    trueFalse: "Дұрыс / Бұрыс",
    shortAnswer: "Қысқа жауап",
    includeAnswerKey: "Мұғалім көрінісіне жауап кілтін қосу",
    includeExplanations: "Жауап түсіндірмелерін қосу",
    generatedLessonPackage: "Жасалған сабақ пакеті",
    reviewAdjustContent:
      "Мазмұнды қарап шығып, мұғалімге немесе оқушыға экспорттаудан бұрын түзетіңіз.",
    translatedLessonText: "Аударылған сабақ мәтіні",
    editableTranslationPreview: "Өңдеуге болатын аударма нобайы.",
    glossaryAndKeyTerms: "Глоссарий және негізгі терминдер",
    coreTermsForUnderstanding: "Екітілді түсінуге арналған негізгі терминдер.",
    simplifiedExplanation: "Жеңілдетілген түсіндірме",
    editableExplanation: "Режимге бейімделген, өңдеуге болатын түсіндірме.",
    quizPreview: "Тестті алдын ала көру",
    practiceViewDescription:
      "Ағымдағы тест параметрлерімен берілетін жаттығу көрінісі.",
    writeShortAnswer: "Қысқа жауабыңызды жазыңыз...",
    answerLabel: "Жауап:",
    whyLabel: "Неге:",
    notAvailable: "Жоқ",
    practiceScore: "Жаттығу ұпайы",
    teacherLessonPreparation: "Мұғалімнің сабақ дайындауы",
    teacherPreparationDescription:
      "Қолмен мәтін енгізу, PDF жүктеу немесе DOCX жүктеу арқылы екітілді сабақ пакетін дайындап, кейін AI қолдауымен аударма және оқу материалдарын жасаңыз.",
    lessonInputAndDocumentProcessing: "Сабақ мәтінін енгізу және құжатты өңдеу",
    lessonTitle: "Сабақ атауы",
    lessonTitlePlaceholder: "Мысалы: Фотосинтезге кіріспе",
    targetLanguage: "Мақсатты тіл",
    guidanceMode: "Нұсқаулық режимі",
    uploadDocxRecommended: "DOCX жүктеу (ұсынылады)",
    uploadPdfExperimental: "PDF жүктеу (эксперименттік)",
    pasteTextInput: "Мәтінді қолмен енгізу",
    processingUploadedDocument: "Жүктелген құжат өңделіп жатыр...",
    pdfExperimentalWarning:
      "PDF қабаттастырудың эксперименттік режимі: күрделі макеттер мен кестелер дәл келмеуі мүмкін.",
    sourceTextPreviewEditable: "Бастапқы мәтінді алдын ала көру (өңдеуге болады)",
    sourceTextPlaceholder:
      "Сабақ мәтінін осы жерге қойыңыз немесе PDF / DOCX жүктеп, алынған мазмұнды өңдеңіз.",
    generateAiLearningSupport: "AI оқу қолдауын жасау",
    generatingAiLearningSupport: "AI оқу қолдауы жасалып жатыр...",
    cancelGeneration: "Бас тарту",
    clearTranslationCache: "Аударма кэшін тазалау",
    translationProgress: "Аударма барысы",
    preparingTranslation: "Аударма дайындалып жатыр...",
    translatingBatchProgress: (current, total) =>
      `Пакет аударылып жатыр: ${current}/${total}`,
    translatingUniqueBlocks: (unique, total) =>
      `${total} блоктың ${unique} бірегей блогы аударылып жатыр`,
    usingCachedTranslations: (count, total) =>
      `${total} блоктың ${count} блогы үшін кэштегі аударма қолданылып жатыр`,
    retryingIncompleteBlocksProgress:
      "Толық аударылмаған блоктар қайта өңделіп жатыр...",
    generatingGlossaryQuiz: "Глоссарий мен тест жасалып жатыр...",
    progressComplete: "Аяқталды",
    generationCancelled: "Генерация тоқтатылды.",
    translationCacheCleared: "Аударма кэші тазартылды.",
    exportTranslatedDocxRecommended: "Аударылған DOCX файлын экспорттау (ұсынылады)",
    exportLearningPackageTeacherJson:
      "Сабақ пакетін экспорттау (мұғалім JSON)",
    exportLearningPackageStudentJson:
      "Сабақ пакетін экспорттау (оқушы JSON)",
    exportTeacherHandoutPdf: "Мұғалімге арналған материалды экспорттау (PDF)",
    exportStudentHandoutPdf: "Оқушыға арналған материалды экспорттау (PDF)",
    exportLayoutPreservingPdfExperimental:
      "Пішімі сақталған PDF экспорттау (эксперименттік)",
    exportDebugReport: "Тексеру есебін экспорттау",
    debugReportExported: "Тексеру есебі экспортталды.",
    studentLearningWorkspace: "Оқушының оқу жұмыс аймағы",
    studentWorkspaceDescription:
      "Мұғалім дайындаған сабақ пакетін импорттап, бағытталған екітілді оқу тапсырмаларын орындаңыз.",
    importLessonPackage: "Сабақ пакетін импорттау",
    importLessonPackageDescription:
      "Мұғалімнің жұмыс аймағынан экспортталған JSON пакетін таңдаңыз.",
    loadLatestTeacherDraft: "Мұғалімнің соңғы нұсқасын жүктеу",
    packageType: "Пакет түрі",
    sourceType: "Дереккөз түрі",
    sourceTypeText: "Мәтін",
    sourceTypePdf: "PDF",
    sourceTypeDocx: "DOCX",
    glossary: "Глоссарий",
    practiceQuiz: "Жаттығу тесті",
    writeYourAnswer: "Жауабыңызды жазыңыз...",
    checkQuiz: "Тестті тексеру",
    score: "Ұпай",
    packageTypeTeacher: "Мұғалім",
    packageTypeStudent: "Оқушы",
    languageToggleEnglish: "English",
    languageToggleKazakh: "Қазақша",
    untitledLesson: "Атауы жоқ сабақ",
    targetLanguageLabels: {
      English: "Ағылшын тілі",
      Chinese: "Қытай тілі",
      Russian: "Орыс тілі",
      Kazakh: "Қазақ тілі",
      Spanish: "Испан тілі",
      French: "Француз тілі",
      Arabic: "Араб тілі",
      Hindi: "Хинди",
      Swahili: "Суахили",
      German: "Неміс тілі",
      Indonesian: "Индонезия тілі",
      Korean: "Корей тілі",
      Japanese: "Жапон тілі",
    },
    quizTypeLabels: {
      multiple_choice: "Бірнеше жауап нұсқасы",
      true_false: "Дұрыс / Бұрыс",
      short_answer: "Қысқа жауап",
    },
    teacherTip:
      "Мұғалімге кеңес: алдымен тест параметрлерін баптап, содан кейін AI оқу қолдауын жасаңыз.",
    recommendedWorkflow:
      "Ұсынылатын жұмыс тәртібі: құрылымды жақсы сақтау үшін DOCX жүктеңіз. PDF қабаттастыруы эксперименттік.",
    manualTextModeIsActive: "Қолмен мәтін енгізу режимі белсенді.",
    manualTextModeSummary:
      "Қолмен мәтін енгізу режимі: мазмұнды тікелей теріңіз немесе қойыңыз. Құрылымды құжаттар үшін DOCX ұсынылады.",
    pleaseUploadDocx: "Ұсынылатын DOCX жұмыс үдерісі үшін .docx файлын жүктеңіз.",
    pleaseUploadPdf: "Эксперименттік қабаттастыру режимі үшін .pdf файлын жүктеңіз.",
    pdfParsed: (fileName, pageCount) => `PDF талданды: ${fileName} (${pageCount} бет)`,
    pdfExperimentalSummary:
      "PDF эксперименттік режимі: қабаттастырылған экспорт көріністі шамамен сақтайды, бірақ күрделі кестелерде ауытқу болуы мүмкін.",
    docxParsed: (fileName, totalBlocks) =>
      `DOCX талданды: ${fileName} (${totalBlocks} мәтін блогы табылды)`,
    docxExtractionAudit: (quick) =>
      `DOCX шығару есебі: абзацтар=${quick.paragraph}, тақырыптар=${quick.heading}, тізімдер=${quick.listItem}, кесте ұяшықтары=${quick.tableCell}, мәтіндік өрістер=${quick.textBox}, графикалық мәтін=${quick.drawingText}, колонтитулдар=${quick.headerFooter}, өткізіп жіберілгені=${quick.skipped}.`,
    unsupportedFileType:
      "Қолдау көрсетілмейтін файл түрі. .pdf немесе .docx файлын жүктеңіз.",
    documentProcessingFailed: "Құжатты өңдеу сәтсіз аяқталды.",
    pleaseEnterLessonText:
      "Мәтінді енгізіңіз немесе генерация алдында PDF / DOCX жүктеңіз.",
    generatingLessonSupport: "AI оқу қолдау пакеті жасалып жатыр...",
    docxBatchedMode:
      "DOCX пакеттік режимі: құрылымды DOCX блоктары кішірек сұраулармен аударылып жатыр. Алдын ала көру мәтіні тек көрсету және тексеру үшін қолданылады.",
    generatingTeachingSupport:
      "2/2 кезең: жергілікті Ollama арқылы глоссарий, түсіндірме және тест жасалып жатыр...",
    noStructuredDocxBlocks:
      "Аударма үшін құрылымды DOCX блоктары табылмады.",
    docxGenerationFallbackUsed: (reason) =>
      `DOCX генерациясында қосалқы режим қолданылды. ${reason || "Жергілікті Ollama арқылы DOCX генерациясы толық аяқталмады."}`,
    docxBatchCompleted: (summary) =>
      `DOCX блоктарын пакеттік аудару аяқталды. аударылды=${summary.translated ?? "?"}, сақталды=${summary.preserved ?? "?"}, өзгеріссіз қалды=${summary.unchangedAfterTranslate ?? "?"}.`,
    docxBatchedTranslationFailed: (reason) =>
      `DOCX пакеттік аудармасы сәтсіз аяқталды. Жергілікті қосалқы мазмұн жүктелді. ${reason || ""}`.trim(),
    docxTranslationBatchProgress: (batch, total) =>
      `1/2 кезең: құжат аударылып жатыр... ${batch}/${total} пакет`,
    docxRetryModeProgress: (block, blockTotal, batch, batchTotal) =>
      `Толық емес блоктар қайта аударылып жатыр... ${batch}/${batchTotal} пакеттегі ${block}/${blockTotal} блок`,
    retryingIncompleteBlocks: (count) =>
      `Толық емес блоктар қайта аударылып жатыр... ${count} блокқа қатаң аударма қажет.`,
    translatingLessonContent:
      "1/2 кезең: құжат жергілікті Ollama арқылы аударылып жатыр...",
    noTranslationChunks: "Аудармаға арналған бөліктер табылмады.",
    experimentalPdfOverlayTranslated:
      " PDF қабаттастыру блоктары аударылды. Күрделі кестелер мен макеттерді қолмен тексеріңіз.",
    localOllamaFallbackUsed: (lessonReason, documentReason) =>
      `Тұрақтылық үшін жергілікті Ollama қосалқы режимі қолданылды. ${lessonReason || ""} ${documentReason || ""}`.trim(),
    aiLearningSupportGenerated: (documentMessage) =>
      `AI оқу қолдауы сәтті жасалды.${documentMessage || ""}`,
    couldNotReachLocalOllama: (reason) =>
      `Жергілікті Ollama-ға қосылу мүмкін болмады. Жергілікті қосалқы мазмұн жүктелді. ${reason || ""}`.trim(),
    teacherJsonExported: "Мұғалім JSON пакеті экспортталды.",
    studentJsonExported: "Оқушы JSON пакеті экспортталды.",
    teacherPdfExported: "Мұғалім PDF файлы экспортталды.",
    studentPdfExported: "Оқушы PDF файлы экспортталды.",
    pdfExportFailed: "PDF экспорттау сәтсіз аяқталды.",
    overlayPdfRequiresSource:
      "Қабаттастырылған PDF экспорттау үшін жүктелген бастапқы PDF құжаты қажет.",
    overlayPdfExported:
      "Эксперименттік қабаттастырылған PDF экспортталды. Күрделі кестелерді қолмен тексеріңіз.",
    overlayPdfExportFailed: "Қабаттастырылған PDF экспорттау сәтсіз аяқталды.",
    translatedDocxExported: "Аударылған DOCX экспортталды (ұсынылады).",
    docxExportFailed: "DOCX экспорттау сәтсіз аяқталды.",
    importingLessonPackage: "Сабақ пакеті импортталып жатыр...",
    importedLessonPackage: (lessonTitle) => `Сабақ пакеті импортталды: ${lessonTitle}`,
    importLessonPackageFailed: "Сабақ пакетін импорттау мүмкін болмады.",
    noTeacherLessonAvailable:
      "Әзірге мұғалім сабағы жоқ. Алдымен сабақ жасаңыз.",
    loadedLatestTeacherDraft:
      "Мұғалімнің соңғы нұсқасы Оқушының жұмыс аймағына жүктелді.",
    localFallbackLessonGenerated: "Жергілікті қосалқы сабақ жасалды.",
    localFallbackUsedReason: "Жергілікті қосалқы режим қолданылды.",
    lessonSupportFailed:
      "Жергілікті Ollama арқылы сабаққа қолдау жасау сәтсіз аяқталды.",
    docxBlockFailure: "DOCX блогын өңдеу сәтсіз аяқталды.",
    unknownBatchError: "Белгісіз пакет қатесі.",
    unknownBlockError: "Белгісіз блок қатесі.",
    docxBatchReason: (batch, total, reason) =>
      `${batch}/${total} пакет: ${reason}`,
    docxBatchFailedReason: (batch, total, reason) =>
      `${batch}/${total} пакет сәтсіз аяқталды: ${reason}`,
    docxBatchBlockReason: (batch, total, block, blockTotal, reason) =>
      `${batch}/${total} пакеттегі ${block}/${blockTotal} блок: ${reason}`,
    docxBatchBlockFailedReason: (batch, total, block, blockTotal, reason) =>
      `${batch}/${total} пакеттегі ${block}/${blockTotal} блок сәтсіз аяқталды: ${reason}`,
    ollamaEmptyResponse: "Ollama бос жауап қайтарды.",
    ollamaNoJson: "Ollama жауабында JSON табылмады.",
    ollamaInvalidJson: "Ollama жарамсыз JSON жауап қайтарды.",
    ollamaNoContent: "Ollama жауабында message.content өрісі болмады.",
    ollamaConnectionFailed: (reason) =>
      `Жергілікті Ollama-ға ${OLLAMA_CONFIG.baseUrl} мекенжайы бойынша қосылу мүмкін болмады. ${reason || ""}`.trim(),
    ollamaHttpError: (status, body) =>
      `Ollama HTTP ${status}: ${body || ""}`.trim(),
  },
};
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

const DOCX_TRANSLATION_BATCH_MAX_BLOCKS = 10;
const DOCX_TRANSLATION_BATCH_MAX_CHARS = 2400;
const DOCX_TRANSLATION_SHORT_BLOCK_MAX_CHARS = 180;
const DOCX_TRANSLATION_SHORT_BATCH_MAX_BLOCKS = 18;
const DOCX_TRANSLATION_LONG_BLOCK_MIN_CHARS = 1200;
const PIPELINE_VERSION = "phase-3-static-ollama-v1";
const TRANSLATION_PROMPT_VERSION = "stage-a-block-translation-v2";
const ENRICHMENT_PROMPT_VERSION = "stage-b-teaching-support-v2";
const CACHE_VERSION = "translation-cache-v2";
const TRANSLATION_CACHE_STORAGE_KEY = "aiBilingual.translationCache.v2";
const TRANSLATION_CACHE_MAX_ENTRIES = 600;
const OLLAMA_CONFIG = {
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen3:14b",
  keepAlive: "10m",
};
const OLLAMA_TRANSLATION_OPTIONS = {
  temperature: 0.3,
  top_p: 0.8,
  top_k: 20,
  min_p: 0,
};
const OLLAMA_ENRICHMENT_OPTIONS = {
  temperature: 0.6,
  top_p: 0.95,
  top_k: 20,
  min_p: 0,
  num_predict: 2048,
};
const PLAIN_TEXT_TRANSLATION_CHUNK_MAX_CHARS = 1800;
const ENRICHMENT_FULL_CONTEXT_MAX_CHARS = 7000;
const ENRICHMENT_EXCERPT_MAX_CHARS = 1100;
const ENRICHMENT_MAX_HEADINGS = 12;

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

const validPages = new Set(navItems.map((item) => item.id));

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

function getTargetLanguageConfig(targetLanguage) {
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

function estimateTranslationNumPredict(blocks) {
  const inputChars = (Array.isArray(blocks) ? blocks : []).reduce(
    (sum, block) => sum + String(block?.text || "").length,
    0
  );
  return Math.min(4096, Math.max(1024, Math.ceil(inputChars * 1.8)));
}

function buildTranslationOptions(blocks, overrides = {}) {
  return {
    ...OLLAMA_TRANSLATION_OPTIONS,
    num_predict: estimateTranslationNumPredict(blocks),
    ...overrides,
  };
}

function createGenerationCancelledError() {
  const err = new Error("generation_cancelled");
  err.name = "GenerationCancelledError";
  return err;
}

function isGenerationCancelledError(err) {
  return err?.name === "GenerationCancelledError" || err?.name === "AbortError";
}

function throwIfGenerationCancelled(runContext) {
  if (runContext?.signal?.aborted) {
    throw createGenerationCancelledError();
  }
}

function readTranslationCache() {
  try {
    const raw = window.localStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function writeTranslationCache(cache) {
  try {
    const entries = Object.entries(cache || {});
    entries.sort((a, b) => Number(b[1]?.createdAt || 0) - Number(a[1]?.createdAt || 0));
    const trimmed = Object.fromEntries(entries.slice(0, TRANSLATION_CACHE_MAX_ENTRIES));
    window.localStorage.setItem(TRANSLATION_CACHE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (_err) {
    // localStorage may be unavailable or full. Translation still continues.
  }
}

function clearTranslationCacheStorage() {
  try {
    window.localStorage.removeItem(TRANSLATION_CACHE_STORAGE_KEY);
  } catch (_err) {
    // Ignore localStorage failures.
  }
}

function getTranslationPreserveFlag(block, preserveFormulas) {
  if (Boolean(block?.isFormula)) {
    return preserveFormulas ? "formula_preserved" : "formula_translatable";
  }
  return shouldTranslateBlock(block) ? "translate" : "preserve_candidate";
}

function buildTranslationCacheKey({ block, targetLanguage, preserveFormulas }) {
  const normalizedText = normalizeForComparison(block?.text);
  if (!normalizedText) return "";
  return JSON.stringify({
    cacheVersion: CACHE_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    translationPromptVersion: TRANSLATION_PROMPT_VERSION,
    model: OLLAMA_CONFIG.model,
    targetLanguage,
    preserveFlag: getTranslationPreserveFlag(block, preserveFormulas),
    sourceText: normalizedText,
  });
}

function isValidTranslationCacheEntry(entry) {
  return Boolean(
    entry &&
    typeof entry === "object" &&
    entry.cacheVersion === CACHE_VERSION &&
    entry.translationPromptVersion === TRANSLATION_PROMPT_VERSION &&
    entry.model === OLLAMA_CONFIG.model &&
    entry.action === "translate" &&
    typeof entry.translatedText === "string" &&
    entry.translatedText.trim()
  );
}

function isCacheableTranslationResult({ block, translatedText, action, validationReasons, targetLanguage }) {
  const finalText = String(translatedText || "").trim();
  if (String(action || "").toLowerCase() === "preserve") return false;
  if (!finalText) return false;
  if (!shouldTranslateBlock(block)) return false;
  if (Array.isArray(validationReasons) && validationReasons.length > 0) return false;
  if (
    targetLanguage !== "English" &&
    normalizeForComparison(block?.text) === normalizeForComparison(finalText)
  ) {
    return false;
  }
  return true;
}

function createTranslationDebugEntry({
  block,
  index = 0,
  targetLanguage,
  apiAction,
  action,
  reason,
  translatedText,
  validationReasons = [],
}) {
  const sourceText = String(block?.text || "");
  return {
    index,
    id: block?.id || `block-${index}`,
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
  if (entry.action === "preserve") {
    summary.preserved += 1;
  } else {
    summary.translated += 1;
    if (normalizeForComparison(entry.sourceText) === normalizeForComparison(entry.translatedText)) {
      summary.unchangedAfterTranslate += 1;
    }
  }
  if (Array.isArray(entry.validationReasons) && entry.validationReasons.length > 0) {
    summary.suspicious += 1;
  }
}

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
    const forcePreserve = Boolean(preserveFormulas && block?.isFormula);

    if (!normalizedText || forcePreserve) {
      const entry = createTranslationDebugEntry({
        block,
        index,
        targetLanguage,
        apiAction: forcePreserve ? "frontend_preserve" : "frontend_empty",
        action: "preserve",
        reason: forcePreserve ? "frontend_formula_preserve" : "empty_block",
        translatedText: sourceText,
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
    const reason = String(primaryEntry.reason || "ollama");

    group.members.forEach((member) => {
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
      if (validationReasons.length > 0) {
        suspiciousBlocks.push({
          id: member.block.id,
          index: member.index,
          reasons: validationReasons,
        });
      }

      const isPrimary = member.block.id === primaryBlock.id;
      const entry = createTranslationDebugEntry({
        block: member.block,
        index: member.index,
        targetLanguage,
        apiAction: isPrimary ? "ollama" : "dedupe_reuse",
        action,
        reason: isPrimary ? reason : `dedupe_reuse:${reason}`,
        translatedText,
        validationReasons,
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
        model: OLLAMA_CONFIG.model,
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
      provider: "ollama",
      model: OLLAMA_CONFIG.model,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      responseItemCount: apiResult.meta?.responseItemCount || 0,
      expectedItemCount: plan.uniqueBlocks.length,
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
    meta: {
      usedFallback: true,
      reason: getRuntimeUiText().localFallbackLessonGenerated,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
      cacheVersion: CACHE_VERSION,
    },
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
  const t = getRuntimeUiText();
  let text = stripModelThinking(content);
  if (!text) {
    throw new Error(t.ollamaEmptyResponse);
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
      throw new Error(t.ollamaNoJson);
    }
    return JSON.parse(candidate);
  }
}

async function callOllamaChat(messages, { think, options, format, signal }) {
  const t = getRuntimeUiText();
  let response;
  throwIfGenerationCancelled({ signal });
  const requestBody = {
    model: OLLAMA_CONFIG.model,
    messages,
    stream: false,
    think,
    keep_alive: OLLAMA_CONFIG.keepAlive,
    options,
  };
  if (format) {
    requestBody.format = format;
  }
  try {
    response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });
  } catch (err) {
    if (isGenerationCancelledError(err)) {
      throw createGenerationCancelledError();
    }
    throw new Error(t.ollamaConnectionFailed(err?.message || ""));
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(t.ollamaHttpError(response.status, body.slice(0, 400) || response.statusText));
  }

  const data = await response.json().catch(() => {
    throw new Error(t.ollamaInvalidJson);
  });
  const content = data?.message?.content;
  if (typeof content !== "string") {
    throw new Error(t.ollamaNoContent);
  }
  return content;
}

function clipText(text, maxChars) {
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

function buildTeachingSupportContext({ lessonTitle, sourceText, translation, targetLanguage }) {
  const source = String(sourceText || "").trim();
  const translated = String(translation || "").trim();
  const totalChars = source.length + translated.length;
  const compact = totalChars > ENRICHMENT_FULL_CONTEXT_MAX_CHARS;
  const headings = extractHeadingCandidates(source);

  if (!compact) {
    return {
      compact,
      summary: {
        lessonTitle,
        targetLanguage,
        sourceCharCount: source.length,
        translationCharCount: translated.length,
        headings,
      },
      sourceContext: source,
      translationContext: translated,
    };
  }

  return {
    compact,
    summary: {
      lessonTitle,
      targetLanguage,
      sourceCharCount: source.length,
      translationCharCount: translated.length,
      headings,
    },
    sourceContext: selectRepresentativeExcerpts(source),
    translationContext: selectRepresentativeExcerpts(translated),
  };
}

function getEnrichmentLanguageInstruction(targetLanguage) {
  if (targetLanguage === "Kazakh") {
    return (
      "Use natural Kazakh in Cyrillic script for explanations, quiz questions, and answers. " +
      "Do not write Russian. Do not use Kazakh Latin script. " +
      'Glossary terms may preserve the English source term alongside the Kazakh term, for example: "photosynthesis / фотосинтез".'
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
}) {
  const context = buildTeachingSupportContext({
    lessonTitle,
    sourceText,
    translation,
    targetLanguage,
  });
  const languageInstruction = getEnrichmentLanguageInstruction(targetLanguage);
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
        "No trailing commas. All strings must be properly quoted. Arrays must use commas between elements. " +
        "Use this exact top-level schema: " +
        '{"glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"meta":{}}. ' +
        "This is the teaching-support generation stage, not the translation stage. Do not include a translation field and do not retranslate or rewrite the completed translation. " +
        "Rules: glossary should have 3-6 key terms. Make glossary terms bilingual when useful, such as source term / translated term. Explanations must be in the target language. " +
        "Quiz must follow requested question count, difficulty, and question types, and must be based on the provided lesson content rather than generic bilingual education. " +
        "For multiple_choice, provide exactly 4 options, exactly one clearly correct answer, plausible incorrect distractors, and a valid answerIndex. Avoid ambiguous questions. " +
        "For true_false, provide exactly 2 options in the target language when practical and a valid answerIndex. For short_answer, provide a concise answerText and avoid broad prompts like explain the topic. " +
        "For long lessons, cover different parts of the context rather than only the beginning.",
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
        `Teaching-support context (${context.compact ? "compact representative excerpts" : "full context"}):\n${JSON.stringify(context, null, 2)}\n\n` +
        "Generate only glossary, simplifiedExplanation, quiz, and optional meta as valid strict JSON. Do not include translation in the response. Do not use markdown, comments, trailing commas, or unquoted strings.",
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
        "Preserve the semantic content if possible. The allowed top-level fields are glossary, simplifiedExplanation, quiz, and meta.",
    },
    {
      role: "user",
      content:
        "Repair this malformed JSON into valid strict JSON only:\n\n" +
        String(malformedJson || ""),
    },
  ];
}

function isEmptyOllamaOutputError(err) {
  const message = String(err?.message || "");
  return message === getRuntimeUiText().ollamaEmptyResponse;
}

function warnEnrichmentParseFailure(label, err) {
  if (typeof console !== "undefined") {
    console.warn(`[Ollama enrichment] ${label}`, err);
  }
}

async function generateTeachingSupportWithOllama(fallbackInput, translation, runContext = null) {
  throwIfGenerationCancelled(runContext);
  const messages = buildLessonEnrichmentMessages({
    ...fallbackInput,
    translation,
  });
  let parsed;
  let malformedContent = "";
  try {
    const content = await callOllamaChat(messages, {
      think: true,
      options: OLLAMA_ENRICHMENT_OPTIONS,
      format: "json",
      signal: runContext?.signal,
    });
    throwIfGenerationCancelled(runContext);
    malformedContent = content;
    parsed = extractJsonPayload(content);
  } catch (err) {
    if (isGenerationCancelledError(err)) throw err;
    warnEnrichmentParseFailure("think:true output could not be parsed; retrying with think:false.", err);
    try {
      const retryContent = await callOllamaChat(messages, {
        think: false,
        options: OLLAMA_ENRICHMENT_OPTIONS,
        format: "json",
        signal: runContext?.signal,
      });
      throwIfGenerationCancelled(runContext);
      malformedContent = retryContent;
      parsed = extractJsonPayload(retryContent);
    } catch (retryErr) {
      if (isGenerationCancelledError(retryErr)) throw retryErr;
      warnEnrichmentParseFailure("think:false output could not be parsed; trying JSON repair.", retryErr);
      if (typeof console !== "undefined") {
        console.warn("[Ollama enrichment] JSON repair retry is being used.");
      }
      if (!malformedContent && isEmptyOllamaOutputError(err)) {
        malformedContent = "";
      }
      if (!malformedContent) {
        throw retryErr;
      }
      const repairedContent = await callOllamaChat(
        buildEnrichmentJsonRepairMessages(malformedContent),
        {
          think: false,
          options: OLLAMA_ENRICHMENT_OPTIONS,
          format: "json",
          signal: runContext?.signal,
        }
      );
      throwIfGenerationCancelled(runContext);
      parsed = extractJsonPayload(repairedContent);
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(getRuntimeUiText().ollamaNoJson);
  }

  return {
    ...parsed,
    lessonTitle: parsed.lessonTitle || fallbackInput.lessonTitle,
    translation,
    quizSettings: parsed.quizSettings || fallbackInput.quizSettings,
    meta: {
      ...(parsed.meta || {}),
      usedFallback: false,
      reason: "",
      provider: "ollama",
      model: OLLAMA_CONFIG.model,
      pipelineVersion: PIPELINE_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
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
  strictRetry = false,
}) {
  const languageConfig = getTargetLanguageConfig(targetLanguage);
  const languageInstruction = strictRetry
    ? languageConfig.retryPrompt
    : languageConfig.prompt;
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
        "Preserve only URLs, emails, file paths, obvious identifiers, course codes, formulas, symbolic expressions, and non-language tokens. " +
        "Do not preserve text only because it is bold, large, in a heading, in a list, in a table, or specially formatted. " +
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

function normalizeForComparison(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function isMostlyNonTranslatableText(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const latin = countMatches(value, /[A-Za-z]/g);
  const cjk = countMatches(value, /[\u3400-\u9FFF]/g);
  const letters = cyrillic + latin + cjk;
  if (letters === 0) return true;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (value.length <= 3 && letters <= 2) return true;
  if (/^[A-Z0-9._:/@#%+\-=()[\]{}<>^|,;\s]+$/.test(value) && value.length <= 80) {
    return true;
  }
  return false;
}

function isLikelyNonTranslatableBlock(text) {
  return isMostlyNonTranslatableText(text);
}

function looksMostlyEnglish(text) {
  const value = String(text || "");
  const latin = countMatches(value, /[A-Za-z]/g);
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const cjk = countMatches(value, /[\u3400-\u9FFF]/g);
  const letters = latin + cyrillic + cjk;
  if (letters < 8) return false;
  return latin / letters >= 0.55 && latin >= 8;
}

function hasEnoughCyrillic(text) {
  const value = String(text || "");
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const latin = countMatches(value, /[A-Za-z]/g);
  const letters = cyrillic + latin;
  if (letters < 8) return true;
  return cyrillic / letters >= 0.45;
}

function isSuspiciousTranslation(sourceText, translatedText, targetLanguage) {
  if (!["Kazakh", "Russian"].includes(targetLanguage)) return [];
  if (isLikelyNonTranslatableBlock(sourceText)) return [];
  const reasons = [];
  const source = normalizeForComparison(sourceText);
  const translated = normalizeForComparison(translatedText);
  if (!translated) reasons.push("empty_translated_text");
  if (source && source === translated && looksMostlyEnglish(source)) {
    reasons.push("ordinary_english_left_untranslated");
  }
  if (looksMostlyEnglish(translated)) {
    reasons.push("translated_text_still_mostly_english");
  }
  if (!hasEnoughCyrillic(translated)) {
    reasons.push("insufficient_cyrillic_for_target");
  }
  return reasons;
}

function shouldTranslateBlock(block) {
  if (Boolean(block?.isFormula)) return false;
  return !isLikelyNonTranslatableBlock(block?.text);
}

function getCyrillicRatio(text) {
  const value = String(text || "");
  const cyrillic = countMatches(value, /[\u0400-\u04FF]/g);
  const latin = countMatches(value, /[A-Za-z]/g);
  const denominator = cyrillic + latin;
  return denominator === 0 ? 1 : cyrillic / denominator;
}

function validateTranslatedBlock({ block, translatedText, action, targetLanguage }) {
  const reasons = [];
  const sourceText = String(block?.text || "");
  const finalText = String(translatedText || "").trim();
  const needsTranslation = shouldTranslateBlock(block);
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

  isSuspiciousTranslation(sourceText, finalText, targetLanguage).forEach((reason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  });

  return reasons;
}

async function translateBlocksWithOllama({
  blocks,
  targetLanguage,
  mode,
  preserveFormulas,
  strictRetry = false,
  signal,
}) {
  throwIfGenerationCancelled({ signal });
  const messages = buildBlockTranslationMessages({
    blocks,
    targetLanguage,
    mode,
    preserveFormulas,
    strictRetry,
  });
  const content = await callOllamaChat(messages, {
    think: false,
    options: buildTranslationOptions(blocks, strictRetry ? { temperature: 0.2 } : {}),
    signal,
  });
  throwIfGenerationCancelled({ signal });
  const parsed = extractJsonPayload(content);
  const list = Array.isArray(parsed?.translations) ? parsed.translations : [];

  if (list.length === 0) {
    throw new Error(getRuntimeUiText().ollamaNoJson);
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
  const responseItemCount = list.length;

  blocks.forEach((block, index) => {
    const rawById = byId.get(String(block.id || ""));
    const raw = rawById || list[index];
    if (!raw || typeof raw !== "object") {
      throw new Error(getRuntimeUiText().ollamaNoJson);
    }
    const idMatched =
      Boolean(rawById) || String(raw.id || "") === String(block.id || "");

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
      throw new Error(getRuntimeUiText().ollamaEmptyResponse);
    }

    const validationReasons = validateTranslatedBlock({
      block,
      translatedText: finalText,
      action,
      targetLanguage,
    });
    if (!idMatched) {
      validationReasons.push("missing_or_mismatched_id");
    }
    if (validationReasons.length > 0) {
      suspiciousBlocks.push({
        id: block.id,
        index,
        reasons: validationReasons,
      });
      debugSummary.suspicious += 1;
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
      validationReasons,
      needsRetry: validationReasons.length > 0,
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
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      responseItemCount,
      expectedItemCount: blocks.length,
      itemCountMismatch: responseItemCount !== blocks.length,
      suspiciousBlocks,
      debugSummary,
      debugEntries,
    },
  };
}

function normalizeGlossaryItems(rawGlossary) {
  if (!Array.isArray(rawGlossary)) return [];
  return rawGlossary
    .map((item) => ({
      term: String(item?.term || "").replace(/\s+/g, " ").trim(),
      explanation: String(item?.explanation || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((item) => item.term && item.explanation)
    .slice(0, 6);
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

function normalizeLessonResult(raw, fallbackInput) {
  if (!raw || typeof raw !== "object") {
    return createLocalFallbackLesson(fallbackInput);
  }

  const quizSettings = normalizeQuizSettings(raw.quizSettings || fallbackInput.quizSettings);
  const translation = String(raw.translation || "").trim();
  const simplifiedExplanation = String(
    raw.simplifiedExplanation || raw.explanation || ""
  ).trim();

  const glossary = normalizeGlossaryItems(raw.glossary);
  const quiz = normalizeQuizItems(raw.quiz, quizSettings, fallbackInput.targetLanguage);

  if (!translation || glossary.length === 0 || !simplifiedExplanation || quiz.length === 0) {
    return createLocalFallbackLesson(fallbackInput);
  }

  return {
    lessonTitle: String(
      raw.lessonTitle || fallbackInput.lessonTitle || getRuntimeUiText().untitledLesson
    ).trim(),
    sourceText: fallbackInput.sourceText,
    targetLanguage: fallbackInput.targetLanguage,
    translation,
    glossary,
    simplifiedExplanation,
    quizSettings,
    quiz,
    mode: fallbackInput.mode,
    meta: {
      ...(raw.meta || {}),
      usedFallback: Boolean(raw.meta?.usedFallback),
      reason: raw.meta?.reason || "",
      pipelineVersion: PIPELINE_VERSION,
      enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
    },
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

function createSingleBlockFallbackDebugEntry(item, reason) {
  const block = item?.block || {};
  const originalIndex = Number.isInteger(item?.originalIndex) ? item.originalIndex : 0;
  const sourceText = String(block.text || "");
  return {
    index: originalIndex,
    batchIndex: item?.batchIndex,
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
    suspicious: 0,
  };
}

function accumulateDebugSummary(summary, addition) {
  const next = addition || {};
  summary.total += Number(next.total || 0);
  summary.translated += Number(next.translated || 0);
  summary.preserved += Number(next.preserved || 0);
  summary.unchangedAfterTranslate += Number(next.unchangedAfterTranslate || 0);
  summary.suspicious += Number(next.suspicious || 0);
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
    }, suspicious=${debugSummary.suspicious ?? 0}`
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
    Number(assets.pdfOverlayData?.allBlocks?.length || 0) ||
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
      };
    }
    const detail = detailById[id];
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
    if (String(entry.apiAction || "").includes("retry")) {
      detail.retryAttempted = true;
      if (String(entry.reason || "").includes("success") && validationReasons.length === 0) {
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
      };
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
        /suspicious|english|cyrillic|identical|preserve|short|empty/i.test(reason)
      ) || (item.preserved && looksMostlyEnglish(item.sourceTextExcerpt))
  );
  const preservedBlockDetails = blockDetails.filter((item) => item.preserved);

  return {
    timestamp: new Date().toISOString(),
    pipelineVersion: PIPELINE_VERSION,
    translationPromptVersion: TRANSLATION_PROMPT_VERSION,
    enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
    cacheVersion: CACHE_VERSION,
    modelName: OLLAMA_CONFIG.model,
    ollamaBaseUrl: OLLAMA_CONFIG.baseUrl,
    lessonTitle: lesson?.lessonTitle || "",
    targetLanguage: lesson?.targetLanguage || "",
    sourceType: assets.sourceType || "text",
    documentFileName: assets.fileName || "",
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
    },
    fallback: {
      usedFallback: Boolean(teacherMeta?.usedFallback),
      reason: teacherMeta?.reason || "",
    },
    generationStageSummary: {
      currentStage: generationProgress?.stage || "",
      progressPercent: generationProgress?.percent || 0,
      progressLabel: generationProgress?.label || "",
      translationProvider: translationMeta.provider || "",
      enrichmentProvider: enrichmentMeta.provider || "",
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
    onExportTeacherPdf,
    onExportStudentPdf,
    onExportOverlayPdf,
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
            ${t.uploadPdfExperimental}
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
        ${lesson?.documentAssets?.sourceType === "pdf" &&
        html`
          <div className="statusBanner statusBanner--error">
            ${t.pdfExperimentalWarning}
          </div>
        `}

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
            ${t.exportTranslatedDocxRecommended}
          </button>
          <button className="ghostBtn" onClick=${onExportTeacherJson}>
            ${t.exportLearningPackageTeacherJson}
          </button>
          <button className="ghostBtn" onClick=${onExportStudentJson}>
            ${t.exportLearningPackageStudentJson}
          </button>
          <button className="ghostBtn" onClick=${onExportTeacherPdf}>
            ${t.exportTeacherHandoutPdf}
          </button>
          <button className="ghostBtn" onClick=${onExportStudentPdf}>
            ${t.exportStudentHandoutPdf}
          </button>
          <button className="ghostBtn" onClick=${onExportOverlayPdf}>
            ${t.exportLayoutPreservingPdfExperimental}
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
              <p>${studentLesson.simplifiedExplanation}</p>
            </article>
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

  const [lessonTitle, setLessonTitle] = useState("Photosynthesis Introduction");
  const [sourceText, setSourceText] = useState(
    "Photosynthesis is the process by which green plants use sunlight to make food."
  );
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
    pdfOverlayData: null,
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

  function useManualTextInput() {
    setDocumentContext({
      sourceType: "text",
      fileName: "",
      pdfOverlayData: null,
      docxData: null,
      blockTranslations: {},
      translationDebugEntries: [],
    });
    setDocumentStatus(t.manualTextModeIsActive);
    setDocumentError("");
    setDocumentSummary(t.manualTextModeSummary);
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
        setDocumentStatus(t.pdfParsed(file.name, parsed.pageCount));
        setDocumentSummary(t.pdfExperimentalSummary);
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
        setDocumentStatus(t.docxParsed(file.name, totalBlocks));
        logDocxExtractionAudit(parsed);
        const quick = getDocxExtractionQuickCounts(parsed);
        setDocumentSummary(t.docxExtractionAudit(quick));
      } else {
        throw new Error(t.unsupportedFileType);
      }
    } catch (err) {
      setDocumentError(err?.message || t.documentProcessingFailed);
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

  async function translateBlocksForDocument(blocks, preserveFormulas = true, runContext = null) {
    assertActiveGenerationRun(runContext);
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
    if (plan.cacheHits > 0) {
      setGenerationStatus("info", t.usingCachedTranslations(plan.cacheHits, blocks.length), runContext);
      updateGenerationProgress({
        stage: "translation",
        current: plan.cacheHits,
        total: blocks.length,
        percent: Math.min(70, Math.max(10, (plan.cacheHits / blocks.length) * 70)),
        label: t.usingCachedTranslations(plan.cacheHits, blocks.length),
      }, runContext);
    }
    if (plan.uniqueBlocks.length > 0 && plan.uniqueBlocks.length < blocks.length) {
      setGenerationStatus(
        "info",
        t.translatingUniqueBlocks(plan.uniqueBlocks.length, blocks.length),
        runContext
      );
      updateGenerationProgress({
        stage: "translation",
        current: plan.uniqueBlocks.length,
        total: blocks.length,
        percent: Math.min(72, Math.max(12, ((blocks.length - plan.cacheHits) / blocks.length) * 60)),
        label: t.translatingUniqueBlocks(plan.uniqueBlocks.length, blocks.length),
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
          model: OLLAMA_CONFIG.model,
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
        assertActiveGenerationRun(runContext);
        const apiResult = await translateBlocksWithOllama({
          ...requestPayload,
          blocks: plan.uniqueBlocks,
          signal: runContext?.signal,
        });
        assertActiveGenerationRun(runContext);
        result = mergeTranslationWorkResult({
          plan,
          apiResult,
          targetLanguage,
          cache,
          cacheChangedRef,
        });
      } catch (initialErr) {
        if (isGenerationCancelledError(initialErr)) throw initialErr;
        forceRetryAll = true;
        result = {
          translationsById: { ...plan.translationsById },
          meta: {
            usedFallback: false,
            reason: `batch_translation_failed:${initialErr?.message || t.unknownBatchError}`,
            provider: "ollama",
            model: OLLAMA_CONFIG.model,
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
        .map((item) => String(item.id || ""))
        .filter(Boolean)
    );
    if (forceRetryAll || result.meta?.itemCountMismatch) {
      plan.retryableIds.forEach((id) => retryIds.add(id));
    }

    if (retryIds.size > 0) {
      setGenerationStatus("info", t.retryingIncompleteBlocks(retryIds.size), runContext);
      updateGenerationProgress({
        stage: "retry",
        current: 0,
        total: retryIds.size,
        percent: 75,
        label: t.retryingIncompleteBlocksProgress,
      }, runContext);
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
        assertActiveGenerationRun(runContext);
        if (!retryIds.has(String(block.id || ""))) continue;
        retryIndex += 1;
        updateGenerationProgress({
          stage: "retry",
          current: retryIndex,
          total: retryIds.size,
          percent: 75 + (retryIndex / retryIds.size) * 10,
          label: t.retryingIncompleteBlocksProgress,
        }, runContext);
        try {
          const retryResult = await translateBlocksWithOllama({
            ...requestPayload,
            blocks: [block],
            strictRetry: true,
            signal: runContext?.signal,
          });
          assertActiveGenerationRun(runContext);
          if (
            Array.isArray(retryResult.meta?.suspiciousBlocks) &&
            retryResult.meta.suspiciousBlocks.length > 0
          ) {
            throw new Error(
              retryResult.meta.suspiciousBlocks
                .map((item) => `${item.id}: ${item.reasons.join(",")}`)
                .join(" | ")
            );
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
                model: OLLAMA_CONFIG.model,
                targetLanguage,
                action: "translate",
                reason: retryEntry.reason || "ollama_strict_retry",
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
              apiAction: "ollama_strict_retry",
              reason: `strict_retry_success: ${entry.reason || "ollama"}`,
            }))
          );
        } catch (retryErr) {
          if (isGenerationCancelledError(retryErr)) throw retryErr;
          result.translationsById[block.id] = block.text;
          result.meta.retrySummary.preservedAfterRetry += 1;
          unresolvedSuspiciousBlocks.push({
            id: block.id,
            reasons: [retryErr?.message || "strict_retry_failed"],
          });
          result.meta.reason = mergeReasonList([
            result.meta.reason,
            `strict_retry_failed:${block.id}:${retryErr?.message || t.unknownBlockError}`,
          ]);
          result.meta.debugEntries.push(
            createSingleBlockFallbackDebugEntry(
              { block, originalIndex: blocks.indexOf(block) },
              retryErr?.message || "strict_retry_failed"
            )
          );
          if (forceRetryAll) {
            result.meta.debugSummary.total += 1;
          }
          result.meta.debugSummary.preserved += 1;
          result.meta.debugSummary.unchangedAfterTranslate += 1;
        }
      }
      result.meta.suspiciousBlocks = unresolvedSuspiciousBlocks;
      result.meta.usedFallback = result.meta.retrySummary.preservedAfterRetry > 0;
      if (!result.meta.usedFallback) {
        result.meta.reason = "";
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

  async function translateDocxBlocksInBatches(blocks, preserveFormulas = true, runContext = null) {
    assertActiveGenerationRun(runContext);
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
    let retriedBlocks = 0;
    let failedBlocks = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      assertActiveGenerationRun(runContext);
      const batch = batches[batchIndex];
      const batchBlocks = batch.items.map((item) => item.block);
      setGenerationStatus("info", t.docxTranslationBatchProgress(batchIndex + 1, batches.length), runContext);
      updateGenerationProgress({
        stage: "translation",
        current: batchIndex + 1,
        total: batches.length,
        percent: ((batchIndex + 1) / batches.length) * 75,
        label: t.translatingBatchProgress(batchIndex + 1, batches.length),
      }, runContext);

      if (typeof console !== "undefined") {
        console.info(
          `[DOCX Batch] Translating batch ${batchIndex + 1}/${batches.length}. blocks=${
            batch.blockCount
          }, chars=${batch.charCount}`
        );
      }

      try {
        const batchResult = await translateBlocksForDocument(batchBlocks, preserveFormulas, runContext);
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
              t.docxBatchReason(
                batchIndex + 1,
                batches.length,
                batchResult.meta.reason
              )
            );
          }
        }
      } catch (batchErr) {
        if (isGenerationCancelledError(batchErr)) throw batchErr;
        usedFallback = true;
        aggregatedReasons.push(
          t.docxBatchFailedReason(
            batchIndex + 1,
            batches.length,
            batchErr?.message || t.unknownBatchError
          )
        );

        if (typeof console !== "undefined") {
          console.warn(
            `[DOCX Batch Retry] Batch ${batchIndex + 1}/${batches.length} failed. Retrying blocks individually.`,
            batchErr
          );
        }

        for (let blockIndex = 0; blockIndex < batch.items.length; blockIndex += 1) {
          assertActiveGenerationRun(runContext);
          const item = batch.items[blockIndex];
          retriedBlocks += 1;
          setGenerationStatus(
            "info",
            t.docxRetryModeProgress(
              blockIndex + 1,
              batch.items.length,
              batchIndex + 1,
              batches.length
            ),
            runContext
          );

          try {
            const singleResult = await translateBlocksForDocument([item.block], preserveFormulas, runContext);
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
                  t.docxBatchBlockReason(
                    batchIndex + 1,
                    batches.length,
                    blockIndex + 1,
                    batch.items.length,
                    singleResult.meta.reason
                  )
                );
              }
            }
          } catch (singleErr) {
            if (isGenerationCancelledError(singleErr)) throw singleErr;
            failedBlocks += 1;
            translationsById[item.block.id] = item.block.text;
            aggregatedDebugEntries.push(
              createSingleBlockFallbackDebugEntry(
                { ...item, batchIndex: batchIndex + 1 },
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
              t.docxBatchBlockFailedReason(
                batchIndex + 1,
                batches.length,
                blockIndex + 1,
                batch.items.length,
                singleErr?.message || t.unknownBlockError
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

    const meta = {
      usedFallback,
      reason: mergeReasonList(aggregatedReasons),
      provider: "ollama",
      model: OLLAMA_CONFIG.model,
      pipelineVersion: PIPELINE_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      debugEntries: aggregatedDebugEntries,
      debugSummary: aggregatedSummary,
      cacheSummary: aggregatedCacheSummary,
      batchSummary: {
        totalBatches: batches.length,
        retriedBlocks,
        failedBlocks,
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

  async function handleGenerate() {
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
    };

    if (documentContext.sourceType === "docx" && documentContext.docxData) {
      setGenerationStatus("info", t.docxBatchedMode, runContext);
      if (typeof console !== "undefined") {
        console.info(
          "[DOCX Batched Path] Preview text is not used as translation input. Lesson support uses local Ollama."
        );
      }
      try {
        assertActiveGenerationRun(runContext);
        const docxBlocks = buildDocxTranslationBlocks(documentContext.docxData);
        if (!Array.isArray(docxBlocks) || docxBlocks.length === 0) {
          throw new Error(t.noStructuredDocxBlocks);
        }

        const translationResult = await translateDocxBlocksInBatches(docxBlocks, true, runContext);
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
          const aiPayload = await generateTeachingSupportWithOllama(
            fallbackInput,
            combinedTranslation,
            runContext
          );
          assertActiveGenerationRun(runContext);
          aiLessonBase = normalizeLessonResult(aiPayload, fallbackInput);
          aiLessonMeta = aiPayload.meta || aiLessonBase.meta || aiLessonMeta;
        } catch (lessonErr) {
          if (isGenerationCancelledError(lessonErr)) throw lessonErr;
          aiLessonBase = createLocalFallbackLesson(fallbackInput);
          aiLessonMeta = {
            usedFallback: true,
            reason: lessonErr?.message || t.lessonSupportFailed,
            pipelineVersion: PIPELINE_VERSION,
            enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
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
        });

        if (usedFallback) {
          setGenerationStatus("error", t.docxGenerationFallbackUsed(fallbackReason), runContext);
          markGenerationProgressError(runContext);
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
        const fallback = createLocalFallbackLesson(fallbackInput);
        if (!isActiveGenerationRun(runContext)) return;
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
        setTeacherMeta({
          usedFallback: true,
          reason: docxErr?.message || t.docxBlockFailure,
          pipelineVersion: PIPELINE_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
          cacheVersion: CACHE_VERSION,
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
          `[Non-DOCX Path] sourceType=${documentContext.sourceType || "text"} using local Ollama.`
        );
      }
      setGenerationStatus("info", t.translatingLessonContent, runContext);

      const translationBlocks =
        documentContext.sourceType === "pdf" && documentContext.pdfOverlayData?.allBlocks
          ? documentContext.pdfOverlayData.allBlocks
          : buildPlainTextTranslationBlocks(fallbackInput.sourceText);
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

      const translationResult = await translateBlocksForDocument(
        translationBlocks,
        documentContext.sourceType === "pdf",
        runContext
      );
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
        const payload = await generateTeachingSupportWithOllama(
          fallbackInput,
          completedTranslation,
          runContext
        );
        assertActiveGenerationRun(runContext);
        lessonBase = normalizeLessonResult(payload, fallbackInput);
        lessonMeta = payload.meta || lessonBase.meta || lessonMeta;
      } catch (lessonErr) {
        if (isGenerationCancelledError(lessonErr)) throw lessonErr;
        lessonBase = createLocalFallbackLesson(fallbackInput);
        lessonMeta = {
          usedFallback: true,
          reason: lessonErr?.message || t.lessonSupportFailed,
          pipelineVersion: PIPELINE_VERSION,
          enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
        };
      }
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
          translationDebugEntries: Array.isArray(translationResult.meta?.debugEntries)
            ? translationResult.meta.debugEntries
            : [],
          formulaPreservation: "Formula-like blocks are kept unchanged during document translation.",
        },
      };

      let documentMessage = "";
      const documentMeta = translationResult.meta || { usedFallback: false, reason: "" };
      if (documentContext.sourceType === "pdf" && documentContext.pdfOverlayData?.allBlocks) {
        documentMessage = t.experimentalPdfOverlayTranslated;
      }

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
      });

      if (lessonMeta?.usedFallback || documentMeta?.usedFallback) {
        setGenerationStatus(
          "error",
          t.localOllamaFallbackUsed(lessonMeta.reason || "", documentMeta.reason || ""),
          runContext
        );
        markGenerationProgressError(runContext);
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
      const fallback = createLocalFallbackLesson(fallbackInput);
      if (!isActiveGenerationRun(runContext)) return;
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
      setTeacherMeta({
        ...(fallback.meta || { usedFallback: true, reason: t.localFallbackUsedReason }),
        pipelineVersion: PIPELINE_VERSION,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        enrichmentPromptVersion: ENRICHMENT_PROMPT_VERSION,
        cacheVersion: CACHE_VERSION,
      });
      setGenerationStatus("error", t.couldNotReachLocalOllama(err?.message || ""), runContext);
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
    setStatusMessage(t.teacherJsonExported);
  }

  function exportStudentJson() {
    const pkg = buildPackage("student");
    if (!pkg) return;
    exportLessonPackageJson(pkg);
    setStatusType("info");
    setStatusMessage(t.studentJsonExported);
  }

  async function exportTeacherPdf() {
    const pkg = buildPackage("teacher");
    if (!pkg) return;
    try {
      await exportLessonToPdf(pkg, { includeAnswerKey: true, audienceLabel: "Teacher" });
      setStatusType("info");
      setStatusMessage(t.teacherPdfExported);
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || t.pdfExportFailed);
    }
  }

  async function exportStudentPdf() {
    const pkg = buildPackage("student");
    if (!pkg) return;
    try {
      await exportLessonToPdf(pkg, { includeAnswerKey: false, audienceLabel: "Student" });
      setStatusType("info");
      setStatusMessage(t.studentPdfExported);
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || t.pdfExportFailed);
    }
  }

  async function exportOverlayPdf() {
    if (!teacherLesson) return;
    const assets = teacherLesson.documentAssets || {};
    if (assets.sourceType !== "pdf" || !assets.pdfOverlayData) {
      setStatusType("error");
      setStatusMessage(t.overlayPdfRequiresSource);
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
      setStatusMessage(t.overlayPdfExported);
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err?.message || t.overlayPdfExportFailed);
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
      setStatusMessage(t.translatedDocxExported);
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
            setLessonTitle=${setLessonTitle}
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
            onExportTeacherPdf=${exportTeacherPdf}
            onExportStudentPdf=${exportStudentPdf}
            onExportOverlayPdf=${exportOverlayPdf}
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
