import { useEffect, useState } from 'react';
import FontFaceObserver from 'fontfaceobserver';

const useIsFontLoaded = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkIsFontLoaded = async () => {
      const fonts = [
        new FontFaceObserver('Noto Sans', {
          weight: 400,
        }).load(),
        new FontFaceObserver('Noto Sans', {
          weight: 600,
        }).load(),
        new FontFaceObserver('Noto Sans', {
          weight: 800,
        }).load(),
        new FontFaceObserver('Noto Sans Display', {
          weight: 400,
        }).load(),
        new FontFaceObserver('Noto Sans Display', {
          weight: 500,
        }).load(),
      ];
      try {
        await Promise.all(fonts);
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
