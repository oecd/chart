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
        dotStatUrlHasLastNObservationsEqOne: false,
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

      const { data, parsingHelperData, dotStatInfo } = result;

      expect(data).toEqual([
        ['Category', 'CO2', 'CH4', 'GHG', 'N2O'],
        [
          'RUS',
          { value: 1709909.7257916 },
          { value: 258632.54203569 },
          { value: 2061245.5949007 },
          { value: 57343.35985996 },
        ],
        [
          'BRA',
          { value: 499345.85944137 },
          { value: 506335.23976696 },
          { value: 1160952.7455324 },
          { value: 147880.41110542 },
        ],
        [
          'MEX',
          { value: 527285.00217865 },
          { value: 169284.44104062 },
          { value: 756812.84307542 },
          { value: 38466.320644507 },
        ],
        [
          'FRA',
          { value: 332385.11992807 },
          { value: 65701.170136246 },
          { value: 444942.92053508 },
          { value: 30736.398317189 },
        ],
        [
          'CAN',
          { value: 575090.77546574 },
          { value: 132690.8336369 },
          { value: 747052.68302528 },
          { value: 26913.962328981 },
        ],
        [
          'ITA',
          { value: 349048.34316779 },
          { value: 47975.607549603 },
          { value: 428292.25030636 },
          { value: 17418.713328404 },
        ],
        [
          'ESP',
          { value: 268520.5939755 },
          { value: 41308.33099116 },
          { value: 327577.41721 },
          { value: 11615.501549907 },
        ],
      ]);

      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('RUS');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('BRA');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('MEX');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('FRA');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('CAN');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('ITA');
      expect(parsingHelperData.xDimensionLabelByCode).toHaveProperty('ESP');

      expect(parsingHelperData.yDimensionLabelByCode).toHaveProperty('CO2');
      expect(parsingHelperData.yDimensionLabelByCode).toHaveProperty('CH4');
      expect(parsingHelperData.yDimensionLabelByCode).toHaveProperty('GHG');
      expect(parsingHelperData.yDimensionLabelByCode).toHaveProperty('N2O');

      expect(dotStatInfo).toEqual({
        unusedDimensions: [],
        totalNumberOfDataPoint: 28,
        numberOfUsedDataPoint: 28,
      });
    });
  });
});
