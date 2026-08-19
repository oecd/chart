// @ts-check
import * as R from 'ramda';
import {
  chartTypes,
  chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
  defaultExportSize,
} from '../../constants/chart';
import customChartRenderByChartType from '../../highchartsCustomCode/customChartRenderByChartType';
import { replaceBasicVarsNameByVarsValue } from '../chartUtil';
import {
  calcExistingFixedColorIndexBySeries,
  createExportFileName,
} from '../chartUtilCommon';
import { getFinalPalette } from '../configUtil';
import { parseCSV } from '../csvUtil';
import { frequencies } from '../dateUtil';
import { createCodeLabelMap } from '../generalUtil';
import {
  createFormatters,
  numericSymbols,
  thousandsSeparator,
} from '../highchartsUtil';
import { isNilOrEmpty } from '../ramdaUtil';
import { createOptionsForBarChart } from './createOptionsForBarChart';
import { createOptionsForLineChart } from './createOptionsForLineChart';
import { createOptionsForPieChart } from './createOptionsForPieChart';
import { createOptionsForRadarChart } from './createOptionsForRadarChart';
import { createOptionsForSankeyChart } from './createOptionsForSankeyChart';
import { createOptionsForScatterChart } from './createOptionsForScatterChart';
import { createOptionsForStackedChart } from './createOptionsForStackedChart';

const mapsUtil = import('../mapsUtil');

/**
 * @param {Function} createOptionsFuncForChartType
 */
const createChartOptionsFunc =
  (createOptionsFuncForChartType) =>
  ({
    highlight,
    baseline,
    colorPalette,
    smallerColorPalettes = [],
    fixedColorIndexBySeries = null,
    paletteStartingColor = null,
    mapColorValueSteps,
    maxNumberOfDecimals,
    maxNumberOfDecimalsXAxis,
    numberPrefix,
    numberPrefixXAxis,
    numberSuffix,
    numberSuffixXAxis,
    decimalPoint,
    customTooltip,
    tooltipOutside,
    csvExportcolumnHeaderFormatter,
    exportWidth = defaultExportSize.width,
    exportHeight = defaultExportSize.height,
    vars,
    lang,
    forceXAxisToBeTreatedAsCategories,
    ...otherProps
  }) => {
    const parsedFixedColorIndexBySeries = isNilOrEmpty(fixedColorIndexBySeries)
      ? {}
      : R.compose(
          calcExistingFixedColorIndexBySeries(
            otherProps.chartType === chartTypes.pie
              ? otherProps.data.categories
              : otherProps.data.series,
          ),
          createCodeLabelMap,
          R.map(R.adjust('1', Number.parseInt)),
          R.filter((row) => {
            const index = Number.parseInt(R.nth(1, row));

            if (!Number.isInteger(index)) {
              return false;
            }

            return index >= 1 && index <= R.length(colorPalette);
          }),
          parseCSV,
        )(fixedColorIndexBySeries);

    const finalColorPalette = R.isEmpty(parsedFixedColorIndexBySeries)
      ? getFinalPalette(
          colorPalette,
          smallerColorPalettes,
          R.length(
            otherProps.chartType === chartTypes.pie
              ? otherProps.data.categories
              : otherProps.data.series || [],
          ),
          paletteStartingColor,
        )
      : colorPalette;

    const parsedHighlight = R.compose(
      R.reject(R.isEmpty),
      R.split('|'),
    )(replaceBasicVarsNameByVarsValue(highlight, vars));

    const parsedBaseline = R.compose(
      R.reject(R.isEmpty),
      R.split('|'),
    )(replaceBasicVarsNameByVarsValue(baseline, vars));

    const formatters = createFormatters({
      chartType: otherProps.chartType,
      mapColorValueSteps,
      maxNumberOfDecimals,
      maxNumberOfDecimalsXAxis,
      numberPrefix,
      numberPrefixXAxis,
      numberSuffix,
      numberSuffixXAxis,
      decimalPoint,
      areCategoriesNumbers: otherProps.data.areCategoriesNumbers,
      areCategoriesDates: otherProps.data.areCategoriesDates,
      categoriesDateFomat: otherProps.data.categoriesDateFomat,
      areSeriesNumbers: otherProps.data.areSeriesNumbers,
      areSeriesDates: otherProps.data.areSeriesDates,
      seriesDateFomat: otherProps.data.seriesDateFomat,
      lang,
      customTooltip,
    });

    const categoriesAreDatesOrNumberForDataParsing =
      (otherProps.data.areCategoriesDates ||
        otherProps.data.areCategoriesNumbers) &&
      !forceXAxisToBeTreatedAsCategories &&
      !R.includes(
        otherProps.chartType,
        chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
      );

    const categoriesFrequency = otherProps.data.areCategoriesDates
      ? R.prop(otherProps.data.categoriesDateFomat, frequencies)
      : null;

    const seriesFrequency = otherProps.data.areSeriesDates
      ? R.prop(otherProps.data.seriesDateFomat, frequencies)
      : null;

    const options = createOptionsFuncForChartType({
      ...otherProps,
      colorPalette: finalColorPalette,
      fixedColorIndexBySeries: parsedFixedColorIndexBySeries,
      highlight: parsedHighlight,
      baseline: parsedBaseline,
      mapColorValueSteps,
      maxNumberOfDecimals,
      numberPrefix,
      numberSuffix,
      formatters,
      decimalPoint,
      categoriesAreDatesOrNumberForDataParsing,
      categoriesFrequency,
      seriesFrequency,
    });

    const customChartRender = R.propOr(
      null,
      otherProps.chartType,
      customChartRenderByChartType,
    );

    const customChartRenderWithCbType = ({ target: chart }) => {
      if (customChartRender) {
        customChartRender({ chart, cbType: otherProps.chartType });
      }
    };

    return R.compose(
      R.when(
        () => !R.isNil(customChartRender),
        R.assocPath(['chart', 'events', 'render'], customChartRenderWithCbType),
      ),
      R.assoc('lang', {
        decimalPoint,
        thousandsSep: thousandsSeparator,
        numericSymbols,
      }),
      R.assoc('tooltip', {
        ...R.prop('tooltip', formatters),
        ...(isNilOrEmpty(customTooltip) ||
        otherProps.chartType === chartTypes.sankey
          ? {}
          : { format: customTooltip }),
        outside: tooltipOutside,
        style: {
          zIndex: 702,
        },
      }),
      R.assoc('exporting', {
        enabled: false,
        sourceWidth: exportWidth,
        sourceHeight: exportHeight,
        filename: createExportFileName(),
        allowHTML: true,
        csv: {
          columnHeaderFormatter: csvExportcolumnHeaderFormatter,
        },
      }),
      R.assoc('credits', {
        enabled: otherProps.isFullScreen,
        text: lang === 'fr' ? '© OCDE' : '© OECD',
        href: 'https://www.oecd.org',
        position: {
          align: 'left',
          x: 20,
          y: -20,
        },
        style: {
          color: '#586179',
          fontSize: '13px',
          cursor: 'auto',
        },
      }),
      R.assoc('caption', {
        text: otherProps.footer,
        align: 'left',
        margin: 25,
        useHTML: true,
        style: {
          color: '#586179',
          fontSize: '13px',
        },
      }),
      R.assoc('subtitle', {
        text: otherProps.subtitle,
        align: 'left',
        style: {
          color: '#586179',
          fontSize: '17px',
        },
      }),
      R.assoc('title', {
        text: otherProps.title,
        align: 'left',
        margin: 20,
        style: {
          color: '#101d40',
          fontWeight: 'bold',
          fontSize: '18px',
        },
      }),
    )(options);
  };

/**
 * Returns the function that creates the Highcharts options for the given chart type
 *
 * @param {string} chartType
 */
export const getCreateOptionsFuncForChartType = async (chartType) => {
  switch (chartType) {
    case chartTypes.line:
      return createChartOptionsFunc(createOptionsForLineChart);

    case chartTypes.bar:
    case chartTypes.row:
      return createChartOptionsFunc(createOptionsForBarChart);

    case chartTypes.stackedBar:
    case chartTypes.stackedRow:
    case chartTypes.stackedArea:
      return createChartOptionsFunc(createOptionsForStackedChart);

    case chartTypes.map:
      return createChartOptionsFunc((await mapsUtil).createOptionsForMapChart);

    case chartTypes.symbol:
    case chartTypes.scatter:
    case chartTypes.symbolMinMax:
      return createChartOptionsFunc(createOptionsForScatterChart);

    case chartTypes.radar:
      return createChartOptionsFunc(createOptionsForRadarChart);

    case chartTypes.pie:
      return createChartOptionsFunc(createOptionsForPieChart);

    case chartTypes.sankey:
      return createChartOptionsFunc(createOptionsForSankeyChart);

    default:
      return () => ({});
  }
};
