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

export const calcLegendMarginForBarAndStacked = (chartSize, horizontal) => {
  if (chartSize === chartSizes.small) {
    return horizontal ? 10 : 26;
  }
  if (chartSize === chartSizes.medium) {
    return horizontal ? 12 : 30;
  }

  return horizontal ? 14 : 34;
};

export const calcLegendMarginDefault = (chartSize) => {
  if (chartSize === chartSizes.small) {
    return 16;
  }
  if (chartSize === chartSizes.medium) {
    return 20;
  }

  return 24;
};

export const calcLegendMarginInlineLabels = (chartSize) => {
  if (chartSize === chartSizes.small) {
    return -5;
  }
  if (chartSize === chartSizes.medium) {
    return -15;
  }

  return -25;
};

export const calcMarginTopDefault = (title, subtitle, chartSize) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (chartSize === chartSizes.small) {
      return 20;
    }

    if (chartSize === chartSizes.medium) {
      return 26;
    }

    return 32;
  }

  return undefined;
};

export const calcMarginTopForBarAndStacked = (
  title,
  subtitle,
  horizontal,
  chartSize,
) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (chartSize === chartSizes.small) {
      return 22;
    }

    if (chartSize === chartSizes.medium) {
      return 26;
    }

    return horizontal ? 22 : 32;
  }

  return undefined;
};

export const calcMarginBottomForRadar = (chartSize) => {
  if (chartSize === chartSizes.small) {
    return 10;
  }
  if (chartSize === chartSizes.medium) {
    return 5;
  }

  return undefined;
};

export const calcYAxisCoordinatesForBarAndStacked = (horizontal, chartSize) => {
  if (!horizontal) {
    return { x: 0, y: -4 };
  }

  if (chartSize === chartSizes.small) {
    return { x: 4, y: 28 };
  }

  if (chartSize === chartSizes.medium) {
    return { x: 5, y: 31 };
  }

  return { x: 4, y: 35 };
};

export const calcRadarPaneSize = (chartSize) => {
  if (chartSize === chartSizes.small) {
    return '70%';
  }
  if (chartSize === chartSizes.medium) {
    return '80px';
  }

  return '85%';
};

const sizeCssClassByChartSize = {
  [chartSizes.small]: 'cb-small',
  [chartSizes.medium]: 'cb-medium',
  [chartSizes.large]: '',
};

export const getSizeCssClass = (chartSize) => {
  return R.propOr('', chartSize, sizeCssClassByChartSize);
};
