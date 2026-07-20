/* global console */
/**
 * @import { Chart, Point, Series, SVGElement } from "highcharts"
 */

const HIGHLIGHT_MARKER_SIZE = 5;
/**
 * Gap between the axis line and the highlight marker
 */
const HIGHLIGHT_MARKER_GAP = 2;

const OUTLINE_WIDTH = 1;
const OUTLINE_GAP = 0.1;
const OUTLINE_SUM = OUTLINE_WIDTH + OUTLINE_GAP;

/**
 * Connects a Highcharts point object with an SVG shape without creating a strong reference to the point
 *
 * @type {WeakMap<Point, SVGElement>}
 */
const outlineRects = new WeakMap();

/**
 * Renders an outline rect around highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {boolean} isHighlighted
 * @param {Point} point
 * @param {string[]} highlightColors
 * @returns {SVGElement | undefined}
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

  if (!outline) {
    outline = chart.renderer
      .rect()
      .attr({ strokeWidth: 1, stroke: highlightColor, fill: 'none' })
      .css({ pointerEvents: 'none' })
      // Add rect to the parent group which already has a transformation applied, depending on the chart type (translate, rotate, flip)
      .add(graphic.parentGroup);

    outlineRects.set(point, outline);
  }

  outline = outline.attr({
    x: shapeArgs.x - OUTLINE_SUM,
    y: shapeArgs.y - OUTLINE_SUM,
    width: shapeArgs.width + 2 * OUTLINE_SUM,
    height:
      // Bar charts are column charts rotated by 90° and mirrored,
      // so x and y dimensions are flipped here, and y: 0 is on the right
      series.type === 'bar'
        ? chart.plotWidth + 2 * OUTLINE_SUM
        : chart.plotHeight + 2 * OUTLINE_SUM,
    zIndex: -1,
  });

  return outline;
};

/**
 * Connects a Highcharts point object with an SVG shape without creating a strong reference to the point
 *
 * @type {WeakMap<Point, SVGElement>}
 */
const axisMarkers = new WeakMap();

/**
 * Renders a marker at the axis for highlighted points.
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {Point} point
 * @param {boolean} isHighlighted
 * @param {string[]} highlightColors
 */
const renderAxisMarker = (
  chart,
  series,
  point,
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
      .rect
      // Attributes are set below
      ()
      .css({ pointerEvents: 'none' })
      // We cannot add the rect to the point's parent <g> since it has
      // a clip mask. The marker is positioned outside of the plot area.
      // The clip mask would cut it off.
      .add(chart.axisMarkerGroup);

    axisMarkers.set(point, axisMarker);
  }

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
          x: Math.floor(shapeArgs.x - OUTLINE_SUM),
          y: chart.plotHeight + HIGHLIGHT_MARKER_GAP,
          width: Math.ceil(shapeArgs.width + 2 * OUTLINE_SUM),
          height: HIGHLIGHT_MARKER_SIZE,
          fill,
        },
  );

  return axisMarker;
};

/**
 * Renders the highlight markers for the given series.
 * Returns the active shapes
 *
 * @param {Chart} chart
 * @param {Series} series
 * @param {string[]} highlightColors
 * @returns {SVGElement[]} activeShapes
 */
const renderSeriesHighlight = (chart, series, highlightColors) => {
  const { renderer } = chart;
  const { points } = series;

  const seriesIsHighlighted = series.options.custom?.isHighlighted;

  // Create container group for axis makers
  if (!chart.axisMarkerGroup) {
    chart.axisMarkerGroup = renderer
      .g()
      .attr({ class: 'oecd-axisMarkerGroup' })
      .add();
  }

  // The series <g> has a transformation applied. We need to apply the same to the axis marker <g>.
  // In a vertical (column) chart, the transformation moves it to the plot area.
  // In a horizontal (row) chart, which is a column chart underneath, the transformation moves, rotates and flips it.
  const seriesTransform = series.group.element.getAttribute('transform');
  chart.axisMarkerGroup.attr({ transform: seriesTransform });

  /** @type {SVGElement[]} */
  const activeShapes = [];

  points.forEach((point) => {
    const pointIsHighlighted = point.options.custom?.isHighlighted;
    const isHighlighted = seriesIsHighlighted || pointIsHighlighted;

    // Highlight background
    const highlightOutline = renderHighlightOutline(
      chart,
      series,
      point,
      isHighlighted,
      highlightColors,
    );
    if (highlightOutline) {
      activeShapes.push(highlightOutline);
    }

    // Axis marker
    const axisMarker = renderAxisMarker(
      chart,
      series,
      point,
      isHighlighted,
      highlightColors,
    );
    if (axisMarker) {
      activeShapes.push(axisMarker);
    }
  });

  return activeShapes;
};

/**
 * Draws a rect around all shapes of highlighted categories
 *
 * @param {Chart} chart
 * @returns {SVGElement[]}
 */
const highlightCategoryGroups = (chart) => {
  /** @type {SVGElement[]} */
  const shapes = [];

  const highlightedCategories = chart.options.custom?.highlightedCategories;

  const categoryGroupIsHighlighted =
    chart.options.custom?.categoryGroupIsHighlighted;

  if (highlightedCategories && categoryGroupIsHighlighted) {
    const highlightedCategoryCodes = highlightedCategories.map((c) => c.code);

    // Gather point coordinates and group them by category

    /** @typedef {{ x: number, y: number, width: number, height: number }} PointRect */
    /** @type {Map<string, PointRect[]>} */
    const pointRectsByCategory = new Map();

    chart.series.forEach((series) => {
      const {
        group: { translateX, translateY },
      } = series;

      series.points.forEach((point) => {
        const { name } = point;
        if (!highlightedCategoryCodes.includes(name)) return;
        let pointRects = pointRectsByCategory.get(name);
        if (!pointRects) {
          pointRects = [];
          pointRectsByCategory.set(name, pointRects);
        }
        const rect = {
          x: point.shapeArgs.x + translateX,
          y: point.shapeArgs.y + translateY,
          width: point.shapeArgs.width,
          height: point.shapeArgs.height,
        };
        pointRects.push(rect);
      });
    });

    // Draws a rectangle around the bounding box of all shapes
    pointRectsByCategory.forEach((pointCoords) => {
      let minX = Infinity;
      let maxX = 0;
      let minY = Infinity;
      let maxY = 0;

      pointCoords.forEach(({ x, y, width, height }) => {
        const rightmost = x + width;
        const bottommost = y + height;
        if (x < minX) minX = x;
        if (rightmost > maxX) maxX = rightmost;
        if (y < minY) minY = y;
        if (bottommost > maxY) maxY = bottommost;
      });

      const rect = chart.renderer
        .rect()
        .attr({
          strokeWidth: 1,
          stroke: 'red',
          fill: 'rgb(255 0 0 / 0.05)',
          x: minX,
          width: maxX - minX,
          y: minY,
          height: maxY - minY,
        })
        .css({ pointerEvents: 'none' })
        .add();

      shapes.push(rect);
    });
  }
  return shapes;
};

/**
 * Event handler called after load (initial render) and redraw (subsequent render).
 * Renders the highlight shapes and cleans up stale ones.
 *
 * @param {Chart} chart
 * @params {string[]} highlightColors
 */
export const barAndColumnChartRenderHandler = (chart, highlightColors) => {
  /** @typedef {{ oecd_highlightShapes: Set<SVGElement> }} Chart */
  chart.oecd_highlightShapes ||= new Set();

  // Fill the plot area for debugging
  chart.plotBackground.element.setAttribute('fill', 'rgb(0 255 0 / 0.1)');

  /**
   * Additional SVG elements created for highlighting
   * @type {SVGElement[]}
   */
  const activeShapes = [];

  activeShapes.push(...highlightCategoryGroups(chart));

  // Render highlight shapes for all active series. Aggregate the shapes in a Set.
  const seriesHighlightShapes = chart.series
    .map((series) => renderSeriesHighlight(chart, series, highlightColors))
    .flat();
  activeShapes.push(...seriesHighlightShapes);

  const activeShapesSet = new Set(activeShapes);

  // Clean up old shapes
  const obsoleteShapes = chart.oecd_highlightShapes.difference(activeShapesSet);
  for (const obsoleteShape of obsoleteShapes) {
    obsoleteShape.destroy();
  }

  // Save new shapes
  chart.oecd_highlightShapes.clear();
  chart.oecd_highlightShapes = activeShapesSet;
};
