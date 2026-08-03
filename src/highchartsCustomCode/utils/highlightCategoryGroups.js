// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */

/** @type {never[]} */
const NO_ELEMENTS = [];
Object.freeze(NO_ELEMENTS);

import { baselineColor } from '../../constants/chart';
import {
  getBoundingRectsByCategory,
  groupPointsByCategory,
} from './getBoundingRectsByCategory';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';

/**
 * Draws a rect around the shapes of highlighted or baseline categories.
 * Returns an array of created SVG elements.
 *
 * Expects several custom options to be set on the chart, like
 * `categoryGroupIsHighlighted`.`
 *
 * @param {Chart} chart
 *
 * @returns {HighchartsSVGElement[]}
 */
export const highlightCategoryGroups = (chart) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return NO_ELEMENTS;

  /** @type {string[]} */
  const highlightedCategoryCodes = customChartOptions.highlightedCategoryCodes;
  /** @type {boolean} */
  const categoryGroupIsHighlighted =
    customChartOptions.categoryGroupIsHighlighted;
  if (!(highlightedCategoryCodes && categoryGroupIsHighlighted)) {
    return NO_ELEMENTS;
  }

  /** @type {string[]} */
  const baselineCodes = customChartOptions.baselineCodes;
  /** @type {string[]} */
  const highlightedCodes = customChartOptions.highlightedCodes;
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
    baselineCodes.concat(highlightedCategoryCodes),
  );
  const boundingRects = getBoundingRectsByCategory(pointsByCategory);

  /**
   * Element cache for reuse across chart renderings
   * @type {Map<string, HighchartsSVGElement>}
   */
  let rectByCategory = chart.oecd_highlightCategoryGroupElements;
  if (!rectByCategory) {
    rectByCategory = new Map();
    chart.oecd_highlightCategoryGroupElements = rectByCategory;
  }

  /** @type {HighchartsSVGElement[]} */
  const elements = [];

  // Draw a rectangle around the bounding box of all points of a category
  boundingRects.forEach(({ x1, x2 }, category) => {
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

    const outlineWidth = getOutlineWidth(chart.plotWidth);
    const outlineGap = getOutlineGap(chart.plotWidth);
    const outlineDistance = outlineGap + outlineWidth / 2;

    const isBaseline = baselineCodes.includes(category);
    const highlightIndex = highlightedCodes.indexOf(category);
    const color = isBaseline ? baselineColor : highlightColors[highlightIndex];

    rect.attr({
      strokeWidth: outlineWidth,

      stroke: color,
      x: x1 - outlineDistance,
      y: 0,
      width: x2 - x1 + 2 * outlineDistance,
      height: firstType === 'column' ? chart.plotHeight : chart.plotWidth,
    });

    elements.push(rect);
  });

  return elements;
};
