const OUTLINE_WIDTH_S = 0.75;
const OUTLINE_WIDTH_M = 1;
const OUTLINE_WIDTH_L = 1.5;
const OUTLINE_WIDTH_XL = 2;

const OUTLINE_GAP_S = 0.5;
const OUTLINE_GAP_M = 0.75;
const OUTLINE_GAP_L = 1;
const OUTLINE_GAP_XL = 1;

const BREAKPOINT_M = 400;
const BREAKPOINT_L = 600;
const BREAKPOINT_XL = 800;

/**
 * Returns the stroke width of outline
 * @param {number} chartWidth
 */
export const getOutlineWidth = (chartWidth) =>
  chartWidth >= BREAKPOINT_XL
    ? OUTLINE_WIDTH_XL
    : chartWidth >= BREAKPOINT_L
      ? OUTLINE_WIDTH_L
      : chartWidth >= BREAKPOINT_M
        ? OUTLINE_WIDTH_M
        : OUTLINE_WIDTH_S;

/**
 * Returns the gap between the value shape and the outline
 * @param {number} chartWidth
 */
export const getOutlineGap = (chartWidth) =>
  chartWidth >= BREAKPOINT_XL
    ? OUTLINE_GAP_XL
    : chartWidth >= BREAKPOINT_L
      ? OUTLINE_GAP_L
      : chartWidth >= BREAKPOINT_M
        ? OUTLINE_GAP_M
        : OUTLINE_GAP_S;
