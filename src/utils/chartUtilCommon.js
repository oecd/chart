import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import { codeOrLabelEquals } from './configUtil';
import { baselineColor } from '../constants/chart';
import { isNilOrEmpty, reduceWithIndex } from './ramdaUtil';

const lightenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const red = (num >> 16) + amt;
  const blue = ((num >> 8) & 0x00ff) + amt;
  const green = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (red < 255 ? (red < 1 ? 0 : red) : 255) * 0x10000 +
    (blue < 255 ? (blue < 1 ? 0 : blue) : 255) * 0x100 +
    (green < 255 ? (green < 1 ? 0 : green) : 255)
  )
    .toString(16)
    .slice(1)}`;
};

export const convertColorToHex = (color) =>
  new TinyColor(color || 'black').toHexString();

export const createLighterColor = (color, percent) => {
  const hex = convertColorToHex(color);

  return lightenColor(hex, percent);
};

export const createShadesFromColor = (color) => {
  const hex = convertColorToHex(color);
  return R.map(
    (n) => {
      const percent = n * 10;
      return lightenColor(hex, percent);
    },
    R.times(R.identity, 9),
  );
};

export const getListItemAtTurningIndex = (idx, list) =>
  R.nth(idx % R.length(list), list);

export const calcExistingFixedColorIndexBySeries =
  (series) => (fixedColorIndexBySeries) => {
    if (isNilOrEmpty(fixedColorIndexBySeries)) {
      return null;
    }

    return R.pick(
      R.map(R.compose(R.toUpper, R.prop('code')), series),
      fixedColorIndexBySeries,
    );
  };

export const getSeriesColor = ({
  colorPalette,
  seriesIndex,
  seriesCode,
  fixedColorIndexBySeries,
}) => {
  if (isNilOrEmpty(fixedColorIndexBySeries)) {
    return getListItemAtTurningIndex(seriesIndex, colorPalette);
  }

  const seriesCodeUpper = R.toUpper(seriesCode);

  if (R.has(seriesCodeUpper, fixedColorIndexBySeries)) {
    const index = R.prop(seriesCodeUpper, fixedColorIndexBySeries) - 1;
    return R.nth(index, colorPalette);
  }

  const finalIndexes = R.map(
    R.subtract(R.__, 1),
    R.values(fixedColorIndexBySeries),
  );
  const colorPaletteWithoutFixedOnes = reduceWithIndex(
    (acc, c, i) => (R.includes(i, finalIndexes) ? acc : R.append(c, acc)),
    [],
    colorPalette,
  );

  return getListItemAtTurningIndex(
    seriesIndex,
    R.isEmpty(colorPaletteWithoutFixedOnes)
      ? colorPalette
      : colorPaletteWithoutFixedOnes,
  );
};

export const getBaselineOrHighlightColor = (
  objWithCodeAndLabel,
  highlight,
  baseline,
  highlightColors,
) => {
  const baselineIndex = R.findIndex(
    codeOrLabelEquals(objWithCodeAndLabel),
    baseline,
  );
  if (baselineIndex !== -1) {
    return baselineColor;
  }

  const highlightColorsIndex = R.findIndex(
    codeOrLabelEquals(objWithCodeAndLabel),
    highlight,
  );

  return highlightColorsIndex === -1
    ? null
    : getListItemAtTurningIndex(highlightColorsIndex, highlightColors);
};

export const createExportFileName = () =>
  `export-${new Date(Date.now()).toISOString()}`;
