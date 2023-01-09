/* eslint-disable no-bitwise, no-nested-ternary */
import Highcharts from 'highcharts';
import { TinyColor, isReadable } from '@ctrl/tinycolor';
import * as R from 'ramda';

import { codeOrLabelEquals, possibleVariables } from './configUtil';
import { isNilOrEmpty, mapWithIndex } from './ramdaUtil';
import { chartTypes, fakeMemberLatest } from '../constants/chart';

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
  new TinyColor(color || 'black').toHex8String();

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

        return color
          ? { name: category.label, y: d, color }
          : { name: category.label, y: d };
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

const roundNumber = (number, maxNumberOfDecimal) =>
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

export const isNumberOrDate = (x) =>
  isCastableToNumber(x) || isCastableToNumber(new Date(x));

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
) =>
  R.reduce(
    (acc, varName) =>
      R.replace(
        new RegExp(`{${varName}}`, 'gi'),
        R.propOr('', R.toUpper(R.prop(varName, vars)), mapping),
        acc,
      ),
    string ?? '',
    possibleVariables,
  );

export const numberFormat = (number, decimals, decimalPoint, thousandsSep) => {
  if (!isCastableToNumber(number)) {
    return number;
  }
  if (
    !isCastableToNumber(decimals) ||
    Number(decimals) < 0 ||
    Number(decimals) > 100
  ) {
    return Highcharts.numberFormat(number, -1, decimalPoint, thousandsSep);
  }

  return Highcharts.numberFormat(
    number,
    roundNumber(number, decimals) === roundNumber(number, 0) ? 0 : decimals,
    decimalPoint,
    thousandsSep,
  );
};

export const createFormatters = ({
  chartType,
  mapColorValueSteps,
  maxNumberOfDecimals,
  latestYByXCode,
  latestYByXLabel,
}) => {
  const isMaxNumberOrDecimalCastableToNumber =
    isCastableToNumber(maxNumberOfDecimals);

  const stepsHaveLabels =
    chartType === chartTypes.map &&
    !isNilOrEmpty(mapColorValueSteps) &&
    R.all(R.compose(R.equals(2), R.length), mapColorValueSteps);

  const dataLabels = isMaxNumberOrDecimalCastableToNumber
    ? {
        formatter: function formatPoint() {
          return numberFormat(
            this.point.value || this.point.z || this.point.y,
            maxNumberOfDecimals,
          );
        },
      }
    : {};

  const tooltip = {
    formatter: function format(tooltipInfo) {
      const fullFormat = `${tooltipInfo.options.headerFormat}${tooltipInfo.options.pointFormat}`;

      const value = this.point.y ?? this.point.value ?? this.point.z;
      const newValue = stepsHaveLabels
        ? R.nth(
            1,
            R.find(
              R.compose(R.equals(`${value}`), R.head),
              mapColorValueSteps,
            ) || [],
          ) || value
        : numberFormat(value, maxNumberOfDecimals);

      return R.compose(
        R.ifElse(
          () => R.isNil(latestYByXCode),
          R.compose(
            R.replace(
              '{series.name}',
              chartType === chartTypes.map ? this.point.name : this.series.name,
            ),
            R.replace(
              '{point.key}',
              chartType === chartTypes.pie
                ? this.point.name
                : this.point.category ?? this.series.name,
            ),
          ),
          R.compose(
            R.replace(
              '{point.key}',
              R.cond([
                [
                  R.includes(R.__, [chartTypes.map, chartTypes.pie]),
                  R.always(this.point.name),
                ],
                [
                  R.includes(R.__, [
                    chartTypes.stackedBar,
                    chartTypes.stackedRow,
                  ]),
                  R.always(this.series.name),
                ],
                [R.T, R.always(this.point.category)],
              ])(chartType),
            ),
            R.replace(
              '{series.name}',
              R.cond([
                [
                  R.includes(R.__, [
                    chartTypes.stackedBar,
                    chartTypes.stackedRow,
                  ]),
                  () =>
                    R.propOr(
                      this.point.category,
                      this.series.name,
                      latestYByXLabel,
                    ),
                ],
                [
                  R.equals(chartTypes.map),
                  () =>
                    R.propOr(this.series.name, this.point.code, latestYByXCode),
                ],
                [
                  R.equals(chartTypes.pie),
                  () =>
                    R.propOr(
                      this.series.name,
                      this.point.name,
                      latestYByXLabel,
                    ),
                ],
                [
                  R.T,
                  () =>
                    R.propOr(
                      this.series.name,
                      this.point.category,
                      latestYByXLabel,
                    ),
                ],
              ])(chartType),
            ),
          ),
        ),

        R.replace('{point.color}', this.color),
        R.replace('{point.y}', newValue),
      )(fullFormat);
    },
  };

  return { dataLabels, tooltip };
};
