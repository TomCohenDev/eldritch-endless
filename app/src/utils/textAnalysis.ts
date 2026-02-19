/**
 * Extract key phrases from text for anti-repetition tracking
 * Uses simple heuristics: distinctive words and 2-3 word sequences
 */
export function extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
  // Simple implementation: extract distinctive words and 2-3 word sequences
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4); // Only words longer than 4 chars

  const phrases: string[] = [];

  // Common words to filter out
  const commonWords = new Set([
    'their', 'there', 'where', 'which', 'would', 'should', 'could',
    'about', 'these', 'those', 'before', 'after', 'through', 'around',
    'every', 'never', 'always', 'something', 'nothing', 'anything'
  ]);

  // Add distinctive single words
  const distinctiveWords = words.filter(w => !commonWords.has(w));

  // Add bigrams (2-word phrases)
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // Add trigrams (3-word phrases)
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  // Count phrase frequencies
  const frequency = new Map<string, number>();
  phrases.forEach(p => frequency.set(p, (frequency.get(p) || 0) + 1));

  // Return most frequent phrases (limited to maxPhrases)
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases)
    .map(([phrase]) => phrase);
}
