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
 * @param {string} fontSizePx
 * @param {number} fontSizeNumber
 * @returns {import('highcharts').XAxisPlotBandsLabelOptions}
 */
const getInlineLabelOptions = (label, fontSizePx, fontSizeNumber) => {
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
      // @ts-ignore This needs to be a string with unit, the Highcharts types are wrong
      height: `${height}px`,
      display: 'flex',
      // Vertically align bottom
      'align-items': 'flex-end',
      fontFamily: fontFamilies.condensed,
      fontSize: fontSizePx,
      lineHeight: lineHeightFactor,
      color: fontColors.normal,
    },
  };
};

/**
 * Renders a numerical reference to the annotation text footer.
 * Number in a circle that looks like ①, ②, ③ etc.
 *
 * @param {string} label
 * @param {'top' | 'right'} position
 * @returns {import('highcharts').XAxisPlotBandsLabelOptions}
 */
const getReferenceLabelOptions = (label, position) => {
  // Fixed font and circle size
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
text-align: center;
`;
  const isRight = position === 'right';
  return {
    align: isRight ? 'right' : 'center',
    useHTML: true,
    text: `<span style="${style}">${escapeHTML(label)}</span>`,
    x: isRight ? -2 : undefined,
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
 * position: 'top' | 'right'
 * }} options
 * @returns {import('highcharts').XAxisPlotBandsOptions[]}
 */
export const createAnnotationPlotBands = ({
  positionedAnnotations,
  chartSize,
  showLabelsInline,
  position,
}) => {
  if (positionedAnnotations.length === 0) return [];

  const fontSizePxInline =
    fontStyleByTextElementTypes[textElementTypes.legend].fontSize[chartSize];
  const fontSizeNumberInline = parseFloat(fontSizePxInline);

  let referenceIndex = 0;
  return positionedAnnotations.map((annotation) => {
    const { label, showLabelInline, from, to, color } = annotation;

    const labelOptions =
      showLabelsInline && showLabelInline
        ? // Inline annotation
          getInlineLabelOptions(label, fontSizePxInline, fontSizeNumberInline)
        : // Reference annotation in footer
          getReferenceLabelOptions(String(++referenceIndex), position);

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
