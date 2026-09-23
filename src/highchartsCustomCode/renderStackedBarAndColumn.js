// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */
import * as R from 'ramda';
import { renderAxisMarkers } from './utils/renderAxisMarkers';
import { renderCategoryGroupOutline } from './utils/renderCategoryGroupOutline';
import { renderHighlightInsets } from './utils/renderHighlightInsets';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {{
 * chart: Chart & { oecd_highlightElements: HighchartsSVGElement[] };
 * }} options
 */
export const renderStackedBarAndColumn = ({ chart }) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return;

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  elements.push(...renderCategoryGroupOutline(chart));
  elements.push(
    ...renderAxisMarkers({
      chart,
      showSeriesBaseline: false,
      showSeriesHighlight: false,
      showCategoryHighlight: true,
    }),
  );
  elements.push(...renderHighlightInsets(chart));

  if (chart.oecd_highlightElements) {
    // Clean up old shapes
    // Use R.difference since Set.prototype.difference is not well supported yet
    const obsoleteElements = R.difference(
      chart.oecd_highlightElements,
      elements,
    );
    R.map((obsoleteElement) => obsoleteElement.destroy(), obsoleteElements);
  }

  // Save new shapes
  chart.oecd_highlightElements = elements;
};

export default renderStackedBarAndColumn;
