import { getBaselineAndHighlightCodes } from '../getBaselineAndHighlightCodes';

describe('getBaselineAndHighlightCodes', () => {
  test('extracts codes', () => {
    const result = getBaselineAndHighlightCodes(
      {
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
      ['France', 'ITA', 'Apples', 'AVO'],
      ['Japan', 'BRA', 'Bananas', 'ORA'],
    );
    expect(result).toStrictEqual({
      seriesCodes: new Set(['ita', 'fra', 'jpn', 'bra', 'isr']),
      categoryCodes: new Set(['apl', 'avo', 'ban', 'ora', 'mag', 'pin']),
      baselineCodes: ['ita', 'fra', 'apl', 'avo'],
      highlightCodes: ['jpn', 'bra', 'ban', 'ora'],
      highlightSeriesCodes: ['jpn', 'bra'],
      highlightCategoryCodes: ['ban', 'ora'],
    });
  });
});
