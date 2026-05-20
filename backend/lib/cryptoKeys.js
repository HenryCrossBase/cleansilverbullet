const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { promisify } = require('util');

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

const KEY_DIR = path.join(__dirname, '..', 'keys');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.pem');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.pem');

let keyPairPromise;

async function ensureKeyDir() {
  await fs.mkdir(KEY_DIR, { recursive: true });
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function generateAndPersistKeyPair() {
  const generated = await generateKeyPairAsync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  await Promise.all([
    fs.writeFile(PUBLIC_KEY_PATH, generated.publicKey, 'utf8'),
    fs.writeFile(PRIVATE_KEY_PATH, generated.privateKey, { encoding: 'utf8', mode: 0o600 })
  ]);

  return generated;
}

async function initKeyPair() {
  if (!keyPairPromise) {
    keyPairPromise = (async () => {
      await ensureKeyDir();
      const [publicKey, privateKey] = await Promise.all([
        readIfExists(PUBLIC_KEY_PATH),
        readIfExists(PRIVATE_KEY_PATH)
      ]);

      if (publicKey && privateKey) {
        return { publicKey, privateKey };
      }

      return generateAndPersistKeyPair();
    })();
  }

  return keyPairPromise;
}

async function getPublicKey() {
  const { publicKey } = await initKeyPair();
  return publicKey;
}

async function decryptBase64Payload(payload) {
  const { privateKey } = await initKeyPair();
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(payload, 'base64')
  ).toString('utf8');
}

module.exports = {
  decryptBase64Payload,
  getPublicKey,
  initKeyPair
};
