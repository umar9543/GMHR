import CryptoJS from 'crypto-js';
import { Crypto_Key } from 'src/config-global';

const key = Crypto_Key || '';

// Pad the key to meet TripleDES requirements
const paddedKey = CryptoJS.enc.Utf8.parse(key.padEnd(24, ' '));

const encrypt = (plainText) => {
  if (plainText == null) {
    return null; // Return null if plainText is null or undefined
  }

  // Check if plainText is an array
  if (Array.isArray(plainText)) {
    // Convert array to string and join elements
    plainText = plainText.join(',');
  }

  // Check if plainText is a boolean or number, convert it to string
  if (typeof plainText === 'boolean' || typeof plainText === 'number') {
    plainText = plainText.toString();
  }

  const iv = CryptoJS.lib.WordArray.random(8); // Generate random IV
  const encrypted = CryptoJS.TripleDES.encrypt(plainText, paddedKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  // Concatenate IV with encrypted data
  const encryptedWithIV = iv.concat(encrypted.ciphertext);
  return encryptedWithIV.toString(CryptoJS.enc.Base64);
};


const decrypt = (encryptedText) => {
  if (encryptedText == null) {
    return null; // Return null if encryptedText is null or undefined
  }

  const encryptedDataWithIV = CryptoJS.enc.Base64.parse(encryptedText);
  const iv = encryptedDataWithIV.clone(); // IV is first 8 bytes
  iv.sigBytes = 8;
  iv.clamp();
  const cipherText = encryptedDataWithIV.clone();
  cipherText.words.splice(0, 2); // Remove IV from cipher text
  cipherText.sigBytes -= 8;
  const decrypted = CryptoJS.TripleDES.decrypt(
    { ciphertext: cipherText },
    paddedKey,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
};

export { encrypt, decrypt };
