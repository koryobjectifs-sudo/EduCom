import crypto from "crypto";

export interface OtpRecord {
  phone: string;
  codeHash: string;
  salt: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number; // timestamp ms
  createdAt: number; // timestamp ms
  lastSentAt: number; // timestamp ms
}

// Store en mémoire des OTPs en cours (avec sliding window et auto-nettoyage)
const otpStore = new Map<string, OtpRecord>();

// Historique pour rate limit d'envoi par numéro : [timestamp, timestamp, ...]
const dispatchHistory = new Map<string, number[]>();

// Pour les tests automatisés uniquement
const testCodeRegistry = new Map<string, string>();

const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 secondes
const MAX_DISPATCH_PER_WINDOW = 4; // Max 4 demandes par 10 minutes
const DISPATCH_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

// Secret pepper applicatif combiné au sel cryptographique par OTP
const OTP_PEPPER =
  process.env.OTP_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "educom-otp-pepper-default-2026";

function hashOtp(code: string, salt: string): string {
  const pepperedKey = crypto
    .createHmac("sha256", OTP_PEPPER)
    .update(salt)
    .digest("hex");
  return crypto.createHmac("sha256", pepperedKey).update(code.trim()).digest("hex");
}

function cleanExpiredOtps(): void {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(phone);
      testCodeRegistry.delete(phone);
    }
  }
}

function cleanupOldDispatches(phone: string): void {
  const history = dispatchHistory.get(phone) || [];
  const cutoff = Date.now() - DISPATCH_WINDOW_MS;
  const filtered = history.filter((t) => t > cutoff);
  if (filtered.length > 0) {
    dispatchHistory.set(phone, filtered);
  } else {
    dispatchHistory.delete(phone);
  }
}


/**
 * Génère un code OTP cryptographique à 6 chiffres pour un numéro donné.
 * Applique le cooldown de renvoi et la limitation de débit.
 */
export async function generateAndStoreOtp(
  phoneE164: string
): Promise<
  | { success: true; code: string; expiresAt: Date }
  | { success: false; error: string; retryAfterSeconds?: number }
> {
  const now = Date.now();
  cleanExpiredOtps();

  // 1. Contrôle de renvoi (Cooldown 60s)

  const existing = otpStore.get(phoneE164);
  if (existing) {
    const elapsed = now - existing.lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Veuillez patienter ${waitSec} seconde(s) avant de demander un nouveau code.`,
        retryAfterSeconds: waitSec,
      };
    }
  }

  // 2. Contrôle de fréquence (Max par fenêtre)
  cleanupOldDispatches(phoneE164);
  const history = dispatchHistory.get(phoneE164) || [];
  if (history.length >= MAX_DISPATCH_PER_WINDOW) {
    const oldest = history[0];
    const waitSec = Math.ceil((oldest + DISPATCH_WINDOW_MS - now) / 1000);
    return {
      success: false,
      error: "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
      retryAfterSeconds: Math.max(1, waitSec),
    };
  }

  // 3. Génération cryptographique à 6 chiffres
  const randomInt = crypto.randomInt(100000, 1000000); // 100000..999999
  const code = randomInt.toString();
  const salt = crypto.randomBytes(16).toString("hex");
  const codeHash = hashOtp(code, salt);

  const expiresAt = now + OTP_EXPIRATION_MS;

  otpStore.set(phoneE164, {
    phone: phoneE164,
    codeHash,
    salt,
    attempts: 0,
    maxAttempts: MAX_VERIFY_ATTEMPTS,
    expiresAt,
    createdAt: now,
    lastSentAt: now,
  });

  // Enregistrement dans l'historique de débit
  history.push(now);
  dispatchHistory.set(phoneE164, history);

  // Mémorisation pour tests automatisés
  testCodeRegistry.set(phoneE164, code);

  return {
    success: true,
    code,
    expiresAt: new Date(expiresAt),
  };
}

export type VerifyOtpResult =
  | { valid: true }
  | { valid: false; error: string; attemptsLeft?: number; expired?: boolean };

/**
 * Valide le code OTP saisi par l'utilisateur.
 * Protégé contre les attaques par force brute (5 tentatives max).
 */
export async function verifyStoredOtp(
  phoneE164: string,
  inputCode: string
): Promise<VerifyOtpResult> {
  cleanExpiredOtps();

  if (!inputCode || typeof inputCode !== "string" || !/^\d{6}$/.test(inputCode.trim())) {
    return {
      valid: false,
      error: "Le code de vérification doit comporter 6 chiffres.",
    };
  }

  const record = otpStore.get(phoneE164);
  const now = Date.now();


  if (!record) {
    return {
      valid: false,
      error: "Aucun code en attente pour ce numéro ou le code a expiré. Veuillez en demander un nouveau.",
      expired: true,
    };
  }

  // 1. Expiration temporelle
  if (now > record.expiresAt) {
    otpStore.delete(phoneE164);
    testCodeRegistry.delete(phoneE164);
    return {
      valid: false,
      error: "Ce code a expiré. Demandez un nouveau code.",
      expired: true,
    };
  }

  // 2. Limite de tentatives
  record.attempts += 1;
  const attemptsLeft = Math.max(0, record.maxAttempts - record.attempts);

  // Vérification de la correspondance par hash en temps constant
  const computedHash = hashOtp(inputCode, record.salt);
  const isMatch =
    computedHash.length === record.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(record.codeHash));

  if (!isMatch) {
    if (record.attempts >= record.maxAttempts) {
      otpStore.delete(phoneE164);
      testCodeRegistry.delete(phoneE164);
      return {
        valid: false,
        error: "Trop de tentatives incorrectes. Ce code a été invalidé par sécurité. Demandez-en un nouveau.",
        attemptsLeft: 0,
        expired: true,
      };
    }

    return {
      valid: false,
      error: "Le code est incorrect. Veuillez réessayer.",
      attemptsLeft,
    };
  }

  // Code valide : consommation immédiate
  otpStore.delete(phoneE164);
  testCodeRegistry.delete(phoneE164);

  return { valid: true };
}

/**
 * Récupère le dernier code généré pour un numéro (réservé aux tests et simulations).
 */
export function getLatestTestOtp(phoneE164: string): string | null {
  return testCodeRegistry.get(phoneE164) || null;
}

/**
 * Réinitialise le store pour un numéro (utile lors des tests ou après succès).
 */
export function clearOtpState(phoneE164: string): void {
  otpStore.delete(phoneE164);
  testCodeRegistry.delete(phoneE164);
  dispatchHistory.delete(phoneE164);
}
