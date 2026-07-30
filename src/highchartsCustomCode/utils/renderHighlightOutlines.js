/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

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
 * @param {string[]} highlightColors
 * @returns {HighchartsSVGElement | undefined}
 */
const renderHighlightOutline = (
  chart,
  series,
  point,
  isHighlighted,
  highlightColors,
) => {
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

  // TODO: pick right color
  const highlightColor = highlightColors[0];

  if (!(outline && outline.element)) {
    outline = chart.renderer
      .rect()
      .attr({
        stroke: highlightColor,
        fill: 'none',
        class: 'oecd-highlightOutline',
      })
      .css({ pointerEvents: 'none' })
      // Add rect to the parent group which already has a transformation applied,
      // depending on the chart type (translate, rotate, flip)
      .add(graphic.parentGroup);

    outlineRects.set(point, outline);
  }

  const outlineWidth = getOutlineWidth(chart.plotWidth);
  const outlineGap = getOutlineGap(chart.plotWidth);
  const outlineDistance = outlineGap + outlineWidth / 2;

  outline = outline
    .attr({
      'stroke-width': outlineWidth,
      x: shapeArgs.x - outlineDistance,
      y: shapeArgs.y - outlineDistance,
      width: shapeArgs.width + 2 * outlineDistance,
      height:
        // Bar charts are column charts rotated by 90° and mirrored,
        // so x and y dimensions are flipped here, and y: 0 is on the right
        series.type === 'bar'
          ? chart.plotWidth + 2 * outlineDistance
          : chart.plotHeight + 2 * outlineDistance,
    })
    .toFront();

  return outline;
};

/**
 * Renders the highlight outlines around highlighted points.
 * Returns the active elements.
 *
 * @param {Chart} chart
 * @param {string[]} highlightColors
 * @returns {HighchartsSVGElement[]} Active elements
 */
export const renderHighlightOutlines = (chart, highlightColors) => {
  const categoryGroupIsHighlighted =
    chart.options.custom?.categoryGroupIsHighlighted;

  const relevantSeries = chart.series.filter(
    ({ visible, type }) => visible && (type === 'bar' || type === 'column'),
  );

  return relevantSeries
    .map((series) => {
      const seriesIsHighlighted = series.options.custom?.isHighlighted;

      return series.points.map((point) => {
        const categoryIsHighlighted = point.options.custom?.isHighlighted;
        const finalIsHighlighted =
          seriesIsHighlighted ||
          (categoryIsHighlighted && !categoryGroupIsHighlighted);

        return renderHighlightOutline(
          chart,
          series,
          point,
          finalIsHighlighted,
          highlightColors,
        );
      });
    })
    .flat()
    .filter(Boolean);
};
