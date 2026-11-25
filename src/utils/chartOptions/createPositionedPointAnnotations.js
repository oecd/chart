// @ts-check

import * as R from 'ramda';
import { chartTypes, stackingOptions } from '../../constants/chart';

/**
 * @param {{
 * annotations: import('./annotation').IndexedPointAnnotation[];
 * data: {
 *   series: { code: string; data: { value: number | null }[] }[];
 *   categories: { code: string }[];
 * };
 * categoriesFrequency: { tryParse: (str: string) => Date | false } | null;
 * areCategoriesDates: boolean;
 * chartType: import("./annotation").ChartType;
 * stacking: import("./annotation").stackingOption;
 *}} options
 * @returns {import('./annotation').PositionedPointAnnotation[]}
 */
export const createPositionedPointAnnotations = ({
  annotations,
  data,
  categoriesFrequency,
  areCategoriesDates,
  chartType,
  stacking,
}) => {
  /**
   * @type {Map<string, {
   *   datapoints: number[],
   *   maximum: number,
   *   midpoints: number[],
   *   total: number,
   *   stackedValues: number[],
   * }>}
   */
  const dataByCategories = new Map(
    data.categories.map((category, index) => {
      /** @type number[] */
      const datapoints = [];
      /** @type number[] */
      const midpoints = [];
      let currentSegmentBottomXPos = 0;
      let maximum = 0;
      let total = 0;
      /** @type number[] */
      let stackedValues = [];

      data.series.forEach((series) => {
        const value = series.data[index].value ?? 0;
        datapoints.push(value);
        midpoints.push(value / 2 + currentSegmentBottomXPos);
        currentSegmentBottomXPos += value;
        maximum = maximum > value ? maximum : value;
        total += value;
        stackedValues.push(total);
      });

      return [
        category.code.toLowerCase(),
        {
          datapoints,
          maximum,
          midpoints,
          total,
          stackedValues,
        },
      ];
    }),
  );

  const scaledAsPercentage = (maxValue, value) => {
    const scalingFactor = maxValue / 100;
    return value / scalingFactor;
  };

  const positionedAnnotations = annotations
    .map((annotation) => {
      const categoryIndex = data.categories.findIndex(
        (category) => category.code.toLowerCase() === annotation.categoryCode,
      );
      if (categoryIndex === -1) return;

      const seriesIndex = data.series.findIndex(
        (series) => series.code.toLowerCase() == annotation.seriesCode,
      );
      if (seriesIndex === -1) return;

      const dataForCategory = dataByCategories.get(annotation.categoryCode);
      if (!dataForCategory) return;

      let yValue;

      switch (chartType) {
        case chartTypes.line:
          yValue = dataForCategory.datapoints[seriesIndex];
          break;
        case chartTypes.bar:
        case chartTypes.row:
          yValue = dataForCategory.maximum;
          break;
        case chartTypes.stackedBar:
        case chartTypes.stackedRow: {
          let midpoint = dataForCategory.midpoints[seriesIndex];
          yValue =
            stacking === stackingOptions.normal.value
              ? midpoint
              : scaledAsPercentage(dataForCategory.total, midpoint);
          break;
        }
        case chartTypes.stackedArea:
          yValue = dataForCategory.stackedValues[seriesIndex];
          break;
        default:
          yValue = dataForCategory.datapoints[seriesIndex];
      }

      let xValue;
      const category = data.categories[categoryIndex];
      if (areCategoriesDates) {
        const date = categoriesFrequency?.tryParse(category.code);
        if (!date) return;
        xValue = date.getTime();
      } else {
        xValue = categoryIndex;
      }

      return {
        ...annotation,
        x: xValue,
        y: yValue,
      };
    })
    .filter(R.isNotNil);

  return positionedAnnotations;
};
