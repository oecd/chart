// @ts-check
/**
 * @import { Chart, Point, SVGElement as HighchartsSVGElement, SVGAttributes } from "highcharts"
 */
import { TinyColor } from '@ctrl/tinycolor';
import { HIGHLIGHT_MARKER_SIZE } from './highlightMarkerSize';
import { getOutlineGap, getOutlineWidth } from './highlightOutline';
import { NO_ELEMENTS } from './noElements';

/** The marker width starts at this percent value of the category width */
const MARKER_PERCENT_WIDTH = 0.62;
/** Cap marker width at this value in pixels */
const MARKER_MAX_WIDTH = 100;

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
 * Creates or updates a marker rect for the given reference point.
 *
 * @param {{
 * chart: Chart;
 * cache: WeakMap<Point, HighchartsSVGElement>;
 * referencePoint: Point;
 * class: string
 * attributes: SVGAttributes;
 * }} options
 * @returns {HighchartsSVGElement}
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
      // This element does  not have a transform applied.
      .add(chart.seriesGroup);

    if (referencePoint) {
      cache.set(referencePoint, marker);
    }
  }

  return marker;
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

  const isDatetimeAxis = xAxis.type === 'datetime';

  // `xAxis.categories` is not present for datetime scales,
  // use the Set from the custom chart options in this case.
  // https://api.highcharts.com/highcharts/xAxis.categories
  let categories =
    xAxis.categories || Array.from(customChartOptions.categories);
  if (!(categories && categories.length > 0)) return NO_ELEMENTS;

  /** @type {number} */
  const axisLeft = xAxis.left;
  /** @type {number} */
  const axisRight = xAxis.right;

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
    (isDatetimeAxis ? Math.max(1, categories.length - 1) : categories.length);
  let markerWidth = categoryWidth * MARKER_PERCENT_WIDTH;
  // Cap marker at a max width
  markerWidth = Math.min(markerWidth, MARKER_MAX_WIDTH);
  if (isDatetimeAxis) {
    // Make sure the marker for the outmost left or right point
    // is not painted outside of the SVG.
    markerWidth = Math.min(markerWidth, Math.min(2 * axisLeft, 2 * axisRight));
  }

  // Find a point for each category so we can
  // associate the marker with a point for caching
  /** @type {Map<string | number, Point>} */
  const referencePointByHighlightedCategory = new Map();
  relevantSeries.forEach((series) => {
    series.points.forEach((point) => {
      // Ignore points without value. They are rendered with an accessibility
      // placeholder.
      if (point.y === null) return;
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

      const x = axisLeft + referencePoint.plotX - markerWidth / 2;
      const highlightColor = customPointOptions.highlightColor;

      return [
        // Top semi-transparent rect behind the lines and points
        // spanning the whole plot height
        renderMarker({
          chart,
          cache: PLOT_AREA_MARKERS,
          referencePoint,
          class: AXIS_MARKER_CLASS,
          attributes: {
            x,
            y: chart.plotTop,
            width: markerWidth,
            height: chart.plotHeight,
            stroke: highlightColor,
            strokeWidth: outlineWidth,
            fill: new TinyColor(highlightColor).setAlpha(0.2).toRgbString(),
          },
        }),
        // Bottom rect below the x axis line
        renderMarker({
          chart,
          cache: AXIS_MARKERS,
          referencePoint,
          class: PLOT_AREA_MARKER_CLASS,
          attributes: {
            x,
            y: chart.plotTop + chart.plotHeight + outlineDistance,
            width: markerWidth,
            height: HIGHLIGHT_MARKER_SIZE,
            fill: highlightColor,
          },
        }),
      ];
    })
    .flat()
    .filter((element) => element !== undefined);
};
