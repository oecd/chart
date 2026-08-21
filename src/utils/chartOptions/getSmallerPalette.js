// @ts-check
import * as R from 'ramda';

/**
 * Returns a smaller color palette that matches the size of the given list
 *
 * @param {any[]} list
 * @param {string[]} fullPalette
 * @param {string[] | undefined} smallerPalettes
 */
export const getSmallerPalette = (list, fullPalette, smallerPalettes) => {
  if (!smallerPalettes) return fullPalette;
  return (
    R.find(R.propEq(list.length, 'length'), smallerPalettes) || fullPalette
  );
};
