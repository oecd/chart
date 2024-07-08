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
import {
  tryCastAllToDatesAndDetectFormat,
  isCastableToNumber,
} from './chartUtil';
import { codeOrLabelEquals, possibleVariables } from './configUtil';
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

const parseRawCSV = (csvString) =>
  Papa.parse(csvString, {
    dynamicTyping: true,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
  });

const cleanupCSV = R.compose((data) => {
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
}, R.prop('data'));

export const parseCSV = (csvString) =>
  R.compose(cleanupCSV, R.pick(['data']), parseRawCSV)(csvString ?? '');

export const parseCSVWithoutCleanUp = (csvString) =>
  R.compose(
    R.when(isNilOrEmpty, R.always([])),
    R.prop('data'),
    parseRawCSV,
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

const shouldPivot = (data, pivotData, chartType, dataSourceType) => {
  if (
    chartType === chartTypes.map &&
    dataSourceType === dataSourceTypes.dotStat.value
  ) {
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
  (chartType, dataSourceType, pivotData) =>
  ({ data, ...rest }) => {
    if (shouldPivot(data, pivotData, chartType, dataSourceType)) {
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

export const createCodeLabelMapping = (
  csvCodeLabelMappingProjectLevel,
  codeLabelMappingChartLevel,
) => {
  if (
    isNilOrEmpty(csvCodeLabelMappingProjectLevel) &&
    isNilOrEmpty(codeLabelMappingChartLevel)
  ) {
    return {};
  }

  const mappingProjectLevel = isNilOrEmpty(csvCodeLabelMappingProjectLevel)
    ? {}
    : createCodeLabelMap(parseCSV(csvCodeLabelMappingProjectLevel));
  const mappingChartLevel = isNilOrEmpty(codeLabelMappingChartLevel)
    ? {}
    : createCodeLabelMap(parseCSV(codeLabelMappingChartLevel));

  return R.mergeRight(mappingProjectLevel, mappingChartLevel);
};

const addParsingHelperData =
  (csvCodeLabelMappingProjectLevel, csvCodeLabelMapping) =>
  ({ data, ...rest }) => {
    const codeLabelMapping = createCodeLabelMapping(
      csvCodeLabelMappingProjectLevel,
      csvCodeLabelMapping,
    );

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
  (sortBy, sortOrder, sortSeries, version) =>
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
      const seriesCodes = R.map(
        R.toUpper,
        R.keys(parsingHelperData.yDimensionLabelByCode),
      );
      const seriesLabels = R.map(
        R.toUpper,
        R.values(parsingHelperData.yDimensionLabelByCode),
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
                R.when(() => version === '2', R.map(R.prop('value'))),
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
  (dataSourceType, chartType, forceXAxisToBeTreatedAsCategories, version) =>
  (data) => {
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
                    version === '2'
                      ? R.assocPath(
                          ['metadata', 'parsedX'],
                          R.nth(i, categoriesCodesAsDates),
                          point,
                        )
                      : [R.nth(i, categoriesCodesAsDates), point],
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
  (chartType, forceXAxisToBeTreatedAsCategories, version) => (data) => {
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
                version === '2'
                  ? R.assocPath(
                      ['metadata', 'parsedX'],
                      R.nth(i, categoriesCodesAsNumbers),
                      point,
                    )
                  : [R.nth(i, categoriesCodesAsNumbers), point],
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
  const varColumnIndex = R.findIndex(
    R.includes(
      R.__,
      R.map((v) => `{${v}}`, possibleVariables),
    ),
    headerRow,
  );

  if (varColumnIndex === -1) {
    return { data };
  }

  const varName = R.nth(varColumnIndex, headerRow);
  const varValue = R.compose(
    R.when(() => varColumnIndex === 0, R.split('|')),
    R.toUpper,
    R.prop(R.replace(/{|}/g, '', varName)),
  )(vars);

  return {
    data: R.compose(
      R.prepend(
        varColumnIndex === 0
          ? R.head(data)
          : R.compose(R.remove(varColumnIndex, 1), R.head)(data),
      ),
      R.filter(
        R.compose(
          R.ifElse(
            () => varColumnIndex === 0,
            R.includes(R.__, varValue),
            R.equals(varValue),
          ),
          R.toUpper,
          (v) => `${v}`,
          R.nth(varColumnIndex),
        ),
      ),
    )(R.tail(data)),
    varsThatCauseNewPreParsedDataFetch: {
      [R.replace(/{|}/g, '', R.nth(varColumnIndex, headerRow))]:
        varColumnIndex === 0 ? R.join('|', varValue) : varValue,
    },
  };
};

const transformCategoriesLabel =
  (chartType, forceXAxisToBeTreatedAsCategories, lang) => (data) => {
    if (
      data.areCategoriesDates &&
      data.categoriesDateFomat === frequencyTypes.yearly.value &&
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

const transformValuesForVersion2 = ({ data, ...rest }) => {
  const headerRow = R.head(data);

  const newData = R.map(
    (row) =>
      R.prepend(
        R.head(row),
        R.map((v) => ({ value: v }), R.tail(row)),
      ),
    R.tail(data),
  );

  return { data: R.prepend(headerRow, newData), ...rest };
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
  version,
}) => {
  if (isNilOrEmpty(staticCsvData)) {
    return emptyData;
  }

  return R.compose(
    R.assoc('version', version),
    addCodeLabelMapping,
    R.dissoc('rawCodeLabelMapping'),
    transformCategoriesLabel(
      chartType,
      forceXAxisToBeTreatedAsCategories,
      lang,
    ),
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
    R.when(() => version === '2', transformValuesForVersion2),
    addParsingHelperData(csvCodeLabelMappingProjectLevel, csvCodeLabelMapping),
    pivotCSV(chartType, dataSourceType, pivotData),
    filterCSV(vars),
    parseCSV,
  )(staticCsvData);
};
