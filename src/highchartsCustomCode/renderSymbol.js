// @ts-check
/**
 * @import { Chart, SVGElement as HighchartsSVGElement } from "highcharts"
 */
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import { chartTypes, nonHighlightedOpacity } from '../constants/chart';
import { mapWithIndex } from '../utils/ramdaUtil';

/** @type {HighchartsSVGElement[]} */
let minMaxLines = [];

/**
 * @param {{
 * chart: Chart;
 * cbType: string;
 * }} options
 */
export const renderSymbol = ({ chart, cbType }) => {
  const lineColorRaw = R.head(chart.options.colors);
  const lineColor = new TinyColor(lineColorRaw)
    .setAlpha(nonHighlightedOpacity)
    .toRgbString();

  R.forEach((l) => l?.destroy(), minMaxLines);

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

  minMaxLines = mapWithIndex((_category, idx) => {
    if (R.isEmpty(categoriesMinMax[idx])) {
      return null;
    }

    const x = R.path([0, 'data', idx, 'x'], chart.series);
    const ax = chart.xAxis[0]?.toPixels(x);
    const ay = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][0]);
    const bx = ax;
    const by = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][1]);

    return chart.renderer
      .path(
        cbType === chartTypes.symbol
          ? ['M', ax, ay, 'L', bx, by]
          : ['M', ay, ax, 'L', by, bx],
      )
      .attr({
        stroke: lineColor,
        'stroke-width': 1,
        zIndex: 1,
      })
      .add();
  }, categoriesMinMax);
};
