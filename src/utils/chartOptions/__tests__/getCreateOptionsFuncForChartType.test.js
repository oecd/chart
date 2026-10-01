import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartTypes,
  nonHighlightedOpacity,
} from '../../../constants/chart';
import { getCreateOptionsFuncForChartType } from '../getCreateOptionsFuncForChartType';

describe('getCreateOptionsFuncForChartType', () => {
  describe('series colors', () => {
    const data = {
      categories: R.map(
        (i) => ({ code: `category${i}`, label: `category${i}` }),
        R.times(R.identity, 5),
      ),
      series: R.map(
        (i) => ({
          code: `series${i}`,
          label: `series${i}`,
          data: R.map((v) => ({ value: v }), R.times(R.identity, 5)),
        }),
        R.times(R.identity, 5),
      ),
      otherDimensions: [],
      areCategoriesDates: false,
      areCategoriesNumbers: false,
      areSeriesDates: false,
      areSeriesNumbers: false,
      codeLabelMapping: R.concat(
        R.map((i) => [`CATEGORY${i}`, `category${i}`], R.times(R.identity, 5)),
        R.map((i) => [`SERIES${i}`, `category${i}`], R.times(R.identity, 5)),
      ),
    };

    const config = {
      chartType: chartTypes.line,
      data,
      baseline: '',
      highlight: '',
      colorPalette: [
        '#264042',
        '#3F5E60',
        '#587C7E',
        '#719B9C',
        '#8AB9B9',
        '#A3D7D7',
        '#9DEAE5',
      ],
      highlightColors: [
        '#E5DC89',
        '#F2C786',
        '#E5AB6E',
        '#D88F57',
        '#CB733F',
        '#BE5727',
        '#B13B10',
      ],
      highlightOutlineColors: [
        '#D1C12F',
        '#E79720',
        '#C97824',
        '#AC6127',
        '#924F27',
        '#853C1B',
        '#7B290B',
      ],
    };

    const smallerColorPalettes = [
      '#264042',
      '#2F5C60',
      '#719B9C',
      '#8DC2C3',
      '#9DEAE5',
    ];

    test('should use the color palette in order', async () => {
      const createOptionsFunc = await getCreateOptionsFuncForChartType(
        chartTypes.line,
      );

      const options = createOptionsFunc(config);
      const seriesColors = R.map(R.prop('color'), options.series);

      expect(seriesColors).toEqual([
        config.colorPalette[0],
        config.colorPalette[1],
        config.colorPalette[2],
        config.colorPalette[3],
        config.colorPalette[4],
      ]);
    });

    test('should use the highlight color palette in order and baseline', async () => {
      const createOptionsFunc = await getCreateOptionsFuncForChartType(
        chartTypes.line,
      );

      const options = createOptionsFunc({
        ...config,
        baseline: 'series0|SERIES1',
        highlight: 'series2|SERIES3',
      });
      const seriesColors = R.map(R.prop('color'), options.series);

      expect(seriesColors).toEqual([
        baselineColor,
        baselineColor,
        config.highlightColors[0],
        config.highlightColors[1],
        new TinyColor(config.colorPalette[4])
          .setAlpha(nonHighlightedOpacity)
          .toString(),
      ]);
    });

    test('should use smallerColorPalettes', async () => {
      const createOptionsFunc = await getCreateOptionsFuncForChartType(
        chartTypes.line,
      );

      const options = createOptionsFunc({
        ...config,
        smallerColorPalettes: [smallerColorPalettes],
      });
      const seriesColors = R.map(R.prop('color'), options.series);

      expect(seriesColors).toEqual(smallerColorPalettes);
    });

    test('invalid indexes should be ignored for fixedColorIndexBySeries', async () => {
      const createOptionsFunc = await getCreateOptionsFuncForChartType(
        chartTypes.line,
      );

      const options = createOptionsFunc({
        ...config,
        fixedColorIndexBySeries: 'series0,0\nseries2,8\nseries3,aaa',
      });
      const seriesColors = R.map(R.prop('color'), options.series);

      expect(seriesColors).toEqual([
        config.colorPalette[0],
        config.colorPalette[1],
        config.colorPalette[2],
        config.colorPalette[3],
        config.colorPalette[4],
      ]);
    });

    test('should use fixedColorIndexBySeries and not smallerColorPalettes', async () => {
      const createOptionsFunc = await getCreateOptionsFuncForChartType(
        chartTypes.line,
      );

      const options = createOptionsFunc({
        ...config,
        smallerColorPalettes: [smallerColorPalettes],
        fixedColorIndexBySeries: 'series0,3\nseries2,5',
      });
      const seriesColors = R.map(R.prop('color'), options.series);

      expect(seriesColors).toEqual([
        config.colorPalette[2],
        config.colorPalette[1],
        config.colorPalette[4],
        config.colorPalette[5],
        config.colorPalette[6],
      ]);
    });

    test('fixedColorIndexBySeries should use categories for pie chart', async () => {
      const createOptionsFunc = await getCreateOptionsFuncForChartType(
        chartTypes.pie,
      );

      const options = createOptionsFunc({
        ...config,
        chartType: chartTypes.pie,
        fixedColorIndexBySeries: 'category0,3\ncategory2,5',
      });
      const seriesColors = R.map(R.prop('color'), options.series[0].data);

      expect(seriesColors).toEqual([
        config.colorPalette[2],
        config.colorPalette[1],
        config.colorPalette[4],
        config.colorPalette[5],
        config.colorPalette[6],
      ]);
    });
  });
});
