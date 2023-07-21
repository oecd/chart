import * as R from 'ramda';

export const isNilOrEmpty = R.either(R.isNil, R.isEmpty);

export const mapWithIndex = R.addIndex(R.map);

export const reduceWithIndex = R.addIndex(R.reduce);

export const forEachWithIndex = R.addIndex(R.forEach);

export const toggleArrayItem = R.curry((item, arr) => {
  if (R.includes(item, arr)) {
    return R.without([item], arr);
  }
  return R.append(item, arr);
});
