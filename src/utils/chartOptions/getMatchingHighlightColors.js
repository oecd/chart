// @ts-check
import * as R from 'ramda';

/**
 * Returns a matching highlight color palette
 *
 * @param {{
 * highlight: any[],
 * highlightColors: string[];
 * smallerHighlightColors: string[];
 * }} options
 */
export const getMatchingHighlightColors = ({
  highlight,
  highlightColors,
  smallerHighlightColors,
}) =>
  R.find(R.propEq(highlight.length, 'length'), smallerHighlightColors) ||
  highlightColors;
