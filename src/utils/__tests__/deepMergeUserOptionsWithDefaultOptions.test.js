import { deepMergeUserOptionsWithDefaultOptions } from '../chartOptions/deepMergeUserOptionsWithDefaultOptions';

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
