// @ts-check
/* eslint-disable no-console */
import * as R from 'ramda';
import truncatise from 'truncatise';
import { frequencyTypes } from '../constants/chart';
import { defaultPalette, palettes } from '../constants/palette';
import {
  dataLastUpdateDateVariable,
  latestMaxVariable,
  latestMinVariable,
  possibleVariables,
} from './configUtil';
import { frequencies } from './dateUtil';
import { isNilOrEmpty } from './ramdaUtil';

export const tryCastAllToDatesAndDetectFormat = (values) => {
  const firstValue = R.head(values);

  const quinquennialFrequency = R.prop(
    frequencyTypes.quinquennial.value,
    frequencies,
  );

  const isAnyYearSmallerOrGreaterThanLikelyRealYear = R.any(
    (d) => d.getFullYear() < 1500 || d.getFullYear() > 2500,
  );

  if (quinquennialFrequency.tryParse(firstValue)) {
    const dates = R.map(quinquennialFrequency.tryParse, values);
    if (R.length(dates) > 1 && !R.any(R.equals(false), dates)) {
      if (isAnyYearSmallerOrGreaterThanLikelyRealYear(dates)) {
        return { isSuccessful: false, dates: null, dateFormat: null };
      }

      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.quinquennial.value,
      };
    }
  }

  const yearlyFrequency = R.prop(frequencyTypes.yearly.value, frequencies);
  if (yearlyFrequency.tryParse(firstValue)) {
    const dates = R.map(yearlyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      if (isAnyYearSmallerOrGreaterThanLikelyRealYear(dates)) {
        return { isSuccessful: false, dates: null, dateFormat: null };
      }

      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.yearly.value,
      };
    }
  }

  const monthyFrequency = R.prop(frequencyTypes.monthly.value, frequencies);
  if (monthyFrequency.tryParse(firstValue)) {
    const dates = R.map(monthyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.monthly.value,
      };
    }
  }

  const quarterlyFrequency = R.prop(
    frequencyTypes.quarterly.value,
    frequencies,
  );
  if (quarterlyFrequency.tryParse(firstValue)) {
    const dates = R.map(quarterlyFrequency.tryParse, values);
    if (!R.any(R.equals(false), dates)) {
      return {
        isSuccessful: true,
        dates: R.map((d) => d.getTime(), dates),
        dateFormat: frequencyTypes.quarterly.value,
      };
    }
  }

  return { isSuccessful: false, dates: null, dateFormat: null };
};

export const replaceBasicVarsNameByVarsValue = (string, vars) =>
  R.reduce(
    (acc, varName) =>
      R.replace(
        new RegExp(`{${varName}}`, 'gi'),
        R.propOr('', varName, vars),
        acc,
      ),
    string ?? '',
    possibleVariables,
  );

export const replaceAllVarsNameByVarsValue = ({
  string,
  vars,
  latestMin,
  latestMax,
  dataLastUpdateDate,
  mapping,
  replaceMissingVarByBlank = false,
  lang,
}) =>
  R.compose(
    R.replace(
      new RegExp(`{${latestMaxVariable}}`, 'gi'),
      latestMax || (replaceMissingVarByBlank ? ' ' : ''),
    ),
    R.replace(
      new RegExp(`{${latestMinVariable}}`, 'gi'),
      latestMin || (replaceMissingVarByBlank ? ' ' : ''),
    ),
    R.replace(
      new RegExp(`{${dataLastUpdateDateVariable}}`, 'gi'),
      dataLastUpdateDate || (replaceMissingVarByBlank ? ' ' : ''),
    ),
    R.reduce(
      (acc, varName) => {
        const labels = R.compose(
          R.when(R.isEmpty, () => (replaceMissingVarByBlank ? ' ' : '')),
          R.join(', '),
          R.reject(isNilOrEmpty),
          R.map((code) => {
            const label = R.propOr(code, code, mapping);
            const { isSuccessful, dateFormat } =
              tryCastAllToDatesAndDetectFormat([label]);
            if (isSuccessful) {
              const frequency = R.prop(dateFormat, frequencies);
              const date = frequency.tryParse(label);
              return frequency.formatToLabel(date, lang);
            }

            return R.propOr('', code, mapping);
          }),
          R.split('|'),
          R.toUpper,
          R.propOr('', varName),
        )(vars);

        return R.replace(new RegExp(`{${varName}}`, 'gi'), labels, acc);
      },
      R.__,
      possibleVariables,
    ),
  )(string ?? '');

const anyVarRegExp = R.join(
  '|',
  R.map(
    (v) => `{${v}}`,
    R.concat(possibleVariables, [
      latestMinVariable,
      latestMaxVariable,
      dataLastUpdateDateVariable,
    ]),
  ),
);

export const doesStringContainVar = R.test(new RegExp(anyVarRegExp, 'i'));

export const calcIsSmall = (width, height) =>
  !width || !height ? false : width < 540 || height < 350;

export const calcMarginTop = (title, subtitle, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return isSmall ? 20 : 32;
  }

  return undefined;
};

export const calcMarginTopWithHorizontal = (
  title,
  subtitle,
  horizontal,
  isSmall,
) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (isSmall) {
      return 22;
    }
    return horizontal ? 22 : 32;
  }

  return undefined;
};

export const createFooter = ({ source, note, stripLinks = false }) =>
  R.compose(
    R.when(() => stripLinks, R.replace(/<a\b[^>]*>(.*?)<\/a>/g, '$1')),
    R.replace(/<p>/g, '<p style="margin: 0px 0px 5px 0px">'),
    (html) =>
      truncatise(html, {
        TruncateLength: 800,
        TruncateBy: 'characters',
        Strict: false,
        StripHTML: false,
        Suffix: '...',
      }),
    R.join(''),
    R.reject(isNilOrEmpty),
  )([note, source]);

export const isParsedDataEmpty = (parsedData) =>
  R.isEmpty(parsedData?.categories) || R.isEmpty(parsedData?.series);

export const getPaletteById = (paletteId) =>
  R.find(R.propEq(paletteId, 'id'), palettes) || defaultPalette;
