'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import type { Restaurant } from '@/lib/supabase/types';

// Fix leaflet default marker icons in bundlers
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  restaurants: Pick<Restaurant, 'id' | 'name' | 'name_zh' | 'city' | 'cuisine' | 'overall_rating' | 'lat' | 'lng'>[];
  locale: string;
};

const PRICE = ['', '$', '$$', '$$$', '$$$$'];

export default function RestaurantMap({ restaurants, locale }: Props) {
  const mapped = restaurants.filter((r) => r.lat && r.lng);

  // Default center: if there are mapped restaurants, center on them; otherwise use a default
  const centerLat = mapped.length > 0 ? mapped.reduce((s, r) => s + r.lat!, 0) / mapped.length : 31.2304;
  const centerLng = mapped.length > 0 ? mapped.reduce((s, r) => s + r.lng!, 0) / mapped.length : 121.4737;

  useEffect(() => {
    // Ensure leaflet CSS applied
  }, []);

  if (mapped.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900">
        <p className="text-sm">No restaurants with coordinates yet. Add lat/lng in the admin.</p>
      </div>
    );
  }

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map((r) => (
          <Marker key={r.id} position={[r.lat!, r.lng!]} icon={icon}>
            <Popup>
              <div className="min-w-[140px]">
                <p className="font-semibold">{r.name}</p>
                {r.name_zh && <p className="text-xs text-stone-500">{r.name_zh}</p>}
                {r.cuisine && <p className="text-xs text-stone-400">{r.cuisine}</p>}
                {r.city && <p className="text-xs text-stone-400">{r.city}</p>}
                {r.overall_rating && (
                  <p className="mt-1 text-xs text-amber-500">{'★'.repeat(r.overall_rating)}{'☆'.repeat(5 - r.overall_rating)}</p>
                )}
                <Link
                  href={`/${locale}/restaurants/${r.id}`}
                  className="mt-2 inline-block text-xs font-medium text-stone-700 underline"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
