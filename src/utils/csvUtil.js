import Papa from 'papaparse';
import * as R from 'ramda';
import {
  chartTypes,
  chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
  dataSourceTypes,
  sortByOptions,
  sortOrderOptions,
} from '../constants/chart';
import { tryCastAllToDatesAndDetectFormat } from './chartUtil';
import {
  codeOrLabelEquals,
  isCastableToNumber,
  isEqualToAnyVar,
  isEqualToAnyVarRange,
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

const cleanupCSV = R.compose(
  (csv) => {
    const largestRowSize = Math.max(...R.map(R.length, csv));

    return R.map((row) => {
      const rowSize = R.length(row);

      return rowSize === largestRowSize
        ? row
        : R.concat(
            row,
            R.times(() => null, largestRowSize - rowSize),
          );
    }, csv);
  },
  R.when(isNilOrEmpty, R.always([])),
);

export const parseCSV = (csvString, options = {}) =>
  R.compose(cleanupCSV, R.prop('data'), (s) => parseRawCSV(s, options))(
    csvString ?? '',
  );

export const parseCSVAndIncludeParsingMetadata = (csvString, options = {}) =>
  R.compose(R.modify('data', cleanupCSV), (s) => parseRawCSV(s, options))(
    csvString ?? '',
  );

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
  dotStatDimensions,
  lang,
  vars,
}) => {
  if (
    isNilOrEmpty(csvCodeLabelMappingProjectLevel) &&
    isNilOrEmpty(codeLabelMappingChartLevel) &&
    isNilOrEmpty(dotStatDimensions) &&
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
  )(dotStatDimensions || []);

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
  (sortBy, sortOrder, sortSeries, lang) =>
  ({
    data,
    parsingHelperData,
    areCategoriesDates,
    areCategoriesNumbers,
    ...rest
  }) => {
    const orderFuncForText =
      !sortOrder ||
      sortOrder === sortOrderOptions.asc.value ||
      areCategoriesDates ||
      areCategoriesNumbers
        ? R.ascendNatural
        : R.descendNatural;

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
      const finalLang = isNilOrEmpty(lang) || lang === 'default' ? 'en' : lang;
      const selector =
        finalSortBy === sortByOptions.categoriesLabel.value
          ? (code) => R.path(['xDimensionLabelByCode', code], parsingHelperData)
          : (l) => `${l}`;

      return {
        data: R.prepend(
          R.head(data),
          R.sort(
            orderFuncForText(finalLang, R.compose(selector, R.head)),
            R.tail(data),
          ),
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

export const handleAreCategoriesAndSeriesDates =
  (chartType, forceXAxisToBeTreatedAsCategories) => (data) => {
    const categoriesLabels = R.compose(
      R.map(
        R.propOr(
          R.identity,
          R.__,
          data.parsingHelperData.xDimensionLabelByCode,
        ),
      ),
      R.map(R.head),
      R.tail,
      R.prop('data'),
    )(data);

    const seriesLabels = R.compose(
      R.map(
        R.propOr(
          R.identity,
          R.__,
          data.parsingHelperData.yDimensionLabelByCode,
        ),
      ),
      R.tail,
      R.head,
      R.prop('data'),
    )(data);
    const {
      isSuccessful: isSuccessfulForSeries,
      dateFormat: dateFormatForSeries,
    } = tryCastAllToDatesAndDetectFormat(seriesLabels);

    const seriesInfo = isSuccessfulForSeries
      ? { areSeriesDates: true, seriesDateFomat: dateFormatForSeries }
      : { areSeriesDates: false };

    const {
      isSuccessful: isSuccessfulForCategories,
      dates: categoriesCodesAsDates,
      dateFormat: dateFormatForCategories,
    } = tryCastAllToDatesAndDetectFormat(categoriesLabels);

    if (isSuccessfulForCategories) {
      if (
        forceXAxisToBeTreatedAsCategories ||
        R.includes(
          chartType,
          chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
        )
      ) {
        return {
          ...data,
          areCategoriesDates: true,
          categoriesDateFomat: dateFormatForCategories,
          ...seriesInfo,
        };
      }

      const newData = R.compose(
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
        categoriesDateFomat: dateFormatForCategories,
        ...seriesInfo,
      };
    }

    return { ...data, areCategoriesDates: false, ...seriesInfo };
  };

export const handleAreCategoriesAndSeriesNumbers =
  (chartType, forceXAxisToBeTreatedAsCategories) => (data) => {
    if (data.areCategoriesDates && data.areSeriesDates) {
      return { ...data, areCategoriesNumbers: false, areSeriesNumbers: false };
    }

    const seriesLabels = R.compose(
      R.map(
        R.propOr(
          R.identity,
          R.__,
          data.parsingHelperData.yDimensionLabelByCode,
        ),
      ),
      R.tail,
      R.head,
      R.prop('data'),
    )(data);
    const areSeriesNumbers = R.all(isCastableToNumber, seriesLabels);

    if (data.areCategoriesDates) {
      return { ...data, areCategoriesNumbers: false, areSeriesNumbers };
    }

    const categoriesLabels = R.compose(
      R.map(
        R.propOr(
          R.identity,
          R.__,
          data.parsingHelperData.xDimensionLabelByCode,
        ),
      ),
      R.map(R.head),
      R.tail,
      R.prop('data'),
    )(data);

    if (R.all(isCastableToNumber, categoriesLabels)) {
      const categoriesCodesAsNumbers = R.map(Number, categoriesLabels);

      if (
        forceXAxisToBeTreatedAsCategories ||
        R.includes(
          chartType,
          chartTypesForWhichXAxisIsAlwaysTreatedAsCategories,
        )
      ) {
        return { ...data, areCategoriesNumbers: true, areSeriesNumbers };
      }

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
        areSeriesNumbers,
      };
    }

    return { ...data, areCategoriesNumbers: false, areSeriesNumbers };
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

  const variableColumnIndexesAndFilterDataPairs = reduceWithIndex(
    (acc, value, i) => {
      if (isEqualToAnyVarRange(value) && i === 0) {
        const rangeVarNames = R.compose(
          R.split('}-{'),
          R.replace('}]', ''),
          R.replace('[{', ''),
          R.head,
        )(headerRow);

        const firstColumnData = R.compose(R.map(R.head), R.tail)(data);

        const { isSuccessful, dateFormat } =
          tryCastAllToDatesAndDetectFormat(firstColumnData);

        if (isSuccessful) {
          const frequency = R.prop(dateFormat, frequencies);

          const minVarValue = R.toUpper(
            R.prop(
              R.replace(/{|}/g, '', R.toLower(R.head(rangeVarNames))),
              vars,
            ),
          );
          const maxVarValue = R.toUpper(
            R.prop(
              R.replace(/{|}/g, '', R.toLower(R.nth(1, rangeVarNames))),
              vars,
            ),
          );

          return R.append(
            [
              i,
              {
                isRange: true,
                frequency,
                minVarName: R.head(rangeVarNames),
                minVarValue,
                minVarValueParsed: frequency.tryParse(minVarValue),
                maxVarName: R.nth(1, rangeVarNames),
                maxVarValue,
                maxVarValueParsed: frequency.tryParse(maxVarValue),
                columnDataIsCompatible: true,
              },
            ],
            acc,
          );
        }

        if (R.all(isCastableToNumber, firstColumnData)) {
          const minVarValue = R.toUpper(
            R.prop(
              R.replace(/{|}/g, '', R.toLower(R.head(rangeVarNames))),
              vars,
            ),
          );
          const maxVarValue = R.toUpper(
            R.prop(
              R.replace(/{|}/g, '', R.toLower(R.nth(1, rangeVarNames))),
              vars,
            ),
          );

          return R.append(
            [
              i,
              {
                isRange: true,
                minVarName: R.head(rangeVarNames),
                minVarValue,
                minVarValueParsed: Number(minVarValue),
                maxVarName: R.nth(1, rangeVarNames),
                maxVarValue,
                maxVarValueParsed: Number(maxVarValue),
                columnDataIsCompatible: true,
              },
            ],
            acc,
          );
        }

        return R.append(
          [i, { isRange: true, columnDataIsCompatible: false }],
          acc,
        );
      }

      if (isEqualToAnyVar(value)) {
        return R.append(
          [
            i,
            {
              varName: R.replace(/{|}/g, '', R.toLower(value)),
              varValue: R.toUpper(
                R.prop(R.replace(/{|}/g, '', R.toLower(value)), vars),
              ),
            },
          ],
          acc,
        );
      }

      return acc;
    },
    [],
    headerRow,
  );

  if (R.isEmpty(variableColumnIndexesAndFilterDataPairs)) {
    return { data };
  }

  const filteredRows = R.filter(
    R.allPass(
      R.map(
        ([i, filterData]) =>
          R.compose(
            (columnValue) => {
              if (filterData.isRange && !filterData.columnDataIsCompatible) {
                return false;
              }

              if (filterData.isRange) {
                const columnValueParsed = R.has('frequency', filterData)
                  ? filterData.frequency.tryParse(columnValue)
                  : Number(columnValue);
                return (
                  columnValueParsed >= filterData.minVarValueParsed &&
                  columnValueParsed <= filterData.maxVarValueParsed
                );
              }

              if (i === 0) {
                return R.includes(
                  columnValue,
                  R.split('|', filterData.varValue),
                );
              }

              return columnValue === filterData.varValue;
            },

            R.toUpper,
            (v) => `${v}`,
            R.nth(i),
          ),
        variableColumnIndexesAndFilterDataPairs,
      ),
    ),
    R.tail(data),
  );

  const variableColumnIndexes = R.map(
    R.head,
    variableColumnIndexesAndFilterDataPairs,
  );

  const varsThatCauseNewPreParsedDataFetch = R.pick(
    R.unnest(
      R.map(
        R.compose(
          (filterData) =>
            filterData.isRange
              ? [filterData.minVarName, filterData.maxVarName]
              : filterData.varName,
          R.nth(1),
        ),
        R.reject(
          R.compose(
            (filterData) =>
              filterData.isRange && !filterData.columnDataIsCompatible,
            R.nth(1),
          ),
          variableColumnIndexesAndFilterDataPairs,
        ),
      ),
    ),
    vars,
  );

  if (
    R.length(variableColumnIndexes) === 1 &&
    R.head(variableColumnIndexes) === 0
  ) {
    return {
      data: R.prepend(headerRow, filteredRows),
      varsThatCauseNewPreParsedDataFetch,
    };
  }

  const finalData = R.map(
    reduceWithIndex(
      (acc, value, i) =>
        i === 0 || !R.includes(i, variableColumnIndexes)
          ? R.append(value, acc)
          : acc,
      [],
    ),
    R.prepend(headerRow, filteredRows),
  );

  return { data: finalData, varsThatCauseNewPreParsedDataFetch };
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
        ? R.head(parseCSV(R.nth(matedata1ColumnIndex, R.tail(row)))) || []
        : [];
    const metadata2 =
      matedata2ColumnIndex !== -1
        ? R.head(parseCSV(R.nth(matedata2ColumnIndex, R.tail(row)))) || []
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
    sortParsedDataOnYAxis(yAxisOrderOverride),
    parseData,
    sortCSV(sortBy, sortOrder, sortSeries, lang),
    handleAreCategoriesAndSeriesNumbers(
      chartType,
      forceXAxisToBeTreatedAsCategories,
    ),
    handleAreCategoriesAndSeriesDates(
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
