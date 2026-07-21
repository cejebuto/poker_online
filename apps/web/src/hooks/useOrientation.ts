import { useEffect, useState } from 'react';

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
      ? 'landscape'
      : 'portrait',
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const onChange = () => setOrientation(mq.matches ? 'landscape' : 'portrait');
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return orientation;
}
