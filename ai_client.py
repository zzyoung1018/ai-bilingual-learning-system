"""
AI client logic for the bilingual education prototype.

Key sections to customize later:
1) `build_messages()` - prompt behavior
2) `normalize_quiz_settings()` - quiz controls
3) `sanitize_quiz_items()` - quiz output shaping + answer randomization
4) `call_model_for_block_decision()` - per-block translate/preserve decision prompt
5) `translate_document_blocks()` - block-level orchestration for DOCX/PDF workflows
"""

from __future__ import annotations

import json
import os
import random
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple

PROJECT_DIR = Path(__file__).resolve().parent

SUPPORTED_QUIZ_TYPES = {"multiple_choice", "true_false", "short_answer"}
DEFAULT_QUIZ_SETTINGS: Dict[str, Any] = {
    "questionCount": 3,
    "difficulty": "medium",
    "questionTypes": ["multiple_choice", "true_false"],
    "includeAnswerKey": True,
    "includeExplanations": False,
}

DOC_BLOCK_DECISION_SYSTEM_PROMPT = """You are a document translation decision engine.

Your task is to process one document block at a time.

You must decide whether the block should be:
1. translated into the target language
or
2. preserved in its original form

You must return strict JSON only.

==================================================
DECISION RULES
==================================================

Translate normal natural-language content, including:
- headings
- paragraphs
- bullet list items
- numbered list items
- table cell prose
- labels and descriptions
- mixed natural-language content

Preserve only content that should clearly remain unchanged, such as:
- person names when clearly acting as names
- emails
- URLs
- file paths
- obvious course codes
- section numbers
- formulas
- symbolic identifiers
- obvious non-language tokens

Do NOT preserve text only because it is:
- bold
- large
- in a heading
- in a list
- in a table
- specially formatted

==================================================
OUTPUT FORMAT
==================================================

Return exactly this JSON schema:

{
  "action": "translate" or "preserve",
  "reason": "short_reason_string",
  "translated_text": "translated text if action=translate, otherwise empty string"
}

Rules:
- If action is "translate", translated_text must be fully translated into the target language.
- If action is "preserve", translated_text must be an empty string.
- Do not return markdown.
- Do not return explanations outside JSON.
- Do not leave natural-language English untranslated unless it is intentionally preserved."""


def split_chunks(items: List[Any], chunk_size: int) -> List[List[Any]]:
    return [items[idx : idx + chunk_size] for idx in range(0, len(items), chunk_size)]


def load_local_env() -> None:
    """
    Load .env.local and .env from project root.
    Existing system environment variables are NOT overwritten.
    """
    for name in [".env.local", ".env"]:
        path = PROJECT_DIR / name
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def get_api_config() -> Dict[str, str]:
    load_local_env()
    return {
        "api_key": os.getenv("AI_API_KEY", "").strip(),
        "base_url": os.getenv("AI_BASE_URL", "https://api.openai.com/v1").strip(),
        "model": os.getenv("AI_MODEL", "gpt-4.1-mini").strip(),
    }


def normalize_quiz_settings(raw: Dict[str, Any] | None) -> Dict[str, Any]:
    settings = dict(DEFAULT_QUIZ_SETTINGS)
    if not isinstance(raw, dict):
        return settings

    question_count = raw.get("questionCount", settings["questionCount"])
    try:
        question_count = int(question_count)
    except (TypeError, ValueError):
        question_count = settings["questionCount"]
    settings["questionCount"] = max(1, min(8, question_count))

    difficulty = str(raw.get("difficulty", settings["difficulty"])).strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = settings["difficulty"]
    settings["difficulty"] = difficulty

    types_raw = raw.get("questionTypes", settings["questionTypes"])
    if not isinstance(types_raw, list):
        types_raw = settings["questionTypes"]
    question_types = [str(item).strip().lower() for item in types_raw]
    question_types = [item for item in question_types if item in SUPPORTED_QUIZ_TYPES]
    settings["questionTypes"] = question_types or list(settings["questionTypes"])

    settings["includeAnswerKey"] = bool(raw.get("includeAnswerKey", settings["includeAnswerKey"]))
    settings["includeExplanations"] = bool(
        raw.get("includeExplanations", settings["includeExplanations"])
    )
    return settings


def build_messages(
    lesson_title: str,
    source_text: str,
    target_language: str,
    mode: str,
    quiz_settings: Dict[str, Any],
) -> List[Dict[str, str]]:
    """
    Prompt template for structured bilingual education output.
    """
    mode_hint = (
        "Teacher mode: include classroom facilitation language and slightly more depth."
        if mode == "teacher"
        else "Student mode: use short, clear, learner-friendly wording."
    )

    system_prompt = (
        "You are an assistant for an AI-supported bilingual education product. "
        "Return ONLY valid JSON with this exact top-level schema: "
        "{"
        '"translation":"string",'
        '"glossary":[{"term":"string","explanation":"string"}],'
        '"simplifiedExplanation":"string",'
        '"quiz":[{'
        '"type":"multiple_choice|true_false|short_answer",'
        '"question":"string",'
        '"options":["string"],'
        '"answerIndex":0,'
        '"answerText":"string",'
        '"explanation":"string"'
        "}]"
        "}. "
        "Rules: glossary should have 3-6 key terms, and quiz should follow requested question count, "
        "difficulty, and question types. For multiple_choice, provide exactly 4 options and a valid answerIndex. "
        "For true_false, provide 2 options and a valid answerIndex. For short_answer, provide answerText."
    )

    user_prompt = (
        f"Lesson title: {lesson_title}\n\n"
        f"Source text:\n{source_text}\n\n"
        f"Target language: {target_language}\n"
        f"Learning mode: {mode}\n"
        f"{mode_hint}\n"
        f"Quiz settings:\n{json.dumps(quiz_settings, ensure_ascii=False)}\n\n"
        "Generate translation, glossary, simplified explanation, and quiz."
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def call_model(
    lesson_title: str,
    source_text: str,
    target_language: str,
    mode: str,
    quiz_settings: Dict[str, Any],
) -> Dict[str, Any]:
    config = get_api_config()
    if not config["api_key"]:
        raise RuntimeError("Missing AI_API_KEY in .env.local")

    url = f"{config['base_url'].rstrip('/')}/chat/completions"
    payload = {
        "model": config["model"],
        "messages": build_messages(
            lesson_title=lesson_title,
            source_text=source_text,
            target_language=target_language,
            mode=mode,
            quiz_settings=quiz_settings,
        ),
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    request = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network/API connection error: {exc.reason}") from exc

    try:
        response_json = json.loads(raw)
        content = response_json["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError("API response format was unexpected.") from exc

    return extract_json_payload(content)


def call_model_for_block_decision(
    block_text: str,
    target_language: str,
    mode: str,
    block_type: str,
    strict_retry: bool = False,
) -> Dict[str, str]:
    """
    Decide per block whether to translate or preserve, and return strict JSON fields:
    action, reason, translated_text.
    """
    config = get_api_config()
    if not config["api_key"]:
        raise RuntimeError("Missing AI_API_KEY in .env.local")

    strict_retry_hint = (
        "Previous response was unchanged English while action was translate. Re-check and translate fully unless preserve is truly required."
        if strict_retry
        else ""
    )

    user_prompt = (
        f"Target language: {target_language}\n"
        f"Mode: {mode}\n"
        f"Block type: {block_type or 'unknown'}\n"
        f"{strict_retry_hint}\n"
        f"Block text:\n{block_text}"
    )

    url = f"{config['base_url'].rstrip('/')}/chat/completions"
    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": DOC_BLOCK_DECISION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
        "response_format": {"type": "json_object"},
    }

    request = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network/API connection error: {exc.reason}") from exc

    try:
        response_json = json.loads(raw)
        content = response_json["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError("API response format was unexpected.") from exc

    parsed = extract_json_payload(content)
    action = safe_text(parsed.get("action")).lower()
    reason = safe_text(parsed.get("reason")) or "unspecified"
    translated_text = safe_text(parsed.get("translated_text"))

    if action not in {"translate", "preserve"}:
        raise RuntimeError("Block decision response must set action to translate or preserve.")

    if action == "preserve":
        translated_text = ""
    elif not translated_text:
        raise RuntimeError("translate action requires non-empty translated_text.")

    return {
        "action": action,
        "reason": reason,
        "translated_text": translated_text,
    }


def extract_json_payload(content: Any) -> Dict[str, Any]:
    if isinstance(content, dict):
        return content
    if not isinstance(content, str):
        raise RuntimeError("Model content was not text JSON.")

    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise RuntimeError("Could not parse JSON from model response.")
        return json.loads(text[start : end + 1])


def safe_text(value: Any) -> str:
    return str(value or "").strip()


def sanitize_glossary(raw_glossary: Any) -> List[Dict[str, str]]:
    glossary: List[Dict[str, str]] = []
    if not isinstance(raw_glossary, list):
        return glossary
    for item in raw_glossary[:8]:
        if not isinstance(item, dict):
            continue
        term = safe_text(item.get("term"))
        explanation = safe_text(item.get("explanation"))
        if term and explanation:
            glossary.append({"term": term, "explanation": explanation})
    return glossary[:6]


def dedupe_options(options: List[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for option in options:
        text = option.strip()
        if not text:
            continue
        lowered = text.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(text)
    return result


def shuffle_options_with_answer(options: List[str], answer_index: int) -> Tuple[List[str], int]:
    """
    Randomize option order and return the new answer index.

    This explicitly fixes the previous bug where the correct answer position
    could end up always appearing first.
    """
    indexed = list(enumerate(options))
    random.shuffle(indexed)
    shuffled = [item[1] for item in indexed]
    new_answer_index = 0
    for idx, (old_index, _) in enumerate(indexed):
        if old_index == answer_index:
            new_answer_index = idx
            break
    return shuffled, new_answer_index


def sanitize_quiz_items(raw_quiz: Any, quiz_settings: Dict[str, Any]) -> List[Dict[str, Any]]:
    question_count = quiz_settings["questionCount"]
    allowed_types = set(quiz_settings["questionTypes"])
    include_explanations = quiz_settings["includeExplanations"]

    if not isinstance(raw_quiz, list):
        raw_quiz = []

    quiz: List[Dict[str, Any]] = []
    for item in raw_quiz:
        if not isinstance(item, dict):
            continue
        question = safe_text(item.get("question"))
        if not question:
            continue

        q_type = safe_text(item.get("type")).lower()
        if q_type not in SUPPORTED_QUIZ_TYPES:
            options_raw = item.get("options", [])
            if isinstance(options_raw, list) and len(options_raw) == 2:
                q_type = "true_false"
            elif safe_text(item.get("answerText")):
                q_type = "short_answer"
            else:
                q_type = "multiple_choice"
        if q_type not in allowed_types:
            continue

        explanation = safe_text(item.get("explanation"))

        if q_type == "short_answer":
            answer_text = safe_text(item.get("answerText") or item.get("answer"))
            if not answer_text:
                continue
            payload: Dict[str, Any] = {
                "type": "short_answer",
                "question": question,
                "answerText": answer_text,
            }
            if include_explanations and explanation:
                payload["explanation"] = explanation
            quiz.append(payload)
            if len(quiz) >= question_count:
                break
            continue

        options_raw = item.get("options", [])
        options = [safe_text(opt) for opt in options_raw] if isinstance(options_raw, list) else []
        options = dedupe_options([opt for opt in options if opt])

        answer_index = item.get("answerIndex")
        try:
            answer_index = int(answer_index)
        except (TypeError, ValueError):
            answer_index = -1

        answer_text = safe_text(item.get("answerText") or item.get("answer"))

        if q_type == "true_false":
            # Build a stable two-option true/false format, then randomize.
            options = options[:2] if len(options) >= 2 else ["True", "False"]
            if answer_text:
                lowered = answer_text.lower()
                answer_index = 0 if lowered in {"true", "t"} else 1
            if answer_index not in {0, 1}:
                answer_index = 0

            randomized, randomized_index = shuffle_options_with_answer(options, answer_index)
            payload = {
                "type": "true_false",
                "question": question,
                "options": randomized,
                "answerIndex": randomized_index,
            }
            if include_explanations and explanation:
                payload["explanation"] = explanation
            quiz.append(payload)
            if len(quiz) >= question_count:
                break
            continue

        # multiple_choice path
        if answer_text and answer_text not in options:
            options.append(answer_text)
        if answer_index < 0 or answer_index >= len(options):
            if answer_text and answer_text in options:
                answer_index = options.index(answer_text)
            else:
                answer_index = 0

        if len(options) < 4:
            filler = [
                "A related concept",
                "A less accurate interpretation",
                "An unrelated detail",
                "A common misconception",
            ]
            for candidate in filler:
                if len(options) >= 4:
                    break
                if candidate not in options:
                    options.append(candidate)
        options = options[:4]
        answer_index = max(0, min(3, answer_index))

        randomized, randomized_index = shuffle_options_with_answer(options, answer_index)
        payload = {
            "type": "multiple_choice",
            "question": question,
            "options": randomized,
            "answerIndex": randomized_index,
        }
        if include_explanations and explanation:
            payload["explanation"] = explanation
        quiz.append(payload)
        if len(quiz) >= question_count:
            break

    return quiz[:question_count]


def fallback_quiz(source_text: str, quiz_settings: Dict[str, Any]) -> List[Dict[str, Any]]:
    question_types = set(quiz_settings["questionTypes"])
    include_explanations = quiz_settings["includeExplanations"]
    question_count = quiz_settings["questionCount"]

    base_items: List[Dict[str, Any]] = []

    if "multiple_choice" in question_types:
        base_items.append(
            {
                "type": "multiple_choice",
                "question": "What is the best summary of this lesson content?",
                "options": [
                    "It introduces a main concept for bilingual learning support",
                    "It is only a random list of disconnected words",
                    "It contains no educational information",
                    "It focuses only on punctuation rules",
                ],
                "answerIndex": 0,
                "explanation": "The source passage presents meaningful lesson content.",
            }
        )
    if "true_false" in question_types:
        base_items.append(
            {
                "type": "true_false",
                "question": "True or False: Reviewing key terms helps comprehension.",
                "options": ["True", "False"],
                "answerIndex": 0,
                "explanation": "Vocabulary scaffolding supports understanding.",
            }
        )
    if "short_answer" in question_types:
        base_items.append(
            {
                "type": "short_answer",
                "question": "In one sentence, explain the main learning idea of the text.",
                "answerText": "Answers may vary, but they should capture the main concept clearly.",
                "explanation": "Look for the central concept and express it concisely.",
            }
        )

    if not base_items:
        base_items.append(
            {
                "type": "multiple_choice",
                "question": "What is the purpose of this learning package?",
                "options": [
                    "Support bilingual understanding",
                    "Remove classroom guidance",
                    "Replace teacher feedback entirely",
                    "Skip all comprehension checks",
                ],
                "answerIndex": 0,
                "explanation": "The tool is meant to support bilingual teaching and learning.",
            }
        )

    quiz: List[Dict[str, Any]] = []
    idx = 0
    while len(quiz) < question_count:
        item = dict(base_items[idx % len(base_items)])
        idx += 1
        if item["type"] in {"multiple_choice", "true_false"}:
            options, answer_index = shuffle_options_with_answer(item["options"], item["answerIndex"])
            item["options"] = options
            item["answerIndex"] = answer_index
        if not include_explanations and "explanation" in item:
            item.pop("explanation")
        quiz.append(item)

    return quiz[:question_count]


def build_fallback_result(
    lesson_title: str,
    source_text: str,
    target_language: str,
    mode: str,
    quiz_settings: Dict[str, Any],
) -> Dict[str, Any]:
    words = re.findall(r"[A-Za-z][A-Za-z'-]{3,}", source_text)
    unique_terms: List[str] = []
    for word in words:
        lower = word.lower()
        if lower not in unique_terms:
            unique_terms.append(lower)
        if len(unique_terms) >= 4:
            break

    if not unique_terms:
        unique_terms = ["concept", "context", "example"]

    glossary = [
        {
            "term": term,
            "explanation": "Key term from the source passage for bilingual learning support.",
        }
        for term in unique_terms
    ]

    simplified = (
        "Teacher support summary: Use this passage for guided vocabulary instruction, "
        "concept checks, and discussion prompts."
        if mode == "teacher"
        else "Student learning summary: This passage explains one main idea. "
        "Review vocabulary, then complete the quiz."
    )

    return {
        "lessonTitle": lesson_title,
        "translation": f"[Demo translation in {target_language}] {source_text}",
        "glossary": glossary,
        "simplifiedExplanation": simplified,
        "quiz": fallback_quiz(source_text, quiz_settings),
        "quizSettings": quiz_settings,
    }


def sanitize_result(
    raw: Dict[str, Any],
    lesson_title: str,
    source_text: str,
    target_language: str,
    mode: str,
    quiz_settings: Dict[str, Any],
) -> Dict[str, Any]:
    translation = safe_text(raw.get("translation"))
    simplified = safe_text(raw.get("simplifiedExplanation") or raw.get("explanation"))
    glossary = sanitize_glossary(raw.get("glossary"))
    quiz = sanitize_quiz_items(raw.get("quiz"), quiz_settings)

    if translation and glossary and simplified and quiz:
        return {
            "lessonTitle": lesson_title,
            "translation": translation,
            "glossary": glossary,
            "simplifiedExplanation": simplified,
            "quiz": quiz,
            "quizSettings": quiz_settings,
        }

    # If model output is incomplete, fall back gracefully.
    return build_fallback_result(lesson_title, source_text, target_language, mode, quiz_settings)


def generate_learning_support(
    lesson_title: str,
    source_text: str,
    target_language: str,
    mode: str,
    quiz_settings: Dict[str, Any] | None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    normalized_settings = normalize_quiz_settings(quiz_settings)

    try:
        model_result = call_model(
            lesson_title=lesson_title,
            source_text=source_text,
            target_language=target_language,
            mode=mode,
            quiz_settings=normalized_settings,
        )
        return (
            sanitize_result(
                raw=model_result,
                lesson_title=lesson_title,
                source_text=source_text,
                target_language=target_language,
                mode=mode,
                quiz_settings=normalized_settings,
            ),
            {"usedFallback": False, "reason": ""},
        )
    except Exception as exc:
        fallback = build_fallback_result(
            lesson_title=lesson_title,
            source_text=source_text,
            target_language=target_language,
            mode=mode,
            quiz_settings=normalized_settings,
        )
        return fallback, {"usedFallback": True, "reason": str(exc)}


def translate_document_blocks(
    blocks: List[Dict[str, Any]],
    target_language: str,
    mode: str,
    preserve_formulas: bool = True,
) -> Tuple[List[str], Dict[str, Any]]:
    """
    Reliability-first block translation pipeline:
    - Traverse blocks (already provided by caller)
    - Ask API per block to decide translate vs preserve
    - Return block-level output + debug metadata for write-back verification
    """
    if not isinstance(blocks, list) or len(blocks) == 0:
        return [], {"usedFallback": False, "reason": ""}

    normalized_mode = "teacher" if mode != "student" else "student"
    texts: List[str] = [safe_text(item.get("text")) for item in blocks]

    debug_entries: List[Dict[str, Any]] = []
    result = list(texts)

    translated_count = 0
    preserved_count = 0
    unchanged_after_translate_count = 0

    try:
        for idx, txt in enumerate(texts):
            block = blocks[idx] if isinstance(blocks[idx], dict) else {}
            block_id = safe_text(block.get("id")) or f"block-{idx}"
            block_type = safe_text(block.get("blockType")) or "unknown"
            source_location = safe_text(block.get("sourceLocation")) or block_id

            entry: Dict[str, Any] = {
                "index": idx,
                "id": block_id,
                "blockType": block_type,
                "sourceLocation": source_location,
                "targetLanguage": target_language,
                "sourceText": txt,
                "apiAction": "",
                "action": "",
                "reason": "",
                "translatedText": txt,
                "textPreview": txt[:120],
            }

            if not txt:
                entry["apiAction"] = "preserve"
                entry["action"] = "preserve"
                entry["reason"] = "empty_block"
                result[idx] = txt
                preserved_count += 1
                debug_entries.append(entry)
                continue

            decision = call_model_for_block_decision(
                block_text=txt,
                target_language=target_language,
                mode=normalized_mode,
                block_type=block_type,
                strict_retry=False,
            )
            action = safe_text(decision.get("action")).lower()
            reason = safe_text(decision.get("reason")) or "unspecified"
            translated_text = safe_text(decision.get("translated_text"))

            # Retry once if model claims translate but returned unchanged English.
            if (
                action == "translate"
                and translated_text == txt
                and bool(re.search(r"[A-Za-z]{3,}", txt))
            ):
                retry_decision = call_model_for_block_decision(
                    block_text=txt,
                    target_language=target_language,
                    mode=normalized_mode,
                    block_type=block_type,
                    strict_retry=True,
                )
                action = safe_text(retry_decision.get("action")).lower() or action
                reason = safe_text(retry_decision.get("reason")) or reason
                translated_text = safe_text(retry_decision.get("translated_text")) or translated_text

            if action == "preserve":
                result[idx] = txt
                entry["translatedText"] = txt
                entry["action"] = "preserve"
                entry["apiAction"] = "preserve"
                entry["reason"] = reason
                preserved_count += 1
            else:
                next_value = translated_text or txt
                result[idx] = next_value
                entry["translatedText"] = next_value
                entry["apiAction"] = "translate"
                if next_value == txt:
                    entry["action"] = "translated_unchanged"
                    entry["reason"] = "model_returned_same_text"
                    unchanged_after_translate_count += 1
                else:
                    entry["action"] = "translated"
                    entry["reason"] = reason or "translated_by_model"
                    translated_count += 1

            debug_entries.append(entry)

        return result, {
            "usedFallback": False,
            "reason": "",
            "debugSummary": {
                "total": len(blocks),
                "translated": translated_count,
                "preserved": preserved_count,
                "unchangedAfterTranslate": unchanged_after_translate_count,
            },
            "debugEntries": debug_entries,
        }
    except Exception as exc:
        if not debug_entries:
            for idx, txt in enumerate(texts):
                block = blocks[idx] if isinstance(blocks[idx], dict) else {}
                block_id = safe_text(block.get("id")) or f"block-{idx}"
                block_type = safe_text(block.get("blockType")) or "unknown"
                source_location = safe_text(block.get("sourceLocation")) or block_id
                debug_entries.append(
                    {
                        "index": idx,
                        "id": block_id,
                        "blockType": block_type,
                        "sourceLocation": source_location,
                        "targetLanguage": target_language,
                        "sourceText": txt,
                        "apiAction": "error",
                        "action": "fallback_preserve_source",
                        "reason": "translation_error_fallback",
                        "translatedText": txt,
                        "textPreview": txt[:120],
                    }
                )
        else:
            for entry in debug_entries:
                if entry.get("action") in {"", "pending_translate"}:
                    entry["apiAction"] = "error"
                    entry["action"] = "fallback_preserve_source"
                    entry["reason"] = "translation_error_fallback"
                    entry["translatedText"] = entry.get("sourceText", "")

        return texts, {
            "usedFallback": True,
            "reason": f"Block translation fallback used: {exc}",
            "debugSummary": {
                "total": len(blocks),
                "translated": translated_count,
                "preserved": len(blocks) - translated_count,
                "unchangedAfterTranslate": 0,
            },
            "debugEntries": debug_entries,
        }
