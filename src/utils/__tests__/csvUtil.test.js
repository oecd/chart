/* eslint-env jest */
/* global describe, test, expect */

import * as R from 'ramda';

import { chartTypes, dataSourceTypes } from '../../constants/chart';
import { parseCSV, pivotCSV } from '../csvUtil';

describe('csvUtil', () => {
  describe('parseCSV', () => {
    const csvData = `Category   ,   CO2   ,CH4
BRA   , 1 ,   2

MEX,3,4
`;

    const parsedCsvData = [
      ['Category', 'CO2', 'CH4'],
      ['BRA', 1, 2],
      ['MEX', 3, 4],
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

  describe('pivotCSV', () => {
    const data = {
      data: [
        ['Category', 'CO2', 'CH4'],
        ['BRA', { value: 499345.85944137 }, { value: 506335.23976696 }],
        ['MEX', { value: 527285.00217865 }, { value: 169284.44104062 }],
        ['FRA', { value: 332385.11992807 }, { value: 65701.170136246 }],
      ],
    };

    const pivotedData = {
      data: [
        ['Category', 'BRA', 'MEX', 'FRA'],
        [
          'CO2',
          { value: 499345.85944137 },
          { value: 527285.00217865 },
          { value: 332385.11992807 },
        ],
        [
          'CH4',
          { value: 506335.23976696 },
          { value: 169284.44104062 },
          { value: 65701.170136246 },
        ],
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

    test('should not pivot even when pivotData is true', () => {
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
});
