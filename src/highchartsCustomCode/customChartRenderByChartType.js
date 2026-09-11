import { chartTypes } from '../constants/chart';
import { renderBarAndColumn } from './renderBarAndColumn';
import { renderLine } from './renderLine';
import renderStackedBarAndColumn from './renderStackedBarAndColumn';
import { renderSymbol } from './renderSymbol';

const customChartRenderByChartType = {
  [chartTypes.symbol]: renderSymbol,
  [chartTypes.symbolMinMax]: renderSymbol,
  [chartTypes.bar]: renderBarAndColumn,
  [chartTypes.row]: renderBarAndColumn,
  [chartTypes.stackedBar]: renderStackedBarAndColumn,
  [chartTypes.stackedRow]: renderStackedBarAndColumn,
  [chartTypes.line]: renderLine,
};

export default customChartRenderByChartType;
