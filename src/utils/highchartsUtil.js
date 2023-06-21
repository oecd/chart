import Highcharts from 'highcharts';
import * as R from 'ramda';

import { chartTypes, decimalPointTypes } from '../constants/chart';
import { isCastableToNumber, roundNumber } from './chartUtil';
import { isNilOrEmpty } from './ramdaUtil';

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
  latestYByXCode,
  latestYByXLabel,
  decimalPoint,
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
        : numberFormat(value, maxNumberOfDecimals, finalDecimalPoint);

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
