// ============================================================
// ASCII Chemistry — stringProperties.js
// ============================================================

const VOWELS = "aeiouAEIOU";
const VOWEL_SET = new Set(VOWELS);
const CONSONANTS = "bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ";
const CONSONANT_SET = new Set(CONSONANTS);
const HEX_CHARS = "0123456789ABCDEFabcdef";
const HEX_CHAR_SET = new Set(HEX_CHARS);
const FIBONACCI_DISTANCES = [1, 2, 3, 5, 8, 13, 21, 34];
const FIBONACCI_DISTANCE_SET = new Set(FIBONACCI_DISTANCES);

const STRING_PROPERTIES_CACHE_MAX = 512;
/** @type {Map<string, { metrics: object, ratios: object, booleans: object, calculated: object }>} */
const _stringPropertiesCache = new Map();

function charClass(char) {
  if (/\d/.test(char)) return 0;
  if (/[a-z]/.test(char)) return 1;
  if (/[A-Z]/.test(char)) return 2;
  return 3;
}

export const characterRules = {
  isGreaterThanNext: (prev, curr, next) =>
    next && curr.charCodeAt(0) > next.charCodeAt(0),

  isBetweenSurroundingValues: (prev, curr, next) => {
    if (!prev || !next) return false;
    const p = prev.charCodeAt(0);
    const c = curr.charCodeAt(0);
    const n = next.charCodeAt(0);
    return (p < c && c < n) || (p > c && c > n);
  },

  isStrictLocalExtremum: (prev, curr, next) => {
    if (!prev || !next) return false;
    const p = prev.charCodeAt(0);
    const c = curr.charCodeAt(0);
    const n = next.charCodeAt(0);
    return (p < c && c > n) || (p > c && c < n);
  },

  isPartOfAscendingSequence: (prev, curr, next, nextNext) => {
    if (!next || !nextNext) return false;
    const a = curr.charCodeAt(0);
    const b = next.charCodeAt(0);
    const c = nextNext.charCodeAt(0);
    return a < b && b < c;
  },

  isEquidistantFromSurrounding: (prev, curr, next) => {
    if (!prev || !next) return false;
    const prevDiff = Math.abs(curr.charCodeAt(0) - prev.charCodeAt(0));
    const nextDiff = Math.abs(curr.charCodeAt(0) - next.charCodeAt(0));
    return prevDiff === nextDiff;
  },

  hasAlternatingCase: (prev, curr, next) => {
    const isCurrentUpper = curr === curr.toUpperCase();
    return next && isCurrentUpper !== (next === next.toUpperCase());
  },

  isFollowedByVowel: (prev, curr, next) => next && VOWEL_SET.has(next),

  isConsonantCluster: (prev, curr, next) =>
    curr && next && CONSONANT_SET.has(curr) && CONSONANT_SET.has(next),

  isRepeatingCharacter: (prev, curr, next) => curr === next,

  isInTripleRepeat: (prev, curr, next, nextNext) =>
    (prev && prev === curr && curr === next) ||
    (next && curr === next && next === nextNext),

  isNonDecreasingAlphabetically: (prev, curr, next) =>
    next && curr.toLowerCase() <= next.toLowerCase(),

  isStrictlyAscendingAlphabetically: (prev, curr, next) =>
    next && curr.toLowerCase() < next.toLowerCase(),

  isConsecutiveASCII: (prev, curr, next) =>
    next && Math.abs(next.charCodeAt(0) - curr.charCodeAt(0)) === 1,

  isClassTransition: (prev, curr) =>
    prev && charClass(prev) !== charClass(curr),

  isLetterDigitAlternation: (prev, curr) =>
    prev &&
    ((/\d/.test(prev) && /[a-zA-Z]/.test(curr)) ||
      (/[a-zA-Z]/.test(prev) && /\d/.test(curr))),

  hasSurroundingSumGreaterThanDouble: (prev, curr, next) => {
    if (!prev || !next) return false;
    return prev.charCodeAt(0) + next.charCodeAt(0) > curr.charCodeAt(0) * 2;
  },

  isFibonacciDistance: (prev, curr, next) => {
    if (!next) return false;
    const diff = Math.abs(next.charCodeAt(0) - curr.charCodeAt(0));
    return FIBONACCI_DISTANCE_SET.has(diff);
  },

  isPerfectSquareDistance: (prev, curr, next) => {
    if (!next) return false;
    const diff = Math.abs(next.charCodeAt(0) - curr.charCodeAt(0));
    const sqrt = Math.sqrt(diff);
    return sqrt === Math.floor(sqrt);
  },

  isPartOfPalindrome: (prev, curr, next) => {
    if (!prev || !next) return false;
    return prev.toLowerCase() === next.toLowerCase();
  },

  isVowelConsonantPair: (prev, curr, next) =>
    (VOWEL_SET.has(curr) && next && !VOWEL_SET.has(next)) ||
    (!VOWEL_SET.has(curr) && next && VOWEL_SET.has(next)),

  isASCIIDivisibleBy3: (prev, curr, next) => curr.charCodeAt(0) % 3 === 0,

  isEvenCharCode: (prev, curr, next) => curr.charCodeAt(0) % 2 === 0,

  formsHexValue: (prev, curr, next) =>
    curr && next && HEX_CHAR_SET.has(curr) && HEX_CHAR_SET.has(next),

  hasBalancedCase: (prev, curr, next, nextNext) => {
    if (!next || !nextNext) return false;
    const upperCount = [curr, next, nextNext].filter(
      (c) => c === c.toUpperCase(),
    ).length;
    return upperCount === 1 || upperCount === 2;
  },
};

/**
 * @param {string} str
 * @param {Function} rule
 */
export function analyzeStringWithRule(str, rule) {
  if (!(rule instanceof Function)) return 0;

  let trueCount = 0;
  for (let i = 0; i < str.length; i++) {
    const prev = i > 0 ? str[i - 1] : null;
    const curr = str[i];
    const next = i < str.length - 1 ? str[i + 1] : null;
    const nextNext = i < str.length - 2 ? str[i + 2] : null;

    if (rule(prev, curr, next, nextNext)) {
      trueCount++;
    }
  }

  return str.length ? trueCount / str.length : 0;
}

/** @param {string} str */
export function isPalindrome(str) {
  return str === str.split("").reverse().join("");
}

/** @param {string} str */
export function hasRepeatingPattern(str) {
  if (str.length < 2) return false;
  const halfLength = Math.floor(str.length / 2);
  for (let i = 1; i <= halfLength; i++) {
    const pattern = str.slice(0, i);
    if (str === pattern.repeat(str.length / i)) {
      return true;
    }
  }
  return false;
}

/** @param {string} str */
export function isAscending(str) {
  return str === str.split("").sort().join("");
}

/** @param {string} str */
export function isDescending(str) {
  return str === str.split("").sort().reverse().join("");
}

function averageCharCode(str) {
  if (str.length === 0) return 0;
  const sum = [...str].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return sum / str.length;
}

function standardDeviation(str) {
  if (str.length === 0) return 0;
  const avg = averageCharCode(str);
  const avgSquareDiff =
    [...str].reduce((acc, char) => {
      const diff = char.charCodeAt(0) - avg;
      return acc + diff * diff;
    }, 0) / str.length;
  return Math.sqrt(avgSquareDiff);
}

function entropy(str) {
  if (str.length === 0) return 0;
  const charFreq = {};
  for (const char of str) {
    charFreq[char] = (charFreq[char] || 0) + 1;
  }

  let result = 0;
  for (const char in charFreq) {
    const probability = charFreq[char] / str.length;
    result -= probability * Math.log2(probability);
  }
  return result;
}

function longestRepeatingRun(str) {
  if (str.length === 0) return 0;
  let maxLength = 0;
  let currentLength = 1;

  for (let i = 1; i < str.length; i++) {
    if (str[i] === str[i - 1]) {
      currentLength++;
    } else {
      maxLength = Math.max(maxLength, currentLength);
      currentLength = 1;
    }
  }

  return Math.max(maxLength, currentLength);
}

function longestPalindromeLength(str) {
  if (str.length === 0) return 0;
  if (str.length === 1) return 1;

  let maxLength = 1;

  for (let center = 0; center < str.length; center++) {
    for (const [left, right] of [
      [center, center],
      [center, center + 1],
    ]) {
      let l = left;
      let r = right;
      while (
        l >= 0 &&
        r < str.length &&
        str[l].toLowerCase() === str[r].toLowerCase()
      ) {
        maxLength = Math.max(maxLength, r - l + 1);
        l--;
        r++;
      }
    }
  }

  return maxLength;
}

function runCount(str) {
  if (str.length === 0) return 0;

  let runs = 1;
  for (let i = 1; i < str.length; i++) {
    if (str[i] !== str[i - 1]) {
      runs++;
    }
  }
  return runs;
}

function xorFingerprint(str) {
  let result = 0;
  for (const char of str) {
    result ^= char.charCodeAt(0);
  }
  return result;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function trigSin01(x) {
  return Math.sin(x) * 0.5 + 0.5;
}

function trigCos01(x) {
  return Math.cos(x) * 0.5 + 0.5;
}

/**
 * @param {ReturnType<typeof calculateMetrics>} metrics
 */
function calculateCalculated(metrics) {
  const calculated = {};

  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      calculated[`sin_${key}`] = trigSin01(value);
      calculated[`cos_${key}`] = trigCos01(value);
    }
  }

  const sumCounts =
    metrics.vowelCount +
    metrics.consonantCount +
    metrics.digitCount +
    metrics.uppercaseCount +
    metrics.lowercaseCount +
    metrics.specialCharCount;
  const sumStructural =
    metrics.longestRepeatingRun +
    metrics.longestPalindromeLength +
    metrics.runCount;
  const sumCodes =
    metrics.sumOfCharCodes + metrics.sumOfDigits + metrics.xorFingerprint;
  const sumStats =
    metrics.averageCharCode + metrics.standardDeviation + metrics.entropy;

  for (const [name, sum] of [
    ["sumCounts", sumCounts],
    ["sumStructural", sumStructural],
    ["sumCodes", sumCodes],
    ["sumStats", sumStats],
  ]) {
    calculated[name] = sum;
    calculated[`sin_${name}`] = trigSin01(sum);
    calculated[`cos_${name}`] = trigCos01(sum);
  }

  const xorPlusSum = metrics.xorFingerprint + metrics.sumOfCharCodes;
  calculated.sinXorPlusSum = trigSin01(xorPlusSum);
  calculated.cosXorPlusSum = trigCos01(xorPlusSum);

  return calculated;
}

/** @param {string} str */
function calculateMetrics(str) {
  const vowels = str.match(/[aeiou]/gi);
  const consonants = str.match(/[bcdfghjklmnpqrstvwxyz]/gi);
  const digits = str.match(/[0-9]/g);
  const uppercase = str.match(/[A-Z]/g);
  const lowercase = str.match(/[a-z]/g);
  const specialChars = str.match(/[^a-zA-Z0-9]/g);

  return {
    length: str.length,
    vowelCount: vowels ? vowels.length : 0,
    consonantCount: consonants ? consonants.length : 0,
    digitCount: digits ? digits.length : 0,
    uppercaseCount: uppercase ? uppercase.length : 0,
    lowercaseCount: lowercase ? lowercase.length : 0,
    specialCharCount: specialChars ? specialChars.length : 0,
    uniqueCharCount: new Set(str).size,
    sumOfDigits: digits
      ? digits.reduce((sum, num) => sum + parseInt(num, 10), 0)
      : 0,
    sumOfCharCodes: [...str].reduce((sum, char) => sum + char.charCodeAt(0), 0),
    longestRepeatingRun: longestRepeatingRun(str),
    longestPalindromeLength: longestPalindromeLength(str),
    runCount: runCount(str),
    averageCharCode: averageCharCode(str),
    standardDeviation: standardDeviation(str),
    entropy: entropy(str),
    xorFingerprint: xorFingerprint(str),
  };
}

/**
 * @param {string} str
 * @param {ReturnType<typeof calculateMetrics>} metrics
 */
function calculateRatios(str, metrics) {
  const ratios = {};

  for (const [ruleName, rule] of Object.entries(characterRules)) {
    ratios[ruleName] = analyzeStringWithRule(str, rule);
  }

  const { length, uniqueCharCount } = metrics;

  ratios.vowelRatio = ratio(metrics.vowelCount, length);
  ratios.consonantRatio = ratio(metrics.consonantCount, length);
  ratios.digitRatio = ratio(metrics.digitCount, length);
  ratios.uppercaseRatio = ratio(metrics.uppercaseCount, length);
  ratios.lowercaseRatio = ratio(metrics.lowercaseCount, length);
  ratios.specialCharRatio = ratio(metrics.specialCharCount, length);
  ratios.uniqueCharRatio = ratio(uniqueCharCount, length);
  ratios.normalizedEntropy =
    uniqueCharCount > 1 ? metrics.entropy / Math.log2(uniqueCharCount) : 0;
  ratios.repetitionRatio = ratio(metrics.longestRepeatingRun, length);
  ratios.palindromeCoverage = ratio(metrics.longestPalindromeLength, length);
  ratios.rleCompressionRatio = ratio(metrics.runCount, length);
  ratios.asciiSumSinNormalized =
    Math.sin(metrics.sumOfCharCodes) * 0.5 + 0.5;

  return ratios;
}

/**
 * @param {string} str
 * @param {ReturnType<typeof calculateMetrics>} metrics
 */
function calculateBooleans(str, metrics) {
  return {
    isPalindrome: isPalindrome(str),
    hasRepeatingPattern: hasRepeatingPattern(str),
    isAscending: isAscending(str),
    isDescending: isDescending(str),
    isAllSameChar: metrics.length > 0 && metrics.uniqueCharCount === 1,
    hasMixedCase: metrics.uppercaseCount > 0 && metrics.lowercaseCount > 0,
    hasDigits: metrics.digitCount > 0,
  };
}

/** @param {string} str */
export function calculateStringProperties(str) {
  const cached = _stringPropertiesCache.get(str);
  if (cached) return cached;

  const metrics = calculateMetrics(str);
  const result = {
    metrics,
    ratios: calculateRatios(str, metrics),
    booleans: calculateBooleans(str, metrics),
    calculated: calculateCalculated(metrics),
  };

  if (_stringPropertiesCache.size >= STRING_PROPERTIES_CACHE_MAX) {
    const oldest = _stringPropertiesCache.keys().next().value;
    _stringPropertiesCache.delete(oldest);
  }
  _stringPropertiesCache.set(str, result);
  return result;
}

if (typeof window !== "undefined") {
  window.calculateStringProperties = calculateStringProperties;
}

function coercePropertyValue(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "boolean") return val ? 1 : 0;
  return 0;
}

export function getOverallValue(propertiesObject) {
  const { metrics = {}, ratios = {}, booleans = {} } = propertiesObject ?? {};
  const values = [
    ...Object.values(metrics),
    ...Object.values(ratios),
    ...Object.values(booleans),
  ];

  if (values.length === 0) return 0;

  let state = 0x811c9dc5;

  for (let i = 0; i < values.length; i++) {
    const v = coercePropertyValue(values[i]);
    const folded = Math.sin(v * (i + 1) * 12.9898) * 43758.5453;
    state ^= Math.imul((folded * 1e6) | 0, 0x01000193);
    state = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
    state ^= state >>> 13;
  }

  state = Math.imul(state ^ (state >>> 16), 0x7feb352d);
  state ^= state >>> 15;
  return (state >>> 0) / 4294967296;
}

window.getOverallValue = getOverallValue;
