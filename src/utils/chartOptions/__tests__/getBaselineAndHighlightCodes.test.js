import { getBaselineAndHighlightCodes } from '../getBaselineAndHighlightCodes';

describe('getBaselineAndHighlightCodes', () => {
  test('extracts codes', () => {
    const result = getBaselineAndHighlightCodes({
      data: {
        series: [
          { label: 'Italy', code: 'ITA' },
          { label: 'France', code: 'FRA' },
          { label: 'Japan', code: 'JPN' },
          { label: 'Brazil', code: 'BRA' },
          { label: 'Israel', code: 'ISR' },
        ],
        categories: [
          { label: 'Apples', code: 'APL' },
          { label: 'Avocado', code: 'AVO' },
          { label: 'Bananas', code: 'BAN' },
          { label: 'Oranges', code: 'ORA' },
          { label: 'Mango', code: 'MAG' },
          { label: 'Pineapple', code: 'PIN' },
        ],
      },
      baseline: ['France', 'ITA', 'Apples', 'AVO'],
      highlight: ['Japan', 'BRA', 'Bananas', 'ORA'],
    });
    expect(result).toStrictEqual({
      seriesCodes: new Set(['ITA', 'FRA', 'JPN', 'BRA', 'ISR']),
      categoryCodes: new Set(['APL', 'AVO', 'BAN', 'ORA', 'MAG', 'PIN']),
      baselineCodes: ['ITA', 'FRA', 'APL', 'AVO'],
      highlightCodes: ['JPN', 'BRA', 'BAN', 'ORA'],
      highlightSeriesCodes: ['JPN', 'BRA'],
      highlightCategoryCodes: ['BAN', 'ORA'],
    });
  });
});
