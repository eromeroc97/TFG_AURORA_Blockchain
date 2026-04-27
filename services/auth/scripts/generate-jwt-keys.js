const { generateKeyPairSync } = require('crypto');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privateKeyBase64 = Buffer.from(privateKey, 'utf8').toString('base64');
const publicKeyBase64 = Buffer.from(publicKey, 'utf8').toString('base64');

console.log('JWT_PRIVATE_KEY=' + privateKeyBase64);
console.log('JWT_PUBLIC_KEY=' + publicKeyBase64);
