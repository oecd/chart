/* eslint-env jest */
/* global describe, test, expect, jest, beforeEach, afterEach, global, AbortSignal */

import {
  getAvailabilityUrlFromDotStatUrl,
  fetchDotStatData,
  createDimensionMemberLabelByCode,
  isTimeDimension,
} from '../../sdmxJsonUtil';

describe('getAvailabilityUrlFromDotStatUrl', () => {
  const dataUrl =
    'https://sdmx.oecd.org/public/rest/data/OECD.ENV.EPI,DSD_AIR_GHG@DF_AIR_GHG,1.0/BRA+CAN+FRA+ITA+MEX+ESP+RUS.A.N2O+CH4+CO2+GHG._T.T_CO2E?startPeriod=2018&endPeriod=2018&dimensionAtObservation=AllDimensions';

  test('should convert data URL to availability constraint URL', () => {
    const result = getAvailabilityUrlFromDotStatUrl(dataUrl);

    expect(result).toContain('/availableconstraint/');
    expect(result).not.toContain('/data/');
    expect(result).toContain('mode=available');
  });

  test('should remove startPeriod and endPeriod when URL contains min/max date variables', () => {
    const dataUrlWithMinMaxVariables =
      'https://sdmx.oecd.org/public/rest/data/OECD.ENV.EPI,DSD_AIR_GHG@DF_AIR_GHG,1.0/BRA+CAN+FRA+ITA+MEX+ESP+RUS.A.N2O+CH4+CO2+GHG._T.T_CO2E?startPeriod={min_date}&endPeriod={max_date}&dimensionAtObservation=AllDimensions';
    const result = getAvailabilityUrlFromDotStatUrl(dataUrlWithMinMaxVariables);

    expect(result).not.toContain('startPeriod=');
    expect(result).not.toContain('endPeriod=');
    expect(result).toContain('mode=available');
  });

  test('should keep startPeriod and endPeriod when URL does not contain min/max date variables', () => {
    const result = getAvailabilityUrlFromDotStatUrl(dataUrl);

    expect(result).toContain('startPeriod=2018');
    expect(result).toContain('endPeriod=2018');
    expect(result).toContain('mode=available');
  });
});

describe('fetchDotStatData', () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const testUrl = 'https://example.com/data/test';
  const testLang = 'en';

  test('should make request with correct headers and URL normalization', async () => {
    const mockResponse = {
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchDotStatData(testUrl, testLang);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dimensionAtObservation=AllDimensions'),
      expect.objectContaining({
        headers: {
          Accept: 'application/vnd.sdmx.data+json;version=1.0',
          'Accept-Language': 'en',
        },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual({ data: 'test' });
  });

  test('should use default language when lang is null or empty', async () => {
    const mockResponse = {
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await fetchDotStatData(testUrl, null);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept-Language': 'en',
        }),
      }),
    );
  });

  test('should pass additional fetchConfig options excluding timeout', async () => {
    const mockResponse = {
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const fetchConfig = {
      timeout: 30000,
      method: 'GET',
      credentials: 'include',
    };

    await fetchDotStatData(testUrl, testLang, fetchConfig);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        signal: expect.any(AbortSignal),
      }),
    );

    // Ensure timeout is not passed directly to fetch
    const fetchCall = mockFetch.mock.calls[0][1];
    expect(fetchCall).not.toHaveProperty('timeout');
  });

  test('should return JSON data for successful responses (2xx)', async () => {
    const mockData = { data: { dataSets: [{ observations: {} }] } };
    const mockResponse = {
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchDotStatData(testUrl, testLang);

    expect(result).toEqual(mockData);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  test('should handle 404 with "NoResultsFound" as empty dataset', async () => {
    const mockResponse = {
      status: 404,
      text: jest.fn().mockResolvedValue('Error: NoResultsFound'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchDotStatData(testUrl, testLang);

    expect(result).toEqual({
      data: { dataSets: [{}] },
      meta: { schema: '' },
    });
  });

  test('should handle 404 with "NoRecordsFound" as empty dataset', async () => {
    const mockResponse = {
      status: 404,
      text: jest.fn().mockResolvedValue('Error: NoRecordsFound'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchDotStatData(testUrl, testLang);

    expect(result).toEqual({
      data: { dataSets: [{}] },
      meta: { schema: '' },
    });
  });

  test('should handle 404 with "No Results Found" as empty dataset', async () => {
    const mockResponse = {
      status: 404,
      text: jest.fn().mockResolvedValue('Error: No Results Found'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchDotStatData(testUrl, testLang);

    expect(result).toEqual({
      data: { dataSets: [{}] },
      meta: { schema: '' },
    });
  });

  test('should throw error for 404 responses without special content', async () => {
    const mockResponse = {
      status: 404,
      statusText: 'Not Found',
      text: jest.fn().mockResolvedValue('Regular 404 error'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow(
      'Regular 404 error',
    );
  });

  test('should throw error with status code when statusText is empty for 404', async () => {
    const mockResponse = {
      status: 404,
      statusText: '',
      text: jest.fn().mockResolvedValue('Regular 404 error'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow('404');
  });

  test('should throw error when 404 response.text() fails', async () => {
    const mockResponse = {
      status: 404,
      statusText: 'Not Found',
      text: jest.fn().mockRejectedValue(new Error('Failed to read text')),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow(
      'Not Found',
    );
  });

  test('should throw error for non-2xx, non-404 responses with statusText', async () => {
    const mockResponse = {
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue('Server error details'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow(
      'Server error details',
    );
  });

  test('should throw error for non-2xx responses with empty statusText', async () => {
    const mockResponse = {
      status: 500,
      statusText: '',
      text: jest.fn().mockResolvedValue('Server error details'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow(
      'Server error details',
    );
  });

  test('should fallback to status code when response text is empty', async () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue(''),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow(
      'Bad Request',
    );
  });

  test('should fallback to status code when both statusText and responseText are empty', async () => {
    const mockResponse = {
      status: 400,
      statusText: '',
      text: jest.fn().mockResolvedValue(''),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow('400');
  });

  test('should handle when response.text() throws an error for non-404 responses', async () => {
    const mockResponse = {
      status: 500,
      statusText: 'Internal Server Error',
      text: jest
        .fn()
        .mockRejectedValue(new Error('Failed to read response text')),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchDotStatData(testUrl, testLang)).rejects.toThrow(
      'Internal Server Error',
    );
  });
});

describe('createDimensionMemberLabelByCode', () => {
  test('should create label mapping using member id when no names exist', () => {
    const members = [{ id: 'FRA' }, { id: 'DEU' }, { id: 'ITA' }];
    const lang = 'en';
    const codeLabelMapping = null;

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      FRA: 'FRA',
      DEU: 'DEU',
      ITA: 'ITA',
    });
  });

  test('should use name property when available and no language-specific names', () => {
    const members = [
      { id: 'FRA', name: 'France' },
      { id: 'DEU', name: 'Germany' },
      { id: 'ITA', name: 'Italy' },
    ];
    const lang = 'en';
    const codeLabelMapping = null;

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      FRA: 'France',
      DEU: 'Germany',
      ITA: 'Italy',
    });
  });

  test('should use language-specific names when available', () => {
    const members = [
      {
        id: 'FRA',
        name: 'France',
        names: { en: 'France', fr: 'France', de: 'Frankreich' },
      },
      {
        id: 'DEU',
        name: 'Germany',
        names: { en: 'Germany', fr: 'Allemagne', de: 'Deutschland' },
      },
      {
        id: 'ITA',
        name: 'Italy',
        names: { en: 'Italy', fr: 'Italie', de: 'Italien' },
      },
    ];
    const lang = 'fr';
    const codeLabelMapping = null;

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      FRA: 'France',
      DEU: 'Allemagne',
      ITA: 'Italie',
    });
  });

  test('should fallback to name property when language-specific name not available', () => {
    const members = [
      {
        id: 'FRA',
        name: 'France',
        names: { en: 'France', de: 'Frankreich' },
      },
      {
        id: 'DEU',
        name: 'Germany',
        names: { en: 'Germany' },
      },
    ];
    const lang = 'es'; // Spanish not available
    const codeLabelMapping = null;

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      FRA: 'France',
      DEU: 'Germany',
    });
  });

  test('should fallback to id when neither language-specific names nor name property exist', () => {
    const members = [
      {
        id: 'FRA',
        names: { en: 'France' },
      },
      {
        id: 'DEU',
      },
    ];
    const lang = 'es'; // Spanish not available
    const codeLabelMapping = null;

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      FRA: 'FRA', // fallback to id when language not available and no name property
      DEU: 'DEU', // fallback to id when no name property at all
    });
  });

  test('should merge with codeLabelMapping when provided', () => {
    const members = [
      { id: 'FRA', name: 'France' },
      { id: 'DEU', name: 'Germany' },
      { id: 'ITA', name: 'Italy' },
    ];
    const lang = 'en';
    const codeLabelMapping = {
      FRA: 'Custom France Label',
      ESP: 'Spain', // additional mapping not in members
    };

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      FRA: 'Custom France Label', // overridden by codeLabelMapping
      DEU: 'Germany', // from member name
      ITA: 'Italy', // from member name
      ESP: 'Spain', // from codeLabelMapping only
    });
  });

  test('should handle empty members array', () => {
    const members = [];
    const lang = 'en';
    const codeLabelMapping = { TEST: 'Test Label' };

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({
      TEST: 'Test Label', // only from codeLabelMapping
    });
  });

  test('should handle null/undefined codeLabelMapping', () => {
    const members = [{ id: 'FRA', name: 'France' }];
    const lang = 'en';

    const resultWithNull = createDimensionMemberLabelByCode(
      members,
      lang,
      null,
    );
    const resultWithUndefined = createDimensionMemberLabelByCode(
      members,
      lang,
      undefined,
    );

    expect(resultWithNull).toEqual({ FRA: 'France' });
    expect(resultWithUndefined).toEqual({ FRA: 'France' });
  });

  test('should handle empty codeLabelMapping object', () => {
    const members = [{ id: 'FRA', name: 'France' }];
    const lang = 'en';
    const codeLabelMapping = {};

    const result = createDimensionMemberLabelByCode(
      members,
      lang,
      codeLabelMapping,
    );

    expect(result).toEqual({ FRA: 'France' });
  });
});

describe('isTimeDimension', () => {
  test('should return true when isTimeDimension property is true', () => {
    const dimension = {
      id: 'TIME',
      isTimeDimension: true,
      name: 'Time',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(true);
  });

  test('should return false when isTimeDimension property is false', () => {
    const dimension = {
      id: 'TIME',
      isTimeDimension: false,
      name: 'Time',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(false);
  });

  test('should return true when role property equals TIME_PERIOD', () => {
    const dimension = {
      id: 'TIME',
      role: 'TIME_PERIOD',
      name: 'Time',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(true);
  });

  test('should return false when role property is different from TIME_PERIOD', () => {
    const dimension = {
      id: 'COUNTRY',
      role: 'DIMENSION',
      name: 'Country',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(false);
  });

  test('should return true when roles array contains TIME_PERIOD', () => {
    const dimension = {
      id: 'TIME',
      roles: ['DIMENSION', 'TIME_PERIOD'],
      name: 'Time',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(true);
  });

  test('should return false when roles array is empty', () => {
    const dimension = {
      id: 'METRIC',
      roles: [],
      name: 'Metric',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(false);
  });

  test('should return false when roles property is missing', () => {
    const dimension = {
      id: 'METRIC',
      name: 'Metric',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(false);
  });

  test('should return true when roles property is null but handled by propOr', () => {
    const dimension = {
      id: 'TIME',
      roles: null,
      role: 'TIME_PERIOD',
      name: 'Time',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(true);
  });

  test('should return false when no time-related properties are present', () => {
    const dimension = {
      id: 'COUNTRY',
      name: 'Country',
      type: 'dimension',
    };

    const result = isTimeDimension(dimension);

    expect(result).toBe(false);
  });

  test('should handle empty object', () => {
    const dimension = {};

    const result = isTimeDimension(dimension);

    expect(result).toBe(false);
  });

  test('should handle null input', () => {
    const result = isTimeDimension(null);

    expect(result).toBe(false);
  });

  test('should handle undefined input', () => {
    const result = isTimeDimension(undefined);

    expect(result).toBe(false);
  });
});
