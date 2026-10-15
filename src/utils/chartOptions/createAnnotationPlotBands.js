// @ts-check

const LABEL_COLOR = '#586179';
const BAND_COLOR = '#F0F4F8';

/**
 * @param {string} string
 */
const escapeHTML = (string) =>
  string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {{
 * positionedAnnotations: import('./annotation').PositionedAnnotation[];
 * isSmall: boolean;
 * showLabelsInline: boolean;
 * }} options
 * @returns {import('highcharts').XAxisPlotBandsOptions[]}
 */
export const createAnnotationPlotBands = ({
  positionedAnnotations,
  isSmall,
  showLabelsInline,
}) => {
  return positionedAnnotations.map((annotation, index) => {
    const { label, showLabelInline, from, to, color } = annotation;

    const finalShowLabelInline = showLabelsInline && showLabelInline;

    /** @type {import('highcharts').XAxisPlotBandsLabelOptions | undefined} */
    let labelOptions;
    if (finalShowLabelInline) {
      // Render label in the plot band
      const fontSize = isSmall ? 13 : 16;
      const fontSizePx = `${fontSize}px`;
      const lineHeightFactor = isSmall ? 1.15 : 1.25;
      const height = fontSize * lineHeightFactor * 2;
      const style = `
display: block;
display: -webkit-box;
-webkit-box-orient: vertical;
-webkit-line-clamp: 2;
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
        y: -(fontSize * lineHeightFactor * 1.5),
        style: {
          // Vertically align bottom
          display: 'flex',
          'align-items': 'flex-end',
          height,
          fontSize: fontSizePx,
          lineHeight: lineHeightFactor,
          color: LABEL_COLOR,
        },
      };
    } else {
      // Render numerical reference to the caption
      const fontSize = '12px';
      const width = 16;
      const widthPx = `${width}px`;
      const style = `
box-sizing: content-box;
display: block;
width: ${widthPx};
height: ${widthPx};
border: 1px solid ${LABEL_COLOR};
border-radius: 50%;
`;
      const htmlText = `<span style="${style}">${String(index + 1)}</span>`;
      labelOptions = {
        y: width - 1,
        useHTML: true,
        text: htmlText,
        style: {
          fontSize: fontSize,
          lineHeight: widthPx,
          fontWeight: 'bolder',
          color: LABEL_COLOR,
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
