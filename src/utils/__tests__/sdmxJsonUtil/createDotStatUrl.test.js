import { fetchJson } from '../../fetchUtil';
import { createDotStatUrl } from '../../sdmxJsonUtil';

// Mock dependencies
jest.mock('../../fetchUtil', () => ({
  fetchJson: jest.fn(),
}));

const mockAvailabilityData = {
  TIME_PERIOD: {
    startPeriod: '2020-01-01T00:00:00',
    endPeriod: '2023-12-31T23:59:59',
  },
};

describe('createDotStatUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchJson.mockResolvedValue(mockAvailabilityData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Most basic cases', () => {
    test('should handle URL without any variables (normal variables + min/max date variables)', async () => {
      const url =
        'https://sdmx.oecd.org/public/rest/data/OECD.ENV.EPI,DSD_AIR_GHG@DF_AIR_GHG,1.0/BRA+CAN+FRA+ITA+MEX+ESP+RUS.A.N2O+CH4+CO2+GHG._T.T_CO2E?startPeriod=2018&endPeriod=2018&dimensionAtObservation=AllDimensions';
      const vars = {};

      const result = await createDotStatUrl(url, vars);

      expect(result.url).toEqual(url);
      expect(result.minAvailableDate).toBeUndefined();
      expect(result.maxAvailableDate).toBeUndefined();
    });
  });

  describe('Basic variable substitution', () => {
    test('should replace var1 in URL with provided value', async () => {
      const urlWithVar = 'https://example.com/{var1}/data';
      const vars = { var1: 'FRA' };

      const result = await createDotStatUrl(urlWithVar, vars);

      expect(result.url).toEqual(
        'https://example.com/FRA/data?dimensionAtObservation=AllDimensions',
      );
    });

    test('should replace multiple variables in URL', async () => {
      const urlWithVars = 'https://example.com/{var1}/{var2}/data';
      const vars = { var1: 'FRA', var2: 'GDP' };

      const result = await createDotStatUrl(urlWithVars, vars);

      expect(result.url).toEqual(
        'https://example.com/FRA/GDP/data?dimensionAtObservation=AllDimensions',
      );
    });

    test('should handle empty variables by replacing with empty string', async () => {
      const urlWithVar = 'https://example.com/{var1}/data';
      const vars = {};

      const result = await createDotStatUrl(urlWithVar, vars);

      expect(result.url).toEqual(
        'https://example.com//data?dimensionAtObservation=AllDimensions',
      );
    });

    test('should convert variable values to uppercase', async () => {
      const urlWithVar = 'https://example.com/{var1}/data';
      const vars = { var1: 'fra' };

      const result = await createDotStatUrl(urlWithVar, vars);

      expect(result.url).toEqual(
        'https://example.com/FRA/data?dimensionAtObservation=AllDimensions',
      );
    });

    test('should replace pipe characters with plus signs in variables', async () => {
      const urlWithVar = 'https://example.com/{var1}/data';
      const vars = { var1: 'FRA|DEU|ITA' };

      const result = await createDotStatUrl(urlWithVar, vars);

      expect(result.url).toEqual(
        'https://example.com/FRA+DEU+ITA/data?dimensionAtObservation=AllDimensions',
      );
    });

    test('should handle case-insensitive variable names', async () => {
      const urlWithVar = 'https://example.com/{VAR1}/data';
      const vars = { var1: 'FRA' };

      const result = await createDotStatUrl(urlWithVar, vars);

      expect(result.url).toEqual(
        'https://example.com/FRA/data?dimensionAtObservation=AllDimensions',
      );
    });
  });

  describe('Date availability handling', () => {
    test('should fetch availability data when URL contains min_date variable', async () => {
      const urlWithMinDate = 'https://example.com/data?startPeriod={min_date}';
      const vars = {};

      const result = await createDotStatUrl(urlWithMinDate, vars);

      expect(fetchJson).toHaveBeenCalled();
      expect(result.minAvailableDate).toEqual('2020');
      expect(result.url).toEqual(
        'https://example.com/data?startPeriod=2020&dimensionAtObservation=AllDimensions',
      );
    });

    test('should fetch availability data when URL contains max_date variable', async () => {
      const urlWithMaxDate = 'https://example.com/data?endPeriod={max_date}';
      const vars = {};

      const result = await createDotStatUrl(urlWithMaxDate, vars);

      expect(fetchJson).toHaveBeenCalled();
      expect(result.maxAvailableDate).toEqual('2023');
      expect(result.url).toEqual(
        'https://example.com/data?endPeriod=2023&dimensionAtObservation=AllDimensions',
      );
    });

    test('should handle both min_date and max_date variables', async () => {
      const urlWithMinAndMaxDates =
        'https://example.com/data?startPeriod={min_date}&endPeriod={max_date}';
      const vars = {};

      const result = await createDotStatUrl(urlWithMinAndMaxDates, vars);

      expect(fetchJson).toHaveBeenCalled();
      expect(result.minAvailableDate).toEqual('2020');
      expect(result.maxAvailableDate).toEqual('2023');
      expect(result.url).toEqual(
        'https://example.com/data?startPeriod=2020&endPeriod=2023&dimensionAtObservation=AllDimensions',
      );
    });

    test('should detect frequency from URL', async () => {
      const url =
        'https://example.com/data/{var1}?startPeriod={var2}&endPeriod={var3}';
      const vars = { var1: 'M', var2: '{min_date}', var3: '{max_date}' };

      const result = await createDotStatUrl(url, vars);

      expect(fetchJson).toHaveBeenCalled();
      expect(result.minAvailableDate).toEqual('2020-01');
      expect(result.maxAvailableDate).toEqual('2023-12');
      expect(result.url).toEqual(
        'https://example.com/data/M?startPeriod=2020-01&endPeriod=2023-12&dimensionAtObservation=AllDimensions',
      );
    });

    test('should detect frequency from FREQ dimension when not present in URL', async () => {
      const url =
        'https://example.com/data?startPeriod={min_date}&endPeriod={max_date}';
      const vars = {};

      fetchJson.mockResolvedValue({ ...mockAvailabilityData, FREQ: ['Q'] });

      const result = await createDotStatUrl(url, vars);

      expect(fetchJson).toHaveBeenCalled();
      expect(result.minAvailableDate).toEqual('2020-Q1');
      expect(result.maxAvailableDate).toEqual('2023-Q4');
      expect(result.url).toEqual(
        'https://example.com/data?startPeriod=2020-Q1&endPeriod=2023-Q4&dimensionAtObservation=AllDimensions',
      );
    });

    test('should use custom getDotStatAvailabilityFunc when provided', async () => {
      const urlWithMinDate = 'https://example.com/data?startPeriod={min_date}';
      const vars = {};
      const customAvailabilityFunc = jest
        .fn()
        .mockResolvedValue(mockAvailabilityData);

      const result = await createDotStatUrl(
        urlWithMinDate,
        vars,
        customAvailabilityFunc,
      );

      expect(customAvailabilityFunc).toHaveBeenCalled();
      expect(fetchJson).not.toHaveBeenCalled();
      expect(result.minAvailableDate).toEqual('2020');
    });
  });

  describe('Error handling', () => {
    test('should throw error when no time range found in availability response', async () => {
      const urlWithMinDate = 'https://example.com/data?startPeriod={min_date}';
      const vars = {};

      fetchJson.mockResolvedValue({
        OTHER_DIMENSION: { someData: 'value' },
      });

      await expect(createDotStatUrl(urlWithMinDate, vars)).rejects.toThrow(
        'Could not get {min_date} or {max_date}: no time range found in availability response.',
      );
    });

    test('should throw error when availability fetch fails with descriptive message', async () => {
      const urlWithMinDate = 'https://example.com/data?startPeriod={min_date}';
      const vars = {};

      fetchJson.mockRejectedValue(new Error('Network error'));

      await expect(createDotStatUrl(urlWithMinDate, vars)).rejects.toThrow(
        'Could not get {min_date} or {max_date}: Network error.',
      );
    });
  });

  describe('URL normalization', () => {
    test('should ensure dimensionAtObservation=AllDimensions is set', async () => {
      const urlWithoutDimension = 'https://example.com/data';
      const vars = {};

      const result = await createDotStatUrl(urlWithoutDimension, vars);

      expect(result.url).toContain('dimensionAtObservation=AllDimensions');
    });

    test('should normalize parameter casing in URL', async () => {
      const urlWithMixedCase =
        'https://example.com/data?LASTNOBSERVATIONS=100&firstnobservations=50';
      const vars = {};

      const result = await createDotStatUrl(urlWithMixedCase, vars);

      expect(result.url).toContain('lastNObservations=');
      expect(result.url).toContain('firstNObservations=');
    });
  });
});
