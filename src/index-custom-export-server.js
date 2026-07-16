/* eslint-disable no-undef */
import customizeHighcharts from './highchartsCustomCode/customizeHighcharts';
import customChartRenderByChartType from './highchartsCustomCode/customChartRenderByChartType';

if (typeof Highcharts === 'object') {
  Highcharts.HTMLElement.useForeignObject = true;

  customizeHighcharts(Highcharts);
}

export { customChartRenderByChartType };
