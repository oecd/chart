/* eslint-disable no-console */
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { highlightCategoryGroups } from './highlightCategoryGroups';
import { renderAxisMarkers } from './renderAxisMarker';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {Chart} chart
 * @params {string[]} highlightColors
 */
export const stackedChartRenderHandler = (chart, highlightColors) => {
  // Fill the plot area for debugging
  chart.plotBackground.element.setAttribute('fill', 'rgb(0 255 0 / 0.1)');

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  elements.push(...highlightCategoryGroups(chart, highlightColors));
  elements.push(...renderAxisMarkers(chart, highlightColors, false, true));

  const elementSet = new Set(elements);

  if (chart.oecd_highlightElements) {
    // Clean up old shapes
    const obsoleteElements =
      chart.oecd_highlightElements.difference(elementSet);
    for (const obsoleteElement of obsoleteElements) {
      obsoleteElement.destroy();
    }
  }

  // Save new shapes
  chart.oecd_highlightElements = elementSet;
};
