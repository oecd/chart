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

The only required prop is `chartId` but if the corresponding chart is configured to use variables, `var1`, `var2` and `var3` can be used as well:

```jsx
<Chart chartId="xxxxxxx" var1="FRA" var2="USA" />
```
