import { useEffect, useState } from 'react';
import FontFaceObserver from 'fontfaceobserver';

const useIsFontLoaded = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkIsFontLoaded = async () => {
      const font = new FontFaceObserver('Noto Sans');
      try {
        await font.load();
        setIsLoaded(true);
      } catch {
        // no need to do anything if the font cannot be loaded
      }
    };

    checkIsFontLoaded();
  }, []);

  return isLoaded;
};

export default useIsFontLoaded;
