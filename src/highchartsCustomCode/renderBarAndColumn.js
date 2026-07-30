/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { renderAxisMarkers } from '../utils/renderAxisMarker';
import { highlightCategoryGroups } from './utils/highlightCategoryGroups';
import { renderHighlightOutlines } from './utils/renderHighlightOutlines';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {{
 *   chart: Chart;
 *   cbType: string;
 *   highlightColors: string[];
 *   smallerHighlightColors: string[];
 * }} options
 */
export const renderBarAndColumn = (options) => {
  const { chart, highlightColors, smallerHighlightColors } = options;

  // Fill the plot area for debugging
  // chart.plotBackground.element.setAttribute('fill', 'rgb(0 255 255 / 0.1)');

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  // TODO: Pass smallerHighlightColors

  // Render highlight shapes for all active series. Aggregate the shapes in a Set.
  elements.push(...renderAxisMarkers(chart, highlightColors, true, true));
  elements.push(...renderHighlightOutlines(chart, highlightColors));
  elements.push(...highlightCategoryGroups(chart, highlightColors));

  const elementSet = new Set(elements);

  if (chart.oecd_highlightElements) {
    // Clean up old shapes
    /** @type {Set<HighchartsSVGElement>} */
    const obsoleteElements =
      chart.oecd_highlightElements.difference(elementSet);
    for (const obsoleteElement of obsoleteElements) {
      obsoleteElement.destroy();
    }
  }

  // Save new shapes
  chart.oecd_highlightElements = elementSet;
};
