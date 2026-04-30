import * as R from 'ramda';

/**
 * @import { Chart, Point, PointOptionsObject, Series, SVGElement } from "highcharts"
 */

const HIGHLIGHT_PADDING = 0;
const HIGHLIGHT_BACKGROUND_FILL = 'rgb(255 0 0 / 0.1)';
const HIGHLIGHT_MARKER_SIZE = 5;
const HIGHLIGHT_MARKER_FILL = 'rgb(255 0 0 / 0.5)';

/**
 * Returns the padding numbers from the point shape size.
 *
 * @example
 * getPadding(point.shapeArgs.width)
 *
 * @param {number} pointWidth
 */
const getPadding = (pointWidth) => Math.max(pointWidth * 0.1, 0.5);

/**
 * Renders a background rect around highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {boolean} isHighlighted
 * @param {Point} point
 * @returns {SVGElement | undefined}
 */
const renderHighlightBackground = (chart, series, isHighlighted, point) => {
  /** @type {SVGElement | undefined} */
  let highlightBackground = point.highlightBackground;

  if (!isHighlighted) {
    if (highlightBackground) {
      highlightBackground.destroy();
      point.highlightBackground = undefined;
    }
    return;
  }

  if (!(point.graphic && point.shapeArgs)) {
    // eslint-disable-next-line no-undef
    console.error('point.graphic not found');
    return;
  }

  if (!highlightBackground) {
    highlightBackground = chart.renderer
      .rect()
      .attr({
        y: 0,
        fill: HIGHLIGHT_BACKGROUND_FILL,
      })
      .css({ pointerEvents: 'none' })
      // Add rect to the parent group which already has a transformation applied, depending on the chart type (translate, rotate, flip)
      .add(point.graphic.parentGroup);

    point.highlightBackground = highlightBackground;
  }

  const padding = getPadding(point.shapeArgs.width);
  console.log('padding', padding);

  highlightBackground = highlightBackground.attr({
    x: point.shapeArgs.x - padding,
    width: point.shapeArgs.width + 2 * padding,
    // Bar charts actually are column charts rotated by 90°,
    // so the vertical dimension is the horizontal dimension in this case
    height: series.type === 'bar' ? chart.plotWidth : chart.plotHeight,
    zIndex: -1,
  });

  return highlightBackground;
};

/**
 * Renders a marker at the axis for highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {boolean} isHighlighted
 * @param {Point} point
 */
const renderAxisMarker = (chart, series, isHighlighted, point) => {
  /** @type {SVGElement | undefined} */
  let axisMarker = point.highlightAxisMarker;

  if (!isHighlighted) {
    if (axisMarker) {
      axisMarker.destroy();
      point.highlightAxisMarker = undefined;
    }
    return;
  }

  if (!(point.graphic && point.shapeArgs)) {
    // eslint-disable-next-line no-undef
    console.error('point.graphic not found');
    return;
  }

  if (!axisMarker) {
    axisMarker = chart.renderer
      .rect({
        x: 0,
        y: 0,
        width: HIGHLIGHT_MARKER_SIZE,
        height: HIGHLIGHT_MARKER_SIZE,
        fill: HIGHLIGHT_MARKER_FILL,
      })
      .css({ pointerEvents: 'none' })
      // We cannot add the rect to the point's parent <g> since it has
      // a clip mask. The marker is positioned outside of the plot area.
      // The clip mask would cut it off.
      .add(chart.axisMarkerGroup);

    point.highlightAxisMarker = axisMarker;
  }

  const padding = getPadding(point.shapeArgs.width);

  axisMarker.attr(
    series.type === 'bar'
      ? {
          x: point.shapeArgs.x,
          y: chart.plotHeight - HIGHLIGHT_MARKER_SIZE,
          width: point.shapeArgs.width,
          height: HIGHLIGHT_MARKER_SIZE,
          fill: HIGHLIGHT_MARKER_FILL,
        }
      : // Column chart
        {
          x: point.shapeArgs.x - padding,
          y: chart.plotHeight + padding,
          width: point.shapeArgs.width + 2 * padding,
          height: HIGHLIGHT_MARKER_SIZE,
          fill: HIGHLIGHT_MARKER_FILL,
        },
  );

  return axisMarker;
};

/**
 * @param {Chart} chart
 * @param {Series} series
 * @returns {SVGElement[]} activeShapes
 */
const renderSeriesHighlight = (chart, series) => {
  const seriesIsHighlighted = series.options.custom?.isHighlighted;

  const { renderer } = chart;
  const { points } = series;

  // Create container group for axis makers
  if (!chart.axisMarkerGroup) {
    chart.axisMarkerGroup = renderer
      .g()
      .attr({ class: 'oecd-axisMarkerGroup' })
      .add();
  }

  // The series <g> has a transformation applied. We need to apply the same to the axis marker <g>.
  // In a column chart, the transformation moves it to the plot area.
  // In a bar chart, which is a column chart underneath, the transformation moves, rotates and flips it.
  const seriesTransform = series.group.element.getAttribute('transform');
  chart.axisMarkerGroup.attr({ transform: seriesTransform });

  /** @type {SVGElement[]} */
  const activeShapes = [];

  points.forEach((point) => {
    const isHighlighted =
      seriesIsHighlighted || point.options.custom?.isHighlighted;

    // Highlight background
    const highlightBackground = renderHighlightBackground(
      chart,
      series,
      isHighlighted,
      point,
    );
    if (highlightBackground) {
      activeShapes.push(highlightBackground);
    }

    // Axis marker
    const axisMarker = renderAxisMarker(chart, series, isHighlighted, point);
    if (axisMarker) {
      activeShapes.push(axisMarker);
    }
  });

  return activeShapes;
};

/**
 * Event handler called after load (initial render) and redraw (subsequent render)
 *
 * @param {Chart} chart
 */
export const barAndColumnChartRenderHandler = (chart) => {
  chart.highlightShapes ||= new Set();

  // Fill the plot area for debugging
  // chart.plotBackground.element.setAttribute('fill', 'rgb(0 255 0 / 0.05)');

  const allSeries = chart.series;

  if (allSeries.length === 0 && chart.highlightShapes) {
    for (const obsoleteRect of chart.highlightShapes) {
      obsoleteRect.destroy();
    }
    chart.highlightShapes.clear();
  }

  const reduceShapes = R.reduce((allShapes, shapes) => {
    R.forEach((shape) => {
      allShapes.add(shape);
    }, shapes);
    return allShapes;
  }, /** @type {Set<SVGElement>} */ (new Set()));

  const activeShapes = R.compose(
    reduceShapes,
    R.map((series) => renderSeriesHighlight(chart, series)),
    R.filter(R.prop('visible')),
  )(chart.series);

  // Clean up old shapes
  const obsoleteShapes = chart.highlightShapes.difference(activeShapes);
  for (const obsoleteShape of obsoleteShapes) {
    obsoleteShape.destroy();
  }

  chart.highlightShapes.clear();
  chart.highlightShapes = activeShapes;
};
