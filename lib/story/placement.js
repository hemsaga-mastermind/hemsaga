/**
 * Decides which chapter a new memory should be woven into.
 * Used by the tweak API so "something that happens now" can be placed in the right moment (e.g. Chapter 1).
 */

/**
 * @param {{ memory_date: string, content?: string }} memory - The new memory (at least memory_date)
 * @param {{ subject_dob?: string }} space - Space with optional subject_dob for time range
 * @param {{ chapter_number: number }[]} chapters - Existing chapters ordered by chapter_number
 * @returns { number } 1-based chapter number to weave into (or 1 if no chapters)
 */
export function getTargetChapterForMemory(memory, space, chapters) {
  if (!chapters?.length) return 1;

  const memDate = new Date(memory.memory_date || Date.now());
  const start = space?.subject_dob ? new Date(space.subject_dob) : new Date(memDate.getFullYear(), 0, 1);
  const end = new Date();

  const totalMs = end - start;
  const memMs = memDate - start;
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, memMs / totalMs)) : 0;

  const chapterIndex = Math.min(
    Math.floor(ratio * chapters.length),
    chapters.length - 1
  );
  return chapters[chapterIndex].chapter_number;
}
