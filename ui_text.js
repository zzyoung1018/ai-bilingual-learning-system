import { MODEL_API_CONFIG } from "./api_client.js";

export const UI_LANGUAGE_STORAGE_KEY = "uiLanguage";
export const UI_TEXT = {
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
