import { getOutlineGap, getOutlineWidth } from './highlightOutline';

/**
 * Draws a rect around all shapes of highlighted categories.
 * Returns an array of created SVG elements.
 *
 * The chart options need
 * ```
 * custom: {
 *   highlightedCategories: { code: string }[] },
 *   categoryGroupIsHighlighted: true
 * }
 * ```
 * for this function to become active.
 *
 * @param {Chart} chart
 * @param {string[]} highlightColors
 * @returns {HighchartsSVGElement[]}
 */
export const highlightCategoryGroups = (chart, highlightColors) => {
  /** @type {HighchartsSVGElement[]} */
  const elements = [];

  const highlightedCategories = chart.options.custom?.highlightedCategories;

  const categoryGroupIsHighlighted =
    chart.options.custom?.categoryGroupIsHighlighted;

  if (!(highlightedCategories && categoryGroupIsHighlighted)) {
    return elements;
  }

  const highlightedCategoryCodes = highlightedCategories.map((c) => c.code);

  // Gather point coordinates and group them by category

  /** @typedef {{ x: number, y: number, width: number, height: number }} PointRect */
  /** @type {Map<string, PointRect[]>} */
  const pointRectsByCategory = new Map();

  chart.series.forEach((series) => {
    const {
      group: { translateX, translateY },
    } = series;

    series.points.forEach((point) => {
      const { name } = point;
      if (!highlightedCategoryCodes.includes(name)) return;
      let pointRects = pointRectsByCategory.get(name);
      if (!pointRects) {
        pointRects = [];
        pointRectsByCategory.set(name, pointRects);
      }
      const rect = {
        x: point.shapeArgs.x + translateX,
        y: point.shapeArgs.y + translateY,
        width: point.shapeArgs.width,
        height: point.shapeArgs.height,
      };
      pointRects.push(rect);
    });
  });

  // Draws a rectangle around the bounding box of all shapes
  pointRectsByCategory.forEach((pointCoords) => {
    // Determine bounding box
    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;

    pointCoords.forEach(({ x, y, width, height }) => {
      const rightmost = x + width;
      const bottommost = y + height;
      if (x < minX) minX = x;
      if (rightmost > maxX) maxX = rightmost;
      if (y < minY) minY = y;
      if (bottommost > maxY) maxY = bottommost;
    });

    const outlineWidth = getOutlineWidth(chart.plotWidth);
    const outlineGap = getOutlineGap(chart.plotWidth);
    const outlineDistance = outlineGap + outlineWidth / 2;

    const floor = chart.plotWidth >= 500 ? Math.floor : R.identity;
    const ceil = chart.plotWidth >= 500 ? Math.ceil : R.identity;

    const rect = chart.renderer
      .rect()
      .attr({
        strokeWidth: outlineWidth,
        stroke: highlightColors[0],
        x: floor(minX - outlineDistance),
        width: ceil(maxX - minX + 2 * outlineDistance),
        y: floor(chart.plotTop + 2 * outlineDistance),
        height: ceil(chart.plotHeight - 2 * outlineDistance),
      })
      .css({ pointerEvents: 'none' })
      .add();

    elements.push(rect);
  });

  return elements;
};
