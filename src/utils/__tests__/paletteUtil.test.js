import {
  getFinalPaletteColors,
  getPaletteById,
  getPaletteData,
} from '../paletteUtil';
import { defaultPalette, palettes } from '../../constants/palette';

describe('paletteUtil', () => {
  describe('getPaletteById', () => {
    test('returns the palette matching the requested id', () => {
      expect(getPaletteById('green')).toBe(
        palettes.find(({ id }) => id === 'green'),
      );
    });

    test('returns the default palette when the id is unknown', () => {
      expect(getPaletteById('missing')).toBe(defaultPalette);
    });
  });

  describe('getPaletteData', () => {
    test('returns data for a palette id', () => {
      const palette = palettes.find(({ id }) => id === 'green');

      expect(getPaletteData('green')).toEqual({
        colorPalette: palette.full,
        smallerColorPalettes: palette.smallers,
        isPaletteContinuous: palette.isContinuous,
      });
    });

    test('returns default data when no palette inputs are provided', () => {
      expect(getPaletteData()).toEqual({
        colorPalette: defaultPalette.full,
        smallerColorPalettes: defaultPalette.smallers,
        isPaletteContinuous: defaultPalette.isContinuous,
      });
    });

    test('returns custom palette data and defaults missing smaller palettes', () => {
      const colorPalette = ['#111111', '#222222'];

      expect(getPaletteData(undefined, colorPalette)).toEqual({
        colorPalette,
        smallerColorPalettes: [],
        isPaletteContinuous: false,
      });
    });
  });

  describe('getFinalPaletteColors', () => {
    test('selects the first smaller palette that fits the series count', () => {
      const colorPalette = ['a', 'b', 'c'];
      const smallerColorPalettes = [['a', 'b'], ['a']];

      expect(
        getFinalPaletteColors(colorPalette, smallerColorPalettes, 2),
      ).toEqual(['a', 'b']);
    });

    test('falls back to the full palette when no smaller palette fits', () => {
      const colorPalette = ['a', 'b', 'c', 'd'];
      const smallerColorPalettes = [['a', 'b', 'c'], ['a', 'b'], ['a']];

      expect(getFinalPaletteColors(colorPalette, smallerColorPalettes, 5)).toBe(
        colorPalette,
      );
    });

    test('rotates the palette to start at the requested color', () => {
      const colorPalette = ['a', 'b', 'c', 'd'];

      expect(getFinalPaletteColors(colorPalette, [], 4, 'c')).toEqual([
        'c',
        'd',
        'a',
        'b',
      ]);
    });

    test('returns the original palette when the starting color is absent', () => {
      const colorPalette = ['a', 'b', 'c'];

      expect(getFinalPaletteColors(colorPalette, [], 3, 'missing')).toBe(
        colorPalette,
      );
    });
  });
});
