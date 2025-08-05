import * as R from 'ramda';

export const createCodeLabelMap = R.compose(
  R.fromPairs,
  R.map(([c, l]) => [R.toUpper(`${c}`), `${l}`]),
  R.reject(R.compose(R.lt(R.__, 2), R.length, R.reject(R.isNil))),
);
