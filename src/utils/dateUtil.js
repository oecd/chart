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
    stringFormat: 'yyyy-MM',
    differenceFunc: differenceInMonths,
    addFunc: addMonths,
  },
  [frequencyTypes.quaterly.value]: {
    stringFormat: 'yyyy-QQQ',
    differenceFunc: differenceInQuarters,
    addFunc: addQuarters,
  },
  [frequencyTypes.yearly.value]: {
    stringFormat: 'yyyy',
    differenceFunc: differenceInYears,
    addFunc: addYears,
  },
};

export const getSteps = ({ frequencyTypeCode, minCode, maxCode }) => {
  try {
    const frequencyType = R.prop(frequencyTypeCode, frequencies);

    const { stringFormat, differenceFunc, addFunc } = frequencyType;

    const minDate = parse(minCode, stringFormat, new Date());
    const maxDate = parse(maxCode, stringFormat, new Date());

    const stepNumber = differenceFunc(maxDate, minDate);

    const steps = R.map((stepIndex) => {
      return format(addFunc(minDate, stepIndex), stringFormat);
    }, R.times(R.identity, stepNumber + 1));

    return steps;
  } catch {
    return [];
  }
};
