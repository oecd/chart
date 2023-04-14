import * as R from 'ramda';

export const generatePseudoRandomString = () => {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return R.join(
    '',
    R.times(() => chars.charAt(Math.random() * 62), 5),
  );
};

export const createCodeLabelMap = R.compose(
  R.fromPairs,
  R.map(([c, l]) => [R.toUpper(`${c}`), l]),
  R.reject(R.compose(R.lt(R.__, 2), R.length, R.reject(R.isNil))),
);
