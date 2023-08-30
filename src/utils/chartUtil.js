/* eslint-disable no-bitwise, no-nested-ternary */
import { TinyColor, isReadable } from '@ctrl/tinycolor';
import * as R from 'ramda';

import { codeOrLabelEquals, possibleVariables } from './configUtil';
import { isNilOrEmpty, mapWithIndex } from './ramdaUtil';
import { fakeMemberLatest, frequencyTypes } from '../constants/chart';
import { frequencies } from './dateUtil';

const baselineColor = '#262639';

const lightenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const red = (num >> 16) + amt;
  const blue = ((num >> 8) & 0x00ff) + amt;
  const green = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (red < 255 ? (red < 1 ? 0 : red) : 255) * 0x10000 +
    (blue < 255 ? (blue < 1 ? 0 : blue) : 255) * 0x100 +
    (green < 255 ? (green < 1 ? 0 : green) : 255)
  )
    .toString(16)
    .slice(1)}`;
};

export const convertColorToHex = (color) =>
  new TinyColor(color || 'black').toHexString();

export const createLighterColor = (color, percent) => {
  const hex = convertColorToHex(color);

  return lightenColor(hex, percent);
};

export const createShadesFromColor = (color) => {
  const hex = convertColorToHex(color);
  return R.map((n) => {
    const percent = n * 10;
    return lightenColor(hex, percent);
  }, R.times(R.identity, 9));
};

export const makeColorReadableOnBackgroundColor = (color, backgroundColor) =>
  R.reduceWhile(
    (acc) => !isReadable(acc, backgroundColor),
    (acc) => acc.darken(10),
    new TinyColor(color || 'black'),
    R.times(R.identity, 3),
  ).toHexString();

export const getListItemAtTurningIndex = (idx, list) =>
  R.nth(idx % R.length(list), list);

export const getBaselineOrHighlightColor = (
  objWithCodeAndLabel,
  highlight,
  baseline,
  highlightColors,
) => {
  if (codeOrLabelEquals(objWithCodeAndLabel)(baseline)) {
    return baselineColor;
  }

  const highlightColorsIndex = R.findIndex(
    codeOrLabelEquals(objWithCodeAndLabel),
    highlight,
  );

  return highlightColorsIndex === -1
    ? null
    : getListItemAtTurningIndex(highlightColorsIndex, highlightColors);
};

export const createStackedDatapoints = (
  data,
  colorPalette,
  highlightColors,
  highlight,
  baseline,
) =>
  mapWithIndex((s, yIdx) => {
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
      showInLegend: s.code !== fakeMemberLatest.code,
      data: mapWithIndex((d, xIdx) => {
        const category = R.nth(xIdx, data.categories);
        const highlightColorsIndex = R.findIndex(
          codeOrLabelEquals(category),
          highlight,
        );

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
          [
            () => codeOrLabelEquals(category)(baseline),
            R.always(baselineColor),
          ],
          [() => !R.isNil(highlightColor), R.always(highlightColor)],
          [R.T, R.always(null)],
        ])();

        const dataPoint = R.cond([
          [
            () => data.areCategoriesDates || data.areCategoriesNumbers,
            () => ({
              x: R.head(d),
              y: R.nth(1, d),
            }),
          ],
          [R.T, R.always({ y: d })],
        ])();

        return color
          ? { name: category.label, ...dataPoint, color }
          : { name: category.label, ...dataPoint };
      }, s.data),
    };
  }, data.series);

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

export const isCastableToNumber = R.ifElse(
  isNilOrEmpty,
  R.always(false),
  R.compose(R.complement(Number.isNaN), Number),
);

export const roundNumber = (number, maxNumberOfDecimal) =>
  isCastableToNumber(number)
    ? Number(Number(number).toFixed(maxNumberOfDecimal))
    : number;

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

  const quaterlyFrequency = R.prop(frequencyTypes.quaterly.value, frequencies);
  if (quaterlyFrequency.tryParse(firstValue)) {
    const dates = R.map(quaterlyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.quaterly.value,
      };
    }
  }

  return { isSuccessful: false, dates: null, dateFormat: null };
};

export const createMapDataClasses = (steps, stepsHaveLabels) => {
  const stepsLength = R.length(steps);

  if (stepsLength === 0) {
    return [];
  }

  if (stepsHaveLabels) {
    return mapWithIndex((s, idx) => {
      if (idx === stepsLength - 1) {
        return {
          from: R.head(R.last(steps)),
          name: R.nth(1, R.last(steps)),
        };
      }
      return {
        from: R.head(R.nth(idx, steps)),
        to: R.head(R.nth(idx + 1, steps)),
        name: R.nth(1, R.nth(idx, steps)),
      };
    }, steps);
  }

  return R.prepend(
    { to: R.head(R.head(steps)), name: `< ${R.head(R.head(steps))}` },
    mapWithIndex((s, idx) => {
      if (idx === stepsLength - 1) {
        return {
          from: R.head(R.nth(idx, steps)),
          name: `> ${R.head(R.nth(idx, steps))}`,
        };
      }
      return {
        from: R.head(R.nth(idx, steps)),
        to: R.head(R.nth(idx + 1, steps)),
        name: `${R.head(R.nth(idx, steps))} - ${R.head(R.nth(idx + 1, steps))}`,
      };
    }, steps),
  );
};

export const replaceVarsNameByVarsValue = (string, vars) =>
  R.reduce(
    (acc, varName) =>
      R.replace(new RegExp(`{${varName}}`, 'gi'), R.prop(varName, vars), acc),
    string ?? '',
    possibleVariables,
  );

export const replaceVarsNameByVarsValueUsingCodeLabelMapping = (
  string,
  vars,
  mapping,
  replaceMissingVarByBlank = false,
) =>
  R.reduce(
    (acc, varName) =>
      R.replace(
        new RegExp(`{${varName}}`, 'gi'),
        R.propOr(
          replaceMissingVarByBlank ? '&nbsp;' : '',
          R.toUpper(R.prop(varName, vars)),
          mapping,
        ),
        acc,
      ),
    string ?? '',
    possibleVariables,
  );

const anyVarRegExp = R.join(
  '|',
  R.map((v) => `{${v}}`, possibleVariables),
);

export const doesStringContainVar = R.test(new RegExp(anyVarRegExp, 'i'));
