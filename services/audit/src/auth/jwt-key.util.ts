import { createPublicKey } from 'crypto';

export const decodeRsaPublicKey = (rawValue: string | undefined, keyName: string): string => {
  if (!rawValue) {
    throw new Error(`${keyName} is not configured`);
  }

  const pem = rawValue.includes('BEGIN')
    ? rawValue.replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
    : Buffer.from(rawValue, 'base64').toString('utf8');

  try {
    const key = createPublicKey({ key: pem.trim(), format: 'pem' });
    return key.export({ type: 'spki', format: 'pem' }).toString();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'invalid key';
    throw new Error(`${keyName} is malformed or not a valid RSA public key: ${message}`);
  }
};

export const getJwtPublicKey = (): string => {
  return decodeRsaPublicKey(process.env.JWT_PUBLIC_KEY, 'JWT_PUBLIC_KEY');
};