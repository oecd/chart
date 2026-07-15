import { numericSymbols } from '../utils/highchartsUtil';

const customizeHighchartsForAllChartTypes = (Highcharts) => {
  if (typeof Highcharts === 'object') {
    Highcharts.dateFormats = {
      q: (timestamp) => {
        const date = new Date(timestamp);
        const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
        return quarter;
      },
    };

    Highcharts.Templating.helpers.shorten = (value) => {
      const valueAsString = '' + value;
      if (
        value == null ||
        valueAsString.trim() === '' ||
        Number.isNaN(Number(valueAsString))
      ) {
        return value;
      }

      const comparisonNumbers = numericSymbols.map((_, i) => 1000 ** (i + 1));

      let i = comparisonNumbers.length - 1;
      let relevantIndex = -1;

      while (i >= 0 && relevantIndex === -1) {
        if (Math.abs(value) >= comparisonNumbers[i]) {
          relevantIndex = i;
        }
        i -= 1;
      }

      if (relevantIndex === -1) {
        return value;
      }

      return value / comparisonNumbers[relevantIndex];
    };

    Highcharts.Templating.helpers.ns = (value) => {
      const valueAsString = '' + value;
      if (
        value == null ||
        valueAsString.trim() === '' ||
        Number.isNaN(Number(valueAsString))
      ) {
        return '';
      }

      if (numericSymbols == null || numericSymbols.length === 0) {
        return '';
      }

      const comparisonNumbers = numericSymbols.map((_, i) => 1000 ** (i + 1));

      let i = comparisonNumbers.length - 1;
      let relevantIndex = -1;

      while (i >= 0 && relevantIndex === -1) {
        if (Math.abs(value) >= comparisonNumbers[i]) {
          relevantIndex = i;
        }
        i -= 1;
      }

      if (relevantIndex === -1) {
        return '';
      }

      return numericSymbols[relevantIndex];
    };

    Highcharts.Templating.helpers.rtz = (value) => {
      const valueAsString = '' + value;
      if (
        value == null ||
        valueAsString.trim() === '' ||
        Number.isNaN(Number(valueAsString.replace(',', '.')))
      ) {
        return value;
      }

      if (valueAsString.includes(',')) {
        const n = parseFloat(valueAsString.replace(',', '.'));
        return n.toString().replace('.', ',');
      }

      return parseFloat(valueAsString);
    };
  }
};

export default customizeHighchartsForAllChartTypes;
