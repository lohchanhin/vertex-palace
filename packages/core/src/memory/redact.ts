export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[REDACTED_OPENAI_KEY]")
    .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_KEY]")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Authorization: Bearer [REDACTED]")
    .replace(/password\s*=\s*[^&\s]+/gi, "password=[REDACTED]")
    .replace(/token\s*=\s*[^&\s]+/gi, "token=[REDACTED]");
}
