import * as R from 'ramda';
import { chartTypes } from '../constants/chart';
import { isNilOrEmpty } from './ramdaUtil';

export const fixDotStatUrl = (url) => {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('dimensionAtObservation', 'AllDimensions');
  return parsedUrl.href;
};

const createDimensionMemberLabelByCode = R.compose(
  R.fromPairs,
  R.map((m) => [m.id, m.name]),
);

const isTimeDimension = R.propEq('role', 'TIME_PERIOD');

const getXAndYDimension = (
  dimensions,
  { chartType, mapCountryDimension, latestAvailableData },
) => {
  const dimensionsWithMoreThanOneMember = R.filter(
    R.compose(R.gt(R.__, 1), R.length, R.prop('values')),
    dimensions,
  );

  const timeDimension = latestAvailableData
    ? R.find(isTimeDimension, dimensionsWithMoreThanOneMember)
    : null;

  if (chartType === chartTypes.map) {
    const countryDimension = R.find(
      R.compose(
        R.ifElse(
          () => isNilOrEmpty(mapCountryDimension),
          R.includes(R.__, ['COU', 'COUNTRY', 'LOC', 'LOCATION']),
          R.equals(R.toUpper(mapCountryDimension)),
        ),
        R.prop('id'),
      ),
      dimensions,
    );

    if (countryDimension) {
      const yDimension =
        R.head(
          R.reject(
            R.propEq('id', countryDimension.id),
            dimensionsWithMoreThanOneMember,
          ),
        ) || R.head(R.reject(R.propEq('id', countryDimension.id), dimensions));

      return [countryDimension, timeDimension ?? yDimension];
    }
  }

  if (timeDimension) {
    const xDimension =
      R.head(
        R.reject(
          R.propEq('id', timeDimension.id),
          dimensionsWithMoreThanOneMember,
        ),
      ) || R.head(R.reject(R.propEq('id', timeDimension.id), dimensions));

    return [xDimension, timeDimension];
  }

  return R.cond([
    [
      R.compose(R.gte(R.__, 2), R.length),
      R.always([
        R.head(dimensionsWithMoreThanOneMember),
        R.nth(1, dimensionsWithMoreThanOneMember),
      ]),
    ],
    [
      R.compose(R.equals(R.__, 1), R.length),
      () => {
        const x = R.head(dimensionsWithMoreThanOneMember);
        const y = R.head(R.reject(R.propEq('id', x.id), dimensions));
        return [x, y];
      },
    ],
    [R.T, R.always([R.head(dimensions), R.nth(1, dimensions)])],
  ])(dimensionsWithMoreThanOneMember);
};

export const fakeMemberLatest = { code: '_LATEST_', label: 'Latest' };

const detectV8 = R.hasPath(['meta', 'schema']);

export const parseSdmxJson = (chartConfig) => (sdmxJson) => {
  const isV8 = detectV8(sdmxJson);

  const dataSets = isV8
    ? R.path(['data', 'dataSets'], sdmxJson)
    : R.prop('dataSets', sdmxJson);

  const dimensions = isV8
    ? R.path(['data', 'structures', 0, 'dimensions', 'observation'], sdmxJson)
    : R.path(['structure', 'dimensions', 'observation'], sdmxJson);

  const [xDimension, yDimension] = getXAndYDimension(dimensions, chartConfig);

  const otherDimensions = R.reject(
    R.propSatisfies(
      (id) => R.includes(id, [xDimension.id, yDimension.id]),
      'id',
    ),
    dimensions,
  );

  const observations = R.path([0, 'observations'], dataSets);

  const getXDimensionMemberCodeByIndex = (index) =>
    R.compose(R.prop('id'), R.nth(index))(xDimension.values);

  const getYDimensionMemberCodeByIndex = (index) =>
    R.compose(R.prop('id'), R.nth(index))(yDimension.values);

  const defaultRowValues = R.times(R.always(null), R.length(yDimension.values));

  // time dimension does not have keyPosition prop (and is always the last one)
  const xDimensionIndexInCoordinate = R.propOr(
    R.length(dimensions) - 1,
    'keyPosition',
    xDimension,
  );
  const yDimensionIndexInCoordinate = R.propOr(
    R.length(dimensions) - 1,
    'keyPosition',
    yDimension,
  );

  const finalLatestAvailableData =
    chartConfig.latestAvailableData && isTimeDimension(yDimension);

  const series = R.compose(
    R.map(([k, v]) => R.prepend(k, v)),
    R.toPairs,
    R.reduce((acc, [coordinateString, [value]]) => {
      const coordinate = R.split(':', coordinateString);

      const x = parseInt(R.nth(xDimensionIndexInCoordinate, coordinate), 10);
      const xCode = getXDimensionMemberCodeByIndex(x);
      const y = parseInt(R.nth(yDimensionIndexInCoordinate, coordinate), 10);

      if (finalLatestAvailableData) {
        const yCode = getYDimensionMemberCodeByIndex(y);
        return R.assoc(xCode, [value, yCode], acc);
      }

      return R.has(xCode, acc)
        ? R.evolve({ [xCode]: R.update(y, value) }, acc)
        : R.assoc(xCode, R.update(y, value, defaultRowValues), acc);
    }, {}),
  )(R.toPairs(observations));

  const yDimensionLabelByCode = createDimensionMemberLabelByCode(
    yDimension.values,
  );

  const parsingHelperData = {
    xDimensionLabelByCode: createDimensionMemberLabelByCode(xDimension.values),
    yDimensionLabelByCode: finalLatestAvailableData
      ? {
          [fakeMemberLatest.code]: fakeMemberLatest.label,
        }
      : createDimensionMemberLabelByCode(yDimension.values),
    otherDimensionsLabelByCode: R.compose(
      R.when(
        () => finalLatestAvailableData,
        R.mergeRight(yDimensionLabelByCode),
      ),
      R.reduce(
        (acc, d) =>
          R.mergeRight(acc, createDimensionMemberLabelByCode(d.values)),
        {},
      ),
    )(otherDimensions),
  };

  const latestAvailableDataMapping = finalLatestAvailableData
    ? {
        latestYByXLabel: R.compose(
          R.fromPairs,
          R.map((s) => [
            R.prop(R.head(s), parsingHelperData.xDimensionLabelByCode),
            R.prop(R.last(s), yDimensionLabelByCode),
          ]),
        )(series),
        latestYByXCode: R.compose(
          R.fromPairs,
          R.map((s) => [R.head(s), R.prop(R.last(s), yDimensionLabelByCode)]),
        )(series),
      }
    : {};

  const caterories = finalLatestAvailableData
    ? ['Category', fakeMemberLatest.code]
    : R.concat(['Category'], R.map(R.prop('id'), R.prop('values', yDimension)));

  return {
    data: R.prepend(caterories, series),
    parsingHelperData,
    ...latestAvailableDataMapping,
  };
};
