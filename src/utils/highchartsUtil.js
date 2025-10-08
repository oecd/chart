import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import { UTCDate } from '@date-fns/utc';
import * as R from 'ramda';

import {
  chartTypes,
  chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
  decimalPointTypes,
} from '../constants/chart';
import { isCastableToNumber, roundNumber } from './configUtil';
import { isNilOrEmpty } from './ramdaUtil';
import { frequencies } from './dateUtil';

export const thousandsSeparator = ' ';
export const numericSymbols = ['k', 'M', 'G', 'T', 'P', 'E'];

const numberFormat = (number, decimals, decimalPoint) => {
  if (!isCastableToNumber(number)) {
    return number;
  }
  if (
    !isCastableToNumber(decimals) ||
    Number(decimals) < 0 ||
    Number(decimals) > 100
  ) {
    return Highcharts.numberFormat(
      number,
      -1,
      decimalPoint,
      thousandsSeparator,
    );
  }

  return Highcharts.numberFormat(
    number,
    roundNumber(number, decimals) === roundNumber(number, 0) ? 0 : decimals,
    decimalPoint,
    thousandsSeparator,
  );
};

const numberFormatAbbreviatedForm = (number, decimals, decimalPoint) => {
  if (!isCastableToNumber(number)) {
    return number;
  }
  const comparisonNumbers = R.times(
    (multiplier) => 1000 ** (multiplier + 1),
    R.length(numericSymbols),
  );

  const comparisonNumbersTrimmed = R.dropLastWhile(
    (n) => number < n,
    comparisonNumbers,
  );

  if (R.isEmpty(comparisonNumbersTrimmed)) {
    return numberFormat(number, decimals, decimalPoint);
  }

  const relevantIndex = R.length(comparisonNumbersTrimmed) - 1;

  const newNumber = number / R.nth(relevantIndex, comparisonNumbers);

  return `${numberFormat(newNumber, decimals, decimalPoint)}${R.nth(relevantIndex, numericSymbols)}`;
};

export const createFormatters = ({
  chartType,
  mapColorValueSteps,
  maxNumberOfDecimals,
  decimalPoint,
  areCategoriesNumbers,
  areCategoriesDates,
  categoriesDateFomat,
  areSeriesNumbers,
  areSeriesDates,
  seriesDateFomat,
  forceXAxisToBeTreatedAsCategories,
  lang,
  isCustomTooltipDefined,
}) => {
  const isMaxNumberOrDecimalCastableToNumber =
    isCastableToNumber(maxNumberOfDecimals);

  const finalDecimalPoint = decimalPoint || decimalPointTypes.point.value;

  const stepsHaveLabels =
    chartType === chartTypes.map &&
    !isNilOrEmpty(mapColorValueSteps) &&
    R.all(R.compose(R.equals(2), R.length), mapColorValueSteps);

  const dataLabels = {
    formatter: function formatPoint() {
      return numberFormat(
        this.point.value || this.point.z || this.point.y,
        isMaxNumberOrDecimalCastableToNumber ? maxNumberOfDecimals : -1,
        finalDecimalPoint,
      );
    },
  };

  const categoriesFrequency = areCategoriesDates
    ? R.prop(categoriesDateFomat, frequencies)
    : null;

  const seriesFrequency = areSeriesDates
    ? R.prop(seriesDateFomat, frequencies)
    : null;

  const xAxisLabels = R.cond([
    [
      () => chartType === chartTypes.pie && areCategoriesNumbers,
      () => ({
        formatter: function formatXAxis() {
          return numberFormat(
            this.name,
            maxNumberOfDecimals,
            finalDecimalPoint,
          );
        },
      }),
    ],
    [
      () => chartType === chartTypes.pie && areCategoriesDates,
      () => ({
        formatter: function formatXAxis() {
          const date = categoriesFrequency.tryParse(this.name);
          return date
            ? categoriesFrequency.formatToLabel(date, lang)
            : new UTCDate(this.name);
        },
      }),
    ],
    [
      () => categoriesFrequency,
      () => ({
        formatter: function formatXAxis() {
          const date =
            forceXAxisToBeTreatedAsCategories ||
            R.includes(
              chartType,
              chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
            )
              ? categoriesFrequency.tryParse(this.value)
              : new UTCDate(this.value);

          return date
            ? categoriesFrequency.formatToLabel(date, lang)
            : this.value;
        },
      }),
    ],
    [
      () => areCategoriesNumbers,
      () => ({
        formatter: function formatXAxis() {
          return numberFormatAbbreviatedForm(
            this.value,
            maxNumberOfDecimals,
            finalDecimalPoint,
          );
        },
      }),
    ],
    [R.T, () => ({})],
  ])();

  const seriesLabels = R.cond([
    [
      () =>
        chartType === chartTypes.pie ? categoriesFrequency : seriesFrequency,
      () => ({
        labelFormatter: function formatSeries() {
          const frequency =
            chartType === chartTypes.pie
              ? categoriesFrequency
              : seriesFrequency;
          const date = frequency.tryParse(this.name);
          return date ? frequency.formatToLabel(date, lang) : this.name;
        },
      }),
    ],
    [
      () =>
        chartType === chartTypes.pie ? areCategoriesNumbers : areSeriesNumbers,
      () => ({
        labelFormatter: function formatSeries() {
          return numberFormatAbbreviatedForm(
            this.name,
            maxNumberOfDecimals,
            finalDecimalPoint,
          );
        },
      }),
    ],
    [R.T, () => ({})],
  ])();

  const yAxisLabels = {
    formatter: function formatYAxis() {
      return numberFormatAbbreviatedForm(
        this.value,
        maxNumberOfDecimals,
        finalDecimalPoint,
      );
    },
  };

  const tooltip = isCustomTooltipDefined
    ? {}
    : {
        formatter: function format(tooltipInfo) {
          const fullFormat = `${tooltipInfo.options.headerFormat}${tooltipInfo.options.pointFormat}`;

          const value = this.point.y ?? this.point.value ?? this.point.z;
          const timeLabel = this.point.__metadata?.timeLabel;

          const newValue = stepsHaveLabels
            ? R.nth(
                1,
                R.find(
                  R.compose(R.equals(`${value}`), R.head),
                  mapColorValueSteps,
                ) || [],
              ) || value
            : numberFormat(value, maxNumberOfDecimals, finalDecimalPoint);

          const seriesName =
            chartType === chartTypes.map ? this.point.name : this.series.name;

          const formattedSeriesName = R.cond([
            [
              () => seriesFrequency && chartType !== chartTypes.map,
              () => {
                const date = seriesFrequency.tryParse(seriesName);
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
                  maxNumberOfDecimals,
                  finalDecimalPoint,
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
                  const date =
                    forceXAxisToBeTreatedAsCategories ||
                    R.includes(
                      chartType,
                      chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
                    )
                      ? frequency.tryParse(key)
                      : new UTCDate(key);

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
                      maxNumberOfDecimals,
                      finalDecimalPoint,
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

  return { dataLabels, tooltip, xAxisLabels, yAxisLabels, seriesLabels };
};
