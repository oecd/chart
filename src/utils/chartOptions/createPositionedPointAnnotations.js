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

      data.series.forEach((series) => {
        const value = series.data[index].value ?? 0;
        datapoints.push(value);
        midpoints.push(value / 2 + currentSegmentBottomXPos);
        currentSegmentBottomXPos += value;
        maximum = maximum > value ? maximum : value;
        total += value;
      });

      return [
        category.code.toLowerCase(),
        {
          datapoints,
          maximum,
          midpoints,
          total,
        },
      ];
    }),
  );

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
      if (chartType === chartTypes.bar || chartType === chartTypes.row) {
        yValue = dataForCategory.maximum;
      } else if (
        (chartType === chartTypes.stackedBar ||
          chartType === chartTypes.stackedRow) &&
        stacking === stackingOptions.normal.value
      ) {
        yValue = dataForCategory.midpoints[seriesIndex];
      } else if (
        (chartType === chartTypes.stackedBar ||
          chartType === chartTypes.stackedRow) &&
        stacking === stackingOptions.percent.value
      ) {
        const scalingFactor = dataForCategory.total / 100;
        yValue = dataForCategory.midpoints[seriesIndex] / scalingFactor;
      } else {
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
