// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { renderAxisMarkers } from './utils/renderAxisMarkers';
import { renderCategoryGroupOutline } from './utils/renderCategoryGroupOutline';
import { renderHighlightInsets } from './utils/renderHighlightInsets';
import { renderHighlightOutlines } from './utils/renderHighlightOutlines';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {{
 * chart: Chart & { oecd_highlightElements: Set<HighchartsSVGElement> };
 * }} options
 */
export const renderBarAndColumn = ({ chart }) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return;

  // Fill the plot area for debugging
  // chart.plotBackground.element.setAttribute('fill', 'rgb(0 255 255 / 0.1)');

  /** @type {boolean} */
  const isGrouped = customChartOptions.isGrouped;

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  // Render highlight shapes for all active series. Aggregate the shapes in a Set.
  elements.push(
    ...renderAxisMarkers({
      chart,
      // In grouped bar/column charts, the bars themselves are highlighted.
      // No need to draw an axis marker.
      showSeriesBaseline: !isGrouped,
      showSeriesHighlight: !isGrouped,
      showCategoryHighlight: true,
    }),
  );
  elements.push(...renderHighlightOutlines(chart));
  elements.push(...renderCategoryGroupOutline(chart));
  elements.push(...renderHighlightInsets(chart));

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
