import Papa from 'papaparse';
import * as R from 'ramda';
import {
  chartTypes,
  dataSourceTypes,
  sortByOptions,
  sortOrderOptions,
} from '../constants/chart';
import { isNumberOrDate } from './chartUtil';
import { codeOrLabelEquals, possibleVariables } from './configUtil';

import { isNilOrEmpty, mapWithIndex, reduceWithIndex } from './ramdaUtil';

export const emptyData = {
  categories: [],
  series: [],
  areCategoriesNumbersOrDates: false,
};

const parseRawCSV = (csvString) =>
  Papa.parse(csvString, { dynamicTyping: true });

const cleanupCSV = R.compose(
  (data) => {
    const numberOfSeries = R.length(R.reject(R.isNil, R.head(data)));

    return R.map((row) => {
      if (R.length(row) === numberOfSeries) {
        return row;
      }
      if (R.length(row) > numberOfSeries) {
        return R.take(numberOfSeries, row);
      }
      return R.concat(
        row,
        R.times(R.always(null), numberOfSeries - R.length(row)),
      );
    }, data);
  },
  R.reject(R.compose(isNilOrEmpty, R.head)),
  R.prop('data'),
);

const parseCSV = (csvString) =>
  R.compose(cleanupCSV, R.pick(['data']), parseRawCSV)(csvString);

export const parseData = ({ data, parsingHelperData, ...rest }) => {
  if (isNilOrEmpty(data)) {
    return { categories: [], series: [], ...rest };
  }

  const categories = R.map(
    (c) => ({
      code: `${c}`,
      label: R.path(['xDimensionLabelByCode', c], parsingHelperData),
    }),
    R.map(R.head, R.tail(data)),
  );

  const series = mapWithIndex((seriesCode, idx) => {
    const serieData = R.map(R.nth(idx + 1), R.tail(data));
    return {
      code: `${seriesCode}`,
      label: R.path(
        ['yDimensionLabelByCode', `${seriesCode}`],
        parsingHelperData,
      ),
      data: serieData,
    };
  }, R.tail(R.head(data)));

  return { categories, series, ...rest };
};

const shouldPivot = (
  data,
  pivotData,
  chartType,
  dataSourceType,
  latestAvailableData,
) => {
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

  if (latestAvailableData) {
    return false;
  }

  return pivotData;
};

export const pivotCSV =
  (chartType, dataSourceType, pivotData) =>
  ({ data, ...rest }) => {
    const latestAvailableData = R.has('latestYByXCode', rest);

    if (
      shouldPivot(
        data,
        pivotData,
        chartType,
        dataSourceType,
        latestAvailableData,
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

const createCodeLabelMapping = (
  csvCodeLabelMappingProjectLevel,
  csvCodeLabelMapping,
) => {
  if (
    isNilOrEmpty(csvCodeLabelMappingProjectLevel) &&
    isNilOrEmpty(csvCodeLabelMapping)
  ) {
    return {};
  }

  const createCodeLabelMap = R.compose(
    R.fromPairs,
    R.map(([c, l]) => [R.toUpper(c), l]),
    R.reject(R.compose(R.lt(R.__, 2), R.length, R.reject(R.isNil))),
  );

  const mappingProjectLevel = isNilOrEmpty(csvCodeLabelMappingProjectLevel)
    ? {}
    : createCodeLabelMap(parseCSV(csvCodeLabelMappingProjectLevel));
  const mappingChartLevel = isNilOrEmpty(csvCodeLabelMapping)
    ? {}
    : createCodeLabelMap(parseCSV(csvCodeLabelMapping));

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
      parsingHelperData: {
        xDimensionLabelByCode,
        yDimensionLabelByCode,
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
  ({ data, parsingHelperData, ...rest }) => {
    const orderFunc =
      !sortOrder || sortOrder === sortOrderOptions.asc.value
        ? R.ascend
        : R.descend;

    if (
      sortBy === sortByOptions.categoriesLabel.value ||
      sortBy === sortByOptions.categoriesCode.value
    ) {
      const selector =
        sortBy === sortByOptions.categoriesLabel.value
          ? (code) => R.path(['xDimensionLabelByCode', code], parsingHelperData)
          : R.identity;
      return {
        data: R.prepend(
          R.head(data),
          R.sort(orderFunc(R.compose(selector, R.head)), R.tail(data)),
        ),
        parsingHelperData,
        ...rest,
      };
    }

    if (sortBy === sortByOptions.seriesValue.value) {
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
            orderFunc(R.compose(R.sum, R.props(yIndexes), R.tail)),
            R.tail(data),
          ),
        ),
        parsingHelperData,
        ...rest,
      };
    }

    return { data, parsingHelperData, ...rest };
  };

export const addAreCategoriesNumbersOrDates = (data) =>
  R.assoc(
    'areCategoriesNumbersOrDates',
    R.all(isNumberOrDate, R.map(R.prop('code'), data.categories)),
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
  const varValue = R.prop(R.replace(/{|}/g, '', varName), vars);

  return {
    data: R.compose(
      R.prepend(R.compose(R.remove(varColumnIndex, 1), R.head)(data)),
      R.map(R.remove(varColumnIndex, 1)),
      R.filter(
        R.compose(
          R.equals(R.toUpper(varValue)),
          R.toUpper,
          R.nth(varColumnIndex),
        ),
      ),
    )(R.tail(data)),
    varUsedForCSVFiltering: R.replace(
      /{|}/g,
      '',
      R.nth(varColumnIndex, headerRow),
    ),
  };
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
  vars,
}) => {
  if (isNilOrEmpty(staticCsvData)) {
    return emptyData;
  }

  return R.compose(
    addAreCategoriesNumbersOrDates,
    sortParsedDataOnYAxis(yAxisOrderOverride),
    parseData,
    sortCSV(sortBy, sortOrder, sortSeries),
    addParsingHelperData(csvCodeLabelMappingProjectLevel, csvCodeLabelMapping),
    pivotCSV(chartType, dataSourceType, pivotData),
    filterCSV(vars),
    parseCSV,
  )(staticCsvData);
};
