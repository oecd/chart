import * as R from 'ramda';

import { forEachWithIndex, mapWithIndex } from '../utils/ramdaUtil';
import { addColorAlpha } from '../utils/colorUtil';
import { chartTypes } from '../constants/chart';

let minMaxLines = [];

const chartRender = ({ chart, cbType }) => {
  try {
    if (cbType !== chartTypes.symbol && cbType !== chartTypes.symbolMinMax) {
      return;
    }

    forEachWithIndex((l) => l?.destroy(), minMaxLines);

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

    minMaxLines = mapWithIndex((category, idx) => {
      if (R.isEmpty(categoriesMinMax[idx])) {
        return null;
      }

      const x = R.path([0, 'data', idx, 'x'], chart.series);
      const ax = chart.xAxis[0]?.toPixels(x);
      const ay = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][0]);
      const bx = ax;
      const by = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][1]);

      const lineColor = chart.series[0].color;

      return chart.renderer
        .path(
          cbType === chartTypes.symbol
            ? ['M', ax, ay, 'L', bx, by]
            : ['M', ay, ax, 'L', by, bx],
        )
        .attr({
          stroke: addColorAlpha(lineColor, -0.6),
          'stroke-width': 1,
          zIndex: 1,
        })
        .add();
    }, categoriesMinMax);
  } catch {
    // too bad but not blocking
  }
};

export default chartRender;
