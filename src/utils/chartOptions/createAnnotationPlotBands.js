import * as R from 'ramda';

const LABEL_COLOR = '#586179';
const BAND_COLOR = '#F0F4F8';
const BAND_COLOR_A = '#FAF0F0';
const BAND_COLOR_B = '#F0F0FA';

/**
 * Adds from/to to annotations for time categories.
 * Plot bands are defined with time stamps.
 *
 * @param {{
 * annotations?: import('./exampleAnnotations').Annotation[];
 * series: {
 *   data: {
 *     value: number;
 *     metadata: { parsedX: number }
 *   }[]
 * }[];
 * categories: { code: string }[];
 * areCategoriesDates: boolean;
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * };
 * isSmall: boolean;
 * showLabels: boolean;
 * }} options
 * @returns {(Annotation & { from: number; to: number; })[]}
 */
const getTimeAnnotations = ({ annotations, series, categoriesFrequency }) => {
  const firstSeries = series[0];
  if (!firstSeries) return [];

  const parsedCategories = firstSeries.data.map(
    (point) => point.metadata.parsedX,
  );
  let firstTimestamp = parsedCategories ? R.head(parsedCategories) : null;
  let lastTimestamp = parsedCategories ? R.last(parsedCategories) : null;

  if (firstTimestamp === null || lastTimestamp === null) return [];

  return annotations
    .filter(({ type }) => type === 'band')
    .map((annotation) => {
      let from = -1;
      let to = -1;

      const fromDate = categoriesFrequency.tryParse(
        annotation.fromCategoryCode,
      );
      if (!fromDate) return;
      from = categoriesFrequency.getMiddle(fromDate, -1).getTime();
      // Ignore annotations outside of the value extent
      if (firstTimestamp !== null && from < firstTimestamp) return;

      const toDate = categoriesFrequency.tryParse(annotation.toCategoryCode);
      if (!toDate) return;
      to = categoriesFrequency.getMiddle(toDate, 1).getTime();
      if (lastTimestamp !== null && to > lastTimestamp) return;

      return { annotation, from, to };
    })
    .filter((definition) => definition !== undefined);
};

/**
 * Adds from/to to annotations for discrete categories.
 * Plot bands are defined with indices.
 *
 * @param {{
 * annotations?: import('./exampleAnnotations').Annotation[];
 * categories: { code: string }[];
 * }} options
 * @returns {(Annotation & { from: number; to: number; })[]}
 */
const getDiscreteAnnotations = ({ annotations, categories }) =>
  annotations
    .filter(({ type }) => type === 'band')
    .map((annotation) => {
      let from = -1;
      let to = -1;
      from = R.findIndex(
        R.compose(R.equals(annotation.fromCategoryCode), R.prop('code')),
        categories,
      );
      if (from === -1) return;
      to = R.findIndex(
        R.compose(R.equals(annotation.toCategoryCode), R.prop('code')),
        categories,
      );
      if (to === -1) return;
      from -= 0.5;
      to += 0.5;
      return { annotation, from, to };
    })
    .filter((definition) => definition !== undefined);

/**
 * @param {string} string
 */
const escapeHTML = (string) =>
  string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {{
 * annotations?: import('./exampleAnnotations').Annotation[];
 * series: {
 *   data: {
 *     value: number;
 *     metadata: { parsedX: number }
 *   }[]
 * }[];
 * categories: { code: string }[];
 * areCategoriesDates: boolean;
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * };
 * isSmall: boolean;
 * showLabelsInline: boolean;
 * }} options
 * @returns {import('highcharts').XAxisPlotBandsOptions[]}
 */
export const createAnnotationPlotBands = ({
  annotations,
  series,
  categories,
  areCategoriesDates,
  categoriesFrequency,
  isSmall,
  showLabelsInline,
}) => {
  const bandAnnotations = annotations.filter(({ type }) => type === 'band');

  const positionedAnnotations = areCategoriesDates
    ? getTimeAnnotations({
        annotations: bandAnnotations,
        series,
        categoriesFrequency,
      })
    : getDiscreteAnnotations({ annotations: bandAnnotations, categories });

  return positionedAnnotations.map(({ annotation, from, to }, index) => {
    const isEven = index % 2 === 0;

    const showLabelInline = showLabelsInline && annotation.showLabelInline;

    /** @type {import('highcharts').XAxisPlotBandsLabelOptions | undefined} */
    let label;
    if (showLabelInline) {
      // Render label in the plot band
      const fontSize = isSmall ? 13 : 16;
      const fontSizePx = `${fontSize}px`;
      const lineHeightFactor = isSmall ? 1.15 : 1.25;
      const height = `${fontSize * lineHeightFactor * 2}px`;
      const style = `
display: block;
display: -webkit-box;
-webkit-box-orient: vertical;
-webkit-line-clamp: 2;
overflow: hidden;
white-space: normal;
`;
      const labelText = escapeHTML(annotation.label);
      const htmlText = `<span style="${style}">${labelText}</span>`;
      label = {
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
      const fontSize = isSmall ? 12 : 14;
      const fontSizePx = `${fontSize}px`;
      const marginTop = isSmall ? 0 : 2;
      const marginTopPx = `${marginTop}px`;
      const lineHeight = isSmall ? 14 : 16;
      const lineHeightPx = `${lineHeight}px`;
      const style = `
display: block;
min-width: ${lineHeightPx};
aspect-ratio: 1;
margin-top: ${marginTopPx};
border: 1px solid ${LABEL_COLOR};
border-radius: 50%;
`;
      const htmlText = `<span style="${style}">${String(index + 1)}</span>`;
      label = {
        useHTML: true,
        text: htmlText,
        style: {
          fontSize: fontSizePx,
          lineHeight: lineHeightPx,
          fontWeight: 'bolder',
          color: LABEL_COLOR,
        },
      };
    }

    const color =
      annotation.color ||
      (positionedAnnotations.length > 1
        ? isEven
          ? BAND_COLOR_A
          : BAND_COLOR_B
        : BAND_COLOR);

    /** @type {import('highcharts').XAxisPlotBandsOptions} */
    const plotBand = {
      from,
      to,
      color,
      label,
    };
    return plotBand;
  });
};
