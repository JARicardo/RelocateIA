import crypto from 'crypto';

const TOKEN_BYTES = 32;

export function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export function generatePasswordResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = generateToken();

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  };
}