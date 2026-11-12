/**
 * Get a reference letter for the given annotation index.
 * @param {number} index
 */
export const getReferenceLetter = (index) =>
  String.fromCodePoint(65 + (index % 26));
