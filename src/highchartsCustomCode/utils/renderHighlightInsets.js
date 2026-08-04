/**
 * @import { Chart, Point, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { NO_ELEMENTS } from './noElements';

/**
 * Connects a Highcharts point object with an SVG shape
 * without creating a strong reference to the point
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const INSET_RECTS = new WeakMap();

const STROKE_WIDTH = 2;
const STROKE_COLOR = 'rgb(0 0 0 / 0.3)';

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
  if (!isHighlighted) {
    INSET_RECTS.delete(point);
    // Element will be remove from DOM automatically
    return;
  }

  let rect = INSET_RECTS.get(point);

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

  if (!rect) {
    rect = chart.renderer
      .rect(attributes)
      // Append to the top-level <g> that holds all series <g>.
      // This element does not have a transform applied.
      .add(chart.seriesGroup)
      .toFront();

    INSET_RECTS.set(point, rect);
  } else {
    rect.attr(attributes);
  }

  return rect;
};

/**
 * @param {Chart} chart
 * @returns {HighchartsSVGElement[]}
 */
export const renderHighlightInsets = (chart) => {
  console.log(
    'renderHighlightInsets ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',
  );
  const isCategoryGroupHighlighted =
    chart.options.custom.isCategoryGroupHighlighted;

  if (isCategoryGroupHighlighted) {
    return NO_ELEMENTS;
  }

  return chart.series
    .filter(
      ({ type, visible }) => visible && (type === 'bar' || type === 'column'),
    )
    .map((series) => {
      // Get the transformations from the series <g>.
      // We cannot just append the element to the series <g> since it has a clip mask.
      const seriesTransform = series.group.element.getAttribute('transform');

      series.points.map((point) => {
        const isHighlighted = point.options.custom.isHighlighted;
        const isBaseline = point.options.custom.isBaseline;

        const finalIsHighlighted = isBaseline || isHighlighted;

        return renderHighlightInset({
          chart,
          series,
          point,
          isHighlighted: finalIsHighlighted,
          transform: seriesTransform,
        });
      });
    })
    .flat()
    .filter(Boolean);
};
