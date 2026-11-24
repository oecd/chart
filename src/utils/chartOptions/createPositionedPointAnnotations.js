// @ts-check

import * as R from 'ramda';
import { chartTypes } from '../../constants/chart';

/**
 * @param {{
 * annotations: import('./annotation').IndexedPointAnnotation[];
 * data: {
 *   series: { code: string; data: { value: number | null }[] }[];
 *   categories: { code: string }[];
 * };
 * categoriesFrequency: { tryParse: (str: string) => Date | false } | null;
 * areCategoriesDates: boolean;
 * chartType: typeof chartTypes[keyof typeof chartTypes];
 * chartType: import("./annotation").ChartType;
 *}} options
 * @returns {import('./annotation').PositionedPointAnnotation[]}
 */
export const createPositionedPointAnnotations = ({
  annotations,
  data,
  categoriesFrequency,
  areCategoriesDates,
  chartType,
}) => {
  /**
   * @type {Map<string, {
   *   datapoints: number[],
   *   maximum: number,
   *   midpoints: number[]
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
       
       data.series.forEach((series) => {
         const value = series.data[index].value ?? 0
         datapoints.push(value);
         midpoints.push(value / 2 + currentSegmentBottomXPos);
         currentSegmentBottomXPos += value;
         maximum = maximum > value ? maximum : value;
       });
       
       return [category.code.toLowerCase(), {
         datapoints,
         maximum,
         midpoints,
       }];
    })
  );

  console.log('dataByCategories', dataByCategories); //DEBUG

  const positionedAnnotations = annotations
    .map((annotation) => {
      const categoryIndex = data.categories.findIndex(
        (category) => category.code.toLowerCase() === annotation.categoryCode,
      );
      if (categoryIndex === -1) {
        return;
      }

      const seriesIndex = data.series.findIndex(
        (series) => series.code.toLowerCase() == annotation.seriesCode,
      );
      if (seriesIndex === -1) {
        return;
      }

      let yValue;
      if (chartType === chartTypes.bar || chartType === chartTypes.row) {
        yValue = dataByCategories.get(annotation.categoryCode)?.maximum ?? 0;
      } else if (chartType === chartTypes.stackedBar || chartType === chartTypes.stackedRow) {
        yValue =
          dataByCategories.get(annotation.categoryCode)?.midpoints[
            seriesIndex
          ] ?? 0;
      } else {
        yValue =
          dataByCategories.get(annotation.categoryCode)?.datapoints[seriesIndex] ?? 0;
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
