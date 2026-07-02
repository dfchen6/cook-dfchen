'use client';

import dynamic from 'next/dynamic';
import type { Restaurant } from '@/lib/supabase/types';

const RestaurantMap = dynamic(() => import('./RestaurantMap'), { ssr: false });

type Props = {
  restaurants: Pick<Restaurant, 'id' | 'name' | 'name_zh' | 'city' | 'cuisine' | 'overall_rating' | 'lat' | 'lng'>[];
  locale: string;
};

export default function RestaurantMapWrapper(props: Props) {
  return <RestaurantMap {...props} />;
}
