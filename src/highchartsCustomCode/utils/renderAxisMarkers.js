/* eslint-disable no-console */
// @ts-check
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement } from "highcharts"
 */

import { baselineColor } from '../../constants/chart';
import {
  getBoundingRectsByCategory,
  groupPointsByCategory,
} from './getBoundingRectsByCategory';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

/**
 * @typedef {{ code: string }} Category
 */

const HIGHLIGHT_MARKER_SIZE = 5;
/**
 * Gap between the axis line and the highlight marker
 */
const HIGHLIGHT_MARKER_GAP = 2.5;

/**
 * Connects a Series object with an SVG element
 *
 * @type {WeakMap<Series, HighchartsSVGElement>}
 */
const AXIS_MARKER_GROUPS = new WeakMap();

/**
 * Connects a Highcharts point object with an SVG element
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const AXIS_MARKERS = new WeakMap();

/**
 * @param {{
 * chart: Chart;
 * seriesType: string;
 * point: Point;
 * parent: HighchartsSVGElement;
 * color: string;
 * x: number;
 * width: number;
 * transform?: string;
 * }} options
 * @returns {HighchartsSVGElement | undefined}
 */
const renderAxisMarkerRect = ({
  chart,
  seriesType,
  point,
  parent,
  color,
  x,
  width,
  transform,
}) => {
  let axisMarker = AXIS_MARKERS.get(point);

  if (!(axisMarker && axisMarker.element)) {
    axisMarker = chart.renderer
      // The other attributes are set below
      .rect({ class: 'oecd-axisMarker' })
      .css({ pointerEvents: 'none' })
      // We cannot add the rect to the point's parent <g> since it has
      // a clip mask. The marker is positioned outside of the plot area.
      // The clip mask would cut it off.
      .add(parent);

    AXIS_MARKERS.set(point, axisMarker);
  }

  const outlineWidth = getOutlineWidth(chart.plotWidth);
  const outlineGap = getOutlineGap(chart.plotWidth);
  const outlineDistance = outlineGap + outlineWidth / 2;

  const finalTransform = transform || '';
  const attributes =
    seriesType === 'column'
      ? {
          class: 'oecd-axisMarker',
          x: x - outlineDistance,
          y: chart.plotHeight + HIGHLIGHT_MARKER_GAP,
          width: width + 2 * outlineDistance,
          height: HIGHLIGHT_MARKER_SIZE,
          fill: color,
          transform: finalTransform,
        }
      : {
          class: 'oecd-axisMarker',
          // Bar charts are column charts rotated by 90° and mirrored,
          // so x and y dimensions are flipped here, and y: 0 is on the right
          x,
          y: chart.plotWidth + HIGHLIGHT_MARKER_GAP,
          width,
          height: HIGHLIGHT_MARKER_SIZE,
          fill: color,
          transform: finalTransform,
        };
  axisMarker.attr(attributes);

  return axisMarker;
};

/**
 * When all columns/bars of a category are highlighted,
 * render one marker rect spanning all points instead of many small rects.
 *
 * @param {{
 * chart: Chart;
 * relevantSeries: Series[];
 * }} options
 * @returns {HighchartsSVGElement[]}
 */
const renderCategoryAxisMarkers = ({ chart, relevantSeries }) => {
  const customChartOptions = chart.options.custom;

  /** @type {string[]} */
  const baselineCodes = customChartOptions.baselineCodes;
  /** @type {string[]} */
  const highlightedCategoryCodes = customChartOptions.highlightedCategoryCodes;

  const firstSeries = relevantSeries[0];
  if (!firstSeries) {
    return NO_ELEMENTS;
  }
  const seriesType = firstSeries.type;
  // Get the transforms from the series <g>
  const seriesTransform = firstSeries.group.element.getAttribute('transform');

  const pointsByCategory = groupPointsByCategory(
    relevantSeries,
    baselineCodes.concat(highlightedCategoryCodes),
  );
  const boundingRectsByCategory = getBoundingRectsByCategory(pointsByCategory);

  return Array.from(pointsByCategory)
    .map(([category, points]) => {
      const boundingRect = boundingRectsByCategory.get(category);
      if (!boundingRect) return;
      const firstPoint = points[0];
      const customPointOptions = firstPoint.options.custom;
      if (!customPointOptions) return;

      const { isBaseline, isCategoryHighlighted, highlightColor } =
        customPointOptions;
      const color = isBaseline
        ? baselineColor
        : isCategoryHighlighted
          ? highlightColor
          : null;

      const marker = renderAxisMarkerRect({
        chart,
        seriesType,
        // Use first point as a cache map key
        point: firstPoint,
        // Append marker to the <g> containing all series, not to a particular series <g>.
        // The latter has a clip mask that would cut off the marker.
        parent: chart.seriesGroup,
        color,
        x: boundingRect.x1,
        width: boundingRect.x2 - boundingRect.x1,
        // Apply series transformation to move the marker into the right place.
        transform: seriesTransform,
      });
      return marker;
    })
    .filter((element) => element !== undefined);
};

/**
 * @param {{
 * chart: Chart;
 * relevantSeries: Series[];
 * showSeriesBaseline: boolean;
 * showSeriesHighlight: boolean;
 * showCategoryHighlight: boolean;
 * }} options
 * @returns {HighchartsSVGElement[]}
 */
const renderSeriesAxisMarkers = ({
  chart,
  relevantSeries,
  showSeriesBaseline,
  showSeriesHighlight,
  showCategoryHighlight,
}) => {
  return relevantSeries
    .map((series) => {
      // Create <g> for the axis markers of this series
      let group = AXIS_MARKER_GROUPS.get(series);
      if (!(group && group.element)) {
        group = chart.renderer
          .g()
          .attr({ class: 'oecd-axisMarkerGroup' })
          // Append to the top-level <g> that holds all series <g>.
          // This element does not have a transform applied.
          .add(chart.seriesGroup);
        AXIS_MARKER_GROUPS.set(series, group);
      }

      // Get the transformations from the series <g>.
      // We cannot just append the element to the series <g> since it has a clip mask.
      const seriesTransform = series.group.element.getAttribute('transform');
      group.attr({ transform: seriesTransform });

      const elements = series.points.map((point) => {
        const pointCustomOptions = point.options.custom;
        if (!pointCustomOptions) return;

        const drawAxisMarker =
          (showSeriesBaseline && pointCustomOptions.isSeriesBaseline) ||
          (showSeriesHighlight && pointCustomOptions.isSeriesHighlighted) ||
          (showCategoryHighlight && pointCustomOptions.isCategoryHighlighted);

        // The potential existing axis marker will be destroyed automatically
        if (!drawAxisMarker) return;

        const color = pointCustomOptions.isBaseline
          ? baselineColor
          : pointCustomOptions.highlightColor;

        const { shapeArgs } = point;
        if (!shapeArgs) {
          console.error('point.shapeArgs not found');
          return;
        }

        return renderAxisMarkerRect({
          chart,
          seriesType: series.type,
          point,
          parent: group,
          color,
          x: shapeArgs.x,
          width: shapeArgs.width,
        });
      });

      elements.push(group);

      return elements;
    })
    .flat()
    .filter((element) => element !== undefined);
};

/**
 * Renders axis markers for a chart
 *
 * @param {{
 *  chart: Chart;
 *  showSeriesBaseline: boolean; // Whether to draw a marker when the series is baseline
 *  showSeriesHighlight: boolean; // Whether to draw a marker when the series is highlighted
 *  showCategoryHighlight: boolean; // Whether to draw a marker when the category is highlighted
 * }} options
 * @returns {HighchartsSVGElement[]}
 */
export const renderAxisMarkers = ({
  chart,
  showSeriesBaseline,
  showSeriesHighlight,
  showCategoryHighlight,
}) => {
  /** @type {boolean} */
  const isCategoryGroupHighlighted =
    chart.options.custom.isCategoryGroupHighlighted;

  const relevantSeries = chart.series.filter(
    ({ type, visible }) => visible && (type === 'bar' || type === 'column'),
  );

  if (isCategoryGroupHighlighted) {
    return renderCategoryAxisMarkers({
      chart,
      relevantSeries,
    });
  }

  return renderSeriesAxisMarkers({
    chart,
    relevantSeries,
    showSeriesBaseline,
    showSeriesHighlight,
    showCategoryHighlight,
  });
};
