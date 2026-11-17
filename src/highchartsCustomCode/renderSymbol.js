import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import { chartTypes, nonHighlightedOpacity } from '../constants/chart';
import { mapWithIndex } from '../utils/ramdaUtil';
import { fadeIn } from './utils/highlightAnimation';

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

  const elements = mapWithIndex((_category, idx) => {
    if (R.isEmpty(categoriesMinMax[idx])) {
      return null;
    }

    const x = R.path([0, 'data', idx, 'x'], chart.series);
    const ax = chart.xAxis[0]?.toPixels(x);
    const ay = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][0]);
    const bx = ax;
    const by = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][1]);

    const path = chart.renderer.path().add();
    fadeIn(path, disableAnimation);

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
    const obsoleteElements = R.difference(
      chart.oecd_highlightElements,
      elements,
    );

    R.map((obsoleteElement) => {
      obsoleteElement.destroy();
    }, obsoleteElements);
  }

  chart.oecd_highlightElements = elements;
};
