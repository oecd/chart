# OECD chart

OECD Chart library

## Getting started

```shell
npm install @oecd-pac/chart --save
```

Then simply import and use the `Chart` component:

```jsx
import React from 'react';
import { Chart } from '@oecd-pac/chart';

const App = () => (
  <div style={{ width: '800px', height: '600px' }}>
    <Chart chartId="xxxxxxx" />
  </div>
);

export default App;
```

The only required prop is `chartId` but if the corresponding chart is configured to use variables, `var1`, `var2`, `var3`, `var4` and `var5` can be used as well:

```jsx
<Chart chartId="xxxxxxx" var1="FRA" var2="USA" />
```

## Note about sizing

A chart does not have an intrinsic size (it can be any size) and therefore the `Chart` component cannot "guess" the desired size.

The `Chart` component supports `width` and `height` props (numbers only) that can be omitted which allows two sizing strategies:

### Strategy 1: Omit `width` and `height`

The chart will take as much space as it can (within the constraints of the parent container):

```jsx
<div style={{ width: '100%', maxWidth: '400px', height: '300px' }}>
  <Chart chartId="xxxxxxx" />
</div>
```

- Pro: The size of the chart (including controls) is guaranteed.
- Cons: If the chart contains controls, it is not guaranteed that they will be displayed; the controls might stack (for instance, when the width is very low) and the controls may be automatically hidden as they are considered less important than the chart itself.

### Strategy 2:  Pass `width` and `height` explicitly

It is important to note that `height` implicitly means "chart height" (not including potential controls).

When using this approach, the parent container has to use `minHeight` (not `height`):

```jsx
<div style={{ width: '100%', maxWidth: '400px', minHeight: '300px' }}>
  <Chart chartId="xxxxxxx" width={400} height={300} />
</div>
```

- Pro: The controls are guaranteed to be displayed, even if the total height of the chart + controls is more than the specified height (300 in the previous example).
- Con: The total height of the chart + controls is not guaranteed.
