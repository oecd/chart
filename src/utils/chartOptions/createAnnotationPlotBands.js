// @ts-check

import {
  fontColors,
  fontFamilies,
  fontStyleByTextElementTypes,
  textElementTypes,
} from '../../constants/styling';

/** Default band fill color */
const BAND_COLOR = '#F0F4F8';

/**
 * Ignore HTML in annotation labels.
 * Note: Highcharts performs its own sanitization on the passed HTML.
 * @param {string} string
 */
const escapeHTML = (string) =>
  string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lineHeightFactor = 1.15;
const numberOfLines = 2;

/**
 * Renders the label on top of the plot band
 *
 * @param {string} label
 * @param {keyof typeof import('../../constants/chart').chartSizes} chartSize
 * @returns {import('highcharts').XAxisPlotBandsLabelOptions}
 */
const getInlineLabelOptions = (label, chartSize) => {
  const fontSizePx =
    fontStyleByTextElementTypes[textElementTypes.legend].fontSize[chartSize];
  const fontSizeNumber = parseFloat(fontSizePx);

  const height = fontSizeNumber * lineHeightFactor * numberOfLines;
  const style = `
display: block;
display: -webkit-box;
-webkit-box-orient: vertical;
-webkit-line-clamp: ${numberOfLines};
overflow: hidden;
white-space: normal;
background-color: white;
`;
  return {
    useHTML: true,
    text: `<span style="${style}">${escapeHTML(label)}</span>`,
    align: 'left',
    x: 0,
    // y: 0 is approx. half of the font size on top of the plot band rect
    y: -((numberOfLines - 0.6) * fontSizeNumber * lineHeightFactor),
    style: {
      // Vertically align bottom
      display: 'flex',
      'align-items': 'flex-end',
      height,
      fontFamily: fontFamilies.condensed,
      fontSize: fontSizePx,
      lineHeight: lineHeightFactor,
      color: fontColors.normal,
    },
  };
};

/**
 * Renders a numerical reference to the caption. Number in a circle that looks like ①, ②, ③ etc.
 *
 * @param {string} label
 * @returns {import('highcharts').XAxisPlotBandsLabelOptions}
 */
const getReferenceLabelOptions = (label) => {
  const fontSize = '12px';
  const diameter = 16;
  const diameterPx = `${diameter}px`;
  const style = `
box-sizing: content-box;
display: block;
width: ${diameterPx};
height: ${diameterPx};
border: 1px solid ${fontColors.normal};
border-radius: 50%;
background-color: white;
`;
  return {
    useHTML: true,
    text: `<span style="${style}">${label}</span>`,
    y: -(diameter / 2 + 1),
    style: {
      fontFamily: fontFamilies.condensed,
      fontSize: fontSize,
      lineHeight: diameterPx,
      color: fontColors.normal,
    },
  };
};

/**
 * Returns Highcharts plot bands for the given annotations.
 *
 * @param {{
 * positionedAnnotations: import('./annotation').PositionedAnnotation[];
 * chartSize: keyof typeof import('../../constants/chart').chartSizes;
 * showLabelsInline: boolean;
 * }} options
 * @returns {import('highcharts').XAxisPlotBandsOptions[]}
 */
export const createAnnotationPlotBands = ({
  positionedAnnotations,
  chartSize,
  showLabelsInline,
}) => {
  if (positionedAnnotations.length === 0) return [];

  return positionedAnnotations.map((annotation, index) => {
    const { label, showLabelInline, from, to, color } = annotation;

    const labelOptions =
      showLabelsInline && showLabelInline
        ? getInlineLabelOptions(label, chartSize)
        : getReferenceLabelOptions(String(index + 1));

    /** @type {import('highcharts').XAxisPlotBandsOptions} */
    const plotBand = {
      from,
      to,
      color: color || BAND_COLOR,
      label: labelOptions,
    };
    return plotBand;
  });
};
