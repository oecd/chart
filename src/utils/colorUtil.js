import { TinyColor, isReadable } from '@ctrl/tinycolor';
import * as R from 'ramda';

export const makeColorReadableOnBackgroundColor = (color, backgroundColor) =>
  R.reduceWhile(
    (acc) => !isReadable(acc, backgroundColor),
    (acc) => acc.darken(10),
    new TinyColor(color || 'black'),
    R.times(R.identity, 3),
  ).toHexString();

export const addColorAlpha = (color, alphaToAdd) => {
  const colorObject = new TinyColor(color || 'black');
  const newAlpha = R.compose(
    R.when(R.gt(R.__, 1), R.always(1)),
    R.when(R.lt(R.__, 0), R.always(0)),
  )(colorObject.getAlpha() + alphaToAdd);
  return colorObject.setAlpha(newAlpha).toHex8String();
};
