// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */
import * as R from 'ramda';
import { renderSplineMarkers } from './utils/renderSplineMarkers';

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {{
 * chart: Chart & { oecd_highlightElements: HighchartsSVGElement[] };
 * disableAnimation: boolean;
 * }} options
 */
export const renderLine = ({ chart, disableAnimation }) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return;

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = renderSplineMarkers({ chart, disableAnimation });

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
