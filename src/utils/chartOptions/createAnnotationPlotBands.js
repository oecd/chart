// @ts-check

import {
  fontColors,
  fontFamilies,
  fontStyleByTextElementTypes,
  textElementTypes,
} from '../../constants/styling';

const BAND_COLOR = '#F0F4F8';

/**
 * @param {string} string
 */
const escapeHTML = (string) =>
  string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lineHeightFactor = 1.15;
const numberOfLines = 2;

/**
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
  const fontSizePx =
    fontStyleByTextElementTypes[textElementTypes.legend].fontSize[chartSize];
  const fontSizeNumber = parseFloat(fontSizePx);

  return positionedAnnotations.map((annotation, index) => {
    const { label, showLabelInline, from, to, color } = annotation;

    const finalShowLabelInline = showLabelsInline && showLabelInline;

    /** @type {import('highcharts').XAxisPlotBandsLabelOptions | undefined} */
    let labelOptions;
    if (finalShowLabelInline) {
      // Render label in the plot band

      const height = fontSizeNumber * lineHeightFactor * numberOfLines;
      const style = `
display: block;
display: -webkit-box;
-webkit-box-orient: vertical;
-webkit-line-clamp: ${numberOfLines};
overflow: hidden;
white-space: normal;
`;
      const htmlText = `<span style="${style}">${escapeHTML(label)}</span>`;
      labelOptions = {
        useHTML: true,
        text: htmlText,
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
    } else {
      // Render numerical reference to the caption. Looks like ①, ②, ③ etc.
      const fontSize = '12px';
      const width = 16;
      const widthPx = `${width}px`;
      const style = `
box-sizing: content-box;
display: block;
width: ${widthPx};
height: ${widthPx};
border: 1px solid ${fontColors.normal};
border-radius: 50%;
`;
      const htmlText = `<span style="${style}">${String(index + 1)}</span>`;
      labelOptions = {
        y: width - 1,
        useHTML: true,
        text: htmlText,
        style: {
          fontFamily: fontFamilies.condensed,
          fontSize: fontSize,
          lineHeight: widthPx,
          color: fontColors.normal,
        },
      };
    }

    const finalColor = color || BAND_COLOR;

    /** @type {import('highcharts').XAxisPlotBandsOptions} */
    const plotBand = {
      from,
      to,
      color: finalColor,
      label: labelOptions,
    };
    return plotBand;
  });
};
