import * as R from 'ramda';
import { isNilOrEmpty } from './ramdaUtil';

export const possibleVariables = [
  'var1',
  'var2',
  'var3',
  'var4',
  'var5',
  'var6',
  'var7',
  'var8',
  'var9',
  'var10',
];
export const latestMinVariable = 'latest_min';
export const latestMaxVariable = 'latest_max';

export const minDateAvailableVariable = 'min_date';
export const maxDateAvailableVariable = 'max_date';

export const isCastableToNumber = R.ifElse(
  isNilOrEmpty,
  R.always(false),
  R.compose(R.complement(Number.isNaN), Number),
);

export const roundNumber = (number, maxNumberOfDecimal) =>
  isCastableToNumber(number)
    ? Number(Number(number).toFixed(maxNumberOfDecimal))
    : number;

export const codeOrLabelEquals = (obj) =>
  R.compose(
    R.either(R.equals(R.toUpper(obj.code)), R.equals(R.toUpper(obj.label))),
    R.toUpper,
  );

export const getFinalPalette = (
  colorPalette,
  smallerColorPalettes,
  numberOfSeries,
  paletteStartingColor,
  paletteStartingColorOverride,
) => {
  if (!isNilOrEmpty(smallerColorPalettes)) {
    const mostAdaptedPalette = R.find(
      (s) => R.length(s) <= numberOfSeries,
      [colorPalette, ...smallerColorPalettes],
    );

    return mostAdaptedPalette || colorPalette;
  }

  const startingColor = paletteStartingColorOverride || paletteStartingColor;

  if (startingColor) {
    const startingColorIndex = R.findIndex(
      R.equals(startingColor),
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
