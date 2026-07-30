/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { getBoundingRectsByCategory } from './getBoundingRectsByCategory';
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

  const relevantSeries = chart.series.filter(
    ({ visible, type }) => visible && (type === 'bar' || type === 'column'),
  );
  const firstSeries = relevantSeries[0];
  if (!firstSeries) {
    return elements;
  }
  const firstType = firstSeries.type;

  const boundingRects = getBoundingRectsByCategory(
    relevantSeries,
    highlightedCategories,
  );

  /**
   * Element cache for reuse across chart renderings
   * @type {Map<string, HighchartsSVGElement>}
   */
  let rectByCategory = chart.oecd_highlightCategoryGroupElements;
  if (!rectByCategory) {
    rectByCategory = new Map();
    chart.oecd_highlightCategoryGroupElements = rectByCategory;
  }

  // Draw a rectangle around the bounding box of all points of a category
  boundingRects.forEach(({ x1, x2 }, category) => {
    const outlineWidth = getOutlineWidth(chart.plotWidth);
    const outlineGap = getOutlineGap(chart.plotWidth);
    const outlineDistance = outlineGap + outlineWidth / 2;

    let rect = rectByCategory.get(category);
    if (!(rect && rect.element)) {
      rect = chart.renderer
        .rect({ class: 'oecd-highlightCategoryGroup' })
        .css({ pointerEvents: 'none' })
        // Add rect to a series group which already has a transformation applied,
        // depending on the chart type (translate, rotate, flip)
        .add(firstSeries.group);
      rectByCategory.set(category, rect);
    }
    rect.attr({
      strokeWidth: outlineWidth,
      // TODO: Pick the right color
      stroke: highlightColors[0],
      x: x1 - outlineDistance,
      y: 0,
      width: x2 - x1 + 2 * outlineDistance,
      height: firstType === 'column' ? chart.plotHeight : chart.plotWidth,
    });

    elements.push(rect);
  });

  return elements;
};
