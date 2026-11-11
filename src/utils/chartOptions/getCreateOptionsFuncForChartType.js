// @ts-check
import * as R from 'ramda';
import {
  chartSizes,
  chartTypes,
  chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
  defaultExportSize,
} from '../../constants/chart';
import { noDataErrorMessageString } from '../../constants/chartErrorMessages';
import {
  fontColors,
  fontFamilies,
  textElementTypes,
} from '../../constants/styling';
import customChartRenderByChartType from '../../highchartsCustomCode/customChartRenderByChartType';
import {
  isParsedDataEmpty,
  replaceBasicVarsNameByVarsValue,
} from '../chartUtil';
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
import { fontStyleForTextElement } from '../stylingUtil';
import { createOptionsForBarChart } from './createOptionsForBarChart';
import { createOptionsForLineChart } from './createOptionsForLineChart';
import { createOptionsForPieChart } from './createOptionsForPieChart';
import { createOptionsForRadarChart } from './createOptionsForRadarChart';
import { createOptionsForSankeyChart } from './createOptionsForSankeyChart';
import { createOptionsForScatterChart } from './createOptionsForScatterChart';
import { createOptionsForStackedChart } from './createOptionsForStackedChart';
import { createPositionedAnnotations } from './createPositionedAnnotations';
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
    chartSize,
    inlineLabels,
    hideLegend,
    annotations,
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
      categoriesDateFormat: data.categoriesDateFormat,
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
      ? R.prop(data.categoriesDateFormat, frequencies)
      : null;

    const seriesFrequency = data.areSeriesDates
      ? R.prop(data.seriesDateFomat, frequencies)
      : null;

    const { positionedBandAnnotations, positionedPointAnnotations } =
      createPositionedAnnotations({ data, annotations, categoriesFrequency });

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
      chartSize,
      inlineLabels,
      hideLegend,
      positionedBandAnnotations,
      positionedPointAnnotations,
    });

    const customChartRender = R.propOr(
      null,
      chartType,
      customChartRenderByChartType,
    );

    /**
     * Rreference to the chart so it is available in the animation complete callback
     * @type {import('highcharts').Chart}
     */
    let chart;

    /**
     * @param {{ target: import('highcharts').Chart }} [event]
     */
    const customChartRenderWithCbType = (event) => {
      if (event) {
        // Save reference to the Highcharts chart object
        chart = event.target;
      }
      if (chart && chart.renderer && customChartRender) {
        customChartRender({ chart, cbType: chartType });
      }
    };

    /** @type {boolean} */
    let renderedAfterAnimation = false;

    /**
     * Callback that runs when Highcharts has completed the animation
     */
    const animationComplete = () => {
      if (
        customChartRender &&
        chart &&
        // The chart object might be destroyed, than it is empty
        chart.renderer &&
        !renderedAfterAnimation
      ) {
        customChartRender({ chart, cbType: chartType });
        renderedAfterAnimation = true;
      }
    };

    return R.compose(
      R.when(
        () => !R.isNil(customChartRender),
        R.assocPath(['chart', 'events', 'render'], customChartRenderWithCbType),
      ),
      // Animation complete callback: Call render callback again once
      // after the animation completed
      R.when(
        (options2) =>
          customChartRender &&
          R.path(['plotOptions', 'series', 'animation'], options2) !== false,
        R.assocPath(['chart', 'animation', 'complete'], animationComplete),
      ),
      R.assoc('lang', {
        decimalPoint,
        thousandsSep: thousandsSeparator,
        numericSymbols,
        noData: noDataErrorMessageString,
      }),
      R.assoc('noData', {
        style: fontStyleForTextElement(textElementTypes.legend, chartSize),
      }),
      R.when(
        () => isParsedDataEmpty(data),
        R.assocPath(['legend', 'enabled'], false),
      ),
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
          ...fontStyleForTextElement(textElementTypes.source, chartSize),
          cursor: 'auto',
        },
      }),
      R.assoc('caption', {
        text: otherProps.footer,
        align: 'left',
        margin: chartSize === chartSizes.small ? 10 : 25,
        useHTML: true,
        style: fontStyleForTextElement(textElementTypes.source, chartSize),
      }),
      R.assoc('subtitle', {
        text: otherProps.subtitle,
        align: 'left',
        style: fontStyleForTextElement(textElementTypes.subtitle, chartSize),
      }),
      R.assoc('title', {
        text: otherProps.title,
        align: 'left',
        margin: inlineLabels || hideLegend ? 50 : 20,
        style: fontStyleForTextElement(textElementTypes.title, chartSize),
      }),
      R.assocPath(['chart', 'style'], {
        fontFamily: fontFamilies.normal,
        color: fontColors.normal,
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
