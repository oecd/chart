import * as R from 'ramda';

const DEFAULT_COLOR = '#F0F4F8';
const COLOR_A = '#FAF0F0';
const COLOR_B = '#F0F0FA';

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
 * labelColor: string;
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
const getDiscreteAnnotations = (annotations, categories) =>
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
 * labelColor: string;
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
  showLabels,
  labelColor,
}) => {
  const bandAnnotations = annotations.filter(({ type }) => type === 'band');

  const annotationsWithPositions = areCategoriesDates
    ? getTimeAnnotations({
        annotations: bandAnnotations,
        series,
        categoriesFrequency,
      })
    : getDiscreteAnnotations({ annotations: bandAnnotations, categories });

  return annotationsWithPositions.map(({ annotation, from, to }, index) => {
    const fontSize = isSmall ? 13 : 16;
    const isEven = index % 2 === 0;

    const showLabel = showLabels && annotation.showLabelInline;

    /** @type {XAxisPlotBandsLabelOptions | undefined} */
    const label = showLabel
      ? {
          text: annotation.label,
          align: 'left',
          inside: false,
          x: isEven ? 0 : 5,
          y: isEven ? fontSize * -0.5 : fontSize + 1,
          style: {
            lineClamp: 1,
            fontSize: `${fontSize}px`,
            color: labelColor,
          },
        }
      : undefined;

    const color =
      annotation.color ||
      (annotationsWithPositions.length > 1
        ? isEven
          ? COLOR_A
          : COLOR_B
        : DEFAULT_COLOR);

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
