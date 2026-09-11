// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { renderAxisMarkers } from './utils/renderAxisMarkers';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {{
 * chart: Chart & { oecd_highlightElements: Set<HighchartsSVGElement> };
 * }} options
 */
export const renderLine = ({ chart }) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return;

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  // Render highlight shapes for all active series. Aggregate the shapes in a Set.
  elements.push(
    ...renderAxisMarkers({
      chart,
      showSeriesBaseline: false,
      showSeriesHighlight: true,
      showCategoryHighlight: true,
    }),
  );

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
