export const chartTypes = {
  line: 'Line',
  bar: 'Bar',
  row: 'Row',
  stackedBar: 'StackedBar',
  stackedRow: 'StackedRow',
  stackedArea: 'StackedArea',
  map: 'Map',
  symbol: 'Symbol',
  scatter: 'Scatter',
  radar: 'Radar',
  pie: 'Pie',
};

export const chartTypesForWhichXAxisIsAlwaysTreatedAsCategories = [
  chartTypes.map,
  chartTypes.pie,
  chartTypes.stackedBar,
  chartTypes.stackedRow,
  chartTypes.radar,
];

export const stackingOptions = {
  percent: { value: 'percent', label: 'Percent' },
  normal: { value: 'normal', label: 'Normal' },
};

export const dataSourceTypes = {
  csv: { value: 'csv', label: 'CSV' },
  dotStat: { value: 'dotStat', label: '.Stat' },
};

export const sortByOptions = {
  none: { value: 'none', label: 'None (data order)' },
  categoriesLabel: { value: 'categoriesLabel', label: 'Categories label' },
  categoriesCode: { value: 'categoriesCode', label: 'Categories code' },
  seriesValue: { value: 'seriesValue', label: 'Series value' },
};

export const sortOrderOptions = {
  asc: { value: 'asc', label: 'Ascending' },
  desc: { value: 'desc', label: 'Descending' },
};

export const selectControlSortByOptions = {
  none: { value: 'none', label: 'None (options order)' },
  label: { value: 'label', label: 'Label' },
};

export const mapTypes = {
  normal: { value: 'normal', label: 'Choropleth' },
  bubble: { value: 'bubble', label: 'Bubble' },
  point: { value: 'point', label: 'Point' },
};

export const controlTypes = {
  timeSlider: { value: 'timeSlider', label: 'Time slider' },
  select: { value: 'select', label: 'Variable select' },
  selectChart: { value: 'selectChart', label: 'Chart select' },
  reusableControl: { value: 'reusableControl', label: 'Reusable control' },
  missingReusableControl: {
    value: 'missingReusableControl',
    label: 'Missing reusable control',
  },
};

export const frequencyTypes = {
  yearly: {
    value: 'yearly',
    label: 'Yearly',
    varValue: 'A',
  },
  quarterly: {
    value: 'quarterly',
    label: 'Quarterly',
    varValue: 'Q',
  },
  monthly: {
    value: 'monthly',
    label: 'Monthly',
    varValue: 'M',
  },
};

export const decimalPointTypes = {
  point: { value: '.', label: 'Point' },
  comma: { value: ',', label: 'Comma' },
};

const chartBuilderApiUrlOverride =
  typeof __CHART_BUILDER_API_URL_OVERRIDE !== 'undefined'
    ? // eslint-disable-next-line no-undef
      __CHART_BUILDER_API_URL_OVERRIDE
    : null;

export const apiUrl =
  chartBuilderApiUrlOverride ||
  process.env.NEXT_PUBLIC_CHART_LIB_API_URL ||
  process.env.API_URL ||
  'https://oecdch.art';

export const debugInfoTypes = {
  dotStatInfo: 'dotStatInfo',
  tooManyDataPoint: 'tooManyDataPoint',
  empty: 'empty',
};

export const maxSupprortedNumberOfDataPoint = 15000;

export const errorMessages = {
  generic: 'An error occured :-(',
  noData: 'No data available',
  underEmbargo: 'Not yet available',
};
