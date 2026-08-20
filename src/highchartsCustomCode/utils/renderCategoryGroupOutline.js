// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { baselineColor } from '../../constants/chart';
import {
  getBoundingRectsByCategory,
  groupPointsByCategory,
} from './getBoundingRectsByCategory';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

/**
 * Connects a Chart with a Map with categories and Highcharts elements
 * without creating a strong reference.
 * Cache for reusing elements across chart renderings.
 *
 * @type {WeakMap<Chart, Map<string, HighchartsSVGElement>>}
 */
const RECTS_BY_CATEGORY_BY_CHART = new WeakMap();

/**
 * Draws a rect around the shapes of highlighted or baseline categories.
 * Returns an array of created SVG elements.
 *
 * Expects several custom options to be set on the chart, like
 * `isCategoryGroupHighlighted`.`
 *
 * @param {Chart} chart
 *
 * @returns {HighchartsSVGElement[]}
 */
export const renderCategoryGroupOutline = (chart) => {
  const customChartOptions = chart.options.custom;

  /** @type {boolean} */
  const isCategoryGroupHighlighted =
    customChartOptions.isCategoryGroupHighlighted;
  if (!isCategoryGroupHighlighted) {
    return NO_ELEMENTS;
  }

  /** @type {string[]} */
  const baselineCodes = customChartOptions.baselineCodes;
  /** @type {string[]} */
  const highlightCodes = customChartOptions.highlightCodes;
  /** @type {string[]} */
  const highlightCategoryCodes = customChartOptions.highlightCategoryCodes;
  /** @type {string[]} */
  const highlightColors = customChartOptions.highlightColors;

  const relevantSeries = chart.series.filter(
    ({ visible, type }) => visible && (type === 'bar' || type === 'column'),
  );
  const firstSeries = relevantSeries[0];
  if (!firstSeries) return NO_ELEMENTS;
  const firstType = firstSeries.type;

  const pointsByCategory = groupPointsByCategory(
    relevantSeries,
    baselineCodes.concat(highlightCategoryCodes),
  );
  const boundingRects = getBoundingRectsByCategory(pointsByCategory);

  let rectByCategory = RECTS_BY_CATEGORY_BY_CHART.get(chart);
  if (!rectByCategory) {
    rectByCategory = new Map();
    RECTS_BY_CATEGORY_BY_CHART.set(chart, rectByCategory);
  }

  // Get the transformations from the series <g>.
  // We cannot just append the element to the series <g> since it has a clip mask.
  const seriesTransform = firstSeries.group.element.getAttribute('transform');

  /** @type {HighchartsSVGElement[]} */
  const elements = [];

  // Draw a rectangle around the bounding box of all points of a category
  boundingRects.forEach(({ x1, x2 }, category) => {
    let rect = rectByCategory.get(category);
    if (!(rect && rect.element)) {
      rect = chart.renderer
        .rect({ class: 'oecd-highlightCategoryGroup' })
        .css({ pointerEvents: 'none' })
        // Append to the top-level <g> that holds all series <g>.
        // This element does not have a transform applied.
        .add(chart.seriesGroup)
        .toFront();
      rectByCategory.set(category, rect);
    }

    const outlineWidth = getOutlineWidth(chart.plotWidth);
    const outlineGap = getOutlineGap(chart.plotWidth);
    const outlineDistance = outlineGap + outlineWidth / 2;

    const isBaseline = baselineCodes.includes(category);
    const highlightIndex = highlightCodes.indexOf(category);
    const color = isBaseline ? baselineColor : highlightColors[highlightIndex];

    rect.attr({
      strokeWidth: outlineWidth,
      stroke: color,
      x: x1 - outlineDistance,
      y: 0,
      width: x2 - x1 + 2 * outlineDistance,
      height: firstType === 'column' ? chart.plotHeight : chart.plotWidth,
      transform: seriesTransform,
    });

    elements.push(rect);
  });

  return elements;
};
