// @ts-check
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { baselineColor } from '../../constants/chart';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

/**
 * Connects a Highcharts point object with an SVG shape
 * without creating a strong reference to the point
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const OUTLINE_RECTS = new WeakMap();

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
  let outline = OUTLINE_RECTS.get(point);

  if (!isHighlighted) {
    if (outline) {
      OUTLINE_RECTS.delete(point);
    }
    // The potential existing outline will be destroyed automatically
    return;
  }

  const { graphic, shapeArgs } = point;
  if (!(graphic && shapeArgs)) {
    console.error('renderHighlightOutline: point.graphic not found');
    return;
  }

  const customPointOptions = point.options.custom;
  if (!customPointOptions) return;
  /** @type {boolean} */
  const isBaseline = customPointOptions.isBaseline;
  /** @type {string} */
  const highlightColor = customPointOptions.highlightColor;
  const color = isBaseline ? baselineColor : highlightColor;

  // Get the transformations from the series <g>.
  // We cannot just append the element to the series <g> since it has a clip mask.
  const seriesTransform = series.group.element.getAttribute('transform');

  if (!(outline && outline.element)) {
    outline = chart.renderer
      .rect({
        fill: 'none',
        class: 'oecd-highlightOutline',
      })
      .css({ pointerEvents: 'none' })
      // Append to the top-level <g> that holds all series <g>.
      // This element does not have a transform applied.
      .add(chart.seriesGroup);

    OUTLINE_RECTS.set(point, outline);
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
  const isCategoryGroupHighlighted =
    chart.options.custom.isCategoryGroupHighlighted;
  // The whole category group is outline, not individual rectangles.
  if (isCategoryGroupHighlighted) return NO_ELEMENTS;

  const relevantSeries = chart.series.filter(
    ({ visible, type }) => visible && (type === 'bar' || type === 'column'),
  );

  const isGroupedChart =
    relevantSeries.length > 1 && relevantSeries[0].data.length > 1;
  // The rectangles will get an inset instead.
  if (isGroupedChart) return NO_ELEMENTS;

  return relevantSeries
    .map((series) =>
      series.points.map((point) => {
        const pointCustomOptions = point.options.custom;
        if (!pointCustomOptions) {
          throw new Error('point.options.custom not defined');
        }
        const isHighlighted = pointCustomOptions.isHighlighted;
        const isBaseline = pointCustomOptions.isBaseline;
        const finalIsHighlighted = isBaseline || isHighlighted;
        return renderHighlightOutline(chart, series, point, finalIsHighlighted);
      }),
    )
    .flat()
    .filter((element) => element !== undefined);
};
