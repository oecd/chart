// @ts-check
import * as R from 'ramda';
import {
  chartSpacing,
  chartSpacingFullScreenAndExport,
} from '../../constants/chart';
import { calcMarginTop } from '../chartUtil';
import { getBaselineOrHighlightColor } from '../chartUtilCommon';
import {
  addFromAndToColumns,
  createFromToPoints,
  rejectInvalidFromToPoints,
} from '../sankeyUtil';

export const createOptionsForSankeyChart = ({
  data,
  title = '',
  subtitle = '',
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
}) => {
  const series = R.compose(
    ({ data: seriesData, columnByNode }) => {
      const nodes = R.map(([code, column]) => {
        const label = R.propOr(code, R.toUpper(code), data.codeLabelMapping);
        const baselineOrHighlightColor = getBaselineOrHighlightColor(
          { code, label },
          highlight,
          baseline,
          highlightColors,
        );

        const color = baselineOrHighlightColor || R.head(colorPalette);

        return {
          id: code,
          column,
          name: label,
          color,
          ...(R.isNil(baselineOrHighlightColor)
            ? {}
            : { dataLabels: { style: { fontWeight: 800 } } }),
        };
      }, R.toPairs(columnByNode));
      return { data: seriesData, nodes };
    },
    R.evolve({
      data: R.compose(
        R.sortWith([
          R.ascend(R.prop('fromColumn')),
          R.ascend(R.prop('toColumn')),
        ]),
      ),
    }),
    addFromAndToColumns,
    rejectInvalidFromToPoints,
    createFromToPoints,
  )(data);

  return {
    chart: {
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: calcMarginTop(title, subtitle, isSmall),
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: {
        fullscreenClose,
      },
    },

    colors: [R.head(colorPalette)],

    plotOptions: {
      series: {
        animation: false,
      },
      sankey: {
        dataLabels: {
          style: {
            fontSize: isSmall ? '13px' : '16px',
            fontWeight: 400,
          },
        },
      },
    },

    series: [
      {
        data: series.data,
        nodes: series.nodes,
        type: 'sankey',
      },
    ],
  };
};
