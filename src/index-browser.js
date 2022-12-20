/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import ReactDOM from 'react-dom';
import { Chart } from './index';

const chartElements = new Map();

const createVars = (var1, var2, var3, var4, var5) => {
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
  if (var4 && var4 !== '') {
    vars.var4 = var4;
  }
  if (var5 && var5 !== '') {
    vars.var5 = var5;
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
    const var4 = el.getAttribute('data-cb-var4');
    const var5 = el.getAttribute('data-cb-var5');

    if (chartElements.has(el)) {
      const prevElement = chartElements.get(el);
      if (
        prevElement.id !== id ||
        prevElement.var1 !== var1 ||
        prevElement.var2 !== var2 ||
        prevElement.var3 !== var3 ||
        prevElement.var4 !== var4 ||
        prevElement.var5 !== var5
      ) {
        const vars = createVars(var1, var2, var3, var4, var5);
        prevElement.reactRoot.render(<Chart chartId={id} {...vars} />);
      }
    } else {
      const reactRoot = ReactDOM.createRoot(el);
      chartElements.set(el, { id, var1, var2, var3, var4, var5, reactRoot });
      const vars = createVars(var1, var2, var3, var4, var5);
      reactRoot.render(<Chart chartId={id} {...vars} />);
    }
  });
};

export default { renderCharts };
