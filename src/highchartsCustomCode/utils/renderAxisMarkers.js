// @ts-check
/**
 * @import { Chart, Point, Series, SVGElement as HighchartsSVGElement, SVGAttributes } from "highcharts"
 */

import { baselineColor } from '../../constants/chart';
import {
  getBoundingRectsByCategory,
  groupPointsByCategory,
} from './getBoundingRectsByCategory';
import { HIGHLIGHT_MARKER_SIZE } from './highlightMarkerSize';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

const AXIS_MARKER_CLASS = 'oecd-axisMarker';

/**
 * Connects a Highcharts Series object with a Highcharts SVG element
 * without creating a strong reference to the Series.
 * Cache for reusing elements across chart renderings.
 *
 * @type {WeakMap<Series, HighchartsSVGElement>}
 */
const AXIS_MARKER_GROUPS = new WeakMap();

/**
 * Connects a Highcharts Point object with a Highcharts SVG element
 * without creating a strong reference to the Point.
 * Cache for reusing elements across chart renderings.
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const AXIS_MARKERS = new WeakMap();

/**
 * Creates and appends an SVG rect and reuses an existing element
 *
 * @param {{
 * chart: Chart;
 * referencePoint: Point;
 * parent: HighchartsSVGElement;
 * attributes: SVGAttributes;
 * }} options
 * @returns {HighchartsSVGElement}
 */
const renderAxisMarkerRect = ({
  chart,
  referencePoint,
  parent,
  attributes,
}) => {
  let axisMarker;
  if (referencePoint) {
    axisMarker = AXIS_MARKERS.get(referencePoint);
  }

  if (axisMarker && axisMarker.element) {
    axisMarker.attr(attributes);
  } else {
    axisMarker = chart.renderer
      // .rect() allows passing attributes but only supports some
      // while .attr() supports all
      .rect()
      .attr({
        ...attributes,
        class: AXIS_MARKER_CLASS,
        'pointer-events': 'none',
      })
      // The marker is positioned outside of the plot area.
      // We cannot simply add the rect to the point's parent <g> since it has
      // a clip mask that would cut it off.
      .add(parent);

    if (referencePoint) {
      AXIS_MARKERS.set(referencePoint, axisMarker);
    }
  }

  return axisMarker;
};

/**
 * @param {{
 * seriesType: string;
 * plotWidth: number;
 * plotHeight: number;
 * x: number;
 * width: number;
 * color: string;
 * transform?: string;
 * }} options
 * @returns {SVGAttributes | undefined}
 */
const getAttributesColumnBar = ({
  seriesType,
  plotWidth,
  plotHeight,
  x,
  width,
  color,
  // Needs to be a string for Highcharts
  transform = '',
}) => {
  const outlineWidth = getOutlineWidth(plotWidth);
  const outlineGap = getOutlineGap(plotWidth);
  const outlineDistance = outlineGap + outlineWidth;

  if (seriesType === 'column') {
    return {
      x: x - outlineDistance,
      y: plotHeight + outlineDistance,
      width: width + 2 * outlineDistance,
      height: HIGHLIGHT_MARKER_SIZE,
      fill: color,
      transform,
    };
  }
  if (seriesType === 'bar') {
    return {
      // Bar charts are column charts rotated by 90° and mirrored,
      // so x and y dimensions are flipped here, and y: 0 is on the right
      x: x - outlineDistance,
      y: plotWidth + outlineDistance,
      width: width + 2 * outlineDistance,
      height: HIGHLIGHT_MARKER_SIZE,
      fill: color,
      transform,
    };
  }
};

/**
 * Bar/column chart:
 * When all points of a category are highlighted, render one marker rect
 * spanning all points instead of many small rects.
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
  const highlightCategoryCodes = customChartOptions.highlightCategoryCodes;

  const firstSeries = relevantSeries[0];
  if (!firstSeries) {
    return NO_ELEMENTS;
  }
  const seriesType = firstSeries.type;
  // Get the transforms from the series <g>
  const seriesTransform = firstSeries.group.element.getAttribute('transform');

  const pointsByCategory = groupPointsByCategory(
    relevantSeries,
    baselineCodes.concat(highlightCategoryCodes),
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

      const attributes = getAttributesColumnBar({
        seriesType,
        plotWidth: chart.plotWidth,
        plotHeight: chart.plotHeight,
        x: boundingRect.x1,
        width: boundingRect.x2 - boundingRect.x1,
        color,
        // Apply series transformation to move the marker into the right place.
        transform: seriesTransform,
      });
      if (!attributes) return;

      return renderAxisMarkerRect({
        chart,
        referencePoint: firstPoint,
        // Append marker to the <g> containing all series, not to a particular series <g>.
        // The latter has a clip mask that would cut off the marker.
        parent: chart.seriesGroup,
        attributes,
      });
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
        const customPointOptions = point.options.custom;
        if (!customPointOptions) return;

        const drawAxisMarker =
          (showSeriesBaseline && customPointOptions.isSeriesBaseline) ||
          (showSeriesHighlight && customPointOptions.isSeriesHighlighted) ||
          (showCategoryHighlight && customPointOptions.isCategoryHighlighted);

        // Any existing axis marker will be destroyed automatically
        if (!drawAxisMarker) return;

        const color = customPointOptions.isBaseline
          ? baselineColor
          : customPointOptions.highlightColor;

        const { shapeArgs } = point;
        if (!shapeArgs) return;

        const attributes = getAttributesColumnBar({
          seriesType: series.type,
          plotWidth: chart.plotWidth,
          plotHeight: chart.plotHeight,
          x: shapeArgs.x,
          width: shapeArgs.width,
          color,
        });
        if (!attributes) return;

        return renderAxisMarkerRect({
          chart,
          referencePoint: point,
          parent: group,
          attributes,
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

  if (relevantSeries.length === 0) return NO_ELEMENTS;

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
