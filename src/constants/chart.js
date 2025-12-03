/*global process*/
import React from 'react';

export const chartTypes = {
  line: 'Line',
  bar: 'Bar',
  row: 'Row',
  stackedBar: 'StackedBar',
  stackedRow: 'StackedRow',
  stackedArea: 'StackedArea',
  map: 'Map',
  symbol: 'Symbol',
  symbolMinMax: 'SymbolMinMax',
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
  dotStatSnapshot: { value: 'dotStatSnapshot', label: '.Stat snapshot' },
};

export const sortByOptions = {
  none: { value: 'none', label: 'None (data order)' },
  categoriesLabel: { value: 'categoriesLabel', label: 'Categories label' },
  categoriesCode: { value: 'categoriesCode', label: 'Categories code' },
  seriesValue: { value: 'seriesValue', label: 'Series value' },
  allSeriesValue: { value: 'allSeriesValue', label: 'Sum of all series value' },
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
  quinquennial: {
    value: 'quinquennial',
    label: 'Quinquennial',
    dotStatId: 'A5',
  },
  yearly: {
    value: 'yearly',
    label: 'Yearly',
    dotStatId: 'A',
  },
  quarterly: {
    value: 'quarterly',
    label: 'Quarterly',
    dotStatId: 'Q',
  },
  monthly: {
    value: 'monthly',
    label: 'Monthly',
    dotStatId: 'M',
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
  generic: {
    code: 'generic',
    label: (
      <div style={{ textAlign: 'center' }}>
        An error occured.
        <br />
        Please refresh the page.
      </div>
    ),
  },
  noData: {
    code: 'noData',
    label: (
      <div style={{ textAlign: 'center' }}>
        No data available for the current selection.
      </div>
    ),
  },
  underEmbargo: {
    code: 'underEmbargo',
    label: <div style={{ textAlign: 'center' }}>Not yet available</div>,
  },
};

export const minChartWidthForControlsDisplayOnRightSide = 850;
export const minChartHeightForControlsDisplayBelow = 280;

export const chartSpacing = [20, 20, 40, 20];
export const chartSpacingNoCredit = 20;

export const baselineColor = '#48A7FF';

export const baselineColorShades = [
  ['#0A4095', '#0E51B5', '#1162D4', '#2379E2', '#3690F1', '#48A7FF', '#73BCFF'],
  ['#0A4095', '#0E51B5', '#1162D4', '#3690F1', '#48A7FF', '#73BCFF'],
  ['#0A4095', '#0E51B5', '#1162D4', '#48A7FF', '#73BCFF'],
  ['#0A4095', '#0E51B5', '#1162D4', '#48A7FF'],
  ['#0A4095', '#1162D4', '#48A7FF'],
  ['#0E51B5', '#48A7FF'],
  [baselineColor],
];

export const defaultExportSize = { width: 1024, height: 768 };
