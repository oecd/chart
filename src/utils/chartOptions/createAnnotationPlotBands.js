import * as R from 'ramda';

/**
 * @param {Annotation[]} annotations
 * @param {{ code: string }[]} categories
 * @param {boolean} areCategoriesDates
 * @param {{
 * tryParse: (string: string) => Date | false;
 * getMiddle: (date: Date, step: number) => Date;
 * }} categoriesFrequency
 * @param {boolean} isSmall
 * @param {string} labelColor
 * @returns {import('highcharts').XAxisPlotBandsOptions[]}
 */
export const createAnnotationPlotBands = (
  annotations,
  categories,
  areCategoriesDates,
  categoriesFrequency,
  isSmall,
  labelColor,
) =>
  annotations
    .filter(({ type }) => type === 'band')
    .map((annotation, index) => {
      let from = -1;
      let to = -1;
      if (areCategoriesDates) {
        // Time categories => plot bands are defined with time stamps
        const fromDate = categoriesFrequency.tryParse(
          annotation.fromCategoryCode,
        );
        if (!fromDate) return;
        from = categoriesFrequency.getMiddle(fromDate, -1).getTime();

        const toDate = categoriesFrequency.tryParse(annotation.toCategoryCode);
        if (!toDate) return;
        to = categoriesFrequency.getMiddle(toDate, 1).getTime();
      } else {
        // Ordinal, discrete categories => plot bands are defined indices
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
      }

      const fontSize = isSmall ? 13 : 16;
      const isEven = index % 2 === 0;
      /** @type {import('highcharts').XAxisPlotBandsOptions} */
      const plotBand = {
        from,
        to,
        color: annotation.color || '#F0F4F8',
        zIndex: index,
        label: annotation.showLabelInline
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
          : undefined,
      };
      return plotBand;
    })
    .filter((plotBand) => plotBand !== undefined);
