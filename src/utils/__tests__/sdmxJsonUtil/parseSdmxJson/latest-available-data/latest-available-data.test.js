/* eslint-env jest */
/* global describe, test, expect */

import { parseSdmxJson } from '../../../../sdmxJsonUtil';
import sdmxStructure from './sdmx-structure.json';
import sdmxData from './sdmx-data.json';
import chartConfig from './chart-config.json';

describe('sdmxJsonUtil', () => {
  describe('parseSdmxJson', () => {
    test('should parse SDMX JSON data correctly', () => {
      const parseFunction = parseSdmxJson({
        chartType: chartConfig.chartType,
        mapCountryDimension: chartConfig.mapCountryDimension,
        dotStatUrlHasLastNObservationsEqOne: true,
        dotStatCodeLabelMapping: chartConfig.dotStatCodeLabelMapping,
        csvCodeLabelMappingProjectLevel: chartConfig.csvCodeLabelMapping,
        lang: chartConfig.dotStatLang,
        dotStatStructure: sdmxStructure,
        dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember:
          chartConfig.dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
        dotStatXAxisDimension: chartConfig.dotStatXAxisDimension,
        dotStatYAxisDimension: chartConfig.dotStatYAxisDimension,
        controlConnectedDotStatDimensionIds: [],
      });

      const result = parseFunction(sdmxData);

      const { data, latestYMin, latestYMax, parsingHelperData, dotStatInfo } =
        result;

      expect(data).toEqual([
        ['Category', 'B1GQ_POP'],
        [
          'JPN',
          {
            value: 43434.539255,
            metadata: {
              timeCode: '2023',
              timeLabel: '2023',
            },
          },
        ],
        [
          'BRA',
          {
            value: 14341.225149,
            metadata: {
              timeCode: '2021',
              timeLabel: '2021',
            },
          },
        ],
        [
          'IDN',
          {
            value: 12410.169563,
            metadata: {
              timeCode: '2022',
              timeLabel: '2022',
            },
          },
        ],
      ]);

      expect(latestYMin).toEqual('2021');
      expect(latestYMax).toEqual('2023');

      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('JPN');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('BRA');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('IDN');

      expect(parsingHelperData.yDimensionLabelByCode).toHaveProperty(
        'B1GQ_POP',
      );

      expect(dotStatInfo).toEqual({
        unusedDimensions: [],
        totalNumberOfDataPoint: 3,
        numberOfUsedDataPoint: 3,
      });
    });
  });
});
