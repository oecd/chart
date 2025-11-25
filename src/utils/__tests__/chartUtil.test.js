/* eslint-env jest */
/* global describe, test, expect */

import { frequencyTypes } from '../../constants/chart';
import {
  addColorAlpha,
  deepMergeUserOptionsWithDefaultOptions,
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
});
