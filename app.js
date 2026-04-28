
import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";
import { exportLessonToPdf } from "./pdf_tools.js";
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
    featureDocxPdf: "Paste text quickly, upload DOCX (recommended), or upload PDF to convert into DOCX.",
    featureDocxWorkflow:
      "DOCX workflow preserves headings, paragraphs, lists, and tables where practical.",
    featureGeneration:
      "Generate translation, glossary, simplified explanation, and configurable quiz.",
    featureExport:
      "Export translated DOCX (recommended), learning package JSON, and optional PDF outputs.",
    featureOverlay:
      "PDF upload now converts to DOCX first, then uses the recommended DOCX workflow.",
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
    learningObjectives: "Learning Objectives",
    keyConcepts: "Key Concepts",
    commonMisconceptions: "Common Misconceptions",
    teacherNotes: "Teacher Notes",
    classroomActivities: "Classroom Activities",
    differentiatedSupport: "Differentiated Support",
    extensionQuestions: "Extension Questions",
    studentWorksheet: "Student Worksheet",
    strugglingLearners: "Struggling learners",
    advancedLearners: "Advanced learners",
    languageSupport: "Language support",
    durationLabel: "Duration:",
    noLearningObjectivesGenerated: "No learning objectives generated.",
    noKeyConceptsGenerated: "No key concepts generated.",
    noCommonMisconceptionsGenerated: "No common misconceptions generated.",
    noTeacherNotesGenerated: "No teacher notes generated.",
    noClassroomActivitiesGenerated: "No classroom activities generated.",
    noDifferentiatedSupportGenerated: "No differentiated support generated.",
    noExtensionQuestionsGenerated: "No extension questions generated.",
    noStudentWorksheetGenerated: "No student worksheet tasks generated.",
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
    uploadPdfConvert: "Upload PDF (Convert to DOCX)",
    convertingPdfToDocx: "Converting PDF to DOCX...",
    pdfConvertedToDocx: "PDF converted to DOCX successfully.",
    pdfConversionFailed:
      "PDF conversion failed. Please try a text-based PDF or upload DOCX directly.",
    pasteTextInput: "Paste Text Input",
    processingUploadedDocument: "Processing uploaded document...",
    pdfConversionWorkflowNote:
      "PDF will be converted to DOCX, then processed with the recommended DOCX workflow.",
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
    sourceTypePdfConvertedDocx: "PDF converted to DOCX",
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
      "Recommended workflow: Upload DOCX for best structure quality. PDF files will be converted to DOCX first.",
    manualTextModeIsActive: "Manual text mode is active.",
    manualTextModeSummary:
      "Manual text mode: type or paste content directly. For structured documents, DOCX is recommended.",
    pleaseUploadDocx: "Please upload a .docx file for the recommended DOCX workflow.",
    pleaseUploadPdf: "Please upload a .pdf file to convert to DOCX.",
    pdfParsed: (fileName, convertedName) =>
      `PDF converted to DOCX successfully: ${fileName} → ${convertedName}`,
    pdfConversionSummary:
      "PDF will be converted to DOCX, then processed with the recommended DOCX workflow.",
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
      "Stage 2/2: Generating glossary, explanation, and quiz with the online AI model...",
    teachingSupportFallbackUsed:
      "Translation completed, but teaching support used local fallback content.",
    teachingSupportPartiallyGenerated:
      "Translation completed, but teaching support was partially generated.",
    noStructuredDocxBlocks: "No structured DOCX blocks were found for translation.",
    docxGenerationFallbackUsed: (reason) =>
      `DOCX generation fallback used. ${reason || "AI generation did not fully complete."}`,
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
    translatingLessonContent: "Stage 1/2: Translating document with the online AI model...",
    noTranslationChunks: "No translation chunks were available.",
    aiModelFallbackUsed: (lessonReason, documentReason) =>
      `AI model fallback used for stability. ${lessonReason || ""} ${documentReason || ""}`.trim(),
    aiLearningSupportGenerated: (documentMessage) =>
      `AI learning support package generated successfully.${documentMessage || ""}`,
    couldNotReachBackendAi: (reason) =>
      `Could not reach the backend AI API. Local fallback content loaded. ${reason || ""}`.trim(),
    teacherJsonExported: "Teacher JSON package exported.",
    studentJsonExported: "Student JSON package exported.",
    teacherPdfExported: "Teacher PDF exported.",
    studentPdfExported: "Student PDF exported.",
    pdfExportFailed: "PDF export failed.",
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
    lessonSupportFailed: "AI lesson support failed.",
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
    aiEmptyResponse: "AI model returned an empty response.",
    aiNoJson: "AI model response did not contain JSON.",
    aiInvalidJson: "AI backend returned invalid response JSON.",
    aiNoContent: "AI backend response did not include content.",
    aiConnectionFailed: (reason) =>
      `Could not connect to the backend AI API at ${MODEL_API_CONFIG.chatUrl}. ${reason || ""}`.trim(),
    aiHttpError: (status, body) =>
      `AI backend HTTP ${status}: ${body || ""}`.trim(),
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
      "Мәтінді тез енгізіңіз, DOCX жүктеңіз (ұсынылады) немесе PDF файлын DOCX-ке түрлендіріңіз.",
    featureDocxWorkflow:
      "DOCX жұмыс үдерісі мүмкіндігінше тақырыптарды, абзацтарды, тізімдерді және кестелерді сақтайды.",
    featureGeneration:
      "Аударма, глоссарий, жеңілдетілген түсіндірме және бапталатын тест жасауға болады.",
    featureExport:
      "Аударылған DOCX файлын (ұсынылады), сабақ пакетінің JSON нұсқасын және қосымша PDF нәтижелерін экспорттауға болады.",
    featureOverlay:
      "PDF алдымен DOCX форматына түрлендіріліп, кейін ұсынылатын DOCX жұмыс үдерісі қолданылады.",
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
    learningObjectives: "Оқу мақсаттары",
    keyConcepts: "Негізгі ұғымдар",
    commonMisconceptions: "Жиі кездесетін қате түсініктер",
    teacherNotes: "Мұғалімге арналған жазбалар",
    classroomActivities: "Сыныптағы әрекеттер",
    differentiatedSupport: "Сараланған қолдау",
    extensionQuestions: "Кеңейту сұрақтары",
    studentWorksheet: "Оқушы жұмыс парағы",
    strugglingLearners: "Қиналатын оқушылар",
    advancedLearners: "Озық оқушылар",
    languageSupport: "Тілдік қолдау",
    durationLabel: "Ұзақтығы:",
    noLearningObjectivesGenerated: "Оқу мақсаттары жасалмады.",
    noKeyConceptsGenerated: "Негізгі ұғымдар жасалмады.",
    noCommonMisconceptionsGenerated: "Жиі кездесетін қате түсініктер жасалмады.",
    noTeacherNotesGenerated: "Мұғалімге арналған жазбалар жасалмады.",
    noClassroomActivitiesGenerated: "Сыныптағы әрекеттер жасалмады.",
    noDifferentiatedSupportGenerated: "Сараланған қолдау жасалмады.",
    noExtensionQuestionsGenerated: "Кеңейту сұрақтары жасалмады.",
    noStudentWorksheetGenerated: "Оқушы жұмыс парағының тапсырмалары жасалмады.",
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
    uploadPdfConvert: "PDF жүктеу (DOCX-ке түрлендіру)",
    convertingPdfToDocx: "PDF DOCX форматына түрлендіріліп жатыр...",
    pdfConvertedToDocx: "PDF DOCX форматына сәтті түрлендірілді.",
    pdfConversionFailed:
      "PDF түрлендіру сәтсіз аяқталды. Мәтіндік PDF қолданып көріңіз немесе DOCX файлын тікелей жүктеңіз.",
    pasteTextInput: "Мәтінді қолмен енгізу",
    processingUploadedDocument: "Жүктелген құжат өңделіп жатыр...",
    pdfConversionWorkflowNote:
      "PDF алдымен DOCX форматына түрлендіріліп, кейін ұсынылатын DOCX жұмыс үдерісімен өңделеді.",
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
    sourceTypePdfConvertedDocx: "PDF-тен DOCX-ке түрлендірілген",
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
      "Ұсынылатын жұмыс тәртібі: құрылымды жақсы сақтау үшін DOCX жүктеңіз. PDF алдымен DOCX форматына түрлендіріледі.",
    manualTextModeIsActive: "Қолмен мәтін енгізу режимі белсенді.",
    manualTextModeSummary:
      "Қолмен мәтін енгізу режимі: мазмұнды тікелей теріңіз немесе қойыңыз. Құрылымды құжаттар үшін DOCX ұсынылады.",
    pleaseUploadDocx: "Ұсынылатын DOCX жұмыс үдерісі үшін .docx файлын жүктеңіз.",
    pleaseUploadPdf: "DOCX-ке түрлендіру үшін .pdf файлын жүктеңіз.",
    pdfParsed: (fileName, convertedName) =>
      `PDF DOCX форматына сәтті түрлендірілді: ${fileName} → ${convertedName}`,
    pdfConversionSummary:
      "PDF алдымен DOCX форматына түрлендіріліп, кейін ұсынылатын DOCX жұмыс үдерісімен өңделеді.",
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
      "2/2 кезең: онлайн AI моделі арқылы глоссарий, түсіндірме және тест жасалып жатыр...",
    teachingSupportFallbackUsed:
      "Аударма аяқталды, бірақ оқу қолдауы үшін жергілікті қосалқы мазмұн қолданылды.",
    teachingSupportPartiallyGenerated:
      "Аударма аяқталды, бірақ оқу қолдауы жартылай ғана жасалды.",
    noStructuredDocxBlocks:
      "Аударма үшін құрылымды DOCX блоктары табылмады.",
    docxGenerationFallbackUsed: (reason) =>
      `DOCX генерациясында қосалқы режим қолданылды. ${reason || "AI генерациясы толық аяқталмады."}`,
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
      "1/2 кезең: құжат онлайн AI моделі арқылы аударылып жатыр...",
    noTranslationChunks: "Аудармаға арналған бөліктер табылмады.",
    aiModelFallbackUsed: (lessonReason, documentReason) =>
      `Тұрақтылық үшін AI моделінің қосалқы режимі қолданылды. ${lessonReason || ""} ${documentReason || ""}`.trim(),
    aiLearningSupportGenerated: (documentMessage) =>
      `AI оқу қолдауы сәтті жасалды.${documentMessage || ""}`,
    couldNotReachBackendAi: (reason) =>
      `Backend AI API-ге қосылу мүмкін болмады. Қосалқы мазмұн жүктелді. ${reason || ""}`.trim(),
    teacherJsonExported: "Мұғалім JSON пакеті экспортталды.",
    studentJsonExported: "Оқушы JSON пакеті экспортталды.",
    teacherPdfExported: "Мұғалім PDF файлы экспортталды.",
    studentPdfExported: "Оқушы PDF файлы экспортталды.",
    pdfExportFailed: "PDF экспорттау сәтсіз аяқталды.",
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
      "AI арқылы сабаққа қолдау жасау сәтсіз аяқталды.",
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
    aiEmptyResponse: "AI моделі бос жауап қайтарды.",
    aiNoJson: "AI моделі жауабында JSON табылмады.",
    aiInvalidJson: "Backend AI API жарамсыз JSON жауап қайтарды.",
    aiNoContent: "Backend AI API жауабында content өрісі болмады.",
    aiConnectionFailed: (reason) =>
      `Backend AI API-ге ${MODEL_API_CONFIG.chatUrl} мекенжайы бойынша қосылу мүмкін болмады. ${reason || ""}`.trim(),
    aiHttpError: (status, body) =>
      `Backend AI API HTTP ${status}: ${body || ""}`.trim(),
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
const PIPELINE_VERSION = "phase-4a-online-api-proxy-v1";
const TRANSLATION_PROMPT_VERSION = "stage-a-block-translation-v2";
const ENRICHMENT_PROMPT_VERSION = "stage-b-teaching-support-v2";
const CACHE_VERSION = "translation-cache-v3";
const TRANSLATION_CACHE_STORAGE_KEY = "aiBilingual.translationCache.v3";
const TRANSLATION_CACHE_MAX_ENTRIES = 600;
const FRONTEND_DEV_HOSTS = new Set(["localhost:5500", "127.0.0.1:5500"]);
const API_BASE_URL =
  typeof window !== "undefined" && typeof window.APP_API_BASE_URL === "string"
    ? window.APP_API_BASE_URL
    : typeof window !== "undefined" && FRONTEND_DEV_HOSTS.has(window.location.host)
    ? "http://127.0.0.1:8000"
    : "";
const MODEL_API_CONFIG = {
  provider: "online-api",
  baseUrl: API_BASE_URL.replace(/\/$/, ""),
  chatUrl: `${API_BASE_URL.replace(/\/$/, "")}/api/llm/chat`,
  pdfToDocxUrl: `${API_BASE_URL.replace(/\/$/, "")}/api/pdf-to-docx`,
  translationModel: "gpt-5.5",
  enrichmentModel: "gpt-5.5",
  repairModel: "gpt-5.5",
};
const MODEL_TRANSLATION_OPTIONS = {
  temperature: 0.3,
  top_p: 0.8,
  top_k: 20,
  min_p: 0,
};
const MODEL_ENRICHMENT_OPTIONS = {
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
const ENRICHMENT_QUALITY_VERSION = "phase4e-grounded-support-v1";
const SUPPORT_FIELD_NAMES = [
  "glossary",
  "simplifiedExplanation",
  "quiz",
  "learningObjectives",
  "keyConcepts",
  "commonMisconceptions",
  "teacherNotes",
  "classroomActivities",
  "differentiatedSupport",
  "extensionQuestions",
  "studentWorksheet",
];
const DOCUMENT_FATAL_FALLBACK_RATIO = 0.2;
const DOCUMENT_MIN_TRANSLATED_RATIO = 0.25;

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
    ...MODEL_TRANSLATION_OPTIONS,
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

function getTranslationPreserveFlag(block, preserveFormulas, targetLanguage = "") {
  if (shouldPreserveBeforeTranslation(block, preserveFormulas, targetLanguage)) {
    return preserveFormulas ? "formula_preserved" : "formula_translatable";
  }
  const classification = classifyTranslationBlock(block?.text, targetLanguage, block);
  return shouldTranslateBlock(block, targetLanguage)
    ? `translate:${classification.blockKind}`
    : `preserve:${classification.blockKind}`;
}

function buildTranslationCacheKey({ block, targetLanguage, preserveFormulas }) {
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
    learningObjectives: [
      "Identify the main idea of the lesson content.",
      "Explain key terms using bilingual support.",
      "Check understanding through short practice tasks.",
    ],
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
    differentiatedSupport: {
      strugglingLearners: "Pre-teach glossary terms and reduce the reading chunk size.",
      advancedLearners: "Ask students to extend the explanation with an example.",
      languageSupport: "Keep important English terms visible next to translated terms.",
    },
    extensionQuestions: [
      "How could this idea be applied in a new situation?",
      "Which term is most important for understanding the lesson?",
    ],
    studentWorksheet: [
      {
        taskTitle: "Key idea check",
        instructions: "Write one sentence explaining the main idea and one key term.",
      },
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

function createSafeEnrichmentFallbackLesson(
  fallbackInput,
  translation,
  {
    reason = "",
    retryAttempted = false,
    firstAttemptEmpty = false,
    firstAttemptInvalid = false,
    richRetryAttempted = false,
    minimalFallbackAttempted = false,
    kazakhValidationReasons = [],
  } = {}
) {
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
    learningObjectives: [],
    keyConcepts: [],
    commonMisconceptions: [],
    teacherNotes: "",
    classroomActivities: [],
    differentiatedSupport: {
      strugglingLearners: "",
      advancedLearners: "",
      languageSupport: "",
    },
    extensionQuestions: [],
    studentWorksheet: [],
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
      enrichmentRetryAttempted: Boolean(retryAttempted),
      enrichmentFirstAttemptEmpty: Boolean(firstAttemptEmpty),
      enrichmentFirstAttemptInvalid: Boolean(firstAttemptInvalid),
      enrichmentRichRetryAttempted: Boolean(richRetryAttempted),
      enrichmentCompactCompleteRetryAttempted: Boolean(richRetryAttempted),
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

async function callModelChat(messages, { stage, options, format, signal }) {
  const t = getRuntimeUiText();
  let response;
  throwIfGenerationCancelled({ signal });
  const requestBody = {
    stage,
    messages,
    format: format === "json" ? "json" : "text",
    options,
  };
  try {
    response = await fetch(MODEL_API_CONFIG.chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });
  } catch (err) {
    if (isGenerationCancelledError(err)) {
      throw createGenerationCancelledError();
    }
    throw new Error(t.aiConnectionFailed(err?.message || ""));
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
const OFF_TOPIC_TERM_EXPANSIONS = {
  photosynthesis: [
    "photosynthesis",
    "plant",
    "plants",
    "leaf",
    "leaves",
    "chlorophyll",
    "sunlight",
    "фотосинтез",
    "өсімдік",
    "өсімдіктер",
    "жапырақ",
    "хлорофилл",
    "күн сәулесі",
  ],
  plant: ["plant", "plants", "өсімдік", "өсімдіктер"],
};

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
      "Use natural Kazakh in Cyrillic script for explanations, quiz questions, and answers. " +
      "Do not write Russian. Do not use Kazakh Latin script. " +
      'Glossary terms may preserve the English source term alongside the Kazakh term, using the pattern "source term / Kazakh term" when useful.'
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
          "Generate a compact but complete Kazakh teaching-support package. Return ONLY strict JSON. No markdown, comments, or text outside JSON. Do not include a translation field. " +
          "Use natural Kazakh in Cyrillic script. Do not write Russian. Do not use Latin-script Kazakh for ordinary prose. Preserve English technical terms in parentheses when useful. " +
          titleWarning +
          "Use only the provided source/translation context. Do not invent unrelated topics. Do not use unsupported lesson-title topics in quiz options or examples. " +
          "Return all fields in this exact schema: " +
          '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"learningObjectives":["string"],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"differentiatedSupport":{"strugglingLearners":"string","advancedLearners":"string","languageSupport":"string"},"extensionQuestions":["string"],"studentWorksheet":[{"taskTitle":"string","instructions":"string"}],"meta":{}}. ' +
          "Limits: glossary 5, simplifiedExplanation 2-4 short paragraphs, learningObjectives 3, keyConcepts 3, commonMisconceptions 2, teacherNotes 3 short notes, classroomActivities 1, extensionQuestions 2, studentWorksheet 1-2 tasks, quiz respects quiz settings.",
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
          "Generate complete compact Kazakh JSON. Actual lesson excerpts are the source of truth.",
      },
    ];
  }

  return [
    {
      role: "system",
      content:
        "You are an assistant for an AI-supported bilingual education product. " +
        "Return ONLY strict JSON. Do not include markdown, comments, or explanatory text outside JSON. " +
        "No trailing commas. All strings must be properly quoted. Arrays must use commas between elements. " +
        "Use this exact top-level schema: " +
        '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"learningObjectives":["string"],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"differentiatedSupport":{"strugglingLearners":"string","advancedLearners":"string","languageSupport":"string"},"extensionQuestions":["string"],"studentWorksheet":[{"taskTitle":"string","instructions":"string"}],"meta":{}}. ' +
        "This is the teaching-support generation stage, not the translation stage. Do not include a translation field and do not retranslate or rewrite the completed translation. " +
        titleWarning +
        "Grounding rules: use only the provided lesson context. Do not invent unrelated topics. Do not give generic education advice. Refer to specific concepts, headings, examples, formulas, terminology, or glossary candidates from the context when possible. If the source content is thin, produce fewer and shorter items rather than hallucinating. " +
        "Glossary rules: choose 5-8 genuinely important terms from the lesson. Avoid trivial words and random terms. Use source term + translated term when useful, and explain each term in concise student-friendly target-language wording. " +
        "Simplified explanation rules: write a concise 200-400 word explanation when enough content exists. Include a short overview, why the topic matters, step-by-step explanation, one concrete example or analogy when possible, a common difficulty point, and a brief recap. Use line breaks if helpful. " +
        "Learning objectives must be actionable and measurable, using verbs such as explain, identify, compare, apply, calculate, interpret, or evaluate. Generate 3-5 objectives. " +
        "Key concepts should have 3-5 lesson-specific concepts with explanations that connect to the lesson context and do not merely repeat the glossary. " +
        "Common misconceptions should have 2-4 specific misunderstandings and corrections. Teacher notes must cover introduction, likely struggle points, examples to emphasize, prior knowledge, and quick checks for understanding. " +
        "Classroom activities should have 1-3 executable activities such as a warm-up, pair discussion, quick practice, or exit ticket with clear instructions and realistic durations. Differentiated support must be practical for struggling learners, advanced learners, and language support. " +
        "Extension questions should have 2-4 open-ended lesson-connected questions. Student worksheet should have 2-4 short actionable tasks, mixing vocabulary check, concept application, short explanation, or reflection. " +
        "Quiz must follow requested question count, difficulty, and question types, and must be concise and grounded in lesson content. Cover recall, understanding, and application when possible. " +
        "For multiple_choice, provide exactly 4 options, exactly one clearly correct answer, plausible distractors, and a valid answerIndex. Avoid ambiguous questions. " +
        "For true_false, provide exactly 2 options in the target language when practical and avoid statements that are too obvious. For short_answer, provide a concise answerText and avoid broad prompts like explain the topic. " +
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
        "Generate only the requested teaching-support JSON fields and optional meta as valid strict JSON. Do not include translation in the response. Do not use markdown, comments, trailing commas, or unquoted strings.",
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
        '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"learningObjectives":["string"],"keyConcepts":[{"title":"string","explanation":"string"}],"meta":{}}. ' +
        "Keep output small and lesson-specific: glossary 3-5 important terms, learningObjectives 3 measurable items, keyConcepts 3 items, simplifiedExplanation short but useful, and quiz concise.",
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
    .filter(Boolean);
  const allowedSchema =
    '{"glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"learningObjectives":["string"],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"differentiatedSupport":{"strugglingLearners":"string","advancedLearners":"string","languageSupport":"string"},"extensionQuestions":["string"],"studentWorksheet":[{"taskTitle":"string","instructions":"string"}],"meta":{}}';

  if (targetLanguage === "Kazakh") {
    return [
      {
        role: "system",
        content:
          "Complete missing Kazakh teaching-support fields for a bilingual lesson package. Return ONLY strict JSON. No markdown, comments, or text outside JSON. " +
          "Generate ONLY the requested missing top-level fields and optional meta. Do not repeat fields that are not requested. Do not include translation. " +
          "Use natural Kazakh Cyrillic. Do not write Russian. Do not use Latin-script Kazakh for ordinary prose. Preserve English technical terms in parentheses only when useful. " +
          "Use source and translation excerpts as ground truth. The lesson title is metadata only; do not use it as the only source. Do not invent title-only topics. " +
          "For linear algebra material, generated glossary and quiz items must be about vectors, matrices, linear transformations, mathematical structure, and learning linear algebra when those ideas are present in the context. Never use photosynthesis, plants, leaves, chlorophyll, or sunlight as quiz content or distractors. " +
          "For Shakespeare biographical material, teacher support should be about Shakespeare's early life, Stratford-upon-Avon, London theatre, performance context, Hamnet, the careful relationship between biography and art, and Shakespeare's legacy when those ideas are present in the context. Famous names and places may be written as Шекспир (Shakespeare), Лондон (London), and Стратфорд (Stratford) when useful. " +
          `Allowed JSON shape: ${allowedSchema}. ` +
          "Kazakh field targets when requested: glossary 3-5 entries, quiz 3-4 questions, learningObjectives 2-3, keyConcepts 2-3, commonMisconceptions 1-2, teacherNotes 2-3, classroomActivities 1, differentiatedSupport with at least one useful non-empty field, extensionQuestions 1-2, simplifiedExplanation 1-2 short paragraphs, studentWorksheet 1-2 tasks.",
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
          "Use natural Kazakh Cyrillic. Do not write Russian. Do not use Latin-script Kazakh. Preserve English technical terms in parentheses when useful. " +
          titleWarning +
          "Use source and translation excerpts as the source of truth. Do not generate quiz, glossary, objectives, examples, or worksheet tasks from title-only topics. Do not return the full translation. " +
          "Return every schema field: lessonTitle, glossary, simplifiedExplanation, quiz, learningObjectives, keyConcepts, commonMisconceptions, teacherNotes, classroomActivities, differentiatedSupport, extensionQuestions, studentWorksheet, meta. " +
          "Keep it short: glossary exactly 5, simplifiedExplanation exactly 2 short paragraphs, quiz 3-4 questions, learningObjectives exactly 3, keyConcepts exactly 3, commonMisconceptions exactly 2, teacherNotes 2-3 short notes, classroomActivities exactly 1, differentiatedSupport includes strugglingLearners, advancedLearners, and languageSupport, extensionQuestions exactly 2, studentWorksheet 1-2 tasks. Quiz follows settings and must be about the actual lesson context.",
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
        '{"lessonTitle":"string","glossary":[{"term":"string","explanation":"string"}],"simplifiedExplanation":"string","quiz":[{"type":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"answerIndex":0,"answerText":"string","explanation":"string"}],"learningObjectives":["string"],"keyConcepts":[{"title":"string","explanation":"string"}],"commonMisconceptions":[{"misconception":"string","correction":"string"}],"teacherNotes":["string"],"classroomActivities":[{"title":"string","duration":"string","instructions":"string"}],"differentiatedSupport":{"strugglingLearners":"string","advancedLearners":"string","languageSupport":"string"},"extensionQuestions":["string"],"studentWorksheet":[{"taskTitle":"string","instructions":"string"}],"meta":{}}. ' +
        "Limits: glossary 5 entries, learningObjectives 3, keyConcepts 3, commonMisconceptions 2, classroomActivities 1, extensionQuestions 2, studentWorksheet 1-2 tasks. Quiz must respect quiz settings.",
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
        "Preserve the semantic content if possible. The allowed top-level fields are lessonTitle, glossary, simplifiedExplanation, quiz, learningObjectives, keyConcepts, commonMisconceptions, teacherNotes, classroomActivities, differentiatedSupport, extensionQuestions, studentWorksheet, and meta.",
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

function warnEnrichmentParseFailure(label, err) {
  if (typeof console !== "undefined") {
    console.warn(`[AI enrichment] ${label}`, err);
  }
}

async function requestParsedEnrichment(messages, runContext) {
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
  [
    "lessonTitle",
    "glossary",
    "simplifiedExplanation",
    "quiz",
    "learningObjectives",
    "keyConcepts",
    "commonMisconceptions",
    "teacherNotes",
    "classroomActivities",
    "extensionQuestions",
    "studentWorksheet",
  ].forEach((field) => {
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

function validateKazakhSupportContent(lesson) {
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

function validateSupportCompleteness(lessonLike) {
  const counts = getSupportFieldCounts(lessonLike);
  const isKazakh = lessonLike?.targetLanguage === "Kazakh";
  const isTeacherMode = String(lessonLike?.mode || "teacher") === "teacher";
  const thresholds = isKazakh
    ? {
        glossary: 3,
        quiz: 3,
        learningObjectives: 2,
        keyConcepts: 2,
      }
    : {
        glossary: 1,
        quiz: 1,
        learningObjectives: 1,
        keyConcepts: 1,
      };
  const missingCriticalSupportFields = [];
  const supportCompletenessReasons = [];

  Object.entries(thresholds).forEach(([field, minimum]) => {
    if (Number(counts[field] || 0) < minimum) {
      missingCriticalSupportFields.push(field);
      supportCompletenessReasons.push(`${field}_below_minimum:${counts[field] || 0}/${minimum}`);
    }
  });

  if (!String(lessonLike?.simplifiedExplanation || "").trim()) {
    missingCriticalSupportFields.push("simplifiedExplanation");
    supportCompletenessReasons.push("simplifiedExplanation_empty");
  }

  if (isTeacherMode) {
    const teacherMinimums = {
      commonMisconceptions: 1,
      teacherNotes: 1,
      classroomActivities: 1,
      differentiatedSupport: 1,
      extensionQuestions: 1,
      studentWorksheet: 1,
    };
    Object.entries(teacherMinimums).forEach(([field, minimum]) => {
      if (Number(counts[field] || 0) < minimum) {
        missingCriticalSupportFields.push(field);
        supportCompletenessReasons.push(`${field}_below_teacher_minimum:${counts[field] || 0}/${minimum}`);
      }
    });
  } else {
    const hasPracticalSupport =
      Number(counts.teacherNotes || 0) > 0 ||
      Number(counts.classroomActivities || 0) > 0 ||
      Number(counts.studentWorksheet || 0) > 0;
    if (isKazakh && !hasPracticalSupport) {
      missingCriticalSupportFields.push("teacherNotes/classroomActivities/studentWorksheet");
      supportCompletenessReasons.push("kazakh_practical_support_empty");
    }
  }

  const allowedCompletionFields = new Set([
    "glossary",
    "simplifiedExplanation",
    "quiz",
    "learningObjectives",
    "keyConcepts",
    "commonMisconceptions",
    "teacherNotes",
    "classroomActivities",
    "differentiatedSupport",
    "extensionQuestions",
    "studentWorksheet",
  ]);
  const completionFields = missingCriticalSupportFields.filter((field) =>
    allowedCompletionFields.has(field)
  );
  if (isKazakh && Number(counts.studentWorksheet || 0) < 1) {
    completionFields.push("studentWorksheet");
  }

  return {
    supportCompletenessPassed: missingCriticalSupportFields.length === 0,
    supportCompletenessReasons,
    missingCriticalSupportFields: Array.from(new Set(missingCriticalSupportFields)),
    missingCompletionFields: Array.from(new Set(completionFields)),
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
  (Array.isArray(fields) ? fields : []).forEach((field) => {
    if (!field || !hasSupportValue(patch[field])) return;
    if (field === "differentiatedSupport") {
      result.differentiatedSupport = {
        ...(result.differentiatedSupport || {}),
        ...(patch.differentiatedSupport || {}),
      };
      return;
    }
    result[field] = patch[field];
  });
  result.meta = {
    ...(result.meta || {}),
    ...(patch.meta || {}),
  };
  return result;
}

async function generateTeachingSupportWithModel(fallbackInput, translation, runContext = null) {
  throwIfGenerationCancelled(runContext);
  const titleGrounding = getLessonTitleGroundingInfo({
    lessonTitle: fallbackInput.lessonTitle,
    sourceText: fallbackInput.sourceText,
    translation,
  });
  const messages = buildLessonEnrichmentMessages({
    ...fallbackInput,
    translation,
  });
  let parsed;
  let malformedContent = "";
  let enrichmentRetryAttempted = false;
  let enrichmentFirstAttemptEmpty = false;
  let enrichmentFirstAttemptInvalid = false;
  let enrichmentRichRetryAttempted = false;
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
  try {
    const result = await requestParsedEnrichment(messages, runContext);
    malformedContent = result.content;
    parsed = result.parsed;
  } catch (err) {
    if (isGenerationCancelledError(err)) throw err;
    malformedContent = err?.enrichmentContent || malformedContent;
    failureReason = formatEnrichmentFailureReason(err);
    enrichmentFirstAttemptEmpty = isEmptyModelOutputError(err);
    enrichmentFirstAttemptInvalid = !enrichmentFirstAttemptEmpty;
    warnEnrichmentParseFailure("initial output could not be parsed; trying repair or complete rich retry.", err);
    enrichmentRetryAttempted = true;
    if (malformedContent) {
      try {
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
        parsed = parseEnrichmentJsonPayload(repairedContent);
      } catch (repairErr) {
        if (isGenerationCancelledError(repairErr)) throw repairErr;
        failureReason = formatEnrichmentFailureReason(repairErr);
        warnEnrichmentParseFailure("initial JSON repair failed; trying complete rich retry.", repairErr);
      }
    }
  }

  const missingAfterFirstParse = getIncompleteRichSupportFields(parsed);
  if (!parsed || missingAfterFirstParse.length > 0) {
    enrichmentRetryAttempted = true;
    enrichmentRichRetryAttempted = true;
    try {
      const retryResult = await requestParsedEnrichment(
        buildCompactRichLessonEnrichmentMessages({
          ...fallbackInput,
          translation,
        }),
        runContext
      );
      malformedContent = retryResult.content;
      parsed = mergeEnrichmentPayloads(parsed, retryResult.parsed);
    } catch (retryErr) {
      if (isGenerationCancelledError(retryErr)) throw retryErr;
      malformedContent = retryErr?.enrichmentContent || malformedContent;
      failureReason = formatEnrichmentFailureReason(retryErr);
      warnEnrichmentParseFailure("complete rich retry output could not be parsed; trying JSON repair.", retryErr);
      if (typeof console !== "undefined") {
        console.warn("[AI enrichment] JSON repair retry is being used.");
      }
      if (malformedContent) {
        try {
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
          warnEnrichmentParseFailure("rich JSON repair failed; trying minimal fallback.", repairErr);
        }
      }
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    enrichmentMinimalFallbackAttempted = true;
    try {
      const minimalResult = await requestParsedEnrichment(
        buildMinimalLessonEnrichmentMessages({
          ...fallbackInput,
          translation,
        }),
        runContext
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
        minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
      });
    }
  }

  if (getMissingCoreEnrichmentFields(parsed).length > 0 && !minimalFallbackUsed) {
    enrichmentRetryAttempted = true;
    enrichmentMinimalFallbackAttempted = true;
    try {
      const minimalResult = await requestParsedEnrichment(
        buildMinimalLessonEnrichmentMessages({
          ...fallbackInput,
          translation,
        }),
        runContext
      );
      parsed = mergeEnrichmentPayloads(parsed, minimalResult.parsed);
      minimalFallbackUsed = true;
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
        minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
      });
    }
  }

  supportCompletenessResult = validateSupportCompleteness(
    buildNormalizedSupportPreview(parsed, fallbackInput, translation)
  );

  if (
    !supportCompletenessResult.supportCompletenessPassed &&
    supportCompletenessResult.missingCompletionFields.length > 0
  ) {
    supportMissingFieldCompletionAttempted = true;
    enrichmentRetryAttempted = true;
    try {
      const completionResult = await requestParsedEnrichment(
        buildMissingSupportCompletionMessages({
          ...fallbackInput,
          translation,
          existingSupport: buildNormalizedSupportPreview(parsed, fallbackInput, translation),
          missingFields: supportCompletenessResult.missingCompletionFields,
        }),
        runContext
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
      warnEnrichmentParseFailure("missing-field support completion failed.", completionErr);
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
      enrichmentRichRetryAttempted = true;
      kazakhValidationRetryAttempted = true;
      failureReason = `kazakh_validation_failed:${kazakhValidationResult.reasons.join(",")}`;
      warnEnrichmentParseFailure("Kazakh support validation failed; trying compact-complete retry.", {
        reasons: kazakhValidationResult.reasons,
      });
      try {
        const retryResult = await requestParsedEnrichment(
          buildCompactRichLessonEnrichmentMessages({
            ...fallbackInput,
            translation,
          }),
          runContext
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
            minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
            kazakhValidationReasons: kazakhValidationResult.reasons,
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
          minimalFallbackAttempted: enrichmentMinimalFallbackAttempted,
          kazakhValidationReasons: kazakhValidationResult.reasons,
        });
      }
    }
  }

  supportCompletenessResult = validateSupportCompleteness(
    buildNormalizedSupportPreview(parsed, fallbackInput, translation)
  );
  if (supportMissingFieldCompletionAttempted) {
    supportMissingFieldCompletionSucceeded = supportCompletenessResult.supportCompletenessPassed;
  }
  const normalizedSupportForSummary = buildNormalizedSupportPreview(parsed, fallbackInput, translation);
  const supportSummary = getGeneratedSupportFieldSummary(normalizedSupportForSummary);
  const teachingSupportFallbackUsed = Boolean(
    !supportCompletenessResult.supportCompletenessPassed
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
      enrichmentCompactCompleteRetryAttempted: enrichmentRichRetryAttempted,
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
      supportMissingFieldCompletionAttempted,
      supportMissingFieldCompletionSucceeded,
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

function normalizeForComparison(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function countMatches(text, pattern) {
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

function classifyTranslationBlock(text, targetLanguage = "", context = {}) {
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

function buildStrictRetryInstruction(blocks, targetLanguage) {
  const block = Array.isArray(blocks) ? blocks[0] : null;
  const classification = classifyTranslationBlock(block?.text || "", targetLanguage, block || {});
  return buildBlockTranslationPrompt(block || {}, targetLanguage, classification);
}

function buildBlockTranslationPrompt(block, targetLanguage, blockClassification = null) {
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

function isMostlyNonTranslatableText(text) {
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

function isOrdinaryProse(text) {
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

function getContactOrIdentifierJustification(text) {
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

function isLikelyFormulaOrCodeBlock(text) {
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

function shouldPreserveBeforeTranslation(block, preserveFormulas, targetLanguage = "") {
  const text = String(block?.text || "");
  if (!normalizeForComparison(text)) return false;
  if (!preserveFormulas || !block?.isFormula) return false;
  if (targetLanguage !== "English" && looksLikeOrdinaryEnglishProse(text)) return false;
  return isLikelyFormulaOrCodeBlock(text);
}

function looksMostlyEnglish(text) {
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

function shouldTranslateBlock(block, targetLanguage = "") {
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

function validateTranslatedBlock({ block, translatedText, action, targetLanguage }) {
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

function getValidationSeverity({ block, translatedText, targetLanguage, validationReasons }) {
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

function getTranslationFailureThresholdInfo(blocks, meta = {}) {
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

async function translateBlocksWithModel({
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
  const content = await callModelChat(messages, {
    stage: "translation",
    options: buildTranslationOptions(blocks, strictRetry ? { temperature: 0.2 } : {}),
    format: "json",
    signal,
  });
  throwIfGenerationCancelled({ signal });
  const parsed = extractJsonPayload(content);
  const list = Array.isArray(parsed?.translations) ? parsed.translations : [];

  if (list.length === 0) {
    throw new Error(getRuntimeUiText().aiNoJson);
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
  const expectedIds = new Set(blocks.map((block) => String(block.id || "")));
  const returnedIds = new Set(
    list
      .map((item) => String(item?.id || "").trim())
      .filter((id) => id && expectedIds.has(id))
  );

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
      throw new Error(getRuntimeUiText().aiEmptyResponse);
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

function normalizeGlossaryItems(rawGlossary) {
  if (!Array.isArray(rawGlossary)) return [];
  const seen = new Set();
  return rawGlossary
    .map((item) => ({
      term: String(item?.term || "").replace(/\s+/g, " ").trim(),
      explanation: String(item?.explanation || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((item) => {
      if (!item.term || !item.explanation) return false;
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

function getGeneratedSupportFieldSummary(lessonLike) {
  const result = {
    generatedSupportFields: [],
    missingOptionalSupportFields: [],
  };
  SUPPORT_FIELD_NAMES.forEach((field) => {
    const value = lessonLike?.[field];
    const hasValue = Array.isArray(value)
      ? value.length > 0
      : value && typeof value === "object"
      ? Object.values(value).some(Boolean)
      : Boolean(String(value || "").trim());
    if (hasValue) result.generatedSupportFields.push(field);
    else result.missingOptionalSupportFields.push(field);
  });
  return result;
}

function getSupportFieldCounts(lessonLike) {
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

function normalizeLessonResult(raw, fallbackInput, fallbackTranslation = "") {
  if (!raw || typeof raw !== "object") {
    if (String(fallbackTranslation || "").trim()) {
      return createSafeEnrichmentFallbackLesson(fallbackInput, fallbackTranslation, {
        reason: "enrichment_normalization_invalid_payload",
        retryAttempted: true,
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
      enrichmentCompactCompleteRetryAttempted: Boolean(
        raw.meta?.enrichmentCompactCompleteRetryAttempted || raw.meta?.enrichmentRichRetryAttempted
      ),
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
      supportMissingFieldCompletionAttempted: Boolean(raw.meta?.supportMissingFieldCompletionAttempted),
      supportMissingFieldCompletionSucceeded: Boolean(raw.meta?.supportMissingFieldCompletionSucceeded),
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
    blockKindCounts: {},
    warningSuspiciousCount: 0,
    fatalSuspiciousCount: 0,
    preserveAcceptedCount: 0,
    preserveWarningCount: 0,
  };
}

function accumulateDebugSummary(summary, addition) {
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
      documentFallbackThreshold: translationMeta.documentFallbackThreshold || null,
      partialTranslationWarning: Boolean(translationMeta.partialTranslationWarning),
      teachingSupportFallbackUsed: Boolean(enrichmentMeta.teachingSupportFallbackUsed),
      teachingSupportFallbackReason: enrichmentMeta.teachingSupportFallbackReason || "",
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
      enrichmentCompactCompleteRetryAttempted: Boolean(
        enrichmentMeta.enrichmentCompactCompleteRetryAttempted ||
          enrichmentMeta.enrichmentRichRetryAttempted
      ),
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
      supportMissingFieldCompletionAttempted: Boolean(
        enrichmentMeta.supportMissingFieldCompletionAttempted ??
          lesson?.meta?.supportMissingFieldCompletionAttempted
      ),
      supportMissingFieldCompletionSucceeded: Boolean(
        enrichmentMeta.supportMissingFieldCompletionSucceeded ??
          lesson?.meta?.supportMissingFieldCompletionSucceeded
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
                <strong>${item.title}</strong>
                ${item.duration && html`<p className="smallText">${t.durationLabel} ${item.duration}</p>`}
                <p>${item.instructions}</p>
              </div>
            `
          )}
    </article>
  `;
}

function DifferentiatedSupportSection({ title, support, t, emptyText }) {
  const value = support || {};
  const hasContent = Object.values(value).some(Boolean);
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${!hasContent && html`<${EmptySupportMessage} text=${emptyText} />`}
      ${value.strugglingLearners &&
      html`<p><strong>${t.strugglingLearners}:</strong> ${value.strugglingLearners}</p>`}
      ${value.advancedLearners &&
      html`<p><strong>${t.advancedLearners}:</strong> ${value.advancedLearners}</p>`}
      ${value.languageSupport &&
      html`<p><strong>${t.languageSupport}:</strong> ${value.languageSupport}</p>`}
    </article>
  `;
}

function WorksheetSection({ title, items, emptyText }) {
  const list = Array.isArray(items) ? items : [];
  return html`
    <article className="resultCard">
      <h3>${title}</h3>
      ${list.length === 0
        ? html`<${EmptySupportMessage} text=${emptyText} />`
        : list.map(
            (item, index) => html`
              <div className="supportItem" key=${`${title}-${index}`}>
                <strong>${item.taskTitle}</strong>
                <p>${item.instructions}</p>
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
    <${StringListSection}
      title=${t.learningObjectives}
      items=${lesson.learningObjectives}
      emptyText=${t.noLearningObjectivesGenerated}
    />
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
      <${DifferentiatedSupportSection}
        title=${t.differentiatedSupport}
        support=${lesson.differentiatedSupport}
        t=${t}
        emptyText=${t.noDifferentiatedSupportGenerated}
      />
    `}
    <${StringListSection}
      title=${t.extensionQuestions}
      items=${lesson.extensionQuestions}
      emptyText=${t.noExtensionQuestionsGenerated}
    />
    <${WorksheetSection}
      title=${t.studentWorksheet}
      items=${lesson.studentWorksheet}
      emptyText=${t.noStudentWorksheetGenerated}
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
    onExportTeacherPdf,
    onExportStudentPdf,
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
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(MODEL_API_CONFIG.pdfToDocxUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const data = await response.json();
        detail = data?.detail || "";
      } catch (_err) {
        detail = await response.text().catch(() => "");
      }
      throw new Error(detail || t.pdfConversionFailed);
    }

    const blob = await response.blob();
    const convertedName = `${safeDownloadName(file.name.replace(/\.pdf$/i, ""), "converted")}.docx`;
    return new File([blob], convertedName, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
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
        assertActiveGenerationRun(runContext);
        const apiResult = await translateBlocksWithModel({
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
          const retryResult = await translateBlocksWithModel({
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
            `strict_retry_failed:${block.id}:${retryErr?.message || t.unknownBlockError}`,
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
    let partialTranslationWarning = false;
    let preservedAfterRetry = 0;
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
        if (batchResult.meta?.partialTranslationWarning) {
          partialTranslationWarning = true;
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
        preservedAfterRetry += Number(batchResult.meta?.retrySummary?.preservedAfterRetry || 0);
      } catch (batchErr) {
        if (isGenerationCancelledError(batchErr)) throw batchErr;
        partialTranslationWarning = true;
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
            if (singleResult.meta?.partialTranslationWarning) {
              partialTranslationWarning = true;
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
            preservedAfterRetry += Number(singleResult.meta?.retrySummary?.preservedAfterRetry || 0);
          } catch (singleErr) {
            if (isGenerationCancelledError(singleErr)) throw singleErr;
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
      batchSummary: {
        totalBatches: batches.length,
        retriedBlocks,
        failedBlocks,
        preservedAfterRetry,
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
          const enrichmentInput = {
            ...fallbackInput,
            blockKindSummary: translationResult.meta?.debugSummary?.blockKindCounts || {},
          };
          const aiPayload = await generateTeachingSupportWithModel(
            enrichmentInput,
            combinedTranslation,
            runContext
          );
          assertActiveGenerationRun(runContext);
          aiLessonBase = normalizeLessonResult(aiPayload, fallbackInput, combinedTranslation);
          aiLessonMeta = aiLessonBase.meta || aiPayload.meta || aiLessonMeta;
        } catch (lessonErr) {
          if (isGenerationCancelledError(lessonErr)) throw lessonErr;
          aiLessonBase = createSafeEnrichmentFallbackLesson(fallbackInput, combinedTranslation, {
            reason: lessonErr?.message || t.lessonSupportFailed,
            retryAttempted: true,
          });
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
        const fallback = createLocalFallbackLesson(fallbackInput);
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

      const translationResult = await translateBlocksForDocument(
        translationBlocks,
        true,
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
        const enrichmentInput = {
          ...fallbackInput,
          blockKindSummary: translationResult.meta?.debugSummary?.blockKindCounts || {},
        };
        const payload = await generateTeachingSupportWithModel(
          enrichmentInput,
          completedTranslation,
          runContext
        );
        assertActiveGenerationRun(runContext);
        lessonBase = normalizeLessonResult(payload, fallbackInput, completedTranslation);
        lessonMeta = lessonBase.meta || payload.meta || lessonMeta;
      } catch (lessonErr) {
        if (isGenerationCancelledError(lessonErr)) throw lessonErr;
        lessonBase = createSafeEnrichmentFallbackLesson(fallbackInput, completedTranslation, {
          reason: lessonErr?.message || t.lessonSupportFailed,
          retryAttempted: true,
        });
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
      const fallback = createLocalFallbackLesson(fallbackInput);
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
      learningObjectives: teacherLesson.learningObjectives,
      keyConcepts: teacherLesson.keyConcepts,
      commonMisconceptions: teacherLesson.commonMisconceptions,
      teacherNotes: teacherLesson.teacherNotes,
      classroomActivities: teacherLesson.classroomActivities,
      differentiatedSupport: teacherLesson.differentiatedSupport,
      extensionQuestions: teacherLesson.extensionQuestions,
      studentWorksheet: teacherLesson.studentWorksheet,
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
            onExportTeacherPdf=${exportTeacherPdf}
            onExportStudentPdf=${exportStudentPdf}
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
