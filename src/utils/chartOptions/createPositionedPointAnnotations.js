import * as R from 'ramda';
import { getReferenceLetter } from './getReferenceLetter';

const diameter = 16;
const diameterPx = `${diameter}px`;
const fontColors = {
  dark: '#101D40',
  normal: '#586179',
};

const style = `
display: block;
width: ${diameterPx};
height: ${diameterPx};
// border: 1px solid ${fontColors.normal};
border-radius: 50%;
background-color: black;
text-align: center;
color: white;
transform: translateY(10px);
`;

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
      if (!categoryIndex === -1) return;

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

      const referenceLetter = getReferenceLetter(index);

      return {
        ...annotation,
        useHTML: true,
        shape: 'rect',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'black',
        padding: 0,
        distance: 0,

        point: {
          x: xValue,
          y: yValue,
          xAxis: 0,
          yAxis: 0,
        },
        text: `<span style="${style}">${referenceLetter}</span>`,
      };
    })
    .filter(R.isNotNil);

  return [
    {
      labels: positionedAnnotations,
    },
  ];
};
