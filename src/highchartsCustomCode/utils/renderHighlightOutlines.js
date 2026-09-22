// @ts-check
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { TinyColor } from '@ctrl/tinycolor';
import { baselineColor } from '../../constants/chart';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

/**
 * Connects a Highcharts Point with a Highcharts SVG element
 * without creating a strong reference to the point.
 * Cache for reusing elements across chart renderings.
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const OUTLINE_RECTS = new WeakMap();

/**
 * Renders an outline rect around the bars/columns of highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {Point} point
 * @returns {HighchartsSVGElement | undefined}
 */
const renderHighlightOutline = (chart, series, point) => {
  const customPointOptions = point.options.custom;
  if (!customPointOptions) return;
  /** @type {boolean} */
  const isHighlighted = customPointOptions.isHighlighted;
  /** @type {boolean} */
  const isBaseline = customPointOptions.isBaseline;
  const isBaselineOrHighlighted = isBaseline || isHighlighted;

  let outline = OUTLINE_RECTS.get(point);

  if (!isBaselineOrHighlighted) {
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

  const stroke = isBaseline
    ? baselineColor
    : customPointOptions.highlightOutlineColor;
  const fill = isBaseline ? baselineColor : customPointOptions.highlightColor;
  const fillWithOpacity = new TinyColor(fill)
    .setAlpha(isBaseline ? 0.2 : 0.3)
    .toRgbString();

  // Get the transformations from the series <g>.
  // We cannot just append the element to the series <g> since it has a clip mask.
  const seriesTransform = series.group.element.getAttribute('transform');

  if (!(outline && outline.element)) {
    outline = chart.renderer
      .rect({ class: 'oecd-highlightOutline' })
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
    stroke,
    'stroke-width': outlineWidth,
    fill: fillWithOpacity,
    x: shapeArgs.x - outlineDistance,
    y: shapeArgs.y - outlineDistance,
    width: shapeArgs.width + 2 * outlineDistance,
    height: shapeArgs.height + 2 * outlineDistance,
    transform: seriesTransform,
  });

  return outline;
};

/**
 * Renders outlines around highlighted bars/columns.
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
      series.points.map((point) =>
        renderHighlightOutline(chart, series, point),
      ),
    )
    .flat()
    .filter((element) => element !== undefined);
};
