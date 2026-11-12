// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement, Series, SVGPathArray } from "highcharts"
 */
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import { chartTypes, nonHighlightedOpacity } from '../constants/chart';
import { mapWithIndex } from '../utils/ramdaUtil';
import { fadeIn } from './utils/animation';

/**
 * Connects a Highcharts Series object with a Highcharts SVG element
 * without creating a strong reference to the series.
 * Cache for reusing elements across chart renderings.
 *
 * @type {WeakMap<Series, HighchartsSVGElement>}
 */
const MIN_MAX_LINES = new WeakMap();

/**
 * @param {{
 * chart: Chart;
 * cbType: string;
 * disableAnimation: boolean;
 * }} options
 */
export const renderSymbol = ({ chart, cbType, disableAnimation }) => {
  const lineColorRaw = R.head(chart.options.colors);
  const lineColor = new TinyColor(lineColorRaw)
    .setAlpha(nonHighlightedOpacity)
    .toRgbString();

  const categoriesMinMax = R.compose(
    (seriesData) =>
      R.compose(
        R.map((categoryData) => {
          const validData = R.reject(R.isNil, categoryData);
          return R.isEmpty(validData)
            ? []
            : [Math.min(...validData), Math.max(...validData)];
        }),
        R.map((idx) => R.map(R.nth(idx), seriesData)),
      )(R.times(R.identity, R.length(R.head(seriesData)))),
    R.map(R.compose(R.map(R.prop('y')), R.prop('data'))),
  )(R.filter(R.propEq(true, 'visible'), chart.series));

  /**
   * SVG elements created for highlighting
   * @type {HighchartsSVGElement[]}
   */
  const elements = mapWithIndex((_category, idx) => {
    if (R.isEmpty(categoriesMinMax[idx])) {
      return null;
    }

    const firstSeries = chart.series[0];
    firstSeries.group;
    const x = R.path(['data', idx, 'x'], firstSeries);
    const ax = chart.xAxis[0]?.toPixels(x);
    const ay = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][0]);
    const bx = ax;
    const by = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][1]);

    let path = MIN_MAX_LINES.get(firstSeries);
    if (!path) {
      path = chart.renderer.path().add();
      fadeIn(path, disableAnimation);
      MIN_MAX_LINES.set(firstSeries, path);
    }

    path.attr({
      d:
        cbType === chartTypes.symbol
          ? ['M', ax, ay, 'L', bx, by]
          : ['M', ay, ax, 'L', by, bx],
      stroke: lineColor,
      'stroke-width': 1,
      zIndex: 1,
    });
    return path;
  }, categoriesMinMax);

  if (chart.oecd_highlightElements) {
    // Clean up old shapes
    const obsoleteElements = R.difference(
      chart.oecd_highlightElements,
      elements,
    );
    R.map((obsoleteElement) => obsoleteElement.destroy(), obsoleteElements);
  }

  // Save new shapes
  chart.oecd_highlightElements = elements;
};
