import {
  parse,
  format,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  addMonths,
  addQuarters,
  addYears,
} from 'date-fns';
import * as R from 'ramda';

import { frequencyTypes } from '../constants/chart';

const frequencies = {
  [frequencyTypes.monthly.value]: {
    codeStringFormat: 'yyyy-MM',
    labelStringFormat: 'MM-yyyy',
    differenceFunc: differenceInMonths,
    addFunc: addMonths,
    transformLabel: R.identity,
  },
  [frequencyTypes.quaterly.value]: {
    codeStringFormat: 'yyyy-QQQ',
    labelStringFormat: 'Q-yyyy',
    differenceFunc: differenceInQuarters,
    addFunc: addQuarters,
    transformLabel: (label, lang) =>
      lang === 'fr' ? `T${label}` : `Q${label}`,
  },
  [frequencyTypes.yearly.value]: {
    codeStringFormat: 'yyyy',
    labelStringFormat: 'yyyy',
    differenceFunc: differenceInYears,
    addFunc: addYears,
    transformLabel: R.identity,
  },
};

export const getSteps = (frequency, lang) => {
  const { frequencyTypeCode, minCode, maxCode } = frequency;
  try {
    const frequencyType = R.prop(frequencyTypeCode, frequencies);

    const {
      codeStringFormat,
      labelStringFormat,
      differenceFunc,
      addFunc,
      transformLabel,
    } = frequencyType;

    const minDate = parse(minCode, codeStringFormat, new Date());
    const maxDate = parse(maxCode, codeStringFormat, new Date());

    const stepNumber = differenceFunc(maxDate, minDate);

    const labelByCode = R.fromPairs(
      R.map((stepIndex) => {
        const date = addFunc(minDate, stepIndex);
        const code = format(date, codeStringFormat);
        const label = transformLabel(format(date, labelStringFormat), lang);
        return [code, label];
      }, R.times(R.identity, stepNumber + 1)),
    );

    return { codes: R.keys(labelByCode), labelByCode };
  } catch {
    return [];
  }
};
