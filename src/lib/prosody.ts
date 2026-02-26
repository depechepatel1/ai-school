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
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'of', 'is', 'in', 'it', 'to', 'over', 'with', 'at', 'by'
]);

export function parseProsody(text: string): WordData[] {
  const words = text.split(' ');
  let charCount = 0;

  const analyzed = words.map((word) => {
    const start = text.indexOf(word, charCount);
    charCount = start + word.length;
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    const isFunc = FUNCTION_WORDS.has(clean);
    const syls = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [word];
    let stressIdx = 0;
    if (syls.length > 1) {
      if (clean.endsWith('graphy') || clean.endsWith('logy')) stressIdx = Math.max(0, syls.length - 3);
      else if (clean.endsWith('tion') || clean.endsWith('ic')) stressIdx = Math.max(0, syls.length - 2);
      else if (!isFunc) stressIdx = 0;
    }
    return { word, syllables: syls, isFunc, stressIdx, finalStress: isFunc ? 0 : 2, startChar: start, endChar: charCount };
  });

  for (let i = 1; i < analyzed.length - 1; i++) {
    if (!analyzed[i - 1].isFunc && !analyzed[i].isFunc && !analyzed[i + 1].isFunc) analyzed[i].finalStress = 1;
  }

  return analyzed.map((w, i) => {
    const next = analyzed[i + 1];
    const chunkWithNext = !w.isFunc && !!next && next.isFunc;
    const sylData: SyllableData[] = (w.syllables as string[]).map((txt, idx) => ({
      text: txt,
      stress: w.isFunc ? 0 : (idx === w.stressIdx ? w.finalStress : 0),
      pitch: w.isFunc ? 0 : (idx === w.stressIdx ? 2 : (idx > w.stressIdx ? -1 : 0)),
    }));
    return { ...w, syllables: sylData, chunkWithNext };
  });
}
