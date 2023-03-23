import React from 'react';
import * as ReactDOM from 'react-dom/client';
import reactToWebComponent from 'react-to-webcomponent';

import { Chart, StandaloneControl } from './index';

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
