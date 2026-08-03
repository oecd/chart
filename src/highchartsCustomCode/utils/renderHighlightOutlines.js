/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { baselineColor } from '../../constants/chart';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';

/**
 * Connects a Highcharts point object with an SVG shape
 * without creating a strong reference to the point
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const outlineRects = new WeakMap();

/**
 * Renders an outline rect around the bars/columns of highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {boolean} isHighlighted
 * @param {Point} point
 * @returns {HighchartsSVGElement | undefined}
 */
const renderHighlightOutline = (chart, series, point, isHighlighted) => {
  let outline = outlineRects.get(point);

  if (!isHighlighted) {
    if (outline) {
      outlineRects.delete(point);
    }
    // The potential existing outline will be destroyed automatically
    return;
  }

  const { graphic, shapeArgs } = point;
  if (!(graphic && shapeArgs)) {
    console.error('renderHighlightOutline: point.graphic not found');
    return;
  }

  /** @type {boolean} */
  const isBaseline = point.options.custom.isBaseline;
  /** @type {number} */
  const highlightIndex = point.custom.highlightIndex;
  /** @type {string[]} */
  const highlightColors = chart.options.custom.highlightColors;
  const highlightColor = highlightColors[highlightIndex];
  const color = isBaseline ? baselineColor : highlightColor;

  // Get the transformations from the series <g>.
  // We cannot just append the element to the series <g> since it has a clip mask.
  const seriesTransform = series.group.element.getAttribute('transform');

  if (!(outline && outline.element)) {
    outline = chart.renderer
      .rect()
      .attr({
        fill: 'none',
        class: 'oecd-highlightOutline',
      })
      .css({ pointerEvents: 'none' })
      // Append to the top-level <g> that holds all series <g>.
      // This element does not have a transform applied.
      .add(chart.seriesGroup);

    outlineRects.set(point, outline);
  }

  const outlineWidth = getOutlineWidth(chart.plotWidth);
  const outlineGap = getOutlineGap(chart.plotWidth);
  const outlineDistance = outlineGap + outlineWidth / 2;

  outline = outline.attr({
    stroke: color,
    'stroke-width': outlineWidth,
    x: shapeArgs.x - outlineDistance,
    y: shapeArgs.y - outlineDistance,
    width: shapeArgs.width + 2 * outlineDistance,
    height: shapeArgs.height + 2 * outlineDistance,
    transform: seriesTransform,
  });

  return outline;
};

/**
 * Renders the highlight outlines around highlighted points.
 * Returns the active elements.
 *
 * @param {Chart} chart
 * @returns {HighchartsSVGElement[]} Active elements
 */
export const renderHighlightOutlines = (chart) => {
  const categoryGroupIsHighlighted =
    chart.options.custom.categoryGroupIsHighlighted;

  const relevantSeries = chart.series.filter(
    ({ visible, type }) => visible && (type === 'bar' || type === 'column'),
  );

  return relevantSeries
    .map((series) =>
      series.points.map((point) => {
        const isHighlighted = point.options.custom.isHighlighted;
        const isBaseline = point.options.custom.isBaseline;
        const finalIsHighlighted =
          (isBaseline || isHighlighted) && !categoryGroupIsHighlighted;

        return renderHighlightOutline(chart, series, point, finalIsHighlighted);
      }),
    )
    .flat()
    .filter(Boolean);
};
