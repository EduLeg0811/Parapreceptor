import { useMemo } from "react";

export interface TextStats {
  words: number;
  characters: number;
  charactersWithSpaces: number;
  paragraphs: number;
  pages: number;
  readingTime: string;
  sesquipedal: number;
  logiaWords: number;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç]/g, "");
  if (w.length <= 2) return 1;
  // Portuguese vowel groups (each group = 1 syllable approx)
  const vowels = w.match(/[aáàâãeéèêiíïoóôõuúü]+/g);
  return vowels ? vowels.length : 1;
}

export function useTextStats(
  text: string,
  refreshKey = 0,
  pageCountOverride: number | null = null,
  paragraphCountOverride: number | null = null,
  wordCountOverride: number | null = null,
  characterCountOverride: number | null = null,
  characterWithSpacesCountOverride: number | null = null,
): TextStats {
  return useMemo(() => {
    void refreshKey;
    const normalized = text.replace(/\r\n/g, "\n");
    const trimmed = normalized.trim();
    const wordList = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const words = wordCountOverride !== null ? Math.max(0, wordCountOverride) : wordList.length;
    const characters = characterCountOverride !== null ? Math.max(0, characterCountOverride) : normalized.replace(/\s+/g, "").length;
    const charactersWithSpaces = characterWithSpacesCountOverride !== null
      ? Math.max(0, characterWithSpacesCountOverride)
      : normalized.length;
    const paragraphs = paragraphCountOverride !== null
      ? Math.max(0, paragraphCountOverride)
      : (trimmed ? trimmed.split(/\n+/).map((item) => item.trim()).filter(Boolean).length : 0);
    const pages = pageCountOverride !== null
      ? Math.max(0, pageCountOverride)
      : (charactersWithSpaces > 0 ? Math.max(1, Math.ceil(charactersWithSpaces / 3000)) : 0);
    const minutes = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    const readingTime = `${minutes} min`;

    let sesquipedal = 0;
    let logiaWords = 0;
    for (const w of wordList) {
      if (countSyllables(w) > 10) sesquipedal++;
      if (/logia$/i.test(w.replace(/[^a-záàâãéèêíïóôõúüç]/gi, ""))) logiaWords++;
    }

    return { words, characters, charactersWithSpaces, paragraphs, pages, readingTime, sesquipedal, logiaWords };
  }, [text, refreshKey, pageCountOverride, paragraphCountOverride, wordCountOverride, characterCountOverride, characterWithSpacesCountOverride]);
}
