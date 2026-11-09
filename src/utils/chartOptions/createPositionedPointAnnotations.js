import * as R from 'ramda';
import { chartTypes } from '../../constants/chart';

const zip = (lists) => {
  const length = Math.min(...lists.map((list) => list.length));
  let result = [];
  for (let i = 0; i < length; i++) {
    result.push(lists.map((list) => list[i]));
  }
  return result;
};

export const createPositionedPointAnnotations = (
  annotations,
  data,
  categoriesFrequency,
  areCategoriesDates,
  chartType,
) => {
  let allSeries = R.pluck('data', data.series);
  let zippedSeries = zip(allSeries);
  let maxValuePerIndex = zippedSeries.map((tuple) =>
    Math.max(...R.pluck('value', tuple)),
  );

  const positionedAnnotations = annotations
    .map((annotation, index) => {
      const categoryIndex = data.categories.findIndex(
        (category) => category.code === annotation.categoryCode,
      );
      if (categoryIndex === -1) return;

      const seriesForAnnotation = data.series.find(
        (series) => series.code == annotation.seriesCode,
      );
      if (!seriesForAnnotation) return;

      let yValue = chartType === chartTypes.bar
        ? maxValuePerIndex[categoryIndex]
        : seriesForAnnotation.data[categoryIndex].value;

      let category = data.categories[categoryIndex];
      let timestamp = areCategoriesDates
        ? categoriesFrequency.tryParse(category.code)
        : null;
      if (areCategoriesDates && !timestamp) return;

      let xValue = areCategoriesDates ? timestamp : categoryIndex;

      return {
        ...annotation,
        point: {
          x: xValue,
          y: yValue,
          xAxis: 0,
          yAxis: 0,
        },
      };
    })
    .filter(R.isNotNil);

  return positionedAnnotations;
};
