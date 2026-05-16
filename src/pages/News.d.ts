declare module './News.jsx' {
  import type { FC } from 'react';
  import type { Session } from '@supabase/supabase-js';

  const News: FC<{ session: Session }>;
  export default News;
}

export {};
