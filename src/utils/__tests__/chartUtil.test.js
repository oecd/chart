import * as R from 'ramda';

import {
  baselineColor,
  chartTypes,
  frequencyTypes,
} from '../../constants/chart';
import {
  addColorAlpha,
  deepMergeUserOptionsWithDefaultOptions,
  getCreateOptionsFuncForChartType,
  makeColorReadableOnBackgroundColor,
  replaceVarsNameByVarsValue,
  replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax,
  tryCastAllToDatesAndDetectFormat,
} from '../chartUtil';

describe('chartUtil', () => {
  describe('makeColorReadableOnBackgroundColor', () => {
    test('should darken pale colors', () => {
      expect(makeColorReadableOnBackgroundColor('yellow', 'white')).toEqual(
        '#666600',
      );
      expect(makeColorReadableOnBackgroundColor('white', 'white')).toEqual(
        '#b3b3b3',
      );
    });

    test('should not darken color if dark enough', () => {
      expect(makeColorReadableOnBackgroundColor('#666600', 'white')).toEqual(
        '#666600',
      );
      expect(makeColorReadableOnBackgroundColor('black', 'white')).toEqual(
        '#000000',
      );
    });
  });

  describe('deepMergeUserOptionsWithDefaultOptions', () => {
    test('should merge options correctly', () => {
      const defaultOptions = {
        series: [
          { data: [1, 2, 3], defaultSeries1Option: true },
          { data: [4, 5, 6] },
        ],
        colorAxis: [{ aaa: 1 }, { bbb: 2 }],
      };

      const overrideOptions = {
        series: [{ data: [100, 200, 300], overriveSeries1Option: true }],
        addedOption: 3,
        colorAxis: {
          minColor: '#fff',
          maxColor: '#000',
          min: 0,
          max: 40,
        },
      };

      const result = deepMergeUserOptionsWithDefaultOptions(
        defaultOptions,
        overrideOptions,
      );

      expect(result).toEqual({
        series: [
          {
            data: [100, 200, 300],
            defaultSeries1Option: true,
            overriveSeries1Option: true,
          },
          { data: [4, 5, 6] },
        ],
        addedOption: 3,
        colorAxis: [
          {
            minColor: '#fff',
            maxColor: '#000',
            min: 0,
            max: 40,
            aaa: 1,
            dataClasses: [],
          },
          { bbb: 2 },
        ],
      });
    });
  });

  describe('addColorAlpha', () => {
    test('should handle negative value', () => {
      expect(addColorAlpha('#000000', -0.4)).toEqual('#00000099');
      expect(addColorAlpha('#000000', -1)).toEqual('#00000000');
    });

    test('should handle too large value', () => {
      expect(addColorAlpha('#00000099', 0.4)).toEqual('#000000ff');
      expect(addColorAlpha('#00000099', 0.8)).toEqual('#000000ff');
    });
  });

  describe('tryCastAllToDatesAndDetectFormat', () => {
    test('should not detect unlikely real years', () => {
      expect(tryCastAllToDatesAndDetectFormat(['1495', '1500'])).toEqual({
        dateFormat: null,
        dates: null,
        isSuccessful: false,
      });

      expect(tryCastAllToDatesAndDetectFormat(['2001', '2501'])).toEqual({
        dateFormat: null,
        dates: null,
        isSuccessful: false,
      });
    });

    test('should not detect if at least one value cannot be casted', () => {
      expect(
        tryCastAllToDatesAndDetectFormat(['2000', '2005', '2009a']),
      ).toEqual({
        dateFormat: null,
        dates: null,
        isSuccessful: false,
      });
    });

    test('should detect quinquennial', () => {
      expect(
        tryCastAllToDatesAndDetectFormat(['2000', '2005', '2010']),
      ).toEqual({
        dateFormat: frequencyTypes.quinquennial.value,
        dates: [946684800000, 1104537600000, 1262304000000],
        isSuccessful: true,
      });
    });

    test('should detect yearly', () => {
      expect(
        tryCastAllToDatesAndDetectFormat(['2000', '2005', '2009']),
      ).toEqual({
        dateFormat: frequencyTypes.yearly.value,
        dates: [946684800000, 1104537600000, 1230768000000],
        isSuccessful: true,
      });
    });

    test('should detect quarterly', () => {
      expect(
        tryCastAllToDatesAndDetectFormat(['2000-Q1', '2000-Q3', '2000-Q4']),
      ).toEqual({
        dateFormat: frequencyTypes.quarterly.value,
        dates: [946684800000, 962409600000, 970358400000],
        isSuccessful: true,
      });
    });

    test('should detect monthly', () => {
      expect(
        tryCastAllToDatesAndDetectFormat(['2000-01', '2000-03', '2000-12']),
      ).toEqual({
        dateFormat: frequencyTypes.monthly.value,
        dates: [946684800000, 951868800000, 975628800000],
        isSuccessful: true,
      });
    });
  });

  describe('replaceVarsNameByVarsValue', () => {
    test('should replace vars by values', () => {
      expect(
        replaceVarsNameByVarsValue('some text {var1} some other text', {
          var1: 'value1',
        }),
      ).toEqual('some text value1 some other text');
    });

    test('should replace vars by blank if missing values', () => {
      expect(
        replaceVarsNameByVarsValue('some text {var1} some other text', {
          var2: 'value2',
        }),
      ).toEqual('some text  some other text');
    });

    test('should not replace unsupported vars', () => {
      expect(
        replaceVarsNameByVarsValue(
          'some text {var0} - {var11} some other text',
          {
            var0: 'value0',
            var11: 'value11',
          },
        ),
      ).toEqual('some text {var0} - {var11} some other text');
    });
  });

  describe('replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax', () => {
    test('should replace vars by values', () => {
      const mapping = { CODE1: 'Value 1', CODE2: 'Value 2' };
      expect(
        replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
          string: 'some text {var1} some other text',
          vars: {
            var1: 'code1|code2',
          },
          mapping,
        }),
      ).toEqual('some text Value 1, Value 2 some other text');
    });

    test('should detect codes as dates and replace vars by formated values (if labels are not defined)', () => {
      const mapping = {};
      expect(
        replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
          string: 'some text {var1} some other text',
          vars: {
            var1: '2000-Q1',
          },
          mapping,
        }),
      ).toEqual('some text Q1-2000 some other text');
    });

    test('should not detect dates if code are dates but not labels', () => {
      const mapping = { '2000-Q1': 'Aaaaa' };
      expect(
        replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
          string: 'some text {var1} some other text',
          vars: {
            var1: '2000-Q1',
          },
          mapping,
        }),
      ).toEqual('some text Aaaaa some other text');
    });

    test('should replace latest_min and latest_max vars', () => {
      const mapping = {};
      expect(
        replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
          string: 'some text {latest_min} - {latest_max} some other text',
          vars: {},
          latestMin: 'Min',
          latestMax: 'Max',
          mapping,
        }),
      ).toEqual('some text Min - Max some other text');
    });
  });

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
        config.colorPalette[4],
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
