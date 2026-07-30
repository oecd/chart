// @ts-check
/* global console */
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { getBoundingRectsByCategory } from '../highchartsCustomCode/utils/getBoundingRectsByCategory';
import {
  getOutlineGap,
  getOutlineWidth,
} from '../highchartsCustomCode/utils/highlightOutline';

/**
 * @typedef {{ code: string }} Category
 */

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
 * @param {Chart} chart
 * @param {string} seriesType
 * @param {Point} point
 * @param {HighchartsSVGElement} parent
 * @param {string} highlightColor
 * @param {number} x
 * @param {number} width
 * @returns {HighchartsSVGElement | undefined}
 */
const renderAxisMarkerRect = (
  chart,
  seriesType,
  point,
  parent,
  highlightColor,
  x,
  width,
) => {
  let axisMarker = axisMarkers.get(point);

  if (!(axisMarker && axisMarker.element)) {
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
  const outlineGap = getOutlineGap(chart.plotWidth);
  const outlineDistance = outlineGap + outlineWidth / 2;

  const attributes =
    seriesType === 'column'
      ? {
          class: 'oecd-axisMarker',
          x: x - outlineDistance,
          y: chart.plotHeight + HIGHLIGHT_MARKER_GAP,
          width: width + 2 * outlineDistance,
          height: HIGHLIGHT_MARKER_SIZE,
          fill: highlightColor,
        }
      : {
          class: 'oecd-axisMarker',
          // Bar charts are column charts rotated by 90° and mirrored,
          // so x and y dimensions are flipped here, and y: 0 is on the right
          x,
          y: chart.plotWidth + HIGHLIGHT_MARKER_GAP,
          width: width,
          height: HIGHLIGHT_MARKER_SIZE,
          fill: highlightColor,
        };
  axisMarker.attr(attributes);

  return axisMarker;
};

/**
 * Renders a marker at the axis for highlighted points.
 *
 * @param {Chart} chart
 * @param {string} seriesType
 * @param {Point} point
 * @param {HighchartsSVGElement} parent
 * @param {string[]} highlightColors
 * @returns {HighchartsSVGElement | undefined}
 */
const renderAxisMarker = (
  chart,
  seriesType,
  point,
  parent,
  highlightColors,
) => {
  const { graphic, shapeArgs } = point;
  if (!(graphic && shapeArgs)) {
    console.error('renderAxisMarker: point.graphic not found');
    return;
  }

  return renderAxisMarkerRect(
    chart,
    seriesType,
    point,
    parent,
    highlightColors[0], // TODO: Use the right color
    shapeArgs.x,
    shapeArgs.width,
  );
};

/**
 * When all columns/bars of a category are highlighted,
 * render one marker rect spanning all points instead of many rects.
 *
 * @param {Chart} chart
 * @param {Series[]} relevantSeries
 * @param {Category[]} highlightedCategories
 * @param {string[]} highlightColors
 * @returns {HighchartsSVGElement[]}
 */
const renderCategoryAxisMarker = (
  chart,
  relevantSeries,
  highlightedCategories,
  highlightColors,
) => {
  const firstSeries = relevantSeries[0];
  if (!firstSeries) return [];
  const seriesType = firstSeries.type;
  const seriesTransform = firstSeries.group.element.getAttribute('transform');

  const boundingRects = getBoundingRectsByCategory(
    relevantSeries,
    highlightedCategories,
  );

  return Array.from(boundingRects)
    .map(([, boundingRect]) => {
      const marker = renderAxisMarkerRect(
        chart,
        seriesType,
        // Use first point as a map key
        firstSeries.points[0],
        // Append marker to the <g> containing all series, not to a particular series <g>.
        // The latter has a clip mask that would cut off the marker.
        chart.seriesGroup,
        highlightColors[0], // TODO: Use the right color
        boundingRect.x1,
        boundingRect.x2 - boundingRect.x1,
      );
      if (marker) {
        // Apply series transformation to move the marker into the right place.
        marker.attr({ transform: seriesTransform });
      }
      return marker;
    })
    .filter((element) => element !== undefined);
};

/**
 * @param {Chart} chart
 * @param {Series[]} relevantSeries
 * @param {string[]} highlightColors
 * @param {boolean} seriesHighlight
 * @param {boolean} categoryHighlight
 * @returns {HighchartsSVGElement[]}
 */
const renderSeriesAxisMarker = (
  chart,
  relevantSeries,
  highlightColors,
  seriesHighlight,
  categoryHighlight,
) =>
  relevantSeries
    .map((series) => {
      // Create <g> for the axis markers of this series
      let group = axisMarkerGroups.get(series);
      if (!(group && group.element)) {
        group = chart.renderer
          .g()
          .attr({ class: 'oecd-axisMarkerGroup' })
          // We cannot add the element to the individual series' <g> since that
          // has a clip mask that would cut off the axis markers
          .add(chart.seriesGroup);
        axisMarkerGroups.set(series, group);
      }

      // The series <g> has a transformation applied. We need to apply the same to the axis marker <g>.
      // In a column chart, the transformation moves it to the plot area.
      // In a bar chart, which is a column chart underneath, the transformation moves, rotates and flips it.
      const seriesTransform = series.group.element.getAttribute('transform');
      group.attr({ transform: seriesTransform });

      const seriesIsHighlighted = series.options.custom?.isHighlighted;

      const elements = series.points.map((point) => {
        const categoryIsHighlighted = point.options.custom?.isHighlighted;
        const isHighlighted =
          (seriesHighlight && seriesIsHighlighted) ||
          (categoryHighlight && categoryIsHighlighted);

        // The potential existing axis marker will be destroyed automatically
        if (!isHighlighted) return;

        const axisMarker = renderAxisMarker(
          chart,
          series.type,
          point,
          group,
          highlightColors,
        );
        return axisMarker;
      });

      elements.push(group);

      return elements;
    })
    .flat()
    .filter((element) => element !== undefined);

/**
 * Renders axis markers for a chart
 *
 * @param {Chart} chart
 * @param {string[]} highlightColors
 * @param {boolean} seriesHighlight Whether to draw a marker when the series is highlighted
 * @param {boolean} categoryHighlight Whether to draw a marker when the category is highlighted
 * @returns {HighchartsSVGElement[]}
 */
export const renderAxisMarkers = (
  chart,
  highlightColors,
  seriesHighlight,
  categoryHighlight,
) => {
  const customOptions = chart.options.custom;

  /** @type {Category[]} */
  const highlightedCategories = customOptions?.highlightedCategories;

  /** @type {boolean} */
  const categoryGroupIsHighlighted = customOptions?.categoryGroupIsHighlighted;

  const relevantSeries = chart.series.filter(
    ({ type, visible }) => visible && (type === 'bar' || type === 'column'),
  );

  if (categoryGroupIsHighlighted) {
    return renderCategoryAxisMarker(
      chart,
      relevantSeries,
      highlightedCategories,
      highlightColors,
    );
  }

  return renderSeriesAxisMarker(
    chart,
    relevantSeries,
    highlightColors,
    seriesHighlight,
    categoryHighlight,
  );
};
