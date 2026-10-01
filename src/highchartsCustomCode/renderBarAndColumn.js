// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */
import * as R from 'ramda';
import { renderAxisMarkers } from './utils/renderAxisMarkers';
import { renderCategoryGroupOutline } from './utils/renderCategoryGroupOutline';
import { renderHighlightInsets } from './utils/renderHighlightInsets';
import { renderHighlightOutlines } from './utils/renderHighlightOutlines';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {{
 * chart: Chart & { oecd_highlightElements: HighchartsSVGElement[] };
 * }} options
 */
export const renderBarAndColumn = ({ chart }) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return;

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  // Render highlight shapes for all active series. Aggregate the shapes in a Set.
  elements.push(...renderAxisMarkers(chart));
  elements.push(...renderHighlightOutlines(chart));
  elements.push(...renderCategoryGroupOutline(chart));
  elements.push(...renderHighlightInsets(chart));

  if (chart.oecd_highlightElements) {
    // Clean up old shapes
    const obsoleteElements = R.difference(
      chart.oecd_highlightElements,
      elements,
    );
    R.map((obsoleteElement) => obsoleteElement.destroy(), obsoleteElements);
  }

  // Save new shapes
  chart.oecd_highlightElements = elements;
};
