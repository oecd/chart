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
    codeStringFormat: 'yyyy-MM',
    tryParse: (string) =>
      R.length(string) === 7 && tryParseWithFormat(string, 'yyyy-MM'),
    formatToLabel: (date) => format(date, 'MM-yyyy'),
    differenceFunc: differenceInMonths,
    addFunc: addMonths,
  },
  [frequencyTypes.quaterly.value]: {
    codeStringFormat: 'yyyy-QQQ',
    tryParse: (string) =>
      R.length(string) === 7 && tryParseWithFormat(string, 'yyyy-QQQ'),

    formatToLabel: (date, lang) => {
      const label = format(date, 'Q-yyyy');
      return lang === 'fr' ? `T${label}` : `Q${label}`;
    },
    differenceFunc: differenceInQuarters,
    addFunc: addQuarters,
  },
  [frequencyTypes.yearly.value]: {
    codeStringFormat: 'yyyy',
    tryParse: (string) =>
      R.length(string) === 4 && tryParseWithFormat(string, 'yyyy'),
    formatToLabel: (date) => format(date, 'yyyy'),
    differenceFunc: differenceInYears,
    addFunc: addYears,
  },
};

export const getSteps = (frequency, lang) => {
  const { frequencyTypeCode, minCode, maxCode } = frequency;
  try {
    const frequencyType = R.prop(frequencyTypeCode, frequencies);

    const {
      tryParse,
      formatToLabel,
      codeStringFormat,
      differenceFunc,
      addFunc,
    } = frequencyType;

    const minDate = tryParse(minCode);
    const maxDate = tryParse(maxCode);

    const stepNumber = differenceFunc(maxDate, minDate);

    const labelByCode = R.fromPairs(
      R.map(
        (stepIndex) => {
          const date = addFunc(minDate, stepIndex);
          const code = format(date, codeStringFormat);
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
