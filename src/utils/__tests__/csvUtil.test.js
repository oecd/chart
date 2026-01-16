import * as R from 'ramda';

import {
  chartTypes,
  dataSourceTypes,
  frequencyTypes,
  sortByOptions,
  sortOrderOptions,
} from '../../constants/chart';
import {
  parseCSV,
  filterCSV,
  pivotCSV,
  addParsingHelperData,
  createCodeLabelMapping,
  transformValues,
  extractMetadata,
  handleAreCategoriesAndSeriesDates,
  handleAreCategoriesAndSeriesNumbers,
  sortCSV,
  parseData,
  sortParsedDataOnYAxis,
  addCodeLabelMapping,
} from '../csvUtil';
import { avgCode } from '../configUtil';

describe('csvUtil', () => {
  describe('parseCSV', () => {
    const csvData = `Category   ,   CO2   ,CH4
BRA   , 1 ,   2

MEX,3,4
"Label with, comma",5,6
`;

    const parsedCsvData = [
      ['Category', 'CO2', 'CH4'],
      ['BRA', 1, 2],
      ['MEX', 3, 4],
      ['Label with, comma', 5, 6],
    ];

    test('basic CSV parsing', () => {
      const result = parseCSV(csvData);

      expect(result).toEqual(parsedCsvData);
    });

    test('should normalize row length', () => {
      expect(
        parseCSV(`Category,CO2
BRA,1,2
MEX,3,4
`),
      ).toEqual([
        ['Category', 'CO2', null],
        ['BRA', 1, 2],
        ['MEX', 3, 4],
      ]);

      expect(
        parseCSV(`Category,CO2,CH4
BRA
MEX
`),
      ).toEqual([
        ['Category', 'CO2', 'CH4'],
        ['BRA', null, null],
        ['MEX', null, null],
      ]);
    });
  });

  describe('filterCSV', () => {
    test('full dataset should be retured when no filter columns are defined', () => {
      const data = [
        ['Category', 'CO2', 'CH4'],
        ['BRA', { value: 1 }, { value: 2 }],
        ['MEX', { value: 2 }, { value: 3 }],
        ['FRA', { value: 4 }, { value: 5 }],
      ];

      const vars = { var1: 'FRA' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: data,
      });
    });

    test('filtering on first column should allow multi selection and keep first column', () => {
      const data = [
        ['{var1}', 'CO2', 'CH4'],
        ['BRA', { value: 1 }, { value: 2 }],
        ['MEX', { value: 2 }, { value: 3 }],
        ['FRA', { value: 4 }, { value: 5 }],
      ];

      const varsWithOnValue = { var1: 'BRA' };
      const filterFunctionWithOneValue = filterCSV({ vars: varsWithOnValue });

      expect(filterFunctionWithOneValue(data)).toEqual({
        data: [
          ['{var1}', 'CO2', 'CH4'],
          ['BRA', { value: 1 }, { value: 2 }],
        ],
        varsThatCauseNewPreParsedDataFetch: varsWithOnValue,
      });

      const varsWithSeveralValues = { var1: 'BRA|MEX' };
      const filterFunctionWithSeveralValues = filterCSV({
        vars: varsWithSeveralValues,
      });

      expect(filterFunctionWithSeveralValues(data)).toEqual({
        data: [
          ['{var1}', 'CO2', 'CH4'],
          ['BRA', { value: 1 }, { value: 2 }],
          ['MEX', { value: 2 }, { value: 3 }],
        ],
        varsThatCauseNewPreParsedDataFetch: varsWithSeveralValues,
      });
    });

    test('filtering on any other column(s) (but not first one) should allow single selection and not keep the column(s)', () => {
      const data = [
        ['Category', 'CO2', 'CH4', '{var1}', '{var10}'],
        ['BRA', { value: 1 }, { value: 2 }, { value: 'A1' }, { value: 'A2' }],
        ['BRA', { value: 2 }, { value: 3 }, { value: 'B1' }, { value: 'B2' }],
        ['BRA', { value: 4 }, { value: 5 }, { value: 'C1' }, { value: 'C2' }],
        ['MEX', { value: 6 }, { value: 7 }, { value: 'A1' }, { value: 'A2' }],
        ['MEX', { value: 8 }, { value: 9 }, { value: 'B1' }, { value: 'B2' }],
        ['MEX', { value: 10 }, { value: 11 }, { value: 'C1' }, { value: 'C2' }],
        ['FRA', { value: 12 }, { value: 13 }, { value: 'A1' }, { value: 'A2' }],
        ['FRA', { value: 14 }, { value: 15 }, { value: 'B1' }, { value: 'B2' }],
        ['FRA', { value: 16 }, { value: 17 }, { value: 'C1' }, { value: 'C2' }],
      ];

      const vars = { var1: 'B1', var10: 'B2' };

      const filterFunctionWithOneValue = filterCSV({ vars });

      expect(filterFunctionWithOneValue(data)).toEqual({
        data: [
          ['Category', 'CO2', 'CH4'],
          ['BRA', { value: 2 }, { value: 3 }],
          ['MEX', { value: 8 }, { value: 9 }],
          ['FRA', { value: 14 }, { value: 15 }],
        ],
        varsThatCauseNewPreParsedDataFetch: vars,
      });
    });

    test('filtering on first column should allow range selection for month dates and keep first column', () => {
      const data = [
        ['[{var2}-{var4}]', 'CO2', 'CH4'],
        ['2010-06', { value: 1 }, { value: 2 }],
        ['2015-05', { value: 2 }, { value: 3 }],
        ['2000-01', { value: 4 }, { value: 5 }],
      ];

      const vars = { var2: '2000-01', var4: '2010-06' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: [
          ['[{var2}-{var4}]', 'CO2', 'CH4'],
          ['2010-06', { value: 1 }, { value: 2 }],
          ['2000-01', { value: 4 }, { value: 5 }],
        ],
        varsThatCauseNewPreParsedDataFetch: vars,
      });
    });

    test('filtering on first column should allow range selection for quarter dates and keep first column', () => {
      const data = [
        ['[{var2}-{var4}]', 'CO2', 'CH4'],
        ['2010-Q2', { value: 1 }, { value: 2 }],
        ['2015-Q3', { value: 2 }, { value: 3 }],
        ['2000-Q1', { value: 4 }, { value: 5 }],
      ];

      const vars = { var2: '2000-Q1', var4: '2010-Q2' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: [
          ['[{var2}-{var4}]', 'CO2', 'CH4'],
          ['2010-Q2', { value: 1 }, { value: 2 }],
          ['2000-Q1', { value: 4 }, { value: 5 }],
        ],
        varsThatCauseNewPreParsedDataFetch: vars,
      });
    });

    test('filtering on first column should allow range selection for year dates and keep first column', () => {
      const data = [
        ['[{var2}-{var4}]', 'CO2', 'CH4'],
        ['2009', { value: 1 }, { value: 2 }],
        ['2015', { value: 2 }, { value: 3 }],
        ['2000', { value: 4 }, { value: 5 }],
      ];

      const vars = { var2: '2000', var4: '2010' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: [
          ['[{var2}-{var4}]', 'CO2', 'CH4'],
          ['2009', { value: 1 }, { value: 2 }],
          ['2000', { value: 4 }, { value: 5 }],
        ],
        varsThatCauseNewPreParsedDataFetch: vars,
      });
    });

    test('filtering on first column should allow range selection for quinquennial dates and keep first column', () => {
      const data = [
        ['[{var2}-{var4}]', 'CO2', 'CH4'],
        ['2010', { value: 1 }, { value: 2 }],
        ['2015', { value: 2 }, { value: 3 }],
        ['2000', { value: 4 }, { value: 5 }],
      ];

      const vars = { var2: '2000', var4: '2010' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: [
          ['[{var2}-{var4}]', 'CO2', 'CH4'],
          ['2010', { value: 1 }, { value: 2 }],
          ['2000', { value: 4 }, { value: 5 }],
        ],
        varsThatCauseNewPreParsedDataFetch: vars,
      });
    });

    test('filtering on first column should not work for incompatible types and keep first column', () => {
      const data = [
        ['[{var2}-{var4}]', 'CO2', 'CH4'],
        ['AAA', [{ value: 1 }], { value: 2 }],
        ['BBB', { value: 2 }, { value: 3 }],
        ['CCC', { value: 4 }, { value: 5 }],
      ];

      const vars = { var2: 'AAA', var4: 'CCC' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: [['[{var2}-{var4}]', 'CO2', 'CH4']],
        varsThatCauseNewPreParsedDataFetch: {},
      });
    });

    test('filtering on first column should allow range selection for numerics and keep first column', () => {
      const data = [
        ['[{var2}-{var4}]', 'CO2', 'CH4'],
        ['300', { value: 1 }, { value: 2 }],
        ['2000', { value: 2 }, { value: 3 }],
        ['200', { value: 4 }, { value: 5 }],
      ];

      const vars = { var2: '150', var4: '300' };
      const filterFunction = filterCSV({ vars });

      expect(filterFunction(data)).toEqual({
        data: [
          ['[{var2}-{var4}]', 'CO2', 'CH4'],
          ['300', { value: 1 }, { value: 2 }],
          ['200', { value: 4 }, { value: 5 }],
        ],
        varsThatCauseNewPreParsedDataFetch: vars,
      });
    });

    const minMaxData = [
      ['Categories', 'CO2', 'IGNORED_SERIES'],
      ['ITA', { value: 4 }, { value: 40 }],
      ['FRA', { value: 1 }, { value: 10 }],
      ['BRA', { value: 2 }, { value: 20 }],
      ['USA', { value: 5 }, { value: 50 }],
      ['MEX', { value: 3 }, { value: 30 }],
    ];

    test('filtering (SymbolMinMax) should return min and max', () => {
      const varsToAddRows = {};
      const filterFunction = filterCSV({
        vars: varsToAddRows,
        chartType: chartTypes.symbolMinMax,
        calcAvgValue: false,
      });

      expect(filterFunction(minMaxData)).toEqual({
        data: [
          ['Categories', 'CO2'],
          ['FRA', { value: 1, custom: { isMin: true } }],
          ['USA', { value: 5, custom: { isMax: true } }],
        ],
      });
    });

    test('filtering (SymbolMinMax) should return min, max and avg', () => {
      const varsToAddRows = {};
      const filterFunction = filterCSV({
        vars: varsToAddRows,
        chartType: chartTypes.symbolMinMax,
        calcAvgValue: true,
      });

      expect(filterFunction(minMaxData)).toEqual({
        data: [
          ['Categories', 'CO2'],
          ['FRA', { value: 1, custom: { isMin: true } }],
          [avgCode, { value: 3, custom: { isAvg: true } }],
          ['USA', { value: 5, custom: { isMax: true } }],
        ],
      });
    });

    test('filtering (SymbolMinMax) should return min, max, avg and additional rows', () => {
      const minMaxDataWithVar = R.assocPath([0, 0], '{var1}', minMaxData);

      const varsToAddRows = { var1: 'BRA|ITA|FRA|USA' };
      const filterFunction = filterCSV({
        vars: varsToAddRows,
        chartType: chartTypes.symbolMinMax,
        calcAvgValue: true,
      });

      expect(filterFunction(minMaxDataWithVar)).toEqual({
        data: [
          ['{var1}', 'CO2'],
          ['FRA', { value: 1, custom: { isMin: true } }],
          [avgCode, { value: 3, custom: { isAvg: true } }],
          ['USA', { value: 5, custom: { isMax: true } }],
          ['ITA', { value: 4 }],
          ['BRA', { value: 2 }],
        ],
        varsThatCauseNewPreParsedDataFetch: varsToAddRows,
      });
    });

    test('filtering (SymbolMinMax) should return min, max and specified reference value as avg', () => {
      const varsToAddRows = {};
      const filterFunction = filterCSV({
        vars: varsToAddRows,
        chartType: chartTypes.symbolMinMax,
        calcAvgValue: false,
        referenceValueCode: 'MEX',
      });

      expect(filterFunction(minMaxData)).toEqual({
        data: [
          ['Categories', 'CO2'],
          ['FRA', { value: 1, custom: { isMin: true } }],
          ['MEX', { value: 3, custom: { isAvg: true } }],
          ['USA', { value: 5, custom: { isMax: true } }],
        ],
      });
    });

    test('filtering (SymbolMinMax) should return min, max but not specified reference value as avg (since equals to max)', () => {
      const varsToAddRows = {};
      const filterFunction = filterCSV({
        vars: varsToAddRows,
        chartType: chartTypes.symbolMinMax,
        calcAvgValue: false,
        referenceValueCode: 'USA',
      });

      expect(filterFunction(minMaxData)).toEqual({
        data: [
          ['Categories', 'CO2'],
          ['FRA', { value: 1, custom: { isMin: true } }],
          ['USA', { value: 5, custom: { isMax: true } }],
        ],
      });
    });
  });

  describe('pivotCSV', () => {
    const data = {
      data: [
        ['Category', 'CO2', 'CH4'],
        ['BRA', { value: 1 }, { value: 2 }],
        ['MEX', { value: 3 }, { value: 4 }],
        ['FRA', { value: 5 }, { value: 6 }],
      ],
    };

    const pivotedData = {
      data: [
        ['Category', 'BRA', 'MEX', 'FRA'],
        ['CO2', { value: 1 }, { value: 3 }, { value: 5 }],
        ['CH4', { value: 2 }, { value: 4 }, { value: 6 }],
      ],
    };

    test('basic pivot data', () => {
      const pivotFunction = pivotCSV(
        chartTypes.line,
        dataSourceTypes.csv.value,
        true,
      );

      const result = pivotFunction(data);

      expect(result).toEqual(pivotedData);
    });

    test('should not pivot when pivotData is false', () => {
      const pivotFunction = pivotCSV(
        chartTypes.line,
        dataSourceTypes.csv.value,
        false,
      );

      const result = pivotFunction(data);

      expect(result).toEqual(data);
    });

    test('should automatically pivot even when pivotData is false', () => {
      const oneCategoryData = R.modify('data', R.take(2), data);
      const oneCategoryPivotedData = R.modify(
        'data',
        R.map(R.take(2)),
        pivotedData,
      );

      R.forEach(
        (ct) => {
          const pivotFunction = pivotCSV(ct, dataSourceTypes.csv.value, false);

          const result = pivotFunction(oneCategoryData);

          expect(result).toEqual(oneCategoryPivotedData);
        },
        [chartTypes.bar, chartTypes.row, chartTypes.line, chartTypes.pie],
      );

      const oneSeriesData = R.modify('data', R.map(R.take(2)), data);
      const oneSeriesPivotedData = R.modify('data', R.take(2), pivotedData);

      R.forEach(
        (ct) => {
          const pivotFunction = pivotCSV(ct, dataSourceTypes.csv.value, false);

          const result = pivotFunction(oneSeriesData);

          expect(result).toEqual(oneSeriesPivotedData);
        },
        [chartTypes.stackedBar, chartTypes.stackedRow],
      );
    });

    test('should not pivot even when pivotData is true when only one series', () => {
      const oneSeriesData = R.modify('data', R.map(R.take(2)), data);

      R.forEach(
        (ct) => {
          const pivotFunction = pivotCSV(ct, dataSourceTypes.csv.value, true);

          const result = pivotFunction(oneSeriesData);

          expect(result).toEqual(oneSeriesData);
        },
        [chartTypes.line, chartTypes.radar],
      );
    });

    test('should not pivot even when pivotData is true for map and .Stat datasource', () => {
      const pivotFunction = pivotCSV(
        chartTypes.map,
        dataSourceTypes.dotStat.value,
        true,
      );

      const result = pivotFunction(data);

      expect(result).toEqual(data);
    });

    test('should not pivot even when pivotData is true and dotStatXAxisDimension, dotStatYAxisDimension are defined', () => {
      const pivotFunction = pivotCSV(
        chartTypes.line,
        dataSourceTypes.dotStat.value,
        true,
        'dim1',
        'dim2',
      );

      const result = pivotFunction(data);

      expect(result).toEqual(data);
    });
  });

  describe('addParsingHelperData', () => {
    test('parsing helper data should handle empty project and chart level mappings', () => {
      const data = {
        data: [
          ['Category', 'CO2', 'CH4'],
          ['BRA', { value: 1 }, { value: 2 }],
          ['MEX', { value: 3 }, { value: 4 }],
          ['FRA', { value: 5 }, { value: 6 }],
        ],
      };

      const mappingProjectLevel = '';

      const mappingChartLevel = '';

      const vars = {};

      const addParsingFunction = addParsingHelperData(
        mappingProjectLevel,
        mappingChartLevel,
        vars,
      );

      const { data: resultData, parsingHelperData } = addParsingFunction(data);

      expect(resultData).toEqual(data.data);
      expect(parsingHelperData).toEqual({
        xDimensionLabelByCode: {
          BRA: 'BRA',
          FRA: 'FRA',
          MEX: 'MEX',
        },
        yDimensionLabelByCode: { CH4: 'CH4', CO2: 'CO2' },
        otherDimensionsLabelByCode: {},
      });
    });

    test('parsing helper data should use project and chart level mappings and handle vars', () => {
      const data = {
        data: [
          ['Category', 'CO2', 'CH4'],
          ['BRA', { value: 1 }, { value: 2 }],
          ['MEX', { value: 3 }, { value: 4 }],
          ['FRA', { value: 5 }, { value: 6 }],
        ],
      };

      const mappingProjectLevel = `
BRA,Brazil PL
MEX,Mexico PL
VAR1,Variable 1 PL
`;

      const mappingChartLevel = `
BRA,Brazil CL
CO2,Carbon Dioxide CL
VAR1,Variable 1 CL
VAR2,Variable 2 CL
`;

      const vars = { var1: 'VAR1', var2: 'VAR2' };

      const addParsingFunction = addParsingHelperData(
        mappingProjectLevel,
        mappingChartLevel,
        vars,
      );

      const { data: resultData, parsingHelperData } = addParsingFunction(data);

      expect(resultData).toEqual(data.data);
      expect(parsingHelperData).toEqual({
        xDimensionLabelByCode: {
          BRA: 'Brazil CL',
          FRA: 'FRA',
          MEX: 'Mexico PL',
        },
        yDimensionLabelByCode: { CH4: 'CH4', CO2: 'Carbon Dioxide CL' },
        otherDimensionsLabelByCode: {
          BRA: 'Brazil CL',
          CO2: 'Carbon Dioxide CL',
          MEX: 'Mexico PL',
          VAR1: 'Variable 1 CL',
          VAR2: 'Variable 2 CL',
        },
      });
    });
  });

  describe('createCodeLabelMapping', () => {
    test('should override correctly', () => {
      const dotStatDimensions = [
        {
          members: { BRA: { labels: { en: 'Brazil .Stat' } } },
        },
      ];
      const mappingProjectLevel = 'BRA,Brazil PL';
      const mappingChartLevel = 'BRA,Brazil CL';

      const resultChartLevelWins = createCodeLabelMapping({
        csvCodeLabelMappingProjectLevel: mappingProjectLevel,
        codeLabelMappingChartLevel: mappingChartLevel,
        dotStatDimensions,
      });

      expect(resultChartLevelWins).toEqual({ BRA: 'Brazil CL' });

      const resultProjectLevelWins = createCodeLabelMapping({
        csvCodeLabelMappingProjectLevel: mappingProjectLevel,
        codeLabelMappingChartLevel: '',
        dotStatDimensions,
      });

      expect(resultProjectLevelWins).toEqual({ BRA: 'Brazil PL' });

      const resultDotStatlWins = createCodeLabelMapping({
        csvCodeLabelMappingProjectLevel: '',
        codeLabelMappingChartLevel: '',
        dotStatDimensions,
      });

      expect(resultDotStatlWins).toEqual({ BRA: 'Brazil .Stat' });
    });

    test('should use the correct lang for .Stat dimensions', () => {
      const dotStatDimensions = [
        {
          members: { BRA: { labels: { en: 'Brazil EN', fr: 'Brazil FR' } } },
        },
      ];

      const resultNoLang = createCodeLabelMapping({
        dotStatDimensions,
      });

      expect(resultNoLang).toEqual({ BRA: 'Brazil EN' });

      const resultFr = createCodeLabelMapping({
        dotStatDimensions,
        lang: 'fr',
      });

      expect(resultFr).toEqual({ BRA: 'Brazil FR' });

      const resultLangDoesNotExist = createCodeLabelMapping({
        dotStatDimensions,
        lang: 'de',
      });

      expect(resultLangDoesNotExist).toEqual({ BRA: 'Brazil EN' });

      const dotStatDimensionsNoEn = [
        {
          members: { BRA: { labels: { es: 'Brazil ES' } } },
        },
      ];

      const resultNoEn = createCodeLabelMapping({
        dotStatDimensions: dotStatDimensionsNoEn,
        lang: 'de',
      });

      expect(resultNoEn).toEqual({ BRA: 'Brazil ES' });
    });

    test('should not use or fail with .Stat time dimensions', () => {
      const dotStatDimensions = [
        {
          members: { BRA: { labels: { en: 'Brazil .Stat' } } },
        },
        {
          id: 'TIME_PERIOD',
          timeRange: {
            startPeriod: { period: '1985-01-01T00:00:00', isInclusive: true },
            endPeriod: { period: '2023-12-31T00:00:00', isInclusive: true },
          },
          name: 'Time period',
        },
      ];
      const result = createCodeLabelMapping({
        csvCodeLabelMappingProjectLevel: '',
        codeLabelMappingChartLevel: '',
        dotStatDimensions,
      });

      expect(result).toEqual({ BRA: 'Brazil .Stat' });
    });
  });

  describe('transformValues', () => {
    test('should transform values', () => {
      const data = [
        ['Category', 'CO2', 'CH4'],
        ['BRA', 1, 2],
        ['MEX', 3, 4],
      ];

      const result = transformValues(data);

      expect(result).toEqual([
        ['Category', 'CO2', 'CH4'],
        ['BRA', { value: 1 }, { value: 2 }],
        ['MEX', { value: 3 }, { value: 4 }],
      ]);
    });
  });

  describe('extractMetadata', () => {
    test('should extract meatadata', () => {
      const data = {
        data: [
          ['Category', 'CO2', 'CH4', '{metadata1}', '{metadata2}'],
          [
            'BRA',
            { value: 1 },
            { value: 2 },
            { value: 'BRA-CO2-en,BRA-CH4-en' },
            { value: 'BRA-CO2-fr,BRA-CH4-fr' },
          ],
          [
            'MEX',
            { value: 3 },
            { value: 4 },
            { value: 'MEX metadata en' },
            { value: 'MEX metadata fr' },
          ],
          ['FRA', { value: 5 }, { value: 6 }, { value: '' }, { value: '' }],
        ],
      };

      const result = extractMetadata(data);

      expect(result).toEqual({
        data: [
          ['Category', 'CO2', 'CH4'],
          [
            'BRA',
            {
              value: 1,
              custom: { metadata1: 'BRA-CO2-en', metadata2: 'BRA-CO2-fr' },
            },
            {
              value: 2,
              custom: { metadata1: 'BRA-CH4-en', metadata2: 'BRA-CH4-fr' },
            },
          ],
          [
            'MEX',
            {
              value: 3,
              custom: {
                metadata1: 'MEX metadata en',
                metadata2: 'MEX metadata fr',
              },
            },
            {
              value: 4,
              custom: {
                metadata1: 'MEX metadata en',
                metadata2: 'MEX metadata fr',
              },
            },
          ],
          [
            'FRA',
            {
              value: 5,
              custom: { metadata1: undefined, metadata2: undefined },
            },
            {
              value: 6,
              custom: { metadata1: undefined, metadata2: undefined },
            },
          ],
        ],
      });
    });
  });

  describe('handleAreCategoriesAndSeriesDates', () => {
    test('should handle when not dates', () => {
      const data = {
        data: [
          ['Category', 'CO2', 'CH4'],
          ['BRA', { value: 1 }, { value: 2 }],
          ['MEX', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const dateFunction = handleAreCategoriesAndSeriesDates(
        chartTypes.line,
        false,
      );

      const result = dateFunction(data);

      expect(result).toEqual({
        areCategoriesDates: false,
        areSeriesDates: false,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when codes are dates and no label', () => {
      const data = {
        data: [
          ['Category', '2000', '2001'],
          ['2000-Q1', { value: 1 }, { value: 2 }],
          ['2000-Q2', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const dateFunction = handleAreCategoriesAndSeriesDates(
        chartTypes.line,
        false,
      );

      const result = dateFunction(data);

      expect(result).toEqual({
        areCategoriesDates: true,
        categoriesDateFomat: frequencyTypes.quarterly.value,
        areSeriesDates: true,
        seriesDateFomat: frequencyTypes.yearly.value,
        data: [
          ['Category', '2000', '2001'],
          [
            '2000-Q1',
            { value: 1, metadata: { parsedX: 946684800000 } },
            { value: 2, metadata: { parsedX: 946684800000 } },
          ],
          [
            '2000-Q2',
            { value: 3, metadata: { parsedX: 954547200000 } },
            { value: 4, metadata: { parsedX: 954547200000 } },
          ],
        ],
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when codes are dates but labels are not', () => {
      const data = {
        data: [
          ['Category', '2000', '2001'],
          ['2000-Q1', { value: 1 }, { value: 2 }],
          ['2000-Q2', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: { '2000-Q1': 'aaaa' },
          yDimensionLabelByCode: { 2000: 'bbbb' },
          otherDimensionsLabelByCode: {},
        },
      };

      const dateFunction = handleAreCategoriesAndSeriesDates(
        chartTypes.line,
        false,
      );

      const result = dateFunction(data);

      expect(result).toEqual({
        areCategoriesDates: false,
        areSeriesDates: false,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when dates but forceXAxisToBeTreatedAsCategories is true or chart type is not compatible', () => {
      const data = {
        data: [
          ['Category', '2000', '2001'],
          ['2000-Q1', { value: 1 }, { value: 2 }],
          ['2000-Q2', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const dateFunctionForce = handleAreCategoriesAndSeriesDates(
        chartTypes.line,
        true,
      );

      const resultForce = dateFunctionForce(data);

      expect(resultForce).toEqual({
        areCategoriesDates: true,
        categoriesDateFomat: frequencyTypes.quarterly.value,
        areSeriesDates: true,
        seriesDateFomat: frequencyTypes.yearly.value,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });

      const dateFunctionIncompatibleChartType =
        handleAreCategoriesAndSeriesDates(chartTypes.stackedBar, false);

      const resultIncompatibleChartType =
        dateFunctionIncompatibleChartType(data);

      expect(resultIncompatibleChartType).toEqual({
        areCategoriesDates: true,
        categoriesDateFomat: frequencyTypes.quarterly.value,
        areSeriesDates: true,
        seriesDateFomat: frequencyTypes.yearly.value,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });
  });

  describe('handleAreCategoriesAndSeriesNumbers', () => {
    test('should handle when not numbers', () => {
      const data = {
        data: [
          ['Category', 'CO2', 'CH4'],
          ['BRA', { value: 1 }, { value: 2 }],
          ['MEX', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const numberFunction = handleAreCategoriesAndSeriesNumbers(
        chartTypes.line,
        false,
      );

      const result = numberFunction(data);

      expect(result).toEqual({
        areCategoriesNumbers: false,
        areSeriesNumbers: false,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when codes are numbers and no label', () => {
      const data = {
        data: [
          ['Category', '10', '20'],
          ['30', { value: 1 }, { value: 2 }],
          ['40', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const numberFunction = handleAreCategoriesAndSeriesNumbers(
        chartTypes.line,
        false,
      );

      const result = numberFunction(data);

      expect(result).toEqual({
        areCategoriesNumbers: true,
        areSeriesNumbers: true,
        data: [
          ['Category', '10', '20'],
          [
            '30',
            { value: 1, metadata: { parsedX: 30 } },
            { value: 2, metadata: { parsedX: 30 } },
          ],
          [
            '40',
            { value: 3, metadata: { parsedX: 40 } },
            { value: 4, metadata: { parsedX: 40 } },
          ],
        ],
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when codes are numbers but labels are not', () => {
      const data = {
        data: [
          ['Category', '10', '20'],
          ['30', { value: 1 }, { value: 2 }],
          ['40', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: { 30: 'aaaa' },
          yDimensionLabelByCode: { 10: 'bbbb' },
          otherDimensionsLabelByCode: {},
        },
      };

      const numberFunction = handleAreCategoriesAndSeriesNumbers(
        chartTypes.line,
        false,
      );

      const result = numberFunction(data);

      expect(result).toEqual({
        areCategoriesNumbers: false,
        areSeriesNumbers: false,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when numbers but forceXAxisToBeTreatedAsCategories is true or chart type is not compatible', () => {
      const data = {
        data: [
          ['Category', '10', '20'],
          ['30', { value: 1 }, { value: 2 }],
          ['40', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const numberFunctionForce = handleAreCategoriesAndSeriesNumbers(
        chartTypes.line,
        true,
      );

      const resultForce = numberFunctionForce(data);

      expect(resultForce).toEqual({
        areCategoriesNumbers: true,
        areSeriesNumbers: true,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });

      const numberFunctionIncompatibleChartType =
        handleAreCategoriesAndSeriesNumbers(chartTypes.stackedBar, false);

      const resultIncompatibleChartType =
        numberFunctionIncompatibleChartType(data);

      expect(resultIncompatibleChartType).toEqual({
        areCategoriesNumbers: true,
        areSeriesNumbers: true,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle when numbers but already detected dates', () => {
      const data = {
        areCategoriesDates: true,
        areSeriesDates: true,
        data: [
          ['Category', '2000', '2001'],
          ['2002', { value: 1 }, { value: 2 }],
          ['2003', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const numberFunction = handleAreCategoriesAndSeriesNumbers(
        chartTypes.line,
        false,
      );

      const result = numberFunction(data);

      expect(result).toEqual({
        areCategoriesDates: true,
        areCategoriesNumbers: false,
        areSeriesDates: true,
        areSeriesNumbers: false,
        data: data.data,
        parsingHelperData: data.parsingHelperData,
      });
    });
  });

  describe('sortCSV', () => {
    test('should handle sort on categories code', () => {
      const data = {
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['Z', { value: 1 }, { value: 2 }],
          ['A', { value: 3 }, { value: 4 }],
          ['É', { value: 5 }, { value: 6 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const sortFunctionAsc = sortCSV(
        sortByOptions.categoriesCode.value,
        sortOrderOptions.asc.value,
      );

      const result = sortFunctionAsc(data);

      expect(result).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['A', { value: 3 }, { value: 4 }],
          ['É', { value: 5 }, { value: 6 }],
          ['Z', { value: 1 }, { value: 2 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });

      const sortFunctionDesc = sortCSV(
        sortByOptions.categoriesCode.value,
        sortOrderOptions.desc.value,
      );

      const resultDesc = sortFunctionDesc(data);

      expect(resultDesc).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['Z', { value: 1 }, { value: 2 }],
          ['É', { value: 5 }, { value: 6 }],
          ['A', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle sort on categories label', () => {
      const data = {
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['Z', { value: 1 }, { value: 2 }],
          ['A', { value: 3 }, { value: 4 }],
          ['É', { value: 5 }, { value: 6 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: { Z: 'Aaaaa', É: 'Ééééé', A: 'Zzzzz' },
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const sortFunctionAsc = sortCSV(
        sortByOptions.categoriesLabel.value,
        sortOrderOptions.asc.value,
      );

      const result = sortFunctionAsc(data);

      expect(result).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['Z', { value: 1 }, { value: 2 }],
          ['É', { value: 5 }, { value: 6 }],
          ['A', { value: 3 }, { value: 4 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });

      const sortFunctionDesc = sortCSV(
        sortByOptions.categoriesLabel.value,
        sortOrderOptions.desc.value,
      );

      const resultDesc = sortFunctionDesc(data);

      expect(resultDesc).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['A', { value: 3 }, { value: 4 }],
          ['É', { value: 5 }, { value: 6 }],
          ['Z', { value: 1 }, { value: 2 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });
    });

    test('should handle sort on series values', () => {
      // series values in data are done in a way that demonstrates the order is different for all cases:
      //CO2 asc:      B-A-C
      //CO2 desc      C-A-B
      //CH4 asc:      C-B-A
      //CO2+CH4 asc:  B-C-A

      const data = {
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['A', { value: -30 }, { value: 0 }],
          ['B', { value: -40 }, { value: -1 }],
          ['C', { value: 20 }, { value: -55 }],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const sortFunctionCO2 = sortCSV(
        sortByOptions.seriesValue.value,
        sortOrderOptions.asc.value,
        'CO2',
      );

      const resultCO2 = sortFunctionCO2(data);

      expect(resultCO2).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['B', { value: -40 }, { value: -1 }],
          ['A', { value: -30 }, { value: 0 }],
          ['C', { value: 20 }, { value: -55 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });

      const sortFunctionCO2Desc = sortCSV(
        sortByOptions.seriesValue.value,
        sortOrderOptions.desc.value,
        'CO2',
      );

      const resultCO2Desc = sortFunctionCO2Desc(data);

      expect(resultCO2Desc).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['C', { value: 20 }, { value: -55 }],
          ['A', { value: -30 }, { value: 0 }],
          ['B', { value: -40 }, { value: -1 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });

      const sortFunctionCH4 = sortCSV(
        sortByOptions.seriesValue.value,
        sortOrderOptions.asc.value,
        'CH4',
      );

      const resultCH4 = sortFunctionCH4(data);

      expect(resultCH4).toEqual({
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['C', { value: 20 }, { value: -55 }],
          ['B', { value: -40 }, { value: -1 }],
          ['A', { value: -30 }, { value: 0 }],
        ],
        parsingHelperData: data.parsingHelperData,
      });

      const expectedResultForSumOfAllSeries = {
        areCategoriesDates: false,
        areCategoriesNumbers: false,
        data: [
          ['Category', 'CO2', 'CH4'],
          ['B', { value: -40 }, { value: -1 }],
          ['C', { value: 20 }, { value: -55 }],
          ['A', { value: -30 }, { value: 0 }],
        ],
        parsingHelperData: data.parsingHelperData,
      };

      const sortFunctionSumCO2AndCH4 = sortCSV(
        sortByOptions.seriesValue.value,
        sortOrderOptions.asc.value,
        'CO2|CH4',
      );

      const resultSumCO2AndCH4 = sortFunctionSumCO2AndCH4(data);

      expect(resultSumCO2AndCH4).toEqual(expectedResultForSumOfAllSeries);

      const sortFunctionSumAll = sortCSV(
        sortByOptions.allSeriesValue.value,
        sortOrderOptions.asc.value,
      );

      const resultSumAll = sortFunctionSumAll(data);

      expect(resultSumAll).toEqual(expectedResultForSumOfAllSeries);
    });
  });

  describe('parseData', () => {
    test('should handle empty data', () => {
      const data = {
        data: [],
        parsingHelperData: {
          xDimensionLabelByCode: {},
          yDimensionLabelByCode: {},
          otherDimensionsLabelByCode: {},
        },
      };

      const result = parseData(data);

      expect(result).toEqual({
        categories: [],
        series: [],
        otherDimensions: [],
      });
    });

    test('should populate and return categories, series and otherDimensions', () => {
      const data = {
        data: [
          ['Category', 'CO2', 'CH4'],
          ['BRA', 1, 2],
          ['MEX', 3, 4],
        ],
        parsingHelperData: {
          xDimensionLabelByCode: {
            BRA: 'BRA label',
            MEX: 'MEX label',
            AAA: 'AAA label',
          },
          yDimensionLabelByCode: {
            CO2: 'CO2 label',
            CH4: 'CH4 label',
            BBB: 'BBB label',
          },
          otherDimensionsLabelByCode: { CCC: 'CCC label' },
        },
      };

      const result = parseData(data);

      expect(result).toEqual({
        categories: [
          {
            code: 'BRA',
            label: 'BRA label',
          },
          { code: 'MEX', label: 'MEX label' },
        ],
        series: [
          {
            code: 'CO2',
            label: 'CO2 label',
            data: [1, 3],
          },
          { code: 'CH4', label: 'CH4 label', data: [2, 4] },
        ],
        otherDimensions: [
          {
            code: 'CCC',
            label: 'CCC label',
          },
        ],
      });
    });
  });

  describe('sortParsedDataOnYAxis', () => {
    test('should handle empty data', () => {
      const data = {
        categories: [],
        series: [],
        otherDimensions: [],
      };

      const sortFunction = sortParsedDataOnYAxis();

      const result = sortFunction(data);

      expect(result).toEqual(data);
    });

    test('should sort on Y axis', () => {
      const series1 = {
        code: 'S1',
        label: 'S1 label',
        data: [1, 2],
      };
      const series2 = {
        code: 'S2',
        label: 'S2 label',
        data: [3, 4],
      };
      const series3 = {
        code: 'S3',
        label: 'S3 label',
        data: [5, 6],
      };
      const data = {
        categories: [
          {
            code: 'BRA',
            label: 'BRA label',
          },
          { code: 'MEX', label: 'MEX label' },
        ],
        series: [series1, series2, series3],
        otherDimensions: [],
      };

      const sortFunction = sortParsedDataOnYAxis('S3|S2');

      const result = sortFunction(data);

      expect(result).toEqual({
        ...data,
        series: [series3, series2, series1],
      });
    });
  });

  describe('addCodeLabelMapping', () => {
    test('should handle empty data', () => {
      const data = {
        categories: [],
        series: [],
        otherDimensions: [],
      };

      const result = addCodeLabelMapping(data);

      expect(result).toEqual({ ...data, codeLabelMapping: {} });
    });

    test('should add codeLabelMapping to data', () => {
      const data = {
        categories: [
          {
            code: 'bRa',
            label: 'BRA label',
          },
          { code: 'mEx', label: 'MEX label' },
        ],
        series: [
          {
            code: 'cO2',
            label: 'CO2 label',
            data: [1, 3],
          },
          { code: 'cH4', label: 'CH4 label', data: [2, 4] },
        ],
        otherDimensions: [
          {
            code: 'cCc',
            label: 'CCC label',
          },
        ],
      };

      const result = addCodeLabelMapping(data);

      expect(result).toEqual({
        ...data,
        codeLabelMapping: {
          BRA: 'BRA label',
          MEX: 'MEX label',
          CO2: 'CO2 label',
          CH4: 'CH4 label',
          CCC: 'CCC label',
        },
      });
    });
  });
});
