// Prosody Parser - analyzes text for stress patterns and pitch contours

export interface SyllableData {
  text: string;
  stress: number;
  pitch: number;
}

export interface WordData {
  word: string;
  syllables: SyllableData[];
  isFunc: boolean;
  stressIdx: number;
  finalStress: number;
  startChar: number;
  endChar: number;
  chunkWithNext: boolean;
}

const FUNCTION_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Pronouns
  'i', 'me', 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
  'we', 'us', 'our', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
  // Prepositions
  'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'about',
  'after', 'before', 'between', 'through', 'during', 'over', 'under', 'above', 'below',
  // Conjunctions
  'and', 'but', 'or', 'so', 'yet', 'nor', 'if', 'when', 'while', 'because', 'although', 'though',
  // Auxiliaries
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'has', 'have', 'had', 'having',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  // Other function words
  'not', 'no', 'as', 'than', 'then', 'just', 'also', 'very', 'too',
  'there', 'here', 'where', 'how', 'what', 'which', 'who', 'whom',
]);

export function parseProsody(text: string): WordData[] {
  if (!text || text.trim().length === 0) return [];
  const result: WordData[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const startChar = match.index;
    const endChar = match.index + word.length;
    const clean = word.toLowerCase().replace(/[^a-z']/g, '');
    const isFunc = FUNCTION_WORDS.has(clean);
    const syls = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [word];
    let stressIdx = 0;
    if (syls.length > 1) {
      if (clean.endsWith('graphy') || clean.endsWith('logy')) stressIdx = Math.max(0, syls.length - 3);
      else if (clean.endsWith('tion') || clean.endsWith('ic') || clean.endsWith('sion')) stressIdx = Math.max(0, syls.length - 2);
      else if (!isFunc) stressIdx = 0;
    }
    const finalStress = isFunc ? 0 : 2;
    const sylData: SyllableData[] = syls.map((txt, idx) => ({
      text: txt,
      stress: isFunc ? 0 : (idx === stressIdx ? finalStress : 0),
      pitch: isFunc ? 0 : (idx === stressIdx ? 2 : (idx > stressIdx ? -1 : 0)),
    }));
    const nextWord = (text.slice(endChar).match(/^\s*(\S+)/) || [])[1]?.toLowerCase().replace(/[^a-z']/g, '') || '';
    const chunkWithNext = !isFunc && FUNCTION_WORDS.has(nextWord);
    result.push({ word, syllables: sylData, isFunc, stressIdx, finalStress, startChar, endChar, chunkWithNext });
  }
  for (let i = 1; i < result.length - 1; i++) {
    if (!result[i - 1].isFunc && !result[i].isFunc && !result[i + 1].isFunc) {
      result[i].finalStress = 1;
      if (result[i].syllables[result[i].stressIdx]) result[i].syllables[result[i].stressIdx].stress = 1;
    }
  }
  return result;
}

/** Find the word index matching a charIndex from SpeechSynthesis onBoundary */
export function matchCharIndex(data: WordData[], charIndex: number): number {
  const exact = data.findIndex((w) => charIndex >= w.startChar && charIndex <= w.endChar + 1);
  if (exact !== -1) return exact;
  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < data.length; i++) {
    const dist = Math.abs(charIndex - data[i].startChar);
    if (dist < minDist) { minDist = dist; closest = i; }
  }
  return closest;
}
