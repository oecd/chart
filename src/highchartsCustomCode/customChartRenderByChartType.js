import { chartTypes } from '../constants/chart';
import symbolChartRender from './customChartRenderForSymbolChart';

const customChartRenderByChartType = {
  [chartTypes.symbol]: symbolChartRender,
  [chartTypes.symbolMinMax]: symbolChartRender,
};

export default customChartRenderByChartType;
