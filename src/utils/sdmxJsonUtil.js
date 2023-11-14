import * as R from 'ramda';
import { chartTypes, fakeMemberLatest } from '../constants/chart';
import {
  parseCSV,
  pivotCSV,
  sortCSV,
  parseData,
  sortParsedDataOnYAxis,
  addCodeLabelMapping,
  handleAreCategoriesDates,
  handleAreCategoriesNumbers,
} from './csvUtil';
import { createCodeLabelMap } from './generalUtil';
import { isNilOrEmpty, mapWithIndex } from './ramdaUtil';
import { possibleVariables } from './configUtil';
import { fetchJson } from './fetchUtil';

const fixDotStatUrl = (url) => {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('dimensionAtObservation', 'AllDimensions');

  return parsedUrl.href;
};

const createDotStatHeaders = (lang) => ({
  Accept: 'application/vnd.sdmx.data+json',
  'Accept-Language': isNilOrEmpty(lang) ? 'en' : R.toLower(lang),
});

export const createDotStatUrl = (dotStatUrl, vars) =>
  R.reduce(
    (acc, varName) => {
      const varValue = R.prop(varName, vars);

      return R.replace(
        new RegExp(`{${varName}}`, 'gi'),
        R.toUpper(R.replace(/\|/g, '+', varValue)),
        acc,
      );
    },
    dotStatUrl,
    possibleVariables,
  );

export const fetchDotStatData = async (url, lang, fetchConfig = {}) =>
  fetchJson(fixDotStatUrl(url), {
    headers: createDotStatHeaders(lang),
    ...fetchConfig,
  });

const createDimensionMemberLabelByCode = (members, codeLabelMapping) =>
  R.compose(
    R.when(
      () => !isNilOrEmpty(codeLabelMapping),
      R.mergeLeft(codeLabelMapping),
    ),
    R.fromPairs,
    R.map((m) => [m.id, m.name]),
  )(members);

const isTimeDimension = R.either(
  R.propEq('TIME_PERIOD', 'role'),
  R.compose(R.includes('TIME_PERIOD'), R.propOr([], 'roles')),
);

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
            R.propEq(countryDimension.id, 'id'),
            dimensionsWithMoreThanOneMember,
          ),
        ) || R.head(R.reject(R.propEq(countryDimension.id, 'id'), dimensions));

      return [countryDimension, timeDimension ?? yDimension];
    }
  }

  if (timeDimension) {
    const xDimension =
      R.head(
        R.reject(
          R.propEq(timeDimension.id, 'id'),
          dimensionsWithMoreThanOneMember,
        ),
      ) || R.head(R.reject(R.propEq(timeDimension.id, 'id'), dimensions));

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
        const y = R.head(R.reject(R.propEq(x.id, 'id'), dimensions));
        return [x, y];
      },
    ],
    [R.T, R.always([R.head(dimensions), R.nth(1, dimensions)])],
  ])(dimensionsWithMoreThanOneMember);
};

const matchMonth = R.match(/(\d{4})-(\d{2})/);

const tweakDimensionLabels = R.map((dimension) => {
  if (isTimeDimension(dimension)) {
    const membersAreMonths = !R.isEmpty(
      matchMonth(R.head(dimension.values).id),
    );

    if (membersAreMonths) {
      return R.evolve(
        {
          values: R.map((month) => {
            // eslint-disable-next-line no-unused-vars
            const [_, y, m] = matchMonth(month.id);
            return { id: month.id, name: `${m}-${y}` };
          }),
        },
        dimension,
      );
    }

    return dimension;
  }
  return dimension;
});

const detectV8 = R.hasPath(['meta', 'schema']);

const fixV7DimensionsBug = (rawDimensions) => {
  // only time dimension is supposed to NOT have a keyPosition
  // but most often, it is the last dimension in the dimensions list
  // which allows to "guess" its position in data coordinates
  const isBugPresent = R.compose(
    (i) => i !== R.length(rawDimensions) - 1,
    R.findIndex((d) => !R.has('keyPosition', d)),
  )(rawDimensions);

  // when the bug occurs not only we no longer can assume that the time dimension "keyPosition"
  // is equal to length - 1 but all dimensions that are after the time one have an incorrect
  // keyPosition!
  // since the dimensions order and the their position in data coordinate match, the fix
  // consists to assoc a "keyPosition" to all dimensions (=> equal to index)
  return isBugPresent
    ? mapWithIndex((d, i) => R.assoc('keyPosition', i, d), rawDimensions)
    : rawDimensions;
};

export const parseSdmxJson = (chartConfig) => (sdmxJson) => {
  const isV8 = detectV8(sdmxJson);

  const dataSets = isV8
    ? R.path(['data', 'dataSets'], sdmxJson)
    : R.prop('dataSets', sdmxJson);

  const rawDimensions = isV8
    ? R.path(['data', 'structures', 0, 'dimensions', 'observation'], sdmxJson)
    : R.path(['structure', 'dimensions', 'observation'], sdmxJson);

  const dimensions = isV8 ? rawDimensions : fixV7DimensionsBug(rawDimensions);

  const [xDimension, yDimension] = tweakDimensionLabels(
    getXAndYDimension(dimensions, chartConfig),
  );

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

  // time dimension does not have keyPosition prop (and is supposed to always be the last one)
  // unless v7 sent buggy data (see fixV7DimensionsBug)
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

  const codeLabelMapping = createCodeLabelMap(
    parseCSV(chartConfig.dotStatCodeLabelMapping),
  );

  const yDimensionLabelByCode = createDimensionMemberLabelByCode(
    yDimension.values,
    codeLabelMapping,
  );

  const parsingHelperData = {
    xDimensionLabelByCode: createDimensionMemberLabelByCode(
      xDimension.values,
      codeLabelMapping,
    ),
    yDimensionLabelByCode: finalLatestAvailableData
      ? {
          [fakeMemberLatest.code]: fakeMemberLatest.label,
        }
      : yDimensionLabelByCode,
    otherDimensionsLabelByCode: R.compose(
      R.when(
        () => finalLatestAvailableData,
        R.mergeRight(yDimensionLabelByCode),
      ),
      R.reduce(
        (acc, d) =>
          R.mergeRight(
            acc,
            createDimensionMemberLabelByCode(d.values, codeLabelMapping),
          ),
        {},
      ),
    )(otherDimensions),
  };

  const latestAvailableDataMapping = finalLatestAvailableData
    ? R.compose(
        (mapping) => {
          const orderedLatestY = R.sortBy(R.identity, R.map(R.last, series));
          return {
            ...mapping,
            latestYMin: R.prop(R.head(orderedLatestY), yDimensionLabelByCode),
            latestYMax: R.prop(R.last(orderedLatestY), yDimensionLabelByCode),
          };
        },
        R.assoc(
          'latestYByXLabel',
          R.compose(
            R.fromPairs,
            R.map((s) => [
              R.prop(R.head(s), parsingHelperData.xDimensionLabelByCode),
              R.prop(R.last(s), yDimensionLabelByCode),
            ]),
          )(series),
        ),
        R.assoc(
          'latestYByXCode',
          R.compose(
            R.fromPairs,
            R.map((s) => [R.head(s), R.prop(R.last(s), yDimensionLabelByCode)]),
          )(series),
        ),
      )({})
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

export const isSdmxJsonEmpty = (sdmxJson) =>
  R.isEmpty(R.path(['structure', 'dimensions', 'observation'], sdmxJson));

export const createDataFromSdmxJson = ({
  sdmxJson,
  dotStatCodeLabelMapping,
  latestAvailableData,
  mapCountryDimension,
  pivotData,
  chartType,
  dataSourceType,
  sortBy,
  sortOrder,
  sortSeries = '',
  yAxisOrderOverride,
  forceXAxisToBeTreatedAsCategories,
}) => {
  if (!sdmxJson) {
    return null;
  }

  return R.compose(
    addCodeLabelMapping,
    handleAreCategoriesNumbers(chartType, forceXAxisToBeTreatedAsCategories),
    handleAreCategoriesDates(
      dataSourceType,
      chartType,
      forceXAxisToBeTreatedAsCategories,
    ),
    sortParsedDataOnYAxis(yAxisOrderOverride),
    parseData,
    sortCSV(sortBy, sortOrder, sortSeries),
    pivotCSV(chartType, dataSourceType, pivotData),
    parseSdmxJson({
      chartType,
      pivotData,
      mapCountryDimension,
      latestAvailableData,
      dotStatCodeLabelMapping,
    }),
  )(sdmxJson);
};
