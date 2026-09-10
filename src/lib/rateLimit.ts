/**
 * Limiteur de débit et journalisation de sécurité (Protection contre les bots et abus).
 * 
 * Règles :
 * - Inscription (/register) : max 5 tentatives / heure / IP
 * - Renvoi de lien de confirmation : 1 / minute, max 5 / heure / IP ou compte
 */

type RateLimitRecord = {
  timestamps: number[];
};

// Stockage en mémoire (sliding window)
const registerIpAttempts = new Map<string, RateLimitRecord>();
const resendRateMap = new Map<string, RateLimitRecord>();

function cleanupOld(record: RateLimitRecord, windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
}

/**
 * Vérifie et consomme une tentative d'inscription pour une IP donnée.
 * Max 5 tentatives par heure (3600s).
 */
export function checkRegisterRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const windowMs = 60 * 60 * 1000; // 1 heure
  const maxAttempts = 5;

  let record = registerIpAttempts.get(ip);
  if (!record) {
    record = { timestamps: [] };
    registerIpAttempts.set(ip, record);
  }

  cleanupOld(record, windowMs);

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  record.timestamps.push(Date.now());
  return { allowed: true };
}

/**
 * Vérifie et consomme une tentative de renvoi d'e-mail.
 * Limites :
 * - 1 renvoi par minute (60s cooldown)
 * - 5 renvois par heure
 */
export function checkResendRateLimit(key: string): { allowed: boolean; reason?: string; retryAfterSeconds?: number } {
  const oneMinuteMs = 60 * 1000;
  const oneHourMs = 60 * 60 * 1000;
  const maxPerHour = 5;

  let record = resendRateMap.get(key);
  if (!record) {
    record = { timestamps: [] };
    resendRateMap.set(key, record);
  }

  cleanupOld(record, oneHourMs);

  const now = Date.now();
  const lastAttempt = record.timestamps[record.timestamps.length - 1];

  // 1 renvoi par minute
  if (lastAttempt && now - lastAttempt < oneMinuteMs) {
    const waitSec = Math.ceil((lastAttempt + oneMinuteMs - now) / 1000);
    return {
      allowed: false,
      reason: `Veuillez patienter ${waitSec} seconde(s) avant de renvoyer un lien.`,
      retryAfterSeconds: Math.max(1, waitSec),
    };
  }

  // 5 renvois par heure
  if (record.timestamps.length >= maxPerHour) {
    const oldest = record.timestamps[0];
    const waitSec = Math.ceil((oldest + oneHourMs - now) / 1000);
    return {
      allowed: false,
      reason: `Nombre maximal de renvois atteint (5 par heure). Réessayez plus tard.`,
      retryAfterSeconds: Math.max(1, waitSec),
    };
  }

  record.timestamps.push(now);
  return { allowed: true };
}

/**
 * Journalisation structurée des échecs de sécurité et d'inscription.
 */
export function logSecurityFailure(details: {
  action: "REGISTER_FAILED" | "RATE_LIMIT_EXCEEDED" | "INVALID_FORMAT";
  ip: string;
  email?: string;
  reason: string;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    event: details.action,
    ip: details.ip,
    email: details.email ? details.email.replace(/(?<=.{2}).(?=.*@)/g, "*") : undefined, // Masquage partiel PII
    reason: details.reason,
  };
  console.warn(`[SECURITY] ${JSON.stringify(payload)}`);
}
