/* eslint-disable no-undef */
import customizeHighchartsForAllChartTypes from './highchartsCustomCode/customizeHighchartsForAllChartTypes';
import customizeHighchartsForScatterChart from './highchartsCustomCode/customizeHighchartsForScatterChart';
import customizeHighchartsForMapChart from './highchartsCustomCode/customizeHighchartsForMapChart';
import customChartRenderByChartType from './highchartsCustomCode/customChartRenderByChartType';
import { chartTypes } from './constants/chart';

if (typeof Highcharts === 'object') {
  Highcharts.HTMLElement.useForeignObject = true;

  customizeHighchartsForAllChartTypes(Highcharts);
}

const customizeHighchartsByChartType = {
  [chartTypes.symbol]: customizeHighchartsForScatterChart,
  [chartTypes.symbolMinMax]: customizeHighchartsForScatterChart,
  [chartTypes.scatter]: customizeHighchartsForScatterChart,
  [chartTypes.map]: customizeHighchartsForMapChart,
};

export { customizeHighchartsByChartType, customChartRenderByChartType };
