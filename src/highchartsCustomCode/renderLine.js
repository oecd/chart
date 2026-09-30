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
 * }} options
 */
export const renderLine = ({ chart }) => {
  const customChartOptions = chart.options.custom;
  if (!customChartOptions) return;

  console.log('chart', chart);
  console.log('chart.chartWidth', chart.chartWidth);
  console.log('chart.plotWidth', chart.plotWidth);

  const plotBandLabels = chart.container.querySelectorAll(
    '.highcharts-plot-band-label',
  );
  plotBandLabels.forEach((label) => {
    const { left, width } = label.style;
    if (typeof left === 'string' && left.slice(-2) === 'px') {
      const leftPx = parseFloat(left);
      console.log('leftPx', leftPx);
    }
    console.log('label.style.left', label.style.left);
    console.log('label.style.width', label.style.width);
  });

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = renderSplineMarkers({ chart });

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
