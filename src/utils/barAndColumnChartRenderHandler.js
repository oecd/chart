/* global console */
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { highlightCategoryGroups } from './highlightCategoryGroups';
import { getOutlineWidth } from './highlightOutline';
import { renderAxisMarkers } from './renderAxisMarker';

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
      outline.destroy();
      outlineRects.delete(point);
    }
    return;
  }

  const { graphic, shapeArgs } = point;
  if (!(graphic && shapeArgs)) {
    console.error('renderHighlightOutline: point.graphic not found');
    return;
  }

  // const highlightColor = new TinyColor(highlightColors[0])
  //   .setAlpha(0.1)
  //   .toRgbString();
  const highlightColor = highlightColors[0];

  const outlineWidth = getOutlineWidth(chart.plotWidth);
  const outlineDistance = outlineWidth + outlineWidth / 2;

  if (!outline) {
    outline = chart.renderer
      .rect()
      .attr({
        'stroke-width': outlineWidth,
        stroke: highlightColor,
        fill: 'none',
        class: 'oecd-highlightOutline',
      })
      .css({ pointerEvents: 'none' })
      // Add rect to the parent group which already has a transformation applied, depending on the chart type (translate, rotate, flip)
      .add(graphic.parentGroup);

    outlineRects.set(point, outline);
  }

  outline = outline.attr({
    x: Math.floor(shapeArgs.x - outlineDistance),
    y: Math.floor(shapeArgs.y - outlineDistance),
    width: Math.ceil(shapeArgs.width + 2 * outlineDistance),
    height: Math.ceil(
      // Bar charts are column charts rotated by 90° and mirrored,
      // so x and y dimensions are flipped here, and y: 0 is on the right
      series.type === 'bar'
        ? chart.plotWidth + 2 * outlineDistance
        : chart.plotHeight + 2 * outlineDistance,
    ),
  });

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
const renderHighlightOutlines = (chart, highlightColors) => {
  const categoryGroupIsHighlighted =
    chart.options.custom?.categoryGroupIsHighlighted;

  return chart.series
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

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {Chart} chart
 * @params {string[]} highlightColors
 */
export const barAndColumnChartRenderHandler = (chart, highlightColors) => {
  // Fill the plot area for debugging
  chart.plotBackground.element.setAttribute('fill', 'rgb(0 255 0 / 0.1)');

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = [];

  // Render highlight shapes for all active series. Aggregate the shapes in a Set.
  elements.push(...highlightCategoryGroups(chart, highlightColors));
  elements.push(...renderAxisMarkers(chart, highlightColors, true, true));
  elements.push(...renderHighlightOutlines(chart, highlightColors));

  const elementSet = new Set(elements);

  if (chart.oecd_highlightShapes) {
    // Clean up old shapes
    const obsoleteElements =
      chart.oecd_highlightElements.difference(elementSet);
    for (const obsoleteElement of obsoleteElements) {
      obsoleteElement.destroy();
    }
  }

  // Save new shapes
  chart.oecd_highlightElements = elementSet;
};
