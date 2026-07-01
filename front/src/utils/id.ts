/**
 * Generates a deterministic candidate ID from a seed string.
 * Uses a simple polynomial hash — reproducible for same inputs.
 */
export function generateCandidateId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `candidate-${hash.toString(36)}`;
}
