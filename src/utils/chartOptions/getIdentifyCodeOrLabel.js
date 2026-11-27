// @ts-check
import * as R from 'ramda';

/**
 * @param {{ label: string; code: string }} s
 * @return {[ label: string, code: string ]}
 */
const getCodeAndLabelLowercase = (s) => [R.toLower(s.label), R.toLower(s.code)];
const getLowercaseCode = R.compose(R.toLower, R.prop('code'));

/**
 * Returns a function to identify a series or category code or label.
 * The function returns the identified type and the lowercase code –
 * or `undefined` if the string could not be identified.
 *
 * @param {{ code: string; label: string; }[]} series
 * @param {{ code: string; label: string; }[]} categories
 */
export const getIdentifyCodeOrLabel = (series, categories) => {
  const seriesCodes = new Set(R.map(getLowercaseCode, series));
  const seriesCodesByLabel = new Map(R.map(getCodeAndLabelLowercase, series));
  const categoryCodes = new Set(R.map(getLowercaseCode, categories));
  const categoryCodesByLabel = new Map(
    R.map(getCodeAndLabelLowercase, categories),
  );

  return R.memoizeWith(
    (codeOrLabel, knownType) => `${codeOrLabel}/${knownType}`,
    /**
     * @param {string} codeOrLabel
     * @param {"unknown" | 'series' | 'category'} [knownType]
     * @returns {{ type: 'series' | 'category', code: string } | undefined}
     */
    (codeOrLabel, knownType = 'unknown') => {
      const codeOrLabelLowercase = codeOrLabel.trim().toLowerCase();

      if (knownType === 'unknown' || knownType === 'series') {
        // Is it a series code?
        if (seriesCodes.has(codeOrLabelLowercase)) {
          return { type: 'series', code: codeOrLabelLowercase };
        }

        // Is it a series label?
        const seriesCode = seriesCodesByLabel.get(codeOrLabelLowercase);
        if (seriesCode) {
          return { type: 'series', code: seriesCode };
        }
      }

      if (knownType === 'unknown' || knownType === 'category') {
        // Is it a category code?
        if (categoryCodes.has(codeOrLabelLowercase)) {
          return { type: 'category', code: codeOrLabelLowercase };
        }

        // Is it a category label?
        const categoryCode = categoryCodesByLabel.get(codeOrLabelLowercase);
        if (categoryCode) {
          return { type: 'category', code: categoryCode };
        }
      }

      return undefined;
    },
  );
};
