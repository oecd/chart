import { chartSizes } from './chart';

export const textElementTypes = {
  title: 'title',
  subtitle: 'subtitle',
  legendRegular: 'legendRegular',
  legendBold: 'legendBold',
  source: 'source',
};

export const fontFamilies = {
  normal: "'Noto Sans', Helvetica, sans-serif",
  condensed: "'Noto Sans Display', Helvetica, sans-serif",
};

export const fontColors = {
  // dark: '#101D40',
  // normal: '#586179',
  dark: 'orange',
  normal: 'green',
};

const fontWeights = {
  regular: 400,
  extraBold: 800,
};

export const fontStyleByTextElementTypes = {
  [textElementTypes.title]: {
    fontSize: {
      [chartSizes.small]: '17px',
      [chartSizes.medium]: '18px',
      [chartSizes.large]: '20px',
    },
    lineHeight: '1.3',
    fontFamily: fontFamilies.condensed,
    fontWeight: fontWeights.extraBold,
    color: fontColors.dark,
  },
  [textElementTypes.subtitle]: {
    fontSize: {
      [chartSizes.small]: '16px',
      [chartSizes.medium]: '17px',
      [chartSizes.large]: '18px',
    },
    lineHeight: '1.375',
    fontFamily: fontFamilies.normal,
    fontWeight: fontWeights.regular,
    color: fontColors.normal,
  },
  [textElementTypes.legendRegular]: {
    fontSize: {
      [chartSizes.small]: '14px',
      [chartSizes.medium]: '15px',
      [chartSizes.large]: '16px',
    },
    lineHeight: '1.4',
    fontFamily: fontFamilies.normal,
    fontWeight: fontWeights.regular,
    color: fontColors.normal,
  },
};
