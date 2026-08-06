/**
 * @import { Chart, Series, Point, SVGElement as HighchartsSVGElement } from "highcharts"
 */

/**
 * Connects a Highcharts point object with an SVG shape
 * without creating a strong reference to the point
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const POINT_INSET_RECTS = new WeakMap();

/**
 * @type {WeakMap<Series, HighchartsSVGElement>}
 */
const LEGEND_INSET_RECTS = new WeakMap();

const STROKE_WIDTH_SMALL = 1;
const STROKE_WIDTH_LARGE = 2;
const STROKE_WIDTH_BREAKPOINT_LARGE = 20;
const STROKE_COLOR = 'rgb(0 0 0 / 0.3)';

/**
 * @param {Series[]} series
 * @returns {number}
 */
const getStrokeWidth = (series) => {
  // Determine the smallest highlighted point rect
  const smallestSize = series.reduce((previousSeriesSize, series) => {
    const isSeriesBaseline = series.options.custom.isBaseline;
    const isSeriesHighlighted = series.options.custom.isHighlighted;
    const finalIsHighlighted = isSeriesBaseline || isSeriesHighlighted;

    if (!finalIsHighlighted) {
      return previousSeriesSize;
    }

    const seriesSize = series.points.reduce((previousPointSize, point) => {
      const { width, height } = point.shapeArgs;
      const size = Math.min(width, height);
      if (size !== 0 && size < previousPointSize) {
        return size;
      }
      return previousPointSize;
    }, Infinity);
    if (seriesSize < previousSeriesSize) {
      return seriesSize;
    }
    return previousSeriesSize;
  }, Infinity);

  // Derive the inset stroke width
  if (smallestSize > STROKE_WIDTH_BREAKPOINT_LARGE) {
    return STROKE_WIDTH_LARGE;
  }
  return STROKE_WIDTH_SMALL;
};

/**
 * Adds an inset border to the series' legend symbol,
 * just like the bar/column itself.
 *
 * @param {{
 * chart: Chart;
 * series: Series;
 * isHighlighted: boolean;
 * strokeWidth: number;
 * }} options
 * @returns {HighchartsSVGElement | undefined}
 */
const renderLegendInset = ({ chart, series, isHighlighted, strokeWidth }) => {
  let rect = LEGEND_INSET_RECTS.get(series);

  if (!isHighlighted) {
    if (rect) {
      LEGEND_INSET_RECTS.delete(series);
    }
    // Element will be removed from DOM automatically
    return;
  }

  if (!series.legendItem) return;
  const { symbol } = series.legendItem;

  const getSymbolAttr = (attrName) =>
    parseFloat(symbol.element.getAttribute(attrName));

  const attributes = {
    class: 'oecd-legendHighlightInset',
    x: getSymbolAttr('x') + strokeWidth / 2,
    y: getSymbolAttr('y') + strokeWidth / 2,
    width: getSymbolAttr('width') - strokeWidth,
    height: getSymbolAttr('height') - strokeWidth,
    'stroke-width': strokeWidth,
    stroke: STROKE_COLOR,
  };

  if (rect && rect.element) {
    rect.attr(attributes);
  } else {
    rect = chart.renderer
      .rect(attributes)
      .add(series.legendItem.group)
      .toFront();
    LEGEND_INSET_RECTS.set(series, rect);
  }

  return rect;
};

/**
 * @param {{
 * chart: Chart;
 * point: Point;
 * isHighlighted: boolean;
 * transform: string | null;
 * strokeWidth: number;
 * }} options
 * @returns {HighchartsSVGElement | undefined}
 */
const renderHighlightInset = ({
  chart,
  point,
  isHighlighted,
  transform,
  strokeWidth,
}) => {
  let rect = POINT_INSET_RECTS.get(point);

  if (!isHighlighted) {
    if (rect) {
      POINT_INSET_RECTS.delete(point);
    }
    // Element will be remove from DOM automatically
    return;
  }

  const { shapeArgs } = point;
  const width = shapeArgs.width - strokeWidth;
  const height = shapeArgs.height - strokeWidth;
  if (width <= 0 || height <= 0) return;
  const attributes = {
    class: 'oecd-highlightInset',
    x: shapeArgs.x + strokeWidth / 2,
    y: shapeArgs.y + strokeWidth / 2,
    width,
    height,
    transform: transform || '',
    strokeWidth: strokeWidth,
    stroke: STROKE_COLOR,
  };

  if (rect && rect.element) {
    rect.attr(attributes);
  } else {
    rect = chart.renderer
      .rect(attributes)
      // Append to the top-level <g> that holds all series <g>.
      // This element does not have a transform applied.
      .add(chart.seriesGroup)
      .toFront();

    POINT_INSET_RECTS.set(point, rect);
  }

  return rect;
};

/**
 * @param {Chart} chart
 * @returns {HighchartsSVGElement[]}
 */
export const renderHighlightInsets = (chart) => {
  const relevantSeries = chart.series.filter(
    ({ type, visible }) => visible && (type === 'bar' || type === 'column'),
  );

  const strokeWidth = getStrokeWidth(relevantSeries);

  return relevantSeries
    .map((series) => {
      /** @type {HighchartsSVGElement[]} */
      const seriesElements = [];

      const isSeriesBaseline = series.options.custom.isBaseline;
      const isSeriesHighlighted = series.options.custom.isHighlighted;
      const finalIsHighlighted = isSeriesBaseline || isSeriesHighlighted;

      const legendInset = renderLegendInset({
        chart,
        series,
        isHighlighted: finalIsHighlighted,
        strokeWidth,
      });
      if (legendInset) {
        seriesElements.push(legendInset);
      }

      // Get the transformations from the series <g>.
      // We cannot just append the element to the series <g> since it has a clip mask.
      const seriesTransform = series.group.element.getAttribute('transform');

      const pointInsets = series.points.map((point) => {
        return renderHighlightInset({
          chart,
          series,
          point,
          isHighlighted: finalIsHighlighted,
          transform: seriesTransform,
          strokeWidth,
        });
      });

      seriesElements.push(...pointInsets);

      return seriesElements;
    })
    .flat()
    .filter(Boolean);
};
