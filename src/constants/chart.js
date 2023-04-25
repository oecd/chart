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

export const mapTypes = {
  normal: { value: 'normal', label: 'Choropleth' },
  bubble: { value: 'bubble', label: 'Bubble' },
  point: { value: 'point', label: 'Point' },
};

export const chartControlTypes = {
  timeSlider: { value: 'timeSlider', label: 'Time slider' },
  select: { value: 'select', label: 'Select' },
};

export const frequencyTypes = {
  yearly: {
    value: 'yearly',
    label: 'Yearly',
  },
  quaterly: {
    value: 'quaterly',
    label: 'Quaterly',
  },
  monthly: {
    value: 'monthly',
    label: 'Monthly',
  },
};

export const decimalPointTypes = {
  point: { value: '.', label: 'Point' },
  comma: { value: ',', label: 'Comma' },
};

export const apiUrl =
  process.env.NEXT_PUBLIC_CHART_LIB_API_URL ||
  process.env.API_URL ||
  'https://oecdch.art';

export const fakeMemberLatest = { code: '_LATEST_', label: 'Latest' };
