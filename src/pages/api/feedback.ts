import type { APIRoute } from "astro";
import { App } from "octokit";

type FeedbackType = "bug" | "feature" | "question";

type FeedbackInput = {
  type: FeedbackType;
  title: string;
  message: string;
  email?: string;
  environment?: string;
  consent: boolean;
  company?: string;
};

type ValidationResult =
  | { ok: true; input: FeedbackInput }
  | { ok: false; details: string[] };

const labelsByType: Record<FeedbackType, string[]> = {
  bug: ["feedback", "bug"],
  feature: ["feedback", "enhancement"],
  question: ["feedback", "question"]
};

export const POST: APIRoute = async ({ request }) => {
  const referenceId = createReferenceId();
  const validation = await readFeedback(request);

  if (!validation.ok) {
    return json({ ok: false, error: "Invalid feedback payload", details: validation.details }, 400);
  }

  if (validation.input.company?.trim()) {
    return json({ ok: true, referenceId });
  }

  try {
    await createIssue(validation.input, referenceId);
    return json({ ok: true, referenceId });
  } catch (error) {
    console.error("Could not create GitHub issue", error);
    return json({ ok: false, error: "GitHub issue could not be created" }, 502);
  }
};

async function readFeedback(request: Request): Promise<ValidationResult> {
  let payload: unknown;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      payload = formDataToObject(await request.formData());
    }
  } catch {
    return { ok: false, details: ["Request body could not be parsed."] };
  }

  return validateFeedback(payload);
}

function validateFeedback(payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return { ok: false, details: ["Payload must be an object."] };
  }

  const type = readString(payload.type);
  const title = readString(payload.title).trim();
  const message = readString(payload.message).trim();
  const email = readOptionalString(payload.email);
  const environment = readOptionalString(payload.environment);
  const company = readOptionalString(payload.company);
  const consent = payload.consent === true || payload.consent === "true" || payload.consent === "on";
  const details: string[] = [];

  if (!isFeedbackType(type)) {
    details.push("Type must be one of: bug, feature, question.");
  }
  if (title.length < 3 || title.length > 120) {
    details.push("Title must be between 3 and 120 characters.");
  }
  if (message.length < 10 || message.length > 4000) {
    details.push("Message must be between 10 and 4000 characters.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.push("Email must be valid when provided.");
  }
  if (!consent) {
    details.push("Consent is required.");
  }

  if (details.length > 0 || !isFeedbackType(type)) {
    return { ok: false, details };
  }

  return {
    ok: true,
    input: {
      type,
      title,
      message,
      email,
      environment,
      consent,
      company
    }
  };
}

async function createIssue(input: FeedbackInput, referenceId: string): Promise<void> {
  const appId = requiredEnv("GITHUB_APP_ID");
  const privateKey = normalizePrivateKey(requiredEnv("GITHUB_PRIVATE_KEY"));
  const owner = requiredEnv("GITHUB_OWNER");
  const repo = requiredEnv("GITHUB_REPO");
  const app = new App({ appId, privateKey });
  const { data: installation } = await app.octokit.request("GET /repos/{owner}/{repo}/installation", {
    owner,
    repo
  });
  const octokit = await app.getInstallationOctokit(installation.id);

  await octokit.request("POST /repos/{owner}/{repo}/issues", {
    owner,
    repo,
    title: `[${referenceId}] ${input.title}`,
    body: formatIssueBody(input, referenceId),
    labels: labelsByType[input.type]
  });
}

function formatIssueBody(input: FeedbackInput, referenceId: string): string {
  const lines = [
    `Reference ID: ${referenceId}`,
    `Type: ${input.type}`,
    "",
    "Submitted from the public Astro GitHub Support Form demo."
  ];

  if (input.email) {
    lines.push("", `Reply email: ${input.email}`);
  }

  if (input.environment) {
    lines.push("", `Environment: ${input.environment}`);
  }

  lines.push("", "Message:", input.message);

  return lines.join("\n");
}

function createReferenceId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";

  for (let index = 0; index < 8; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `SUP-${suffix}`;
}

function requiredEnv(name: string): string {
  const metaEnv = import.meta.env as Record<string, string | undefined>;
  const value = process.env[name]?.trim() || metaEnv[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function normalizePrivateKey(value: string): string {
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  return {
    type: formData.get("type"),
    title: formData.get("title"),
    message: formData.get("message"),
    email: formData.get("email"),
    environment: formData.get("environment"),
    consent: formData.get("consent"),
    company: formData.get("company")
  };
}

function isFeedbackType(value: string): value is FeedbackType {
  return value === "bug" || value === "feature" || value === "question";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}
