const customizeHighchartsForMapChart = (Highcharts) => {
  if (typeof Highcharts === 'object') {
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

export default customizeHighchartsForMapChart;
