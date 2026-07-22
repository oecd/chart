export const OUTLINE_WIDTH_SMALL = 1;
export const OUTLINE_WIDTH_MEDIUM = 1.5;
export const OUTLINE_WIDTH_LARGE = 2;

/**
 * Returns the width of the bar outline depending on the chart width
 * @param {number} chartWidth
 */
export const getOutlineWidth = (chartWidth) =>
  chartWidth >= 800
    ? OUTLINE_WIDTH_LARGE
    : chartWidth >= 500
      ? OUTLINE_WIDTH_MEDIUM
      : OUTLINE_WIDTH_SMALL;
