import { useEffect, useState } from 'react';

const useMemoForArrayOrObject = (value) => {
  const [valueInternal, setValueInternal] = useState(value);

  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(valueInternal)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValueInternal(value);
    }
  }, [value, valueInternal]);

  return valueInternal;
};

export default useMemoForArrayOrObject;
