/*global customElements*/
import * as R from 'ramda';
import r2wc from '@r2wc/react-to-web-component';
import 'rc-slider/assets/index.css';

import './index.css';
import Chart from './components/Chart';
import StandaloneControl from './components/StandaloneControl';
import { possibleVariables } from './utils/configUtil';

const OecdChart = r2wc(Chart, {
  props: {
    chartId: 'string',
    ...R.fromPairs(R.map((varName) => [varName, 'string'], possibleVariables)),
    width: 'string',
    height: 'number',
    lazyLoad: 'boolean',
    language: 'string',
    displayActionButton: 'boolean',
    actionButtonLabel: 'string',
    hideTitle: 'boolean',
    hideSubtitle: 'boolean',
    hideNote: 'boolean',
    hideSource: 'boolean',
    hideToolbox: 'boolean',
    tooltipContainerId: 'string',
  },
});

customElements.define('oecd-chart', OecdChart);

const OecdStandaloneControl = r2wc(StandaloneControl, {
  props: {
    controlId: 'string',
    ...R.fromPairs(R.map((varName) => [varName, 'string'], possibleVariables)),
    dataComponentId: 'string',
    hideTitle: 'boolean',
    initialValue: 'string',
    language: 'string',
  },
});

customElements.define('oecd-control', OecdStandaloneControl);
