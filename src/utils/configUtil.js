import * as R from 'ramda';

export const possibleVariables = ['var1', 'var2', 'var3'];

export const doesStringContainVariable = R.test(
  new RegExp(
    R.join(
      '|',
      R.map((varName) => `{${varName}}`, possibleVariables),
    ),
    'i',
  ),
);

export const codeOrLabelEquals = (obj) =>
  R.compose(
    R.either(R.equals(R.toUpper(obj.code)), R.equals(R.toUpper(obj.label))),
    R.toUpper,
  );
