/* eslint-disable no-console */
/* global console */
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { getOutlineWidth } from './highlightOutline';

const HIGHLIGHT_MARKER_SIZE = 5;
/**
 * Gap between the axis line and the highlight marker
 */
const HIGHLIGHT_MARKER_GAP = 2;

/**
 * Connects a Series object with an SVG element
 *
 * @type {WeakMap<Series, HighchartsSVGElement>}
 */
const axisMarkerGroups = new WeakMap();

/**
 * Connects a Highcharts point object with an SVG element
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const axisMarkers = new WeakMap();

/**
 * Renders a marker at the axis for highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {Point} point
 * @param {HighchartsSVGElement} parent
 * @param {boolean} isHighlighted
 * @param {string[]} highlightColors
 */
const renderAxisMarker = (
  chart,
  series,
  point,
  parent,
  isHighlighted,
  highlightColors,
) => {
  let axisMarker = axisMarkers.get(point);

  if (!isHighlighted) {
    if (axisMarker) {
      axisMarker.destroy();
      axisMarker.delete(point);
    }
    return;
  }

  const { graphic, shapeArgs } = point;
  if (!(graphic && shapeArgs)) {
    console.error('renderAxisMarker: point.graphic not found');
    return;
  }

  const fill = highlightColors[0];

  if (!axisMarker) {
    axisMarker = chart.renderer
      // The other attributes are set below
      .rect({ class: 'oecd-axisMarker' })
      .css({ pointerEvents: 'none' })
      // We cannot add the rect to the point's parent <g> since it has
      // a clip mask. The marker is positioned outside of the plot area.
      // The clip mask would cut it off.
      .add(parent);

    axisMarkers.set(point, axisMarker);
  }

  const outlineWidth = getOutlineWidth(chart.plotWidth);

  axisMarker.attr(
    series.type === 'bar'
      ? {
          // Bar charts are column charts rotated by 90° and mirrored,
          // so x and y dimensions are flipped here, and y: 0 is on the right
          x: shapeArgs.x,
          y: chart.plotWidth + HIGHLIGHT_MARKER_GAP,
          width: shapeArgs.width,
          height: HIGHLIGHT_MARKER_SIZE,
          fill,
        }
      : // Column chart
        {
          x: Math.floor(shapeArgs.x - 2 * outlineWidth),
          y: chart.plotHeight + HIGHLIGHT_MARKER_GAP,
          width: Math.ceil(shapeArgs.width + 4 * outlineWidth),
          height: HIGHLIGHT_MARKER_SIZE,
          fill,
        },
  );

  return axisMarker;
};

/**
 * Renders axis markers for a chart
 *
 * @param {Chart} chart
 * @param {string[]} highlightColors
 * @param {boolean} seriesHighlight Whether to draw a marker when the series is highlighted
 * @param {boolean} categoryHighlight Whether to draw a marker when the category is highlighted
 */
export const renderAxisMarkers = (
  chart,
  highlightColors,
  seriesHighlight,
  categoryHighlight,
) =>
  chart.series
    .map((series) => {
      // Create <g> for axis markers
      let group = axisMarkerGroups.get(series);
      if (!group) {
        group = chart.renderer
          .g()
          .attr({ class: 'oecd-axisMarkerGroup' })
          .add();
        axisMarkerGroups.get(series, group);
      }

      // The series <g> has a transformation applied. We need to apply the same to the axis marker <g>.
      // In a vertical (column) chart, the transformation moves it to the plot area.
      // In a horizontal (row) chart, which is a column chart underneath, the transformation moves, rotates and flips it.
      const seriesTransform = series.group.element.getAttribute('transform');
      group.attr({ transform: seriesTransform });

      const seriesIsHighlighted = series.options.custom?.isHighlighted;

      const elements = series.points.map((point) => {
        const categoryIsHighlighted = point.options.custom?.isHighlighted;
        const isHighlighted =
          (seriesHighlight && seriesIsHighlighted) ||
          (categoryHighlight && categoryIsHighlighted);

        // Axis marker
        const axisMarker = renderAxisMarker(
          chart,
          series,
          point,
          group,
          isHighlighted,
          highlightColors,
        );
        return axisMarker;
      });

      elements.push(group);

      return elements;
    })
    .flat()
    .filter(Boolean);
