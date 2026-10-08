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
import { parseCSV } from '../csvUtil';
import { frequencies } from '../dateUtil';
import { createCodeLabelMap } from '../generalUtil';
import {
  createFormatters,
  numericSymbols,
  thousandsSeparator,
} from '../highchartsUtil';
import { getFinalPaletteColors } from '../paletteUtil';
import { isNilOrEmpty } from '../ramdaUtil';
import { createOptionsForBarChart } from './createOptionsForBarChart';
import { createOptionsForLineChart } from './createOptionsForLineChart';
import { createOptionsForPieChart } from './createOptionsForPieChart';
import { createOptionsForRadarChart } from './createOptionsForRadarChart';
import { createOptionsForSankeyChart } from './createOptionsForSankeyChart';
import { createOptionsForScatterChart } from './createOptionsForScatterChart';
import { createOptionsForStackedChart } from './createOptionsForStackedChart';
import { getBaselineAndHighlightCodes } from './getBaselineAndHighlightCodes';
import { getSmallerPalette } from './getSmallerPalette';

const mapsUtil = import('../mapsUtil');

/**
 * @param {Function} createOptionsFuncForChartType
 */
const createChartOptionsFunc =
  (createOptionsFuncForChartType) =>
  ({
    chartType,
    data,
    highlight,
    baseline,
    colorPalette,
    smallerColorPalettes = [],
    highlightColors,
    smallerHighlightColors,
    highlightOutlineColors,
    smallerHighlightOutlineColors,
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
            chartType === chartTypes.pie ? data.categories : data.series,
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

    const finalColorPaletteColors = R.isEmpty(parsedFixedColorIndexBySeries)
      ? getFinalPaletteColors(
          colorPalette,
          smallerColorPalettes,
          R.length(
            chartType === chartTypes.pie ? data.categories : data.series || [],
          ),
          paletteStartingColor,
        )
      : colorPalette;

    const parsedBaseline = R.compose(
      R.reject(R.isEmpty),
      R.split('|'),
    )(replaceBasicVarsNameByVarsValue(baseline, vars));

    const parsedHighlight = R.compose(
      R.reject(R.isEmpty),
      R.split('|'),
    )(replaceBasicVarsNameByVarsValue(highlight, vars));

    const baselineAndHighlightCodes = getBaselineAndHighlightCodes(
      data,
      parsedBaseline,
      parsedHighlight,
    );

    const matchingHighlightColors = getSmallerPalette(
      parsedHighlight,
      highlightColors,
      smallerHighlightColors,
    );
    const matchingHighlightOutlineColors = getSmallerPalette(
      parsedHighlight,
      highlightOutlineColors,
      smallerHighlightOutlineColors,
    );

    const formatters = createFormatters({
      chartType: chartType,
      mapColorValueSteps,
      maxNumberOfDecimals,
      maxNumberOfDecimalsXAxis,
      numberPrefix,
      numberPrefixXAxis,
      numberSuffix,
      numberSuffixXAxis,
      decimalPoint,
      areCategoriesNumbers: data.areCategoriesNumbers,
      areCategoriesDates: data.areCategoriesDates,
      categoriesDateFomat: data.categoriesDateFomat,
      areSeriesNumbers: data.areSeriesNumbers,
      areSeriesDates: data.areSeriesDates,
      seriesDateFomat: data.seriesDateFomat,
      lang,
      customTooltip,
    });

    const categoriesAreDatesOrNumberForDataParsing =
      (data.areCategoriesDates || data.areCategoriesNumbers) &&
      !forceXAxisToBeTreatedAsCategories &&
      !R.includes(
        chartType,
        chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
      );

    const categoriesFrequency = data.areCategoriesDates
      ? R.prop(data.categoriesDateFomat, frequencies)
      : null;

    const seriesFrequency = data.areSeriesDates
      ? R.prop(data.seriesDateFomat, frequencies)
      : null;

    const options = createOptionsFuncForChartType({
      ...otherProps,
      data,
      chartType,
      colorPalette: finalColorPaletteColors,
      fixedColorIndexBySeries: parsedFixedColorIndexBySeries,
      highlight: parsedHighlight,
      baseline: parsedBaseline,
      ...baselineAndHighlightCodes,
      matchingHighlightColors,
      matchingHighlightOutlineColors,
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
      chartType,
      customChartRenderByChartType,
    );

    const customChartRenderWithCbType = ({ target: chart }) => {
      if (customChartRender) {
        customChartRender({ chart, cbType: chartType });
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
        ...(isNilOrEmpty(customTooltip) || chartType === chartTypes.sankey
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
