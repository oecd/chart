import * as R from 'ramda';

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

      // let yValue = seriesForAnnotation.data[categoryIndex].value;
      let yValue = maxValuePerIndex[categoryIndex];

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
