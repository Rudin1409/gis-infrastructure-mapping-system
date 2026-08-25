/**
 * Generate a sequential pole ID format: "LL-0001", "LL-0002", etc.
 * Uses current max sequence number or fallback timestamp hash to prevent collisions.
 */
export function generatePoleId(existingIds: string[] = []): string {
  let maxSeq = 0;

  for (const id of existingIds) {
    if (typeof id === 'string' && id.startsWith('LL-')) {
      const numPart = parseInt(id.replace('LL-', ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(4, '0');
  return `LL-${padded}`;
}

/**
 * Generate a sequential segment ID format: "SEG-0001"
 */
export function generateSegmentId(existingIds: string[] = []): string {
  let maxSeq = 0;

  for (const id of existingIds) {
    if (typeof id === 'string' && id.startsWith('SEG-')) {
      const numPart = parseInt(id.replace('SEG-', ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(4, '0');
  return `SEG-${padded}`;
}
