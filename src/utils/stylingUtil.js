import * as R from 'ramda';

import { chartSizes } from '../constants/chart';
import { isNilOrEmpty } from './ramdaUtil';
import { fontStyleByTextElementTypes } from '../constants/styling';

export const calcChartSize = (width, height) => {
  if (!width || !height) {
    return null;
  }

  if (width <= 400 || height <= 250) {
    return chartSizes.small;
  }

  if ((width > 400 && width <= 600) || (height > 250 && height <= 380)) {
    return chartSizes.medium;
  }

  return chartSizes.large;
};

export const calcIsSmall = (width, height) =>
  !width || !height ? false : width < 540 || height < 350;

export const calcMarginTop = (title, subtitle, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return isSmall ? 20 : 32;
  }

  return undefined;
};

export const calcMarginTopWithHorizontal = (
  title,
  subtitle,
  horizontal,
  isSmall,
) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (isSmall) {
      return 22;
    }
    return horizontal ? 22 : 32;
  }

  return undefined;
};

export const fontStyleForTextElement = (textElementType, chartSize) => {
  if (!R.has(textElementType, fontStyleByTextElementTypes)) {
    throw new Error(
      `Font styles for text element type "${textElementType}" not found!`,
    );
  }

  const styles = R.compose(
    R.modify('fontSize', R.propOr('', chartSize)),
    R.prop(textElementType),
  )(fontStyleByTextElementTypes);

  return styles;
};
