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
import { UTCDate, utc } from '@date-fns/utc';
import * as R from 'ramda';

import { frequencyTypes } from '../constants/chart';

const differenceInQinquennials = (maxDate, minDate) =>
  (maxDate.getFullYear() - minDate.getFullYear()) / 5;

const addQinquennials = (date, amount) => addYears(date, amount * 5);

const tryParseWithFormat = (string, dateFormat) => {
  const date = parse(`${string}`, dateFormat, new UTCDate(), {
    in: utc,
  });

  if (isValid(date)) {
    return date;
  }
  return false;
};

export const frequencies = {
  [frequencyTypes.monthly.value]: {
    tryParse: (string) =>
      R.length(`${string}`) === 7 && tryParseWithFormat(string, 'yyyy-MM'),
    formatToCode: (date) => format(date, 'yyyy-MM'),
    formatToLabel: (date) => format(date, 'MM-yyyy'),
    differenceFunc: differenceInMonths,
    addFunc: addMonths,
    getStartPeriod: (date) => (isValid(date) ? startOfMonth(date) : ''),
    getEndPeriod: (date) => (isValid(date) ? endOfMonth(date) : ''),
    frequencyTypeCode: frequencyTypes.monthly.value,
    dotStatId: frequencyTypes.monthly.dotStatId,
    getLabel: (lang) => (lang === 'fr' ? 'Mensuelle' : 'Monthly'),
  },
  [frequencyTypes.quarterly.value]: {
    tryParse: (string) =>
      R.length(`${string}`) === 7 && tryParseWithFormat(string, 'yyyy-QQQ'),
    formatToCode: (date) => format(date, 'yyyy-QQQ'),
    formatToLabel: (date, lang) => {
      const label = format(date, 'Q-yyyy');
      return lang === 'fr' ? `T${label}` : `Q${label}`;
    },
    differenceFunc: differenceInQuarters,
    addFunc: addQuarters,
    getStartPeriod: (date) => (isValid(date) ? startOfQuarter(date) : ''),
    getEndPeriod: (date) => (isValid(date) ? endOfQuarter(date) : ''),
    frequencyTypeCode: frequencyTypes.quarterly.value,
    dotStatId: frequencyTypes.quarterly.dotStatId,
    getLabel: (lang) => (lang === 'fr' ? 'Trimestrielle' : 'Quarterly'),
  },
  [frequencyTypes.yearly.value]: {
    tryParse: (string) =>
      R.length(`${string}`) === 4 && tryParseWithFormat(string, 'yyyy'),
    formatToCode: (date) => format(date, 'yyyy'),
    formatToLabel: (date) => format(date, 'yyyy'),
    differenceFunc: differenceInYears,
    addFunc: addYears,
    getStartPeriod: (date) => (isValid(date) ? startOfYear(date) : ''),
    getEndPeriod: (date) => (isValid(date) ? endOfYear(date) : ''),
    frequencyTypeCode: frequencyTypes.yearly.value,
    dotStatId: frequencyTypes.yearly.dotStatId,
    getLabel: (lang) => (lang === 'fr' ? 'Annuelle' : 'Yearly'),
  },
  [frequencyTypes.quinquennial.value]: {
    tryParse: (string) => {
      const parsed = tryParseWithFormat(string, 'yyyy');
      if (R.length(`${string}`) !== 4 || !parsed) {
        return false;
      }
      return parsed.getFullYear() % 5 === 0 ? parsed : false;
    },
    formatToCode: (date) => format(date, 'yyyy'),
    formatToLabel: (date) => format(date, 'yyyy'),
    differenceFunc: differenceInQinquennials,
    addFunc: addQinquennials,
    getStartPeriod: (date) => {
      if (isValid(date)) {
        const year = date.getFullYear();
        date.setFullYear(year - (year % 5));
        return startOfYear(date);
      }
      return '';
    },
    getEndPeriod: (date) => {
      if (isValid(date)) {
        const year = date.getFullYear();
        if (year % 5 !== 0) {
          date.setFullYear(year + (5 - (year % 5)));
        }
        return endOfYear(date);
      }
      return '';
    },
    frequencyTypeCode: frequencyTypes.quinquennial.value,
    dotStatId: frequencyTypes.quinquennial.dotStatId,
    getLabel: (lang) => (lang === 'fr' ? 'Quinquennal' : 'Quinquennial'),
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

    const codes = R.keys(labelByCode);

    return { codes, labelByCode };
  } catch {
    return { codes: [], labelByCode: [] };
  }
};
