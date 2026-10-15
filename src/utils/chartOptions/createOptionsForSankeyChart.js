// @ts-check
import * as R from 'ramda';
import {
  chartSpacing,
  chartSpacingFullScreenAndExport,
} from '../../constants/chart';
import { calcMarginTopDefault, fontStyleForTextElement } from '../stylingUtil';
import { getBaselineOrHighlightColor } from '../chartUtilCommon';
import {
  addFromAndToColumns,
  createFromToPoints,
  rejectInvalidFromToPoints,
} from '../sankeyUtil';
import { textElementTypes } from '../../constants/styling';

/**
 * @param {import("./getBaselineAndHighlightCodes").BaselineAndHighlightCodes} options
 */
export const createOptionsForSankeyChart = ({
  data,
  baselineCodes,
  highlightCodes,
  title = '',
  subtitle = '',
  colorPalette,
  matchingHighlightColors,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  chartSize,
}) => {
  const series = R.compose(
    ({ data: seriesData, columnByNode }) => {
      const nodes = R.map(([code, column]) => {
        const label = R.propOr(code, R.toUpper(code), data.codeLabelMapping);
        const baselineOrHighlightColor = getBaselineOrHighlightColor(
          code,
          baselineCodes,
          highlightCodes,
          matchingHighlightColors,
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
      marginTop: calcMarginTopDefault(title, subtitle, chartSize),
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
          style: fontStyleForTextElement(textElementTypes.legend, chartSize),
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
