// ============================================================
// ASCII Chemistry — atomCharProperties.js
// ============================================================

const VOWEL_SET = new Set("aeiouAEIOU");
const CONSONANT_SET = new Set(
  "bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ",
);
const CONNECTOR_SET = new Set("!@#$%^&*=|;:,.-_");

/**
 * @param {string} char
 */
export function getAtomCharFlags(char) {
  return {
    isVowel: VOWEL_SET.has(char),
    isConsonant: CONSONANT_SET.has(char),
    isConnector: CONNECTOR_SET.has(char),
    isUpperCase: char === char.toUpperCase() && char !== char.toLowerCase(),
    isLowerCase: char === char.toLowerCase() && char !== char.toUpperCase(),
    isDigit: /\d/.test(char),
    isSpecialChar: !/[a-zA-Z0-9]/.test(char),
  };
}
