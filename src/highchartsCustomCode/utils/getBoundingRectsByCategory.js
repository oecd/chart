// @ts-check
/**
 * @import { Point, Series } from "highcharts"
 */

/**
 * Groups all points of a series by the given categories
 *
 * @param {Series[]} series Relevant series
 * @param {string[]} categories Categories to filter for
 * @returns {Map<string, Point[]>}
 */
export const groupPointsByCategory = (series, categories) => {
  const categoryCodes = new Set(categories);

  /** @type {Map<string, Point[]>} */
  const pointsByCategory = new Map();

  // Gather the bounding boxes of points for highlighted categories
  series.forEach((singleSeries) => {
    singleSeries.points.forEach((point) => {
      const { name } = point;
      if (!categoryCodes.has(name)) return;
      let points = pointsByCategory.get(name);
      if (!points) {
        points = [];
        pointsByCategory.set(name, points);
      }
      points.push(point);
    });
  });

  return pointsByCategory;
};

/**
 * @typedef {{
 * x1: number;
 * x2: number;
 * y1: number;
 * y2: number;
 * }} BoundingRect
 */

/**
 * Gets the bounding rects for all points of the given highlight categories
 * @param {Map<string, Point[]>} pointsByCategory
 * @returns {Map<string, BoundingRect>}
 */
export const getBoundingRectsByCategory = (pointsByCategory) => {
  /** @type {Map<string, BoundingRect>} */
  const boundingRectsByCategory = new Map();

  // Determine bounding box
  pointsByCategory.forEach((points, category) => {
    let x1 = Infinity;
    let x2 = 0;
    let y1 = Infinity;
    let y2 = 0;

    points.forEach((point) => {
      if (!point.shapeArgs) return;
      const { x, y, width, height } = point.shapeArgs;
      const rightmost = x + width;
      const bottommost = y + height;
      if (x < x1) x1 = x;
      if (rightmost > x2) x2 = rightmost;
      if (y < y1) y1 = y;
      if (bottommost > y2) y2 = bottommost;
    });

    boundingRectsByCategory.set(category, { x1, x2, y1, y2 });
  });

  return boundingRectsByCategory;
};
