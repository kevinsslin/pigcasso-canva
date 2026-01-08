import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENCRYPTION_KEY_ENV = "GITHUB_OAUTH_ENCRYPTION_KEY";

const parseEncryptionKey = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${ENCRYPTION_KEY_ENV} is empty`);
  }

  try {
    const asBase64 = Buffer.from(trimmed, "base64");
    if (asBase64.length === 32) {
      return asBase64;
    }
  } catch {
    // ignore
  }

  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  return createHash("sha256").update(trimmed).digest();
};

export const getGithubOAuthEncryptionKey = () => {
  const raw = process.env[ENCRYPTION_KEY_ENV];
  if (!raw) {
    throw new Error(`Missing ${ENCRYPTION_KEY_ENV}`);
  }
  return parseEncryptionKey(raw);
};

export const encryptSecret = (plaintext: string, key: Buffer) => {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty secret");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

export const decryptSecret = (encrypted: string, key: Buffer) => {
  const parts = encrypted.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted secret format");
  }

  const [version, ivB64, tagB64, dataB64] = parts;
  if (version !== "v1") {
    throw new Error(`Unsupported encrypted secret version: ${version}`);
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
};

