// @ts-check
/**
 * @import { Chart, Point, SVGElement as HighchartsSVGElement, SVGAttributes } from "highcharts"
 */
import { TinyColor } from '@ctrl/tinycolor';
import { HIGHLIGHT_MARKER_SIZE } from './highlightMarkerSize';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

const SPLINE_X_AXIS_MARKER_PERCENT_WIDTH = 0.62;
const SPLINE_X_AXIS_MARKER_MAX_WIDTH = 100;

const PLOT_AREA_MARKER_CLASS = 'oecd-plotAreaMarker';
const AXIS_MARKER_CLASS = 'oecd-axisMarker';

/**
 * Connects a Highcharts Point object with a Highcharts SVG element
 * without creating a strong reference to the Series.
 * Cache for reusing elements across chart renderings.
 *
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const PLOT_AREA_MARKERS = new WeakMap();

/**
 * @type {WeakMap<Point, HighchartsSVGElement>}
 */
const AXIS_MARKERS = new WeakMap();

/**
 *
 * @param {{
 * chart: Chart;
 * cache: WeakMap<Point, HighchartsSVGElement>;
 * referencePoint: Point;
 * class: string
 * attributes: SVGAttributes;
 * }} options
 */
const renderMarker = ({
  chart,
  cache,
  referencePoint,
  class: className,
  attributes,
}) => {
  let marker = cache.get(referencePoint);

  if (marker && marker.element) {
    marker.attr(attributes);
  } else {
    marker = chart.renderer
      // .rect() allows passing attributes but only supports some
      // while .attr() supports all
      .rect()
      .attr({
        class: className,
        'pointer-events': 'none',
        ...attributes,
      })
      // Append to the top-level <g> that holds all series <g>.
      // This element does not have a transform applied.
      .add(chart.seriesGroup);

    if (referencePoint) {
      cache.set(referencePoint, marker);
    }
  }
};

/**
 * Line chart (spline series): Render x axis markers (category markers)
 *
 * @param {{
 *  chart: Chart;
 * }} options
 * @returns {HighchartsSVGElement[]}
 */
export const renderSplineMarkers = ({ chart }) => {
  const relevantSeries = chart.series.filter(
    ({ type, visible }) => visible && type === 'spline',
  );

  if (relevantSeries.length === 0) return NO_ELEMENTS;

  const customChartOptions = chart.options.custom;

  /** @type {string[]} */
  const highlightCategoryCodes = customChartOptions.highlightCategoryCodes;

  if (!(highlightCategoryCodes && highlightCategoryCodes.length > 0)) {
    return NO_ELEMENTS;
  }

  const xAxis = chart.xAxis[0];
  if (!xAxis) return NO_ELEMENTS;

  // `xAxis.categories` is not presents datetime scales
  // https://api.highcharts.com/highcharts/xAxis.categories
  let categories =
    xAxis.categories || Array.from(customChartOptions.categories);
  if (!(categories && categories.length > 0)) return NO_ELEMENTS;

  /** @type {number} */
  const axisLeft = xAxis.left;

  const outlineWidth = getOutlineWidth(chart.plotWidth);
  const outlineGap = getOutlineGap(chart.plotWidth);
  const outlineDistance = outlineGap + outlineWidth;

  const categoryWidth =
    xAxis.width /
    // For a datetime axis, xAxis.width measures the inner width:
    // |----¤----|----¤----|----¤----|
    //      ^-------------------^
    // For other axis types, xAxis.width measures the outer width:
    // |----¤----|----¤----|----¤----|
    // ^-----------------------------^
    // Therefore add a category band for datetime.
    (xAxis.type === 'datetime'
      ? Math.max(1, categories.length - 1)
      : categories.length);
  const markerWidth = Math.min(
    categoryWidth * SPLINE_X_AXIS_MARKER_PERCENT_WIDTH,
    SPLINE_X_AXIS_MARKER_MAX_WIDTH,
  );

  // Find a point for each category so we can
  // associate the marker with a point for caching
  /** @type {Map<string | number, Point>} */
  const referencePointByHighlightedCategory = new Map();
  relevantSeries.forEach((series) => {
    series.points.forEach((point) => {
      const customPointOptions = point.options.custom;
      const categoryCode = customPointOptions?.categoryCode;
      if (!categoryCode) {
        console.error('Expected point.options.custom.categoryCode');
        return;
      }
      if (
        customPointOptions?.isCategoryHighlighted &&
        !referencePointByHighlightedCategory.has(categoryCode)
      ) {
        referencePointByHighlightedCategory.set(categoryCode, point);
      }
    });
  });

  return highlightCategoryCodes
    .map((category) => {
      const referencePoint = referencePointByHighlightedCategory.get(category);
      if (!(referencePoint && typeof referencePoint.plotX === 'number')) return;
      const customPointOptions = referencePoint.options.custom;
      if (!customPointOptions) return;

      const highlightColor = customPointOptions.highlightColor;

      return [
        renderMarker({
          chart,
          cache: PLOT_AREA_MARKERS,
          referencePoint,
          class: PLOT_AREA_MARKER_CLASS,
          attributes: {
            x: axisLeft + referencePoint.plotX - markerWidth / 2,
            y: chart.plotTop + chart.plotHeight + outlineDistance,
            width: markerWidth,
            height: HIGHLIGHT_MARKER_SIZE,
            fill: highlightColor,
          },
        }),
        renderMarker({
          chart,
          cache: AXIS_MARKERS,
          referencePoint,
          class: AXIS_MARKER_CLASS,
          attributes: {
            x: axisLeft + referencePoint.plotX - markerWidth / 2,
            y: chart.plotTop,
            width: markerWidth,
            height: chart.plotHeight,
            stroke: highlightColor,
            strokeWidth: outlineWidth,
            fill: new TinyColor(highlightColor).setAlpha(0.2).toRgbString(),
          },
        }),
      ];
    })
    .flat()
    .filter((element) => element !== undefined);
};
