import React from 'react';
import * as ReactDOM from 'react-dom/client';
import reactToWebComponent from 'react-to-webcomponent';
import 'rc-slider/assets/index.css';

import './index.css';

import Chart from './components/Chart';
import StandaloneControl from './components/StandaloneControl';

customElements.define(
  'oecd-chart',
  reactToWebComponent(Chart, React, ReactDOM, { dashStyleAttributes: true }),
);

customElements.define(
  'oecd-control',
  reactToWebComponent(StandaloneControl, React, ReactDOM, {
    dashStyleAttributes: true,
  }),
);
