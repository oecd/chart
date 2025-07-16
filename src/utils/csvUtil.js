import Papa from 'papaparse';
import * as R from 'ramda';
import {
  chartTypes,
  chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
  dataSourceTypes,
  frequencyTypes,
  sortByOptions,
  sortOrderOptions,
} from '../constants/chart';
import { tryCastAllToDatesAndDetectFormat } from './chartUtil';
import {
  codeOrLabelEquals,
  possibleVariables,
  isCastableToNumber,
} from './configUtil';
import { createCodeLabelMap } from './generalUtil';

import { isNilOrEmpty, mapWithIndex, reduceWithIndex } from './ramdaUtil';
import { frequencies } from './dateUtil';

export const emptyData = {
  categories: [],
  series: [],
  otherDimensions: [],
  areCategoriesDates: false,
  areCategoriesNumbers: false,
  codeLabelMapping: {},
};

const parseRawCSV = (csvString, options = {}) =>
  Papa.parse(csvString, {
    dynamicTyping: true,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
    ...options,
  });

export const serializeCSV = (data, options) => Papa.unparse(data, options);

const cleanupCSV = (data) => {
  if (isNilOrEmpty(data)) {
    return [];
  }

  const numberOfColumn = R.length(R.reject(R.isNil, R.head(data)));

  return R.map((row) => {
    if (R.length(row) === numberOfColumn) {
      return row;
    }
    if (R.length(row) > numberOfColumn) {
      return R.take(numberOfColumn, row);
    }
    return R.concat(
      row,
      R.times(R.always(null), numberOfColumn - R.length(row)),
    );
  }, data);
};

export const parseCSV = (csvString, options = {}) =>
  R.compose(cleanupCSV, R.prop('data'), (s) => parseRawCSV(s, options))(
    csvString ?? '',
  );

export const parseCSVAndIncludeParsingMetadata = (csvString, options = {}) =>
  R.compose(R.modify('data', cleanupCSV), (s) => parseRawCSV(s, options))(
    csvString ?? '',
  );

export const parseCSVWithoutCleanUp = (csvString, options = {}) =>
  R.compose(R.when(isNilOrEmpty, R.always([])), R.prop('data'), (s) =>
    parseRawCSV(s, options),
  )(csvString ?? '');

export const parseData = ({ data, parsingHelperData, ...rest }) => {
  if (isNilOrEmpty(data)) {
    return { categories: [], series: [], otherDimensions: [], ...rest };
  }

  const categories = R.map(
    (c) => ({
      code: `${c}`,
      label: R.path(['xDimensionLabelByCode', c], parsingHelperData),
    }),
    R.map(R.head, R.tail(data)),
  );

  const series = mapWithIndex(
    (seriesCode, idx) => {
      const serieData = R.map(R.nth(idx + 1), R.tail(data));
      return {
        code: `${seriesCode}`,
        label: R.path(
          ['yDimensionLabelByCode', `${seriesCode}`],
          parsingHelperData,
        ),
        data: serieData,
      };
    },
    R.tail(R.head(data)),
  );

  const otherDimensions = R.map(
    ([c, l]) => ({
      code: `${c}`,
      label: l,
    }),
    R.toPairs(parsingHelperData.otherDimensionsLabelByCode),
  );

  return { categories, series, otherDimensions, ...rest };
};

const shouldPivot = (
  data,
  pivotData,
  chartType,
  dataSourceType,
  dotStatXAxisDimension,
  dotStatYAxisDimension,
) => {
  if (
    chartType === chartTypes.map &&
    dataSourceType === dataSourceTypes.dotStat.value
  ) {
    return false;
  }

  if (!R.isNil(dotStatXAxisDimension) && !R.isNil(dotStatYAxisDimension)) {
    return false;
  }

  if (
    R.length(data) === 2 &&
    R.includes(chartType, [
      chartTypes.bar,
      chartTypes.row,
      chartTypes.line,
      chartTypes.pie,
    ])
  ) {
    return true;
  }
  if (
    R.length(R.head(data)) === 2 &&
    R.includes(chartType, [chartTypes.stackedBar, chartTypes.stackedRow])
  ) {
    return true;
  }
  if (
    R.length(R.head(data)) === 2 &&
    R.includes(chartType, [chartTypes.line, chartTypes.radar])
  ) {
    return false;
  }

  return pivotData;
};

export const pivotCSV =
  (
    chartType,
    dataSourceType,
    pivotData,
    dotStatXAxisDimension,
    dotStatYAxisDimension,
  ) =>
  ({ data, ...rest }) => {
    if (
      shouldPivot(
        data,
        pivotData,
        chartType,
        dataSourceType,
        dotStatXAxisDimension,
        dotStatYAxisDimension,
      )
    ) {
      const header = R.map(R.head, data);

      const rows = mapWithIndex(
        (category, i) => R.prepend(category, R.map(R.nth(i + 1), R.tail(data))),
        R.tail(R.head(data)),
      );

      const newData = R.prepend(header, rows);

      // parsingHelperData will be defined only if datasource is .Stat
      if (R.has('parsingHelperData', rest)) {
        const parsingHelperData = {
          xDimensionLabelByCode: rest.parsingHelperData.yDimensionLabelByCode,
          yDimensionLabelByCode: rest.parsingHelperData.xDimensionLabelByCode,
          otherDimensionsLabelByCode:
            rest.parsingHelperData.otherDimensionsLabelByCode,
        };

        return {
          data: newData,
          parsingHelperData,
          ...R.omit(['parsingHelperData'], rest),
        };
      }

      return { data: newData, ...rest };
    }

    return { data, ...rest };
  };

export const createCodeLabelMapping = ({
  csvCodeLabelMappingProjectLevel,
  codeLabelMappingChartLevel,
  dotStatStructure,
  lang,
  vars,
}) => {
  if (
    isNilOrEmpty(csvCodeLabelMappingProjectLevel) &&
    isNilOrEmpty(codeLabelMappingChartLevel) &&
    isNilOrEmpty(dotStatStructure?.dimensions) &&
    isNilOrEmpty(vars)
  ) {
    return {};
  }

  const mappingDotStatMembers = R.compose(
    R.mergeAll,
    R.map(
      R.compose(
        R.map(
          ({ labels }) =>
            R.prop(lang, labels) ||
            R.prop('en', labels) ||
            R.prop(R.head(R.keys(labels)), labels) ||
            '',
        ),
        R.prop('members'),
      ),
    ),
    R.reject(R.has('timeRange')),
  )(dotStatStructure?.dimensions || []);

  const mappingVars = R.compose(
    createCodeLabelMap,
    R.map((v) => [v, v]),
    R.reject(R.isEmpty),
    R.values,
  )(vars || {});

  const mappingProjectLevel = createCodeLabelMap(
    parseCSV(csvCodeLabelMappingProjectLevel),
  );
  const mappingChartLevel = createCodeLabelMap(
    parseCSV(codeLabelMappingChartLevel),
  );

  return R.compose(
    R.mergeRight(mappingVars),
    R.mergeRight(mappingDotStatMembers),
    R.mergeRight(mappingProjectLevel),
  )(mappingChartLevel);
};

const addParsingHelperData =
  (csvCodeLabelMappingProjectLevel, csvCodeLabelMapping, vars) =>
  ({ data, ...rest }) => {
    const codeLabelMapping = createCodeLabelMapping({
      csvCodeLabelMappingProjectLevel,
      codeLabelMappingChartLevel: csvCodeLabelMapping,
      vars,
    });

    const xDimensionLabelByCode = R.fromPairs(
      R.map(
        R.compose(
          (code) => [
            `${code}`,
            R.propOr(`${code}`, R.toUpper(`${code}`), codeLabelMapping),
          ],
          R.head,
        ),
        R.tail(data),
      ),
    );

    const yDimensionLabelByCode = R.compose(
      R.fromPairs,
      R.map((code) => [
        `${code}`,
        R.propOr(`${code}`, R.toUpper(`${code}`), codeLabelMapping),
      ]),
      R.tail,
      R.head,
    )(data);

    return {
      data,
      rawCodeLabelMapping: codeLabelMapping,
      parsingHelperData: {
        xDimensionLabelByCode,
        yDimensionLabelByCode,
        otherDimensionsLabelByCode: codeLabelMapping,
      },
      ...rest,
    };
  };

export const sortParsedDataOnYAxis =
  (yAxisOrderOverride) =>
  ({ categories, series, ...rest }) => {
    if (isNilOrEmpty(yAxisOrderOverride)) {
      return { categories, series, ...rest };
    }

    const validCodesOrLabels = R.filter(
      (codeOrLabel) => R.find((s) => codeOrLabelEquals(s)(codeOrLabel), series),
      R.split('|', yAxisOrderOverride),
    );

    const sortedSeries = reduceWithIndex(
      (acc, codeOrLabel, i) => {
        const idx = R.findIndex((s) => codeOrLabelEquals(s)(codeOrLabel), acc);
        return R.move(idx, i, acc);
      },
      series,
      validCodesOrLabels,
    );

    return { categories, series: sortedSeries, ...rest };
  };

export const sortCSV =
  (sortBy, sortOrder, sortSeries) =>
  ({
    data,
    parsingHelperData,
    areCategoriesDates,
    areCategoriesNumbers,
    ...rest
  }) => {
    const orderFunc =
      !sortOrder ||
      sortOrder === sortOrderOptions.asc.value ||
      areCategoriesDates ||
      areCategoriesNumbers
        ? R.ascend
        : R.descend;

    const finalSortBy =
      areCategoriesDates || areCategoriesNumbers
        ? sortByOptions.categoriesCode.value
        : sortBy;

    if (
      finalSortBy === sortByOptions.categoriesLabel.value ||
      finalSortBy === sortByOptions.categoriesCode.value
    ) {
      const selector =
        finalSortBy === sortByOptions.categoriesLabel.value
          ? (code) => R.path(['xDimensionLabelByCode', code], parsingHelperData)
          : R.identity;
      return {
        data: R.prepend(
          R.head(data),
          R.sort(orderFunc(R.compose(selector, R.head)), R.tail(data)),
        ),
        parsingHelperData,
        areCategoriesDates,
        areCategoriesNumbers,
        ...rest,
      };
    }

    if (finalSortBy === sortByOptions.seriesValue.value) {
      const seriesCodes = R.map((s) => R.toUpper(`${s}`), R.tail(R.head(data)));

      const seriesLabels = R.map(
        R.compose(
          R.toUpper,
          R.propOr('', R.__, parsingHelperData.yDimensionLabelByCode),
        ),
        seriesCodes,
      );

      const findSeriesIndexByCodeOrLabel = (codeOrLabel) =>
        R.compose(
          R.when(R.equals(-1), () =>
            R.findIndex(R.equals(codeOrLabel), seriesLabels),
          ),
          () => R.findIndex(R.equals(codeOrLabel), seriesCodes),
        )();

      const yIndexes = R.compose(
        R.when(R.isEmpty, R.always([0])),
        R.reject(R.equals(-1)),
        R.map(findSeriesIndexByCodeOrLabel),
        R.split('|'),
        R.toUpper,
      )(sortSeries);

      return {
        data: R.prepend(
          R.head(data),
          R.sort(
            orderFunc(
              R.compose(
                R.sum,
                R.props(yIndexes),
                R.map(R.prop('value')),
                R.tail,
              ),
            ),
            R.tail(data),
          ),
        ),
        parsingHelperData,
        areCategoriesDates,
        areCategoriesNumbers,
        ...rest,
      };
    }

    if (finalSortBy === sortByOptions.allSeriesValue.value) {
      const yIndexes = R.compose(
        R.times(R.identity),
        R.length,
        R.tail,
        R.head,
      )(data);

      return {
        data: R.prepend(
          R.head(data),
          R.sort(
            orderFunc(
              R.compose(
                R.sum,
                R.props(yIndexes),
                R.map(R.prop('value')),
                R.tail,
              ),
            ),
            R.tail(data),
          ),
        ),
        parsingHelperData,
        areCategoriesDates,
        areCategoriesNumbers,
        ...rest,
      };
    }

    return {
      data,
      parsingHelperData,
      areCategoriesDates,
      areCategoriesNumbers,
      ...rest,
    };
  };

export const handleAreCategoriesDates =
  (dataSourceType, chartType, forceXAxisToBeTreatedAsCategories) => (data) => {
    const xAxisToBeTreatedAsCategories =
      forceXAxisToBeTreatedAsCategories ||
      R.includes(chartType, chartTypesForWhichXAxisIsAlwaysTreatedAsCategories);

    if (xAxisToBeTreatedAsCategories) {
      return { ...data, areCategoriesDates: false };
    }

    const categoriesCodes = R.compose(
      R.map(R.head),
      R.tail,
      R.prop('data'),
    )(data);

    const {
      isSuccessful,
      dates: categoriesCodesAsDates,
      dateFormat,
    } = tryCastAllToDatesAndDetectFormat(categoriesCodes);

    if (isSuccessful) {
      const newData = xAxisToBeTreatedAsCategories
        ? data.data
        : R.compose(
            R.prepend(R.head(data.data)),
            mapWithIndex((d, i) =>
              R.prepend(
                R.head(d),
                R.map(
                  (point) =>
                    R.assocPath(
                      ['metadata', 'parsedX'],
                      R.nth(i, categoriesCodesAsDates),
                      point,
                    ),
                  R.tail(d),
                ),
              ),
            ),
            R.tail,
            R.prop('data'),
          )(data);

      return {
        ...data,
        data: newData,
        areCategoriesDates: true,
        categoriesDateFomat: dateFormat,
      };
    }

    return { ...data, areCategoriesDates: false };
  };

export const handleAreCategoriesNumbers =
  (chartType, forceXAxisToBeTreatedAsCategories) => (data) => {
    if (
      data.areCategoriesDates ||
      forceXAxisToBeTreatedAsCategories ||
      R.includes(chartType, chartTypesForWhichXAxisIsAlwaysTreatedAsCategories)
    ) {
      return { ...data, areCategoriesNumbers: false };
    }

    const categoriesCodes = R.compose(
      R.map(R.head),
      R.tail,
      R.prop('data'),
    )(data);

    if (R.all(isCastableToNumber, categoriesCodes)) {
      const categoriesCodesAsNumbers = R.map(Number, categoriesCodes);

      const newData = R.compose(
        R.prepend(R.head(data.data)),
        mapWithIndex((d, i) =>
          R.prepend(
            R.head(d),
            R.map(
              (point) =>
                R.assocPath(
                  ['metadata', 'parsedX'],
                  R.nth(i, categoriesCodesAsNumbers),
                  point,
                ),
              R.tail(d),
            ),
          ),
        ),
        R.tail,
        R.prop('data'),
      )(data);

      return {
        ...data,
        data: newData,
        areCategoriesNumbers: true,
      };
    }

    return { ...data, areCategoriesNumbers: false };
  };

export const addCodeLabelMapping = (data) =>
  R.assoc(
    'codeLabelMapping',
    R.compose(
      R.fromPairs,
      R.map(({ code, label }) => [R.toUpper(code), label]),
    )(
      R.unnest([
        R.prop('categories', data),
        R.prop('series', data),
        R.prop('otherDimensions', data),
      ]),
    ),
    data,
  );

const filterCSV = (vars) => (data) => {
  const headerRow = R.head(data);
  const firstVarColumnIndex = R.findIndex(
    R.includes(
      R.__,
      R.map((v) => `{${v}}`, possibleVariables),
    ),
    headerRow,
  );

  if (firstVarColumnIndex === -1) {
    return { data };
  }

  const firstVarName = R.nth(firstVarColumnIndex, headerRow);
  const firstVarValue = R.compose(
    R.when(() => firstVarColumnIndex === 0, R.split('|')),
    R.toUpper,
    R.prop(R.replace(/{|}/g, '', firstVarName)),
  )(vars);

  const secondVarColumnIndex =
    firstVarColumnIndex +
    1 +
    R.findIndex(
      R.includes(
        R.__,
        R.map((v) => `{${v}}`, possibleVariables),
      ),
      R.drop(firstVarColumnIndex + 1, headerRow),
    );

  const secondVarName =
    secondVarColumnIndex > firstVarColumnIndex
      ? R.nth(secondVarColumnIndex, headerRow)
      : null;
  const secondVarValue = secondVarName
    ? R.compose(R.toUpper, R.prop(R.replace(/{|}/g, '', secondVarName)))(vars)
    : null;

  return {
    data: R.compose(
      (dataRows) => {
        if (!secondVarName) {
          const finalDataRows =
            firstVarColumnIndex === 0
              ? dataRows
              : R.map(R.remove(firstVarColumnIndex, 1), dataRows);
          return R.prepend(
            firstVarColumnIndex === 0
              ? R.head(data)
              : R.compose(R.remove(firstVarColumnIndex, 1), R.head)(data),
            finalDataRows,
          );
        }

        if (firstVarColumnIndex === 0) {
          const finalDataRows = R.map(
            R.remove(secondVarColumnIndex, 1),
            dataRows,
          );

          return R.prepend(
            R.compose(R.remove(secondVarColumnIndex, 1), R.head)(data),
            finalDataRows,
          );
        }

        const finalDataRows = R.map(
          R.compose(
            R.remove(secondVarColumnIndex - 1, 1),
            R.remove(firstVarColumnIndex, 1),
          ),
          dataRows,
        );

        return R.prepend(
          R.compose(
            R.remove(secondVarColumnIndex - 1, 1),
            R.remove(firstVarColumnIndex, 1),
            R.head,
          )(data),
          finalDataRows,
        );
      },
      R.filter((row) => {
        const firstVarColumnValue = R.toUpper(
          `${R.nth(firstVarColumnIndex, row)}`,
        );

        const firstVarValueMatches =
          firstVarColumnIndex === 0
            ? R.includes(firstVarColumnValue, firstVarValue)
            : R.equals(firstVarColumnValue, firstVarValue);

        if (!secondVarName) {
          return firstVarValueMatches;
        }

        const secondVarColumnValue = R.toUpper(
          `${R.nth(secondVarColumnIndex, row)}`,
        );

        const secondVarValueMatches = R.equals(
          secondVarColumnValue,
          secondVarValue,
        );

        return firstVarValueMatches && secondVarValueMatches;
      }),
    )(R.tail(data)),
    varsThatCauseNewPreParsedDataFetch: secondVarName
      ? {
          [R.replace(/{|}/g, '', R.nth(firstVarColumnIndex, headerRow))]:
            firstVarColumnIndex === 0
              ? R.join('|', firstVarValue)
              : firstVarValue,
          [R.replace(/{|}/g, '', R.nth(secondVarColumnIndex, headerRow))]:
            secondVarValue,
        }
      : {
          [R.replace(/{|}/g, '', R.nth(firstVarColumnIndex, headerRow))]:
            firstVarColumnIndex === 0
              ? R.join('|', firstVarValue)
              : firstVarValue,
        },
  };
};

const transformCategoriesLabel =
  (chartType, forceXAxisToBeTreatedAsCategories, lang) => (data) => {
    if (
      data.areCategoriesDates &&
      R.includes(data.categoriesDateFomat, [
        frequencyTypes.quinquennial.value,
        frequencyTypes.yearly.value,
      ]) &&
      !forceXAxisToBeTreatedAsCategories &&
      !R.includes(chartType, chartTypesForWhichXAxisIsAlwaysTreatedAsCategories)
    ) {
      return data;
    }

    if (
      data.areCategoriesDates &&
      R.includes(data.categoriesDateFomat, [
        frequencyTypes.monthly.value,
        frequencyTypes.quarterly.value,
      ])
    ) {
      const frequency = R.prop(data.categoriesDateFomat, frequencies);

      return R.compose(
        R.when(
          () =>
            forceXAxisToBeTreatedAsCategories ||
            R.includes(
              chartType,
              chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
            ),
          R.compose(
            R.dissoc('categoriesDateFomat'),
            R.assoc('areCategoriesDates', false),
          ),
        ),
        R.evolve({
          categories: R.map((c) => {
            if (R.has(c.code, data.rawCodeLabelMapping)) {
              return c;
            }
            const codeAsDate = frequency.tryParse(c.code);
            return R.assoc(
              'label',
              frequency.formatToLabel(codeAsDate, lang),
              c,
            );
          }),
        }),
      )(data);
    }

    return R.compose(
      R.dissoc('categoriesDateFomat'),
      R.assoc('areCategoriesDates', false),
    )(data);
  };

const transformValuesAndExtractMetadata = ({ data, ...rest }) => {
  const headerRow = R.head(data);

  const matedata1ColumnIndex = R.findIndex(
    R.test(/{metadata1}/i),
    R.tail(headerRow),
  );
  const matedata2ColumnIndex = R.findIndex(
    R.test(/{metadata2}/i),
    R.tail(headerRow),
  );

  if (matedata1ColumnIndex === -1 && matedata2ColumnIndex === -1) {
    const newData = R.map(
      (row) =>
        R.prepend(
          R.head(row),
          R.map((v) => ({ value: v }), R.tail(row)),
        ),
      R.tail(data),
    );

    return { data: R.prepend(headerRow, newData), ...rest };
  }

  const newData = R.map((row) => {
    const metadata1 =
      matedata1ColumnIndex !== -1
        ? R.head(
            parseCSVWithoutCleanUp(R.nth(matedata1ColumnIndex, R.tail(row))),
          ) || []
        : [];
    const metadata2 =
      matedata2ColumnIndex !== -1
        ? R.head(
            parseCSVWithoutCleanUp(R.nth(matedata2ColumnIndex, R.tail(row))),
          ) || []
        : [];

    return R.prepend(
      R.head(row),
      reduceWithIndex(
        (acc, v, i) =>
          i === matedata1ColumnIndex || i === matedata2ColumnIndex
            ? acc
            : R.append(
                {
                  value: v,
                  custom: {
                    metadata1:
                      R.length(metadata1) === 1
                        ? R.head(metadata1)
                        : R.nth(i, metadata1),
                    metadata2:
                      R.length(metadata2) === 1
                        ? R.head(metadata2)
                        : R.nth(i, metadata2),
                  },
                },
                acc,
              ),
        [],
        R.tail(row),
      ),
    );
  }, R.tail(data));

  const finalHeaderRow = R.reject(R.test(/{metadata[12]}/i), headerRow);

  return { data: R.prepend(finalHeaderRow, newData), ...rest };
};

export const createDataFromCSV = ({
  staticCsvData,
  chartType,
  dataSourceType,
  pivotData,
  csvCodeLabelMappingProjectLevel,
  csvCodeLabelMapping,
  sortBy,
  sortOrder,
  sortSeries,
  yAxisOrderOverride,
  forceXAxisToBeTreatedAsCategories,
  vars,
  lang,
}) => {
  if (isNilOrEmpty(staticCsvData)) {
    return emptyData;
  }

  return R.compose(
    addCodeLabelMapping,
    R.dissoc('rawCodeLabelMapping'),
    transformCategoriesLabel(
      chartType,
      forceXAxisToBeTreatedAsCategories,
      lang,
    ),
    sortParsedDataOnYAxis(yAxisOrderOverride),
    parseData,
    sortCSV(sortBy, sortOrder, sortSeries),
    handleAreCategoriesNumbers(chartType, forceXAxisToBeTreatedAsCategories),
    handleAreCategoriesDates(
      dataSourceType,
      chartType,
      forceXAxisToBeTreatedAsCategories,
    ),
    transformValuesAndExtractMetadata,
    addParsingHelperData(
      csvCodeLabelMappingProjectLevel,
      csvCodeLabelMapping,
      vars,
    ),
    pivotCSV(chartType, dataSourceType, pivotData),
    filterCSV(vars),
    parseCSV,
  )(staticCsvData);
};
