// @ts-check
/* eslint-disable no-console */
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import truncatise from 'truncatise';
import { baselineColor, frequencyTypes } from '../constants/chart';
import { getListItemAtTurningIndex, getSeriesColor } from './chartUtilCommon';
import {
  dataLastUpdateDateVariable,
  latestMaxVariable,
  latestMinVariable,
  possibleVariables,
} from './configUtil';
import { frequencies } from './dateUtil';
import { isNilOrEmpty, mapWithIndex } from './ramdaUtil';

/**
 * Opacity of non-highlighted chart markers in case there are any highlights
 */
const NON_HIGHLIGHTED_OPACITY = 0.5;

const createDatapoint = (d, categoriesAreDatesOrNumberForDataParsing) =>
  categoriesAreDatesOrNumberForDataParsing && d.metadata
    ? {
        x: d.metadata.parsedX,
        y: d.value,
        custom: { ...(d.custom || {}), ...(d.metadata || {}) },
      }
    : {
        y: d.value,
        custom: { ...(d.custom || {}), ...(d.metadata || {}) },
      };

/**
 * @param {{
 * data: {
 *   code: string;
 *   label: string;
 *   data: { value: number }[];
 * }
 * }} options
 */
const createStackedDatapoints = ({
  data,
  colorPalette,
  fixedColorIndexBySeries,
  highlightColors,
  smallerHighlightColors,
  categoriesAreDatesOrNumberForDataParsing,
  seriesFrequency,
  baselineCodes,
  highlightedCodes,
  highlightedSeriesCodes,
  highlightedCategoryCodes,
}) => {
  // Find a matching highlight color palette
  const matchingHighlightColors =
    R.find(
      R.propEq(highlightedCodes.length, 'length'),
      smallerHighlightColors,
    ) || highlightColors;

  const anyCategoriesHighlighted = highlightedCategoryCodes.length > 0;

  return mapWithIndex((series, seriesIndex) => {
    const seriesCode = series.code;

    const seriesBaselineIndex = baselineCodes.indexOf(seriesCode);
    const isSeriesBaseline = seriesBaselineIndex !== -1;

    const seriesHighlightIndex = highlightedCodes.indexOf(seriesCode);
    const isSeriesHighlighted = seriesHighlightIndex !== -1;

    const getFinalSeriesColor = () => {
      if (isSeriesBaseline) return baselineColor;
      if (isSeriesHighlighted) {
        return getListItemAtTurningIndex(
          seriesHighlightIndex,
          matchingHighlightColors,
        );
      }
      const colorFromPalette = getSeriesColor({
        colorPalette,
        seriesIndex,
        seriesCode,
        fixedColorIndexBySeries,
      });
      if (highlightedSeriesCodes.length > 0) {
        return new TinyColor(colorFromPalette)
          .setAlpha(NON_HIGHLIGHTED_OPACITY)
          .toRgbString();
      }
      return colorFromPalette;
    };
    const seriesColor = getFinalSeriesColor();

    return {
      custom: {
        isBaseline: isSeriesBaseline,
        isHighlighted: isSeriesHighlighted,
      },
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
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
      data: mapWithIndex((pointData, pointIndex) => {
        const category = R.nth(pointIndex, data.categories);
        const categoryCode = category.code;

        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        // Same code as in `createOptionsForBarChart`

        // Baseline

        const categoryBaselineIndex = baselineCodes.indexOf(categoryCode);
        const isCategoryBaseline = categoryBaselineIndex !== -1;

        const isBaseline = isSeriesBaseline || isCategoryBaseline;

        // Highlight

        const categoryHighlightIndex = highlightedCodes.indexOf(categoryCode);
        const isCategoryHighlighted = categoryHighlightIndex !== -1;

        const finalIsHighlighted = isSeriesHighlighted || isCategoryHighlighted;
        const finalHighlightIndex = isSeriesHighlighted
          ? seriesHighlightIndex
          : isCategoryHighlighted
            ? categoryHighlightIndex
            : -1;

        // Colors

        const highlightColor = finalIsHighlighted
          ? getListItemAtTurningIndex(
              finalHighlightIndex,
              matchingHighlightColors,
            )
          : null;

        // Only color the bar segment if the series is baseline or highlighted.
        // If the category is highlighted, we draw an outline around all segments.

        const getPointColor = () => {
          if (isSeriesBaseline) {
            return baselineColor;
          }
          if (isSeriesHighlighted) {
            return getListItemAtTurningIndex(
              seriesHighlightIndex,
              matchingHighlightColors,
            );
          }
          // Reduce opacity for non-baseline/non-highlighted background categories
          if (
            !isCategoryBaseline &&
            !isCategoryHighlighted &&
            anyCategoriesHighlighted
          ) {
            return new TinyColor(seriesColor)
              .setAlpha(NON_HIGHLIGHTED_OPACITY)
              .toRgbString();
          }
          return null;
        };
        const pointColor = getPointColor();

        return {
          ...dataPoint,
          custom: {
            ...dataPoint.custom,
            // Baseline
            isBaseline,
            isSeriesBaseline,
            isCategoryBaseline,
            // Highlight
            isHighlighted: finalIsHighlighted,
            isSeriesHighlighted,
            isCategoryHighlighted,
            highlightColor,
          },
          name: category.label,
          color: pointColor,
        };
      }, series.data),
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

export const tryCastAllToDatesAndDetectFormat = (values) => {
  const firstValue = R.head(values);

  const quinquennialFrequency = R.prop(
    frequencyTypes.quinquennial.value,
    frequencies,
  );

  const isAnyYearSmallerOrGreaterThanLikelyRealYear = R.any(
    (d) => d.getFullYear() < 1500 || d.getFullYear() > 2500,
  );

  if (quinquennialFrequency.tryParse(firstValue)) {
    const dates = R.map(quinquennialFrequency.tryParse, values);
    if (R.length(dates) > 1 && !R.any(R.equals(false), dates)) {
      if (isAnyYearSmallerOrGreaterThanLikelyRealYear(dates)) {
        return { isSuccessful: false, dates: null, dateFormat: null };
      }

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
      if (isAnyYearSmallerOrGreaterThanLikelyRealYear(dates)) {
        return { isSuccessful: false, dates: null, dateFormat: null };
      }

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

export const replaceBasicVarsNameByVarsValue = (string, vars) =>
  R.reduce(
    (acc, varName) =>
      R.replace(
        new RegExp(`{${varName}}`, 'gi'),
        R.propOr('', varName, vars),
        acc,
      ),
    string ?? '',
    possibleVariables,
  );

export const replaceAllVarsNameByVarsValue = ({
  string,
  vars,
  latestMin,
  latestMax,
  dataLastUpdateDate,
  mapping,
  replaceMissingVarByBlank = false,
  lang,
}) =>
  R.compose(
    R.replace(
      new RegExp(`{${latestMaxVariable}}`, 'gi'),
      latestMax || (replaceMissingVarByBlank ? ' ' : ''),
    ),
    R.replace(
      new RegExp(`{${latestMinVariable}}`, 'gi'),
      latestMin || (replaceMissingVarByBlank ? ' ' : ''),
    ),
    R.replace(
      new RegExp(`{${dataLastUpdateDateVariable}}`, 'gi'),
      dataLastUpdateDate || (replaceMissingVarByBlank ? ' ' : ''),
    ),
    R.reduce(
      (acc, varName) => {
        const labels = R.compose(
          R.when(R.isEmpty, () => (replaceMissingVarByBlank ? ' ' : '')),
          R.join(', '),
          R.reject(isNilOrEmpty),
          R.map((code) => {
            const label = R.propOr(code, code, mapping);
            const { isSuccessful, dateFormat } =
              tryCastAllToDatesAndDetectFormat([label]);
            if (isSuccessful) {
              const frequency = R.prop(dateFormat, frequencies);
              const date = frequency.tryParse(label);
              return frequency.formatToLabel(date, lang);
            }

            return R.propOr('', code, mapping);
          }),
          R.split('|'),
          R.toUpper,
          R.propOr('', varName),
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
    R.concat(possibleVariables, [
      latestMinVariable,
      latestMaxVariable,
      dataLastUpdateDateVariable,
    ]),
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

export const createFooter = ({ source, note, stripLinks = false }) =>
  R.compose(
    R.when(() => stripLinks, R.replace(/<a\b[^>]*>(.*?)<\/a>/g, '$1')),
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
  )([note, source]);

export const isParsedDataEmpty = (parsedData) =>
  R.isEmpty(parsedData?.categories) || R.isEmpty(parsedData?.series);
