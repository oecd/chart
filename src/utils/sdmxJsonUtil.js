import * as R from 'ramda';
import { chartTypes } from '../constants/chart';
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
import { isNilOrEmpty } from './ramdaUtil';
import { possibleVariables } from './configUtil';

const dotStatTimeout = 15000;

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
      const varValue = R.propOr('', varName, vars);

      return R.replace(
        new RegExp(`{${varName}}`, 'gi'),
        R.toUpper(R.replace(/\|/g, '+', `${varValue}`)),
        acc,
      );
    },
    dotStatUrl,
    possibleVariables,
  );

export const fetchDotStatData = async (url, lang, fetchConfig = {}) => {
  const response = await fetch(fixDotStatUrl(url), {
    headers: createDotStatHeaders(lang),
    signal: AbortSignal.timeout(fetchConfig.timeout || dotStatTimeout),
    ...R.dissoc('timeout', fetchConfig),
  });

  if (response.status >= 200 && response.status < 300) {
    return response.json();
  }

  if (response.status === 404) {
    try {
      const responseText = await response.text();
      // handle the response that should be considered as empty
      // instead of as "404" errors for .Stat v8 (application/vnd.sdmx.data+json;version=1.0)
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
      throw new Error(
        R.isEmpty(response.statusText) ? response.status : response.statusText,
      );
    }
  }

  let message = R.isEmpty(response.statusText)
    ? response.status
    : response.statusText;
  try {
    const responseText = await response.text();
    message = R.isEmpty(responseText) ? message : responseText;
    // eslint-disable-next-line no-empty
  } catch {}

  throw new Error(message);
};

export const createDimensionMemberLabelByCode = (
  members,
  lang,
  codeLabelMapping,
) =>
  R.compose(
    R.when(
      () => !isNilOrEmpty(codeLabelMapping),
      R.mergeLeft(codeLabelMapping),
    ),
    R.fromPairs,
    R.map((m) => [
      m.id,
      R.pathOr(R.propOr(R.prop('id', m), 'name', m), ['names', lang], m),
    ]),
  )(members);

export const isTimeDimension = R.anyPass([
  R.propEq(true, 'isTimeDimension'),
  R.propEq('TIME_PERIOD', 'role'),
  R.compose(R.includes('TIME_PERIOD'), R.propOr([], 'roles')),
]);

export const getXAndYDimension = (
  allDimensions,
  dimensionsWithMoreThanOneMember,
  {
    chartType,
    mapCountryDimension,
    dotStatUrlHasLastNObservationsEqOne,
    dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
    dotStatXAxisDimension,
    dotStatYAxisDimension,
  },
) => {
  if (!R.isNil(dotStatXAxisDimension) && !R.isNil(dotStatYAxisDimension)) {
    const x = R.find(R.propEq(dotStatXAxisDimension, 'id'), allDimensions);
    const y = R.find(R.propEq(dotStatYAxisDimension, 'id'), allDimensions);
    if (x && y) {
      return [x, y];
    }
  }

  const finalDimensions = R.compose(
    R.when(R.isEmpty, R.always(allDimensions)),
    R.when(
      () => dotStatUrlHasLastNObservationsEqOne,
      R.reject(isTimeDimension),
    ),
  )(allDimensions);

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
      finalDimensions,
    );

    if (countryDimension) {
      const yDimension =
        R.head(
          R.reject(
            R.propEq(countryDimension.id, 'id'),
            dimensionsWithMoreThanOneMember,
          ),
        ) ||
        findDimensionWithPredefinedIdOrThatDoesNotHaveId(
          finalDimensions,
          countryDimension.id,
        );

      return [countryDimension, yDimension];
    }
  }

  if (R.length(dimensionsWithMoreThanOneMember) >= 2) {
    const x = R.head(dimensionsWithMoreThanOneMember);
    const y = R.nth(1, dimensionsWithMoreThanOneMember);
    return [x, y];
  }
  if (R.length(dimensionsWithMoreThanOneMember) === 1) {
    const x = R.head(dimensionsWithMoreThanOneMember);
    const y = findDimensionWithPredefinedIdOrThatDoesNotHaveId(
      finalDimensions,
      x.id,
    );
    return [x, y];
  }

  return [R.head(finalDimensions), R.nth(1, finalDimensions)];
};

const matchMonth = R.match(/(\d{4})-(\d{2})/);

export const tweakDimensionLabels = R.map((dimension) => {
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

export const parseSdmxJson =
  ({
    chartType,
    mapCountryDimension,
    dotStatUrlHasLastNObservationsEqOne,
    dotStatCodeLabelMapping,
    csvCodeLabelMappingProjectLevel,
    lang,
    dotStatStructure,
    dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
    dotStatXAxisDimension,
    dotStatYAxisDimension,
  }) =>
  (sdmxJson) => {
    const observations = R.path(
      ['data', 'dataSets', 0, 'observations'],
      sdmxJson,
    );

    const dimensions = R.compose(
      R.filter(R.has('values')),
      R.path(['data', 'structure', 'dimensions', 'observation']),
    )(sdmxJson);

    const dimensionsWithMoreThanOneMember = R.compose(
      R.when(
        () => dotStatUrlHasLastNObservationsEqOne,
        R.reject(isTimeDimension),
      ),
      R.filter(R.compose(R.gt(R.__, 1), R.length, R.prop('values'))),
    )(dimensions);

    const [xDimension, yDimension] = tweakDimensionLabels(
      getXAndYDimension(dimensions, dimensionsWithMoreThanOneMember, {
        chartType,
        mapCountryDimension,
        dotStatUrlHasLastNObservationsEqOne,
        dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
        dotStatXAxisDimension,
        dotStatYAxisDimension,
      }),
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
      R.when(
        () => dotStatUrlHasLastNObservationsEqOne,
        R.reject(isTimeDimension),
      ),
    )(otherDimensions);

    const totalNumberOfDataPoint = R.length(R.keys(observations));

    const getXDimensionMemberCodeByIndex = (index) =>
      R.compose(R.prop('id'), R.nth(index))(xDimension.values);

    const getTimeDimensionMemberCodeByIndex = (index) =>
      R.compose(R.prop('id'), R.nth(index))(timeDimension?.values || []);

    const defaultRowValues = R.times(
      () => ({ value: null }),
      R.length(yDimension.values),
    );

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
      timeDimension && dotStatUrlHasLastNObservationsEqOne;

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
          () => ({ value: null }),
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

        const finalValue = R.when(
          () => finalLastNObservationsEqOne,
          (v) => {
            const time = parseInt(
              R.nth(timeDimensionIndexInCoordinate, coordinate),
              10,
            );
            const timeCode = getTimeDimensionMemberCodeByIndex(time);
            return R.assoc('metadata', { timeCode }, v);
          },
        )({ value });

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
      csvCodeLabelMappingProjectLevel,
      dotStatCodeLabelMapping,
      dotStatStructure,
      lang,
    );

    const yDimensionLabelByCode = createDimensionMemberLabelByCode(
      yDimension.values,
      lang,
      codeLabelMapping,
    );

    const parsingHelperData = {
      xDimensionLabelByCode: createDimensionMemberLabelByCode(
        xDimension.values,
        lang,
        codeLabelMapping,
      ),
      yDimensionLabelByCode,
      otherDimensionsLabelByCode: R.compose(
        R.reduce(
          (acc, d) =>
            R.mergeRight(
              acc,
              createDimensionMemberLabelByCode(
                d.values,
                lang,
                codeLabelMapping,
              ),
            ),
          {},
        ),
      )(otherDimensions),
    };

    const latestAvailableDataMapping = finalLastNObservationsEqOne
      ? R.compose(() => {
          const timeCodes = R.compose(
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
        })()
      : {};

    const caterories = R.concat(
      ['Category'],
      R.map(R.prop('id'), R.prop('values', yDimension)),
    );

    return {
      data: R.prepend(caterories, series),
      parsingHelperData,
      dotStatInfo: {
        unusedDimensions,
        totalNumberOfDataPoint,
        numberOfUsedDataPoint,
      },
      ...latestAvailableDataMapping,
    };
  };

export const isSdmxJsonEmpty = (sdmxJson) =>
  !R.has('observations', R.path(['data', 'dataSets', 0], sdmxJson));

export const createDataFromSdmxJson = ({
  sdmxJson,
  lang,
  dotStatStructure,
  dotStatCodeLabelMapping,
  csvCodeLabelMappingProjectLevel,
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
  dotStatXAxisDimension,
  dotStatYAxisDimension,
}) => {
  if (!sdmxJson) {
    return null;
  }

  return R.compose(
    addCodeLabelMapping,
    sortParsedDataOnYAxis(yAxisOrderOverride),
    parseData,
    sortCSV(sortBy, sortOrder, sortSeries),
    handleAreCategoriesNumbers(chartType, forceXAxisToBeTreatedAsCategories),
    handleAreCategoriesDates(
      dataSourceType,
      chartType,
      forceXAxisToBeTreatedAsCategories,
    ),
    pivotCSV(
      chartType,
      dataSourceType,
      pivotData,
      dotStatXAxisDimension,
      dotStatYAxisDimension,
    ),
    parseSdmxJson({
      chartType,
      mapCountryDimension,
      dotStatUrlHasLastNObservationsEqOne,
      dotStatCodeLabelMapping,
      csvCodeLabelMappingProjectLevel,
      lang,
      dotStatStructure,
      dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
      dotStatXAxisDimension,
      dotStatYAxisDimension,
    }),
  )(sdmxJson);
};
