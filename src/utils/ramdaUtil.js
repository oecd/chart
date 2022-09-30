import * as R from 'ramda';

export const isNilOrEmpty = R.either(R.isNil, R.isEmpty);

export const mapWithIndex = R.addIndex(R.map);

export const reduceWithIndex = R.addIndex(R.reduce);

export const forEachWithIndex = R.addIndex(R.forEach);
