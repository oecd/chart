/* eslint-disable no-bitwise, no-nested-ternary */
import { TinyColor, isReadable } from '@ctrl/tinycolor';
import truncatise from 'truncatise';
import * as R from 'ramda';

import {
  codeOrLabelEquals,
  getFinalPalette,
  latestMaxVariable,
  latestMinVariable,
  possibleVariables,
} from './configUtil';
import { forEachWithIndex, isNilOrEmpty, mapWithIndex } from './ramdaUtil';
import {
  baselineColorShades,
  chartSpacing,
  chartTypes,
  defaultExportSize,
  frequencyTypes,
  stackingOptions,
} from '../constants/chart';
import { frequencies } from './dateUtil';
import { createFormatters } from './highchartsUtil';
import {
  createExportFileName,
  createShadesFromColor,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
} from './chartUtilCommon';

const mapsUtil = import('./mapsUtil');

export const makeColorReadableOnBackgroundColor = (color, backgroundColor) =>
  R.reduceWhile(
    (acc) => !isReadable(acc, backgroundColor),
    (acc) => acc.darken(10),
    new TinyColor(color || 'black'),
    R.times(R.identity, 3),
  ).toHexString();

const createDatapoint = (d, categoriesAreDatesOrNumber) =>
  categoriesAreDatesOrNumber
    ? {
        x: d.metadata.parsedX,
        y: d.value,
        __metadata: d.metadata,
        custom: d.custom,
      }
    : {
        y: d.value,
        __metadata: d.metadata,
        custom: d.custom,
      };

const areCategoriesDatesOrNumber = (data) =>
  data.areCategoriesDates || data.areCategoriesNumbers;

export const createStackedDatapoints = (
  data,
  colorPalette,
  highlightColors,
  highlight,
  baseline,
) => {
  const categoriesAreDatesOrNumber = areCategoriesDatesOrNumber(data);

  const baselineColors = R.find(
    (shade) => R.length(shade) <= R.length(data.series),
    baselineColorShades,
  );

  return mapWithIndex((s, yIdx) => {
    const seriesColor = getListItemAtTurningIndex(yIdx, colorPalette);

    return {
      name: s.label,
      color: seriesColor,
      marker: {
        enabled: false,
        symbol: 'circle',
        radius: 3,
        lineWidth: 2,
        states: {
          hover: {
            enabled: true,
          },
        },
      },
      showInLegend: true,
      data: mapWithIndex((d, xIdx) => {
        const category = R.nth(xIdx, data.categories);
        const highlightColorsIndex = R.findIndex(
          codeOrLabelEquals(category),
          highlight,
        );
        const baselineColorsIndex = R.findIndex(
          codeOrLabelEquals(category),
          baseline,
        );

        const finalBaselineColor =
          baselineColorsIndex === -1
            ? null
            : getListItemAtTurningIndex(yIdx, baselineColors);

        const highlightColor =
          highlightColorsIndex === -1
            ? null
            : getListItemAtTurningIndex(
                yIdx,
                createShadesFromColor(
                  getListItemAtTurningIndex(
                    highlightColorsIndex,
                    highlightColors,
                  ),
                ),
              );

        const color = R.cond([
          [() => !R.isNil(finalBaselineColor), R.always(finalBaselineColor)],
          [() => !R.isNil(highlightColor), R.always(highlightColor)],
          [R.T, R.always(null)],
        ])();

        const dataPoint = createDatapoint(d, categoriesAreDatesOrNumber);

        return color
          ? { name: category.label, ...dataPoint, color }
          : { name: category.label, ...dataPoint };
      }, s.data),
    };
  }, data.series);
};

const createIndexesFromLongestArrays = (arr1, arr2) =>
  isNilOrEmpty(arr1) || isNilOrEmpty(arr2)
    ? []
    : R.times(R.identity, R.max(R.length(arr1), R.length(arr2)));

export const deepMergeUserOptionsWithDefaultOptions = (
  defaultOptions,
  optionsOverride,
) => {
  const fixedOptionsOverride = R.when(
    R.compose(R.complement(R.is(Array)), R.prop('colorAxis')),
    R.evolve({ colorAxis: (ca) => [ca] }),
  )(optionsOverride);

  return R.compose(
    // the clone is important here: Highcharts internally mutates the passed options for
    // perfomance reasons (https://github.com/highcharts/highcharts-react#why-highcharts-mutates-my-data)
    R.clone,
    R.mergeDeepRight(defaultOptions),
    R.mergeDeepRight(fixedOptionsOverride),

    R.when(
      () =>
        !isNilOrEmpty(R.prop('colorAxis', defaultOptions)) &&
        !isNilOrEmpty(R.prop('colorAxis', fixedOptionsOverride)),
      R.compose(
        R.assocPath(
          ['colorAxis', 0, 'dataClasses'],
          R.map(
            (idx) =>
              R.mergeDeepRight(
                R.pathOr(
                  {},
                  ['colorAxis', [0], 'dataClasses', idx],
                  defaultOptions,
                ),
                R.pathOr(
                  {},
                  ['colorAxis', [0], 'dataClasses', idx],
                  fixedOptionsOverride,
                ),
              ),
            createIndexesFromLongestArrays(
              R.pathOr([], ['colorAxis', [0], 'dataClasses'], defaultOptions),
              R.pathOr(
                [],
                ['colorAxis', [0], 'dataClasses'],
                fixedOptionsOverride,
              ),
            ),
          ),
        ),
        R.assoc(
          'colorAxis',
          R.map(
            (idx) =>
              R.mergeDeepRight(
                R.pathOr({}, ['colorAxis', idx], defaultOptions),
                R.pathOr({}, ['colorAxis', idx], fixedOptionsOverride),
              ),
            createIndexesFromLongestArrays(
              R.prop('colorAxis', defaultOptions),
              R.prop('colorAxis', fixedOptionsOverride),
            ),
          ),
        ),
      ),
    ),

    R.when(
      () =>
        !isNilOrEmpty(R.prop('series', defaultOptions)) &&
        !isNilOrEmpty(R.prop('series', fixedOptionsOverride)),
      R.assoc(
        'series',
        R.map(
          (idx) =>
            R.mergeDeepRight(
              R.pathOr({}, ['series', idx], defaultOptions),
              R.pathOr({}, ['series', idx], fixedOptionsOverride),
            ),
          createIndexesFromLongestArrays(
            R.prop('series', defaultOptions),
            R.prop('series', fixedOptionsOverride),
          ),
        ),
      ),
    ),
  )({});
};

export const addColorAlpha = (color, alphaToAdd) => {
  const colorObject = new TinyColor(color || 'black');
  const newAlpha = R.compose(
    R.when(R.gt(R.__, 1), R.always(1)),
    R.when(R.lt(R.__, 0), R.always(0)),
  )(colorObject.getAlpha() + alphaToAdd);
  return colorObject.setAlpha(newAlpha).toHex8String();
};

export const tryCastAllToDatesAndDetectFormat = (values) => {
  const firstValue = R.head(values);

  const quinquennialFrequency = R.prop(
    frequencyTypes.quinquennial.value,
    frequencies,
  );
  if (quinquennialFrequency.tryParse(firstValue)) {
    const dates = R.map(quinquennialFrequency.tryParse, values);
    if (R.length(dates) > 2 && !R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.quinquennial.value,
      };
    }
  }

  const yearlyFrequency = R.prop(frequencyTypes.yearly.value, frequencies);
  if (yearlyFrequency.tryParse(firstValue)) {
    const dates = R.map(yearlyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.yearly.value,
      };
    }
  }

  const monthyFrequency = R.prop(frequencyTypes.monthly.value, frequencies);
  if (monthyFrequency.tryParse(firstValue)) {
    const dates = R.map(monthyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.monthly.value,
      };
    }
  }

  const quarterlyFrequency = R.prop(
    frequencyTypes.quarterly.value,
    frequencies,
  );
  if (quarterlyFrequency.tryParse(firstValue)) {
    const dates = R.map(quarterlyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.quarterly.value,
      };
    }
  }

  return { isSuccessful: false, dates: null, dateFormat: null };
};

export const replaceVarsNameByVarsValue = (string, vars) =>
  R.reduce(
    (acc, varName) =>
      R.replace(new RegExp(`{${varName}}`, 'gi'), R.prop(varName, vars), acc),
    string ?? '',
    possibleVariables,
  );

export const replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax = ({
  string,
  vars,
  latestMin,
  latestMax,
  mapping,
  replaceMissingVarByBlank = false,
}) =>
  R.compose(
    R.replace(
      new RegExp(`{${latestMaxVariable}}`, 'gi'),
      latestMax || (replaceMissingVarByBlank ? '&nbsp;' : ''),
    ),
    R.replace(
      new RegExp(`{${latestMinVariable}}`, 'gi'),
      latestMin || (replaceMissingVarByBlank ? '&nbsp;' : ''),
    ),
    R.reduce(
      (acc, varName) => {
        const labels = R.compose(
          R.when(R.isEmpty, () => (replaceMissingVarByBlank ? '&nbsp;' : '')),
          R.join(', '),
          R.reject(isNilOrEmpty),
          R.map(R.prop(R.__, mapping)),
          R.split('|'),
          R.toUpper,
          R.prop(varName),
        )(vars);

        return R.replace(new RegExp(`{${varName}}`, 'gi'), labels, acc);
      },
      R.__,
      possibleVariables,
    ),
  )(string ?? '');

const anyVarRegExp = R.join(
  '|',
  R.map(
    (v) => `{${v}}`,
    R.concat(possibleVariables, [latestMinVariable, latestMaxVariable]),
  ),
);

export const doesStringContainVar = R.test(new RegExp(anyVarRegExp, 'i'));

export const calcIsSmall = (width, height) =>
  !width || !height ? false : width < 540 || height < 350;

export const calcMarginTop = (title, subtitle, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return isSmall ? 20 : 32;
  }

  return undefined;
};

export const calcMarginTopWithHorizontal = (
  title,
  subtitle,
  horizontal,
  isSmall,
) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (isSmall) {
      return 22;
    }
    return horizontal ? 22 : 32;
  }

  return undefined;
};

const createOptionsForLineChart = ({
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
}) => {
  const categoriesAreDatesOrNumber = areCategoriesDatesOrNumber(data);

  const series = mapWithIndex((s, yIdx) => {
    const highlightOrBaselineColor = getBaselineOrHighlightColor(
      s,
      highlight,
      baseline,
      highlightColors,
    );
    const color =
      highlightOrBaselineColor || getListItemAtTurningIndex(yIdx, colorPalette);

    const dataLabelColor = makeColorReadableOnBackgroundColor(color, 'white');

    return {
      name: s.label,
      data: R.map((d) => {
        const dataPoint = createDatapoint(d, categoriesAreDatesOrNumber);

        return dataPoint;
      }, s.data),
      type: 'spline',
      lineWidth: 2.5,
      marker: {
        symbol: 'circle',
        radius: 3,
        lineWidth: 2,
      },
      states: {
        hover: {
          lineWidth: 2.5,
        },
      },
      color,
      dataLabels: {
        style: {
          color: dataLabelColor,
          textShadow:
            '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
          textOutline: 'none',
        },
      },
      ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
      showInLegend: true,
    };
  }, data.series);

  return {
    chart: {
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: hideLegend
        ? calcMarginTop(title, subtitle, isSmall)
        : undefined,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacing : 0,
      events: {
        fullscreenClose,
      },
    },

    colors: [R.head(colorPalette)],

    xAxis: {
      categories: categoriesAreDatesOrNumber
        ? null
        : R.map(R.prop('label'), data.categories),
      ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        ...R.prop('xAxisLabels', formatters),
        ...(hideXAxisLabels ? { enabled: false } : {}),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      left: categoriesAreDatesOrNumber ? '10%' : '5%',
      width: categoriesAreDatesOrNumber ? '85%' : '95%',
      tickWidth: 0,
    },

    yAxis: {
      title: {
        enabled: false,
      },
      startOnTick: false,
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        enabled: !hideYAxisLabels,
        align: 'left',
        x: 0,
        y: -4,
      },
    },

    legend: {
      enabled: !hideLegend,
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 26 : 34,
    },

    plotOptions: {
      series: {
        animation: false,
        events: {
          mouseOver: (e) => {
            e.target.data.forEach((p) => {
              p.update(
                {
                  dataLabels: {
                    enabled: true,
                    ...R.prop('dataLabels', formatters),
                  },
                },
                false,
                false,
                false,
              );
            });
            e.target.chart.redraw();
          },
          mouseOut: (e) => {
            e.target.data.forEach((p) => {
              p.update(
                {
                  dataLabels: {
                    enabled: false,
                  },
                },
                false,
                false,
                false,
              );
            });
            e.target.chart.redraw();
          },
        },
      },
    },

    series,
  };
};

const createOptionsForBarChart = ({
  chartType,
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  pivotValue = 0,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
}) => {
  const categoriesAreDatesOrNumber = areCategoriesDatesOrNumber(data);

  const series = mapWithIndex((s, xIdx) => {
    const seriesColor =
      getBaselineOrHighlightColor(s, highlight, baseline, highlightColors) ||
      getListItemAtTurningIndex(xIdx, colorPalette);

    return {
      name: s.label,
      data: mapWithIndex((d, dIdx) => {
        const category = R.nth(dIdx, data.categories);

        const baselineOrHighlightColor = getBaselineOrHighlightColor(
          category,
          highlight,
          baseline,
          highlightColors,
        );

        const dataPoint = createDatapoint(d, categoriesAreDatesOrNumber);

        return baselineOrHighlightColor
          ? {
              name: category.label,
              color: baselineOrHighlightColor,
              ...dataPoint,
            }
          : { name: category.label, ...dataPoint };
      }, s.data),
      color: seriesColor,
      showInLegend: true,
    };
  }, data.series);

  const horizontal = chartType === chartTypes.row;

  const calcXAxisLayout = () => {
    if (horizontal) {
      return categoriesAreDatesOrNumber
        ? { top: '7.5%', height: '88.9%' }
        : { top: '8%', height: '88%' };
    }

    return categoriesAreDatesOrNumber
      ? { left: '8%', width: '89%' }
      : { left: '9%', width: '87%' };
  };

  const calcLegendMargin = () => {
    if (isSmall) {
      return horizontal ? 10 : 26;
    }

    return horizontal ? 14 : 34;
  };

  return {
    chart: {
      type: horizontal ? 'bar' : 'column',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: hideLegend
        ? calcMarginTopWithHorizontal(title, subtitle, horizontal, isSmall)
        : undefined,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacing : 0,
      events: {
        fullscreenClose,
      },
    },

    colors: colorPalette,

    xAxis: {
      categories: categoriesAreDatesOrNumber
        ? null
        : R.map(R.prop('label'), data.categories),
      ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        ...R.prop('xAxisLabels', formatters),
        ...((hideXAxisLabels && !horizontal) || (hideYAxisLabels && horizontal)
          ? { enabled: false }
          : {}),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      ...calcXAxisLayout(),
      tickWidth: 0,
    },

    yAxis: {
      title: {
        enabled: false,
      },
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        enabled:
          (!horizontal && !hideYAxisLabels) || (horizontal && !hideXAxisLabels),

        align: 'left',
        ...(horizontal ? { x: 4, y: isSmall ? 28 : 35 } : { x: 0, y: -4 }),
      },
      opposite: horizontal,
    },

    legend: {
      enabled: !hideLegend,
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      squareSymbol: false,
      symbolRadius: 0,
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: calcLegendMargin(),
    },

    plotOptions: {
      series: {
        animation: false,
        pointPadding: 0.1,
        groupPadding: 0.1,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
        threshold: parseFloat(pivotValue) || 0,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series,
  };
};

const createOptionsForStackedChart = ({
  chartType,
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
  stacking = stackingOptions.percent.value,
}) => {
  const categoriesAreDatesOrNumber = areCategoriesDatesOrNumber(data);

  const series = createStackedDatapoints(
    data,
    colorPalette,
    highlightColors,
    highlight,
    baseline,
  );

  const horizontal = chartType === chartTypes.stackedRow;
  const area = chartType === chartTypes.stackedArea;

  const highChartsChartType = R.cond([
    [R.always(area), R.always('areaspline')],
    [R.always(horizontal), R.always('bar')],
    [R.T, R.always('column')],
  ])();

  const calcXAxisLayout = () => {
    if (area) {
      return categoriesAreDatesOrNumber
        ? { left: '10%', width: '85%' }
        : { left: '5%', width: '95%' };
    }

    return horizontal
      ? { top: '8%', height: '88%' }
      : { left: '9%', width: '87%' };
  };

  const calcLegendMargin = () => {
    if (isSmall) {
      return horizontal ? 10 : 26;
    }

    return horizontal ? 14 : 34;
  };

  return {
    chart: {
      type: highChartsChartType,
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: hideLegend
        ? calcMarginTopWithHorizontal(title, subtitle, horizontal, isSmall)
        : undefined,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacing : 0,
      events: {
        fullscreenClose,
      },
    },

    colors: colorPalette,

    xAxis: {
      categories:
        area && categoriesAreDatesOrNumber
          ? null
          : R.map(R.prop('label'), data.categories),
      ...(data.areCategoriesDates
        ? {
            type: 'datetime',
          }
        : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        ...R.prop('xAxisLabels', formatters),
        ...((hideXAxisLabels && !horizontal) || (hideYAxisLabels && horizontal)
          ? { enabled: false }
          : {}),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      ...calcXAxisLayout(),
      tickWidth: 0,
    },

    yAxis: {
      title: {
        enabled: false,
      },
      startOnTick: false,
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        enabled:
          (!horizontal && !hideYAxisLabels) || (horizontal && !hideXAxisLabels),
        align: 'left',
        ...(horizontal ? { x: 4, y: isSmall ? 28 : 35 } : { x: 0, y: -4 }),
      },
      opposite: horizontal,
      reversedStacks: false,
    },

    legend: {
      enabled: !hideLegend,
      reversed: false,
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      squareSymbol: false,
      symbolRadius: 0,
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: calcLegendMargin(),
    },

    plotOptions: {
      series: {
        animation: false,
        stacking: stacking || stackingOptions.percent.value,
        pointPadding: 0.1,
        groupPadding: 0.1,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series,
  };
};

const symbols = [
  'circle',
  'diamond',
  'cross',
  'square',
  'triangle',
  'triangle-down',
];

const createOptionsForScatterChart = ({
  chartType,
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
}) => {
  const symbolLayout = chartType === chartTypes.symbol;

  const firstPaletteColor = R.head(colorPalette);

  const categoriesAreDatesOrNumber = areCategoriesDatesOrNumber(data);

  const series = mapWithIndex((s, yIdx) => {
    const symbol = getListItemAtTurningIndex(yIdx, symbols);

    const seriesBaselineOrHighlightColor = getBaselineOrHighlightColor(
      s,
      highlight,
      baseline,
      highlightColors,
    );

    const seriesColor =
      seriesBaselineOrHighlightColor ||
      getListItemAtTurningIndex(yIdx, colorPalette);

    return {
      name: s.label,
      data: mapWithIndex((d, xIdx) => {
        const category = R.nth(xIdx, data.categories);

        const baselineOrHighlightColor = getBaselineOrHighlightColor(
          category,
          highlight,
          baseline,
          highlightColors,
        );

        const dataPoint = createDatapoint(d, categoriesAreDatesOrNumber);

        return baselineOrHighlightColor
          ? {
              name: category.label,
              ...dataPoint,
              color: baselineOrHighlightColor,
              marker: {
                fillColor: !symbolLayout
                  ? addColorAlpha(baselineOrHighlightColor, -0.4)
                  : baselineOrHighlightColor,
              },
            }
          : {
              name: category.label,
              ...dataPoint,
            };
      }, s.data),
      color: seriesColor,
      showInLegend: true,
      marker: {
        symbol,
        lineColor: symbol === 'cross' ? null : '#deeaf1',
        lineWidth: symbol === 'cross' ? 2 : 1,
        radius: symbol === 'cross' ? 5 : 6,
        fillColor: !symbolLayout
          ? addColorAlpha(seriesColor, -0.4)
          : seriesColor,
        states: {
          hover: {
            lineWidth: symbol === 'cross' ? 2 : 1,
            radius: symbol === 'cross' ? 5 : 6,
          },
        },
      },
    };
  }, data.series);

  let minMaxLines = [];

  const chartRender = ({ target: chart }) => {
    if (symbolLayout) {
      // remove previous lines (user can make series visible or not which requires to
      // redraw the lines)
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
          )(R.times(R.identity, R.length(data.categories))),

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

        const lineColor = chart.series[0].color || firstPaletteColor;

        return chart.renderer
          .path(['M', ax, ay, 'L', bx, by])
          .attr({
            stroke: addColorAlpha(lineColor, -0.6),
            'stroke-width': 1,
            zIndex: 1,
          })
          .add();
      }, data.categories);
    }
  };

  return {
    chart: {
      type: 'scatter',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: hideLegend
        ? calcMarginTop(title, subtitle, isSmall)
        : undefined,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacing : 0,
      events: {
        fullscreenClose,
        render: chartRender,
      },
    },

    colors: colorPalette,

    xAxis: {
      categories: categoriesAreDatesOrNumber
        ? null
        : R.map(R.prop('label'), data.categories),
      ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        ...R.prop('xAxisLabels', formatters),
        ...(hideXAxisLabels ? { enabled: false } : {}),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      left: categoriesAreDatesOrNumber ? '10%' : '5%',
      width: categoriesAreDatesOrNumber ? '85%' : '95%',
      tickWidth: 0,
    },

    yAxis: {
      title: {
        enabled: false,
      },
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        enabled: !hideYAxisLabels,
        align: 'left',
        x: 0,
        y: -4,
      },
    },

    legend: {
      enabled: !hideLegend,
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      squareSymbol: false,
      symbolRadius: 0,
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 26 : 34,
    },

    plotOptions: {
      series: {
        animation: false,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series,
  };
};

const createOptionsForRadarChart = ({
  data,
  formatters = {},
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
}) => {
  const series = mapWithIndex((s, xIdx) => {
    const highlightOrBaselineColor = getBaselineOrHighlightColor(
      s,
      highlight,
      baseline,
      highlightColors,
    );
    const color =
      highlightOrBaselineColor || getListItemAtTurningIndex(xIdx, colorPalette);

    const dataLabelColor = makeColorReadableOnBackgroundColor(color, 'white');

    return {
      name: s.label,
      data: R.map((d) => createDatapoint(d), s.data),
      type: 'line',
      lineWidth: 2.5,
      marker: {
        symbol: 'circle',
        radius: 3,
        lineWidth: 2,
      },
      states: {
        hover: {
          lineWidth: 2.5,
        },
      },
      color,
      showInLegend: true,
      dataLabels: {
        color: dataLabelColor,
        textShadow:
          '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
        textOutline: 'none',
      },
      ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
    };
  }, data.series);

  return {
    chart: {
      polar: true,
      type: 'line',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      height,
      animation: false,
      margin: hideLegend ? 40 : undefined,
      marginBottom: !hideLegend && isSmall ? 5 : undefined,
      spacing: isFullScreen ? chartSpacing : 0,
      events: { fullscreenClose },
    },

    colors: colorPalette,

    pane: {
      startAngle: 0,
      endAngle: 360,
      size: isSmall ? '70%' : '85%',
    },

    xAxis: {
      categories: R.map(R.prop('label'), data.categories),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        enabled: !hideXAxisLabels,
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
    },

    yAxis: {
      title: {
        enabled: false,
      },
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        enabled: !hideYAxisLabels,
      },
    },

    legend: {
      enabled: !hideLegend,
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 16 : 24,
    },

    plotOptions: {
      series: {
        animation: false,
        pointPadding: 0,
        groupPadding: 0,
        events: {
          mouseOver: (e) => {
            e.target.data.forEach((p) => {
              p.update(
                {
                  dataLabels: {
                    enabled: true,
                    ...R.prop('dataLabels', formatters),
                  },
                },
                false,
                false,
                false,
              );
            });
            e.target.chart.redraw();
          },
          mouseOut: (e) => {
            e.target.data.forEach((p) => {
              p.update(
                {
                  dataLabels: {
                    enabled: false,
                  },
                },
                false,
                false,
                false,
              );
            });
            e.target.chart.redraw();
          },
        },
      },
    },

    series,
  };
};

const createOptionsForPieChart = ({
  data,
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
}) => {
  const series = R.map(
    (s) => ({
      name: s.label,
      data: mapWithIndex((d, xIdx) => {
        const category = R.nth(xIdx, data.categories);

        const color =
          getBaselineOrHighlightColor(
            category,
            highlight,
            baseline,
            highlightColors,
          ) || getListItemAtTurningIndex(xIdx, colorPalette);

        const dataPoint = createDatapoint(d);

        return { name: category.label, ...dataPoint, color };
      }, s.data),
    }),
    R.isEmpty(data.series) ? [] : [R.head(data.series)],
  );

  return {
    chart: {
      type: 'pie',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacing : 0,
      marginLeft: 10,
      marginRight: 10,
      events: { fullscreenClose },
    },

    legend: {
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 16 : 24,
    },

    plotOptions: {
      series: {
        animation: false,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
      },
      pie: {
        dataLabels: {
          enabled: !hideXAxisLabels,
          style: {
            fontSize: isSmall ? '13px' : '16px',
            color: '#586179',
            fontWeight: 'normal',
          },
        },
        showInLegend: !hideLegend,
      },
    },

    series,
  };
};

const getCreateOptionsFuncForChartType = async (chartType) => {
  switch (chartType) {
    case chartTypes.line:
      return createOptionsForLineChart;

    case chartTypes.bar:
    case chartTypes.row:
      return createOptionsForBarChart;

    case chartTypes.stackedBar:
    case chartTypes.stackedRow:
    case chartTypes.stackedArea:
      return createOptionsForStackedChart;

    case chartTypes.map:
      return (await mapsUtil).createOptionsForMapChart;

    case chartTypes.symbol:
    case chartTypes.scatter:
      return createOptionsForScatterChart;

    case chartTypes.radar:
      return createOptionsForRadarChart;

    case chartTypes.pie:
      return createOptionsForPieChart;

    default:
      return () => ({});
  }
};

export const createChartOptions = async ({
  highlight,
  baseline,
  colorPalette,
  smallerColorPalettes = [],
  paletteStartingColor = null,
  paletteStartingColorOverride = null,
  mapColorValueSteps,
  maxNumberOfDecimals,
  noThousandsSeparator,
  decimalPoint,
  customTooltip,
  tooltipOutside,
  csvExportcolumnHeaderFormatter,
  exportWidth = defaultExportSize.width,
  exportHeight = defaultExportSize.height,
  vars,
  lang,
  ...otherProps
}) => {
  const createOptionsForChartType = await getCreateOptionsFuncForChartType(
    otherProps.chartType,
  );

  const finalColorPalette = getFinalPalette(
    colorPalette,
    smallerColorPalettes,
    R.length(
      otherProps.chartType === chartTypes.pie
        ? otherProps.data.categories
        : otherProps.data.series || [],
    ),
    paletteStartingColor,
    paletteStartingColorOverride,
  );

  const parsedHighlight = R.compose(
    R.reject(R.isEmpty),
    R.split('|'),
  )(replaceVarsNameByVarsValue(highlight, vars));

  const parsedBaseline = R.compose(
    R.reject(R.isEmpty),
    R.split('|'),
  )(replaceVarsNameByVarsValue(baseline, vars));

  const formatters = createFormatters({
    chartType: otherProps.chartType,
    mapColorValueSteps,
    maxNumberOfDecimals,
    noThousandsSeparator,
    codeLabelMapping: otherProps.data.codeLabelMapping,
    decimalPoint,
    areCategoriesNumbers: otherProps.data.areCategoriesNumbers,
    areCategoriesDates: otherProps.data.areCategoriesDates,
    categoriesDateFomat: otherProps.data.categoriesDateFomat,
    lang,
    isCustomTooltipDefined: !isNilOrEmpty(customTooltip),
  });

  const options = await createOptionsForChartType({
    ...otherProps,
    colorPalette: finalColorPalette,
    highlight: parsedHighlight,
    baseline: parsedBaseline,
    mapColorValueSteps,
    maxNumberOfDecimals,
    formatters,
    decimalPoint,
    noThousandsSeparator,
  });

  return R.compose(
    R.assoc('lang', {
      decimalPoint,
      thousandsSep: noThousandsSeparator ? '' : null,
    }),
    R.assoc('tooltip', {
      ...R.prop('tooltip', formatters),
      ...(isNilOrEmpty(customTooltip) ? {} : { format: customTooltip }),
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

export const createFooter = ({ source, note }) =>
  R.compose(
    R.replace(/<p>/g, '<p style="margin: 0px 0px 5px 0px">'),
    (html) =>
      truncatise(html, {
        TruncateLength: 800,
        TruncateBy: 'characters',
        Strict: false,
        StripHTML: false,
        Suffix: '...',
      }),
    R.join(''),
    R.reject(isNilOrEmpty),
  )([source, note]);
