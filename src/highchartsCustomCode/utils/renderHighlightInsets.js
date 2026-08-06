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

const STROKE_WIDTH = 2;
const STROKE_COLOR = 'rgb(0 0 0 / 0.3)';

/**
 * Adds an inset border to the series' legend symbol,
 * just like the bar/column itself.
 *
 * @param {{
 * chart: Chart;
 * series: Series;
 * isHighlighted: boolean;
 * }} options
 * @returns {HighchartsSVGElement | undefined}
 */
const renderLegendInset = ({ chart, series, isHighlighted }) => {
  let rect = LEGEND_INSET_RECTS.get(series);

  if (!isHighlighted) {
    if (rect) {
      LEGEND_INSET_RECTS.delete(series);
    }
    // Element will be removed from DOM automatically
    return;
  }

  const { symbol } = series.legendItem;

  const getSymbolAttr = (attrName) =>
    parseFloat(symbol.element.getAttribute(attrName));

  const attributes = {
    class: 'oecd-legendHighlightInset',
    x: getSymbolAttr('x') + STROKE_WIDTH / 2,
    y: getSymbolAttr('y') + STROKE_WIDTH / 2,
    width: getSymbolAttr('width') - STROKE_WIDTH,
    height: getSymbolAttr('height') - STROKE_WIDTH,
    'stroke-width': STROKE_WIDTH,
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
 * }} options
 * @returns {HighchartsSVGElement | undefined}
 */
const renderHighlightInset = ({ chart, point, isHighlighted, transform }) => {
  let rect = POINT_INSET_RECTS.get(point);

  if (!isHighlighted) {
    if (rect) {
      POINT_INSET_RECTS.delete(point);
    }
    // Element will be remove from DOM automatically
    return;
  }

  const { shapeArgs } = point;
  const width = shapeArgs.width - STROKE_WIDTH;
  const height = shapeArgs.height - STROKE_WIDTH;
  if (width <= 0 || height <= 0) return;
  const attributes = {
    class: 'oecd-highlightInset',
    x: shapeArgs.x + STROKE_WIDTH / 2,
    y: shapeArgs.y + STROKE_WIDTH / 2,
    width,
    height,
    transform: transform || '',
    strokeWidth: STROKE_WIDTH,
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
  return chart.series
    .filter(
      ({ type, visible }) => visible && (type === 'bar' || type === 'column'),
    )
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
        });
      });

      seriesElements.push(...pointInsets);

      return seriesElements;
    })
    .flat()
    .filter(Boolean);
};
