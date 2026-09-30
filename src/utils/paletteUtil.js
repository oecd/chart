import * as R from 'ramda';

import { defaultPalette, palettes } from '../constants/palette';
import { isNilOrEmpty } from './ramdaUtil';

export const getPaletteById = (paletteId) =>
  R.find(R.propEq(paletteId, 'id'), palettes) || defaultPalette;

export const getPaletteData = (
  paletteId,
  colorPalette,
  smallerColorPalettes,
) => {
  if (!isNilOrEmpty(paletteId)) {
    const palette = getPaletteById(paletteId);

    return {
      colorPalette: palette.full,
      smallerColorPalettes: palette.smallers,
      isPaletteContinuous: palette.isContinuous,
    };
  }

  if (isNilOrEmpty(colorPalette)) {
    return {
      colorPalette: defaultPalette.full,
      smallerColorPalettes: defaultPalette.smallers,
      isPaletteContinuous: defaultPalette.isContinuous,
    };
  }

  return {
    colorPalette: colorPalette,
    smallerColorPalettes: smallerColorPalettes ?? [],
    isPaletteContinuous: false,
  };
};

export const getFinalPaletteColors = (
  colorPalette,
  smallerColorPalettes,
  numberOfSeries,
  paletteStartingColor,
) => {
  if (!isNilOrEmpty(smallerColorPalettes)) {
    const mostAdaptedPalette = R.find(
      (s) => R.length(s) <= numberOfSeries,
      [colorPalette, ...smallerColorPalettes],
    );

    return mostAdaptedPalette || colorPalette;
  }

  if (paletteStartingColor) {
    const startingColorIndex = R.findIndex(
      R.equals(paletteStartingColor),
      colorPalette,
    );
    if (startingColorIndex !== -1) {
      return R.compose(
        R.unnest,
        R.reverse,
        R.splitAt(startingColorIndex),
      )(colorPalette);
    }
  }

  return colorPalette;
};
