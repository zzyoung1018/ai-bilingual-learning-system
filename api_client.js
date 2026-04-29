export const FRONTEND_DEV_HOSTS = new Set(["localhost:5500", "127.0.0.1:5500"]);
export const API_BASE_URL =
  typeof window !== "undefined" && typeof window.APP_API_BASE_URL === "string"
    ? window.APP_API_BASE_URL
    : typeof window !== "undefined" && FRONTEND_DEV_HOSTS.has(window.location.host)
    ? "http://127.0.0.1:8000"
    : "";
export const MODEL_API_CONFIG = {
  provider: "online-api",
  baseUrl: API_BASE_URL.replace(/\/$/, ""),
  chatUrl: `${API_BASE_URL.replace(/\/$/, "")}/api/llm/chat`,
  pdfToDocxUrl: `${API_BASE_URL.replace(/\/$/, "")}/api/pdf-to-docx`,
  translationModel: "gpt-5.5",
  enrichmentModel: "gpt-5.5",
  repairModel: "gpt-5.5",
};

function assertValidChatRequestBody(requestBody) {
  if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
    throw new Error("Invalid chat request body: expected object with stage/messages/format/options");
  }
  if (!requestBody.stage || typeof requestBody.stage !== "string") {
    throw new Error("Invalid chat request body: missing or invalid stage field");
  }
  if (!Array.isArray(requestBody.messages)) {
    throw new Error("Invalid chat request body: messages must be an array");
  }
  if (requestBody.messages.length === 0) {
    throw new Error("Invalid chat request body: messages array cannot be empty");
  }
  for (let i = 0; i < requestBody.messages.length; i++) {
    const msg = requestBody.messages[i];
    if (!msg || typeof msg !== "object" || !msg.role || !msg.content) {
      throw new Error(`Invalid chat request body: message at index ${i} must have role and content fields`);
    }
  }
  if (!requestBody.format || typeof requestBody.format !== "string") {
    throw new Error("Invalid chat request body: missing or invalid format field");
  }
  if (!requestBody.options || typeof requestBody.options !== "object" || Array.isArray(requestBody.options)) {
    throw new Error("Invalid chat request body: options must be an object");
  }
}

export function postModelChat(requestBody, { signal } = {}) {
  assertValidChatRequestBody(requestBody);
  return fetch(MODEL_API_CONFIG.chatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });
}

export async function convertPdfToDocx(file, { fallbackErrorMessage = "PDF conversion failed", outputBaseName = "converted" } = {}) {
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
    throw new Error(detail || fallbackErrorMessage);
  }

  const blob = await response.blob();
  return {
    blob,
    fileName: `${outputBaseName}.docx`,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}
