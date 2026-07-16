import { numericSymbols } from '../utils/highchartsUtil';

const customizeHighcharts = (Highcharts) => {
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

    Highcharts.SVGRenderer.prototype.symbols.cross = (x, y, w, h) => [
      'M',
      x,
      y,
      'L',
      x + w,
      y + h,
      'M',
      x + w,
      y,
      'L',
      x,
      y + h,
      'z',
    ];
    if (Highcharts.VMLRenderer) {
      Highcharts.VMLRenderer.prototype.symbols.cross =
        Highcharts.SVGRenderer.prototype.symbols.cross;
    }

    // inspired example about "Logarithmic color axis with extension to emulate negative values"
    // https://api.highcharts.com/highmaps/colorAxis.type
    function allowNegativeOnLogarithmicAxis() {
      const { logarithmic } = this;

      if (logarithmic && this.options.allowNegativeLog) {
        // avoid errors on negative numbers on a log axis
        this.positiveValuesOnly = false;

        // override the converter functions
        logarithmic.log2lin = (num) => {
          const isNegative = num < 0;

          const absoluteNum = Math.abs(num);
          const adjustedNum =
            absoluteNum < 10
              ? absoluteNum + (10 - absoluteNum) / 10
              : absoluteNum;

          const result = Math.log(adjustedNum) / Math.LN10;
          return isNegative ? -result : result;
        };

        logarithmic.lin2log = (num) => {
          const isNegative = num < 0;

          const exp = 10 ** Math.abs(num);
          const result = exp < 10 ? (10 * (exp - 1)) / (10 - 1) : exp;

          return isNegative ? -result : result;
        };
      }
    }

    Highcharts.addEvent(
      Highcharts.Axis,
      'afterInit',
      allowNegativeOnLogarithmicAxis,
    );
  }
};

export default customizeHighcharts;
