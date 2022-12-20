import * as R from 'ramda';

// eslint-disable-next-line import/prefer-default-export
export const generatePseudoRandomString = () => {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return R.join(
    '',
    R.times(() => chars.charAt(Math.random() * 62), 5),
  );
};
