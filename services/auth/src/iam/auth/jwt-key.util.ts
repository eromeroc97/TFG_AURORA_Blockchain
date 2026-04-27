import { createPrivateKey, createPublicKey } from 'crypto';

const normalizePem = (rawValue: string): string => {
  const pem = rawValue.includes('BEGIN') ? rawValue.replace(/\\n/g, '\n') : Buffer.from(rawValue, 'base64').toString('utf8');
  return pem.trim().replace(/\r\n/g, '\n');
};

export const decodeRsaPrivateKey = (rawValue: string | undefined, keyName: string): string => {
  if (!rawValue) {
    throw new Error(`${keyName} is not configured`);
  }

  const pem = normalizePem(rawValue);

  try {
    const key = createPrivateKey({ key: pem, format: 'pem' });
    return key.export({ type: 'pkcs8', format: 'pem' }).toString();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'invalid key';
    throw new Error(`${keyName} is malformed or not a valid RSA private key: ${message}`);
  }
};

export const decodeRsaPublicKey = (rawValue: string | undefined, keyName: string): string => {
  if (!rawValue) {
    throw new Error(`${keyName} is not configured`);
  }

  const pem = normalizePem(rawValue);

  try {
    const key = createPublicKey({ key: pem, format: 'pem' });
    return key.export({ type: 'spki', format: 'pem' }).toString();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'invalid key';
    throw new Error(`${keyName} is malformed or not a valid RSA public key: ${message}`);
  }
};
