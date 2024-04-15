import {
  parse,
  format,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  addMonths,
  addQuarters,
  addYears,
  isValid,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import * as R from 'ramda';

import { frequencyTypes } from '../constants/chart';

const tryParseWithFormat = (string, dateFormat) => {
  const date = parse(string, dateFormat, new Date());
  if (isValid(date)) {
    return date;
  }
  return false;
};

export const frequencies = {
  [frequencyTypes.monthly.value]: {
    tryParse: (string) =>
      R.length(string) === 7 && tryParseWithFormat(string, 'yyyy-MM'),
    formatToCode: (date) => format(date, 'yyyy-MM'),
    formatToLabel: (date) => format(date, 'MM-yyyy'),
    differenceFunc: differenceInMonths,
    addFunc: addMonths,
    getStartPeriod: (date) => (isValid(date) ? startOfMonth(date) : ''),
    getEndPeriod: (date) => (isValid(date) ? endOfMonth(date) : ''),
    varValue: frequencyTypes.monthly.varValue,
    getLabel: (lang) => (lang === 'fr' ? 'Mensuelle' : 'Monthly'),
  },
  [frequencyTypes.quaterly.value]: {
    tryParse: (string) =>
      R.length(string) === 7 && tryParseWithFormat(string, 'yyyy-QQQ'),
    formatToCode: (date) => format(date, 'yyyy-QQQ'),
    formatToLabel: (date, lang) => {
      const label = format(date, 'Q-yyyy');
      return lang === 'fr' ? `T${label}` : `Q${label}`;
    },
    differenceFunc: differenceInQuarters,
    addFunc: addQuarters,
    getStartPeriod: (date) => (isValid(date) ? startOfQuarter(date) : ''),
    getEndPeriod: (date) => (isValid(date) ? endOfQuarter(date) : ''),
    varValue: frequencyTypes.quaterly.varValue,
    getLabel: (lang) => (lang === 'fr' ? 'Trimestrielle' : 'Quaterly'),
  },
  [frequencyTypes.yearly.value]: {
    tryParse: (string) =>
      R.length(string) === 4 && tryParseWithFormat(string, 'yyyy'),
    formatToCode: (date) => format(date, 'yyyy'),
    formatToLabel: (date) => format(date, 'yyyy'),
    differenceFunc: differenceInYears,
    addFunc: addYears,
    getStartPeriod: (date) => (isValid(date) ? startOfYear(date) : ''),
    getEndPeriod: (date) => (isValid(date) ? endOfYear(date) : ''),
    varValue: frequencyTypes.yearly.varValue,
    getLabel: (lang) => (lang === 'fr' ? 'Annuelle' : 'Yearly'),
  },
};

export const getSteps = (frequency, lang) => {
  const { frequencyTypeCode, minCode, maxCode } = frequency;
  try {
    const frequencyType = R.prop(frequencyTypeCode, frequencies);

    const { tryParse, formatToCode, formatToLabel, differenceFunc, addFunc } =
      frequencyType;

    const minDate = tryParse(minCode);
    const maxDate = tryParse(maxCode);

    const stepNumber = differenceFunc(maxDate, minDate);

    const labelByCode = R.fromPairs(
      R.map(
        (stepIndex) => {
          const date = addFunc(minDate, stepIndex);
          const code = formatToCode(date);
          const label = formatToLabel(date, lang);
          return [code, label];
        },
        R.times(R.identity, stepNumber + 1),
      ),
    );

    return { codes: R.keys(labelByCode), labelByCode };
  } catch {
    return { codes: [], labelByCode: [] };
  }
};
