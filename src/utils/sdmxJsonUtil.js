import * as R from 'ramda';
import { chartTypes, fakeMemberLatest } from '../constants/chart';
import {
  pivotCSV,
  sortCSV,
  parseData,
  sortParsedDataOnYAxis,
  createCodeLabelMapping,
  addCodeLabelMapping,
  handleAreCategoriesDates,
  handleAreCategoriesNumbers,
} from './csvUtil';
import { isNilOrEmpty, mapWithIndex } from './ramdaUtil';
import { possibleVariables } from './configUtil';

const fixDotStatUrl = (url) => {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('dimensionAtObservation', 'AllDimensions');

  return parsedUrl.href;
};

const createDotStatHeaders = (lang) => ({
  Accept: 'application/vnd.sdmx.data+json;version=1.0',
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

export const fetchDotStatData = async (url, lang, fetchConfig = {}) => {
  const response = await fetch(fixDotStatUrl(url), {
    headers: createDotStatHeaders(lang),
    ...fetchConfig,
  });

  if (response.status >= 200 && response.status < 300) {
    return response.json();
  }

  if (response.status === 404) {
    try {
      const responseText = await response.text();
      // handle the response that should be considered as empty
      // instead of as "404" errors for .Stat v7 and v8 (application/vnd.sdmx.data+json;version=1.0)
      // application/vnd.sdmx.data+json;version=2.0 responds with 200 status code but can not be used
      // because it contains other bugs.
      if (
        R.includes('NoResultsFound', responseText) ||
        R.includes('NoRecordsFound', responseText) ||
        R.includes('No Results Found', responseText)
      ) {
        // send a fake .Stat v8 partial message
        // so that it will be detected as an "empty" message by the parser
        return { data: { dataSets: [{}] }, meta: { schema: '' } };
      }
    } catch (e) {
      throw new Error(response.statusText);
    }
  }

  throw new Error(response.statusText);
};

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
  {
    chartType,
    mapCountryDimension,
    latestAvailableData,
    dotStatUrlHasLastNObservationsEqOne,
    dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
  },
  isV8,
) => {
  const dimensionsWithMoreThanOneMember = R.filter(
    R.compose(R.gt(R.__, 1), R.length, R.prop('values')),
    dimensions,
  );

  const findDimensionWithPredefinedIdOrThatDoesNotHaveId = (
    dimensionList,
    id,
  ) => {
    const dimensionWithoutIdToExclude = R.reject(
      R.propEq(id, 'id'),
      dimensionList,
    );
    if (
      isNilOrEmpty(dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember)
    ) {
      return R.head(dimensionWithoutIdToExclude);
    }

    return (
      R.find(
        R.compose(
          R.equals(
            R.toUpper(
              dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
            ),
          ),
          R.toUpper,
          R.prop('id'),
        ),
        dimensionWithoutIdToExclude,
      ) || R.head(dimensionWithoutIdToExclude)
    );
  };

  const timeDimension =
    latestAvailableData || dotStatUrlHasLastNObservationsEqOne
      ? R.find(isTimeDimension, dimensionsWithMoreThanOneMember)
      : null;

  if (chartType === chartTypes.map) {
    const countryDimension = R.find(
      R.compose(
        R.ifElse(
          () => isNilOrEmpty(mapCountryDimension),
          R.includes(R.__, ['COU', 'COUNTRY', 'LOC', 'LOCATION', 'REF_AREA']),
          R.equals(R.toUpper(mapCountryDimension)),
        ),
        R.prop('id'),
      ),
      dimensions,
    );

    if (countryDimension) {
      if (timeDimension && dotStatUrlHasLastNObservationsEqOne && isV8) {
        const dimensionsWithMoreThanOneMemberWithoutTime = R.reject(
          R.propEq(timeDimension.id, 'id'),
          dimensionsWithMoreThanOneMember,
        );
        const dimensionsWithoutTime = R.reject(
          R.propEq(timeDimension.id, 'id'),
          dimensions,
        );

        const yDimension =
          R.head(
            R.reject(
              R.propEq(countryDimension.id, 'id'),
              dimensionsWithMoreThanOneMemberWithoutTime,
            ),
          ) ||
          findDimensionWithPredefinedIdOrThatDoesNotHaveId(
            dimensionsWithoutTime,
            countryDimension.id,
          );

        return [countryDimension, yDimension];
      }

      if (latestAvailableData) {
        const yDimension =
          R.head(
            R.reject(
              R.propEq(countryDimension.id, 'id'),
              dimensionsWithMoreThanOneMember,
            ),
          ) ||
          findDimensionWithPredefinedIdOrThatDoesNotHaveId(
            dimensions,
            countryDimension.id,
          );

        return [countryDimension, timeDimension ?? yDimension];
      }
    }
  }

  if (timeDimension) {
    if (dotStatUrlHasLastNObservationsEqOne && isV8) {
      const dimensionsWithMoreThanOneMemberWithoutTime = R.reject(
        R.propEq(timeDimension.id, 'id'),
        dimensionsWithMoreThanOneMember,
      );
      const dimensionsWithoutTime = R.reject(
        R.propEq(timeDimension.id, 'id'),
        dimensions,
      );

      if (R.length(dimensionsWithMoreThanOneMemberWithoutTime) >= 2) {
        const x = R.head(dimensionsWithMoreThanOneMemberWithoutTime);
        const y = R.nth(1, dimensionsWithMoreThanOneMemberWithoutTime);
        return [x, y];
      }
      if (R.length(dimensionsWithMoreThanOneMemberWithoutTime) === 1) {
        const x = R.head(dimensionsWithMoreThanOneMemberWithoutTime);
        const y = findDimensionWithPredefinedIdOrThatDoesNotHaveId(
          dimensionsWithoutTime,
          x.id,
        );
        return [x, y];
      }

      return [R.head(dimensions), R.nth(1, dimensions)];
    }

    if (latestAvailableData) {
      const xDimension =
        R.head(
          R.reject(
            R.propEq(timeDimension.id, 'id'),
            dimensionsWithMoreThanOneMember,
          ),
        ) ||
        findDimensionWithPredefinedIdOrThatDoesNotHaveId(
          dimensions,
          timeDimension.id,
        );

      return [xDimension, timeDimension];
    }
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
        const y = findDimensionWithPredefinedIdOrThatDoesNotHaveId(
          dimensions,
          x.id,
        );

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

export const parseSdmxJson = (chartConfig, version) => (sdmxJson) => {
  const isV8 = detectV8(sdmxJson);

  const dataSets = isV8
    ? R.path(['data', 'dataSets'], sdmxJson)
    : R.prop('dataSets', sdmxJson);

  const rawDimensions = isV8
    ? R.path(['data', 'structure', 'dimensions', 'observation'], sdmxJson)
    : R.path(['structure', 'dimensions', 'observation'], sdmxJson);

  const dimensions = isV8 ? rawDimensions : fixV7DimensionsBug(rawDimensions);

  const [xDimension, yDimension] = tweakDimensionLabels(
    getXAndYDimension(dimensions, chartConfig, isV8),
  );

  const timeDimension = R.find(isTimeDimension, dimensions);

  const otherDimensions = R.reject(
    R.compose(R.includes(R.__, [xDimension.id, yDimension.id]), R.prop('id')),
    dimensions,
  );

  const unusedDimensions = R.compose(
    R.map((dim) => ({
      id: dim.id,
      name: dim.name,
      memberCodes: R.map(R.prop('id'), dim.values),
    })),
    R.filter(R.compose(R.gt(R.__, 1), R.length, R.prop('values'))),
  )(otherDimensions);

  const observations = R.path([0, 'observations'], dataSets);

  const totalNumberOfDataPoint = R.length(R.keys(observations));

  const getXDimensionMemberCodeByIndex = (index) =>
    R.compose(R.prop('id'), R.nth(index))(xDimension.values);

  const getTimeDimensionMemberCodeByIndex = (index) =>
    R.compose(R.prop('id'), R.nth(index))(timeDimension?.values || []);

  const defaultRowValues = R.times(
    () => (version !== '2' ? null : { value: null }),
    R.length(yDimension.values),
  );

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
  const timeDimensionIndexInCoordinate = timeDimension
    ? R.propOr(R.length(dimensions) - 1, 'keyPosition', timeDimension)
    : -1;

  const finalLastNObservationsEqOne =
    timeDimension && chartConfig.dotStatUrlHasLastNObservationsEqOne && isV8;

  const finalLatestAvailableData =
    chartConfig.latestAvailableData && isTimeDimension(yDimension);

  const series = R.compose(
    (seriesWithoutEmptyOnes) => {
      const allXMemberCodes = R.map(R.prop('id'), xDimension.values);
      const seriesMemberCodes = R.map(R.head, seriesWithoutEmptyOnes);
      const missingEmptySeriesMemberCodes = R.difference(
        allXMemberCodes,
        seriesMemberCodes,
      );

      if (R.isEmpty(missingEmptySeriesMemberCodes)) {
        return seriesWithoutEmptyOnes;
      }

      const emptyData = R.times(
        () => (version !== '2' ? null : { value: null }),
        R.length(R.head(seriesWithoutEmptyOnes)) - 1,
      );

      const missingEmptySeries = R.map(
        (c) => R.prepend(c, emptyData),
        missingEmptySeriesMemberCodes,
      );

      return R.concat(seriesWithoutEmptyOnes, missingEmptySeries);
    },
    R.map(([k, v]) => R.prepend(k, v)),
    R.toPairs,
    R.reduce((acc, [coordinateString, [value]]) => {
      const coordinate = R.split(':', coordinateString);

      const x = parseInt(R.nth(xDimensionIndexInCoordinate, coordinate), 10);
      const xCode = getXDimensionMemberCodeByIndex(x);
      const y = parseInt(R.nth(yDimensionIndexInCoordinate, coordinate), 10);

      if (version !== '2') {
        if (finalLatestAvailableData) {
          const yCode = getTimeDimensionMemberCodeByIndex(y);
          return R.assoc(xCode, [value, yCode], acc);
        }

        return R.has(xCode, acc)
          ? R.evolve({ [xCode]: R.update(y, value) }, acc)
          : R.assoc(xCode, R.update(y, value, defaultRowValues), acc);
      }

      const finalValue = R.when(
        () => finalLastNObservationsEqOne || finalLatestAvailableData,
        (v) => {
          const time = parseInt(
            R.nth(timeDimensionIndexInCoordinate, coordinate),
            10,
          );
          const timeCode = getTimeDimensionMemberCodeByIndex(time);
          return R.assoc('metadata', { timeCode }, v);
        },
      )({ value });

      if (finalLatestAvailableData) {
        return R.assoc(xCode, [finalValue], acc);
      }

      return R.has(xCode, acc)
        ? R.evolve({ [xCode]: R.update(y, finalValue) }, acc)
        : R.assoc(xCode, R.update(y, finalValue, defaultRowValues), acc);
    }, {}),
  )(R.toPairs(observations));

  const numberOfUsedDataPoint = R.compose(
    R.sum,
    R.map(
      R.compose(
        R.length,
        R.reject(R.compose(R.isNil, R.prop('value'))),
        R.tail,
      ),
    ),
  )(series);

  const codeLabelMapping = createCodeLabelMapping(
    chartConfig.csvCodeLabelMappingProjectLevel,
    chartConfig.dotStatCodeLabelMapping,
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

  const latestAvailableDataMapping =
    finalLatestAvailableData || finalLastNObservationsEqOne
      ? R.compose(
          R.when(
            () => version !== '2',
            R.compose(
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
                  R.map((s) => [
                    R.head(s),
                    R.prop(R.last(s), yDimensionLabelByCode),
                  ]),
                )(series),
              ),
            ),
          ),
          () => {
            const timeCodes =
              version !== '2'
                ? R.map(R.last, series)
                : R.compose(
                    R.reject(R.isNil),
                    R.map(R.path(['metadata', 'timeCode'])),
                    R.unnest,
                    R.map(R.tail),
                  )(series);
            const orderedTimeCodes = R.sortBy(R.identity, timeCodes);
            return {
              latestYMin: R.head(orderedTimeCodes),
              latestYMax: R.last(orderedTimeCodes),
            };
          },
        )()
      : {};

  const caterories = finalLatestAvailableData
    ? ['Category', fakeMemberLatest.code]
    : R.concat(['Category'], R.map(R.prop('id'), R.prop('values', yDimension)));

  return {
    data: R.prepend(caterories, series),
    parsingHelperData,
    dotStatInfo: {
      unusedDimensions,
      totalNumberOfDataPoint,
      numberOfUsedDataPoint,
    },
    finalLatestAvailableData,
    ...latestAvailableDataMapping,
  };
};

export const isSdmxJsonEmpty = (sdmxJson) =>
  detectV8(sdmxJson)
    ? !R.has('observations', R.path(['data', 'dataSets', 0], sdmxJson))
    : R.isEmpty(R.path(['structure', 'dimensions', 'observation'], sdmxJson));

export const createDataFromSdmxJson = ({
  sdmxJson,
  dotStatCodeLabelMapping,
  csvCodeLabelMappingProjectLevel,
  latestAvailableData,
  dotStatUrlHasLastNObservationsEqOne,
  mapCountryDimension,
  pivotData,
  chartType,
  dataSourceType,
  sortBy,
  sortOrder,
  sortSeries = '',
  yAxisOrderOverride,
  forceXAxisToBeTreatedAsCategories,
  dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
  version,
}) => {
  if (!sdmxJson) {
    return null;
  }

  return R.compose(
    R.assoc('version', version),
    addCodeLabelMapping,
    sortParsedDataOnYAxis(yAxisOrderOverride),
    parseData,
    sortCSV(sortBy, sortOrder, sortSeries, version),
    handleAreCategoriesNumbers(
      chartType,
      forceXAxisToBeTreatedAsCategories,
      version,
    ),
    handleAreCategoriesDates(
      dataSourceType,
      chartType,
      forceXAxisToBeTreatedAsCategories,
      version,
    ),
    pivotCSV(chartType, dataSourceType, pivotData),
    parseSdmxJson(
      {
        chartType,
        pivotData,
        mapCountryDimension,
        latestAvailableData,
        dotStatUrlHasLastNObservationsEqOne,
        dotStatCodeLabelMapping,
        csvCodeLabelMappingProjectLevel,
        dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
      },
      version,
    ),
  )(sdmxJson);
};
