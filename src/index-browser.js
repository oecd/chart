import React from 'react';
import * as ReactDOM from 'react-dom/client';
import reactToWebComponent from 'react-to-webcomponent';

import { Chart } from './index';

customElements.define(
  'oecd-chart',
  reactToWebComponent(Chart, React, ReactDOM),
);
