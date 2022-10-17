/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import ReactDOM from 'react-dom';
import { Chart } from './index-with-css';

const chartElements = new Map();

const createVars = (var1, var2, var3) => {
  const vars = {};
  if (var1 && var1 !== '') {
    vars.var1 = var1;
  }
  if (var2 && var2 !== '') {
    vars.var2 = var2;
  }
  if (var3 && var3 !== '') {
    vars.var3 = var3;
  }
  return vars;
};

const renderCharts = () => {
  const currentChartElements = document.querySelectorAll(
    '[data-cb-id]:not([data-cb-id=""])',
  );

  currentChartElements.forEach((el) => {
    const id = el.getAttribute('data-cb-id');
    const var1 = el.getAttribute('data-cb-var1');
    const var2 = el.getAttribute('data-cb-var2');
    const var3 = el.getAttribute('data-cb-var3');

    if (chartElements.has(el)) {
      const prevElement = chartElements.get(el);
      if (
        prevElement.id !== id ||
        prevElement.var1 !== var1 ||
        prevElement.var2 !== var2 ||
        prevElement.var3 !== var3
      ) {
        const vars = createVars(var1, var2, var3);
        prevElement.reactRoot.render(<Chart chartId={id} {...vars} />);
      }
    } else {
      const reactRoot = ReactDOM.createRoot(el);
      chartElements.set(el, { id, var1, var2, var3, reactRoot });
      const vars = createVars(var1, var2, var3);
      reactRoot.render(<Chart chartId={id} {...vars} />);
    }
  });
};

export default { renderCharts };
