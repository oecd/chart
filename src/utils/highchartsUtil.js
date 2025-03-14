import Highcharts from 'highcharts';
import * as R from 'ramda';

import {
  chartTypes,
  chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
  decimalPointTypes,
} from '../constants/chart';
import { isCastableToNumber, roundNumber } from './chartUtil';
import { isNilOrEmpty } from './ramdaUtil';
import { frequencies } from './dateUtil';

const numberFormat = (number, decimals, decimalPoint, thousandsSep) => {
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
  noThousandsSeparator,
  codeLabelMapping,
  decimalPoint,
  areCategoriesNumbers,
  areCategoriesDates,
  categoriesDateFomat,
  lang,
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
        noThousandsSeparator ? '' : null,
      );
    },
  };

  const frequency = areCategoriesDates
    ? R.prop(categoriesDateFomat, frequencies)
    : null;

  const xAxisLabels =
    frequency &&
    !R.includes(chartType, chartTypesForWhichXAxisIsAlwaysTreatedAsCategories)
      ? {
          formatter: function formatXAxis() {
            return frequency.formatToLabel(this.value, lang);
          },
        }
      : {};

  const tooltip = {
    formatter: function format(tooltipInfo) {
      const fullFormat = `${tooltipInfo.options.headerFormat}${tooltipInfo.options.pointFormat}`;

      const value = this.point.y ?? this.point.value ?? this.point.z;
      const timeCode = this.point.__metadata?.timeCode;
      const timeLabel = timeCode ? R.prop(timeCode, codeLabelMapping) : null;

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
            maxNumberOfDecimals,
            finalDecimalPoint,
            noThousandsSeparator ? '' : null,
          );

      const seriesName =
        chartType === chartTypes.map ? this.point.name : this.series.name;

      return R.compose(
        R.compose(
          (content) => R.replace('{series.name}', seriesName, content),
          (content) => {
            const key = R.cond([
              [() => chartType === chartTypes.map, () => this.series.name],
              [() => chartType === chartTypes.pie, () => this.point.name],
              [R.T, () => this.point.category ?? this.series.name],
            ])();

            const timeLabelSuffix = R.cond([
              [() => isNilOrEmpty(timeLabel), () => ''],
              [() => R.isEmpty(key), () => timeLabel],
              [R.T, () => ` - ${timeLabel}`],
            ])();

            if (
              R.includes(
                chartType,
                chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
              )
            ) {
              return R.replace(
                /{.*point.key}/,
                `${key}${timeLabelSuffix}`,
                content,
              );
            }

            if (!R.isNil(frequency)) {
              return R.replace(
                /{.*point.key}/,
                frequency.formatToLabel(key, lang),
                content,
              );
            }

            if (areCategoriesNumbers) {
              return R.replace(
                /{.*point.key}/,
                `${numberFormat(
                  key,
                  maxNumberOfDecimals,
                  finalDecimalPoint,
                  noThousandsSeparator ? '' : null,
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

  return { dataLabels, tooltip, xAxisLabels };
};
