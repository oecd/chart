export const OUTLINE_WIDTH_SMALL = 1;
export const OUTLINE_WIDTH_MEDIUM = 1.5;
export const OUTLINE_WIDTH_LARGE = 2;

export const OUTLINE_GAP_SMALL = 0.5;
export const OUTLINE_GAP_MEDIUM = 0.75;
export const OUTLINE_GAP_LARGE = 1;

/**
 * Returns the stroke width of outline
 * @param {number} chartWidth
 */
export const getOutlineWidth = (chartWidth) =>
  chartWidth >= 800
    ? OUTLINE_WIDTH_LARGE
    : chartWidth >= 600
      ? OUTLINE_WIDTH_MEDIUM
      : OUTLINE_WIDTH_SMALL;

/**
 * Returns the gap between the value shape and the outline
 * @param {number} chartWidth
 */
export const getOutlineGap = (chartWidth) =>
  chartWidth >= 800
    ? OUTLINE_GAP_LARGE
    : chartWidth >= 600
      ? OUTLINE_GAP_MEDIUM
      : OUTLINE_GAP_SMALL;
