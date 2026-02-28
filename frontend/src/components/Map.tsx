'use client';

import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface Location {
  lat: number;
  lng: number;
  label?: string;
}

interface MapProps {
  locations?: Location[];
  center?: Location;
  zoom?: number;
}

export default function AppMap({
  locations = [],
  center = { lat: 53.5511, lng: 9.9937 }, // Default to Hamburg
  zoom = 10
}: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-800/80 rounded-xl border border-white/10 p-8 glass-panel text-gray-400">
         Google Maps API Key strictly required. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden shadow-2xl shadow-primary-900/40 border border-white/10 glass-panel">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId={process.env.NEXT_PUBLIC_MAP_ID || 'DEMO_MAP_ID'}
          disableDefaultUI={true}
        >
          {locations.map((loc, index) => (
            <AdvancedMarker key={index} position={{ lat: loc.lat, lng: loc.lng }}>
              <Pin background={'#22c55e'} borderColor={'#16a34a'} glyphColor={'#fff'} />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
