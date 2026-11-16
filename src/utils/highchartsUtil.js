import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import { UTCDate } from '@date-fns/utc';
import * as R from 'ramda';

import { chartTypes, decimalPointTypes } from '../constants/chart';
import { isCastableToNumber, roundNumber } from './configUtil';
import { isNilOrEmpty } from './ramdaUtil';
import { frequencies } from './dateUtil';
import { fontFamilies, fontWeights } from '../constants/styling';

export const thousandsSeparator = ' ';
export const numericSymbols = ['k', 'M', 'G', 'T', 'P', 'E'];

const emptyIfNil = R.when(R.isNil, R.always(''));

const getNumericFormat = (valueField, maxNumberOrDecimal, prefix, suffix) =>
  `{#if (ge ${valueField} 1000)}${prefix}{rtz ((shorten ${valueField}):,.1f)}{ns ${valueField}}${suffix}` +
  `{else}{#if (le ${valueField} -1000)}${prefix}{rtz ((shorten ${valueField}):,.1f)}{ns ${valueField}}${suffix}` +
  `{else}${prefix}{rtz ((rtz ${valueField}):,.${maxNumberOrDecimal}f)}${suffix}{/if}{/if}`;

const getNumericFormatWithoutShorten = (
  valueField,
  maxNumberOrDecimal,
  prefix,
  suffix,
) => `${prefix}{rtz ((rtz ${valueField}):,.${maxNumberOrDecimal}f)}${suffix}`;

const numberFormat = (number, decimals, decimalPoint, prefix, suffix) => {
  if (!isCastableToNumber(number)) {
    return number;
  }

  if (
    !isCastableToNumber(decimals) ||
    Number(decimals) < 0 ||
    Number(decimals) > 100
  ) {
    return `${prefix}${Highcharts.numberFormat(
      number,
      -1,
      decimalPoint,
      thousandsSeparator,
    )}${suffix}`;
  }

  return `${prefix}${Highcharts.numberFormat(
    number,
    roundNumber(number, decimals) === roundNumber(number, 0) ? 0 : decimals,
    decimalPoint,
    thousandsSeparator,
  )}${suffix}`;
};

export const numberFormatAbbreviatedForm = (
  number,
  decimals,
  decimalPoint,
  prefix,
  suffix,
) => {
  if (!isCastableToNumber(number)) {
    return number;
  }

  const finalPrefix = emptyIfNil(prefix);
  const finalSuffix = emptyIfNil(suffix);

  const comparisonNumbers = R.times(
    (multiplier) => 1000 ** (multiplier + 1),
    R.length(numericSymbols),
  );

  const comparisonNumbersTrimmed = R.dropLastWhile(
    (n) => number < n,
    comparisonNumbers,
  );

  if (R.isEmpty(comparisonNumbersTrimmed)) {
    return numberFormat(
      number,
      decimals,
      decimalPoint,
      finalPrefix,
      finalSuffix,
    );
  }

  const relevantIndex = R.length(comparisonNumbersTrimmed) - 1;

  const newNumber = number / R.nth(relevantIndex, comparisonNumbers);

  return `${numberFormat(newNumber, decimals, decimalPoint, finalPrefix, finalSuffix)}${R.nth(relevantIndex, numericSymbols)}`;
};

const wrapWithIsBoldDetection = (format) =>
  isNilOrEmpty(format)
    ? format
    : `{#if (isBold)}<span style="font-weight: ${fontWeights.extraBold}; font-family: ${fontFamilies.condensed}">${format}</span>{else}${format}{/if}`;

export const createFormatters = ({
  chartType,
  mapColorValueSteps,
  maxNumberOfDecimals,
  maxNumberOfDecimalsXAxis,
  numberPrefix,
  numberPrefixXAxis,
  numberSuffix,
  numberSuffixXAxis,
  decimalPoint,
  areCategoriesNumbers,
  areCategoriesDates,
  categoriesDateFomat,
  areSeriesNumbers,
  areSeriesDates,
  seriesDateFomat,
  inlineLabels,
  lang,
  customTooltip,
}) => {
  const finalMaxNumberOrDecimal = isCastableToNumber(maxNumberOfDecimals)
    ? maxNumberOfDecimals
    : -1;

  const finalMaxNumberOrDecimalXAxis = isCastableToNumber(
    maxNumberOfDecimalsXAxis,
  )
    ? maxNumberOfDecimalsXAxis
    : finalMaxNumberOrDecimal;

  const finalDecimalPoint = decimalPoint || decimalPointTypes.point.value;

  const finalPrefix = emptyIfNil(numberPrefix);
  const finalPrefixXAxis = emptyIfNil(numberPrefixXAxis);
  const finalSuffix = emptyIfNil(numberSuffix);
  const finalSuffixXAxis = emptyIfNil(numberSuffixXAxis);

  if (chartType === chartTypes.sankey) {
    return {
      tooltip: {
        headerFormat: null,
        nodeFormat: `{point.name}: <b>${getNumericFormatWithoutShorten(
          'point.sum',
          finalMaxNumberOrDecimal,
          finalPrefix,
          finalSuffix,
        )}</b><br/>`,
        pointFormat: isNilOrEmpty(customTooltip)
          ? `{point.fromNode.name} → {point.toNode.name}: <b>${getNumericFormatWithoutShorten(
              'point.weight',
              finalMaxNumberOrDecimal,
              finalPrefix,
              finalSuffix,
            )}</b><br/>`
          : customTooltip,
      },
    };
  }

  const stepsHaveLabels =
    chartType === chartTypes.map &&
    !isNilOrEmpty(mapColorValueSteps) &&
    R.all(R.compose(R.equals(2), R.length), mapColorValueSteps);

  const categoriesFrequency = areCategoriesDates
    ? R.prop(categoriesDateFomat, frequencies)
    : null;

  const seriesFrequency = areSeriesDates
    ? R.prop(seriesDateFomat, frequencies)
    : null;

  const symbolMinMaxSeriesFormat = R.ifElse(
    R.equals(chartTypes.symbolMinMax),
    () => {
      if (seriesFrequency) {
        return seriesFrequency.getHighchartsFormat('series.name', lang);
      }
      if (areSeriesNumbers) {
        return getNumericFormat(
          'series.name',
          finalMaxNumberOrDecimal,
          finalPrefix,
          finalSuffix,
        );
      }

      return '{series.name}';
    },
    R.always(''),
  )(chartType);

  const dataLabels = {
    format:
      '{#if (ne null point.y)}' +
      `${chartType === chartTypes.symbolMinMax ? `${symbolMinMaxSeriesFormat}: ` : ''}${finalPrefix}{rtz (point.y:,.${finalMaxNumberOrDecimal}f)}${finalSuffix}` +
      '{else}' +
      `{#if (ne null point.value)}${finalPrefix}{rtz (point.value:,.${finalMaxNumberOrDecimal}f)}${finalSuffix}` +
      `{else}${finalPrefix}{rtz (point.z:,.${finalMaxNumberOrDecimal}f)}${finalSuffix}` +
      '{/if}{/if}',
  };

  const xAxisLabels = R.cond([
    [
      () => categoriesFrequency,
      () => ({
        format: categoriesFrequency.getHighchartsFormat(
          chartType === chartTypes.pie ? 'name' : 'value',
          lang,
        ),
      }),
    ],
    [
      () => areCategoriesNumbers,
      () => ({
        format: getNumericFormat(
          chartType === chartTypes.pie ? 'name' : 'value',
          finalMaxNumberOrDecimalXAxis,
          finalPrefixXAxis,
          finalSuffixXAxis,
        ),
      }),
    ],
    [
      R.T,
      () => ({
        format: chartType === chartTypes.pie ? '{name}' : '{value}',
      }),
    ],
  ])();

  const seriesLabels = R.cond([
    [
      () =>
        chartType === chartTypes.pie ? categoriesFrequency : seriesFrequency,
      () => ({
        labelFormat: (chartType === chartTypes.pie
          ? categoriesFrequency
          : seriesFrequency
        ).getHighchartsFormat('name', lang),
      }),
    ],
    [
      () =>
        chartType === chartTypes.pie ? areCategoriesNumbers : areSeriesNumbers,
      () => ({
        labelFormat: getNumericFormat(
          'name',
          finalMaxNumberOrDecimal,
          finalPrefix,
          finalSuffix,
        ),
      }),
    ],
    [
      R.T,
      () => ({
        labelFormat: '{name}',
      }),
    ],
  ])();

  const dataLabelForInlineLabels =
    chartType === chartTypes.line && inlineLabels
      ? R.cond([
          [
            () => seriesFrequency,
            () => ({
              format: seriesFrequency.getHighchartsFormat('series.name', lang),
            }),
          ],
          [
            () => areSeriesNumbers,
            () => ({
              format: getNumericFormat(
                'series.name',
                finalMaxNumberOrDecimal,
                finalPrefix,
                finalSuffix,
              ),
            }),
          ],
          [
            R.T,
            () => ({
              format: '{series.name}',
            }),
          ],
        ])()
      : {};

  const yAxisLabels = {
    format: getNumericFormat(
      'value',
      finalMaxNumberOrDecimal,
      finalPrefix,
      finalSuffix,
    ),
  };

  const tooltip = !isNilOrEmpty(customTooltip)
    ? {}
    : {
        formatter: function format(tooltipInfo) {
          const fullFormat =
            chartType === chartTypes.symbolMinMax
              ? tooltipInfo.options.pointFormat
              : `${tooltipInfo.options.headerFormat}${tooltipInfo.options.pointFormat}`;

          const value = this.point.y ?? this.point.value ?? this.point.z;
          const timeLabel = this.point.custom?.timeLabel;

          const newValue = stepsHaveLabels
            ? R.nth(
                1,
                R.find(
                  R.compose(R.equals(`${value}`), R.head),
                  mapColorValueSteps,
                ) || [],
              ) || value
            : numberFormat(
                value,
                finalMaxNumberOrDecimal,
                finalDecimalPoint,
                finalPrefix,
                finalSuffix,
              );

          const seriesName =
            chartType === chartTypes.map ? this.point.name : this.series.name;

          const formattedSeriesName = R.cond([
            [
              () => seriesFrequency && chartType !== chartTypes.map,
              () => {
                const date = new UTCDate(seriesName);
                return date
                  ? seriesFrequency.formatToLabel(date, lang)
                  : seriesName;
              },
            ],
            [
              () => areSeriesNumbers && chartType !== chartTypes.map,
              () =>
                numberFormat(
                  seriesName,
                  finalMaxNumberOrDecimal,
                  finalDecimalPoint,
                  finalPrefix,
                  finalSuffix,
                ),
            ],
            [R.T, () => seriesName],
          ])();

          return R.compose(
            R.compose(
              (content) =>
                R.replace('{series.name}', formattedSeriesName, content),
              (content) => {
                const key = R.cond([
                  [() => chartType === chartTypes.map, () => this.series.name],
                  [() => chartType === chartTypes.pie, () => this.point.name],
                  [R.T, () => this.point.category ?? this.series.name],
                ])();

                const frequency =
                  chartType === chartTypes.map
                    ? seriesFrequency
                    : categoriesFrequency;

                const timeLabelSuffix = R.cond([
                  [() => isNilOrEmpty(timeLabel), () => ''],
                  [() => R.isEmpty(key), () => timeLabel],
                  [R.T, () => ` - ${timeLabel}`],
                ])();

                if (!R.isNil(frequency)) {
                  const date = new UTCDate(key);

                  return R.replace(
                    /{.*point.key}/,
                    date ? frequency.formatToLabel(date, lang) : key,
                    content,
                  );
                }

                if (
                  areCategoriesNumbers ||
                  (chartType === chartTypes.map && areSeriesNumbers)
                ) {
                  return R.replace(
                    /{.*point.key}/,
                    `${numberFormat(
                      key,
                      finalMaxNumberOrDecimalXAxis,
                      finalDecimalPoint,
                      finalPrefixXAxis,
                      finalSuffixXAxis,
                    )}${timeLabelSuffix}`,
                    content,
                  );
                }

                return R.replace(
                  /{.*point.key}/,
                  `${key}${timeLabelSuffix}`,
                  content,
                );
              },
            ),
            R.replace('{point.color}', this.color),
            R.replace('{point.y}', newValue),
          )(fullFormat);
        },
      };

  return {
    dataLabels,
    tooltip,
    xAxisLabels: R.map(wrapWithIsBoldDetection, xAxisLabels),
    yAxisLabels,
    seriesLabels: R.map(wrapWithIsBoldDetection, seriesLabels),
    dataLabelForInlineLabels: R.map(
      wrapWithIsBoldDetection,
      dataLabelForInlineLabels,
    ),
  };
};
