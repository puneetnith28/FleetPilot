export interface RoutingResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // Array of [lat, lng] for Polyline
}

/**
 * Geocodes an address string to [lat, lng] using OpenStreetMap Nominatim.
 */
export async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'FleetPilot-App/1.0',
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Calculates driving route between two points using OSRM public API.
 */
export async function calculateRoute(
  start: [number, number],
  end: [number, number]
): Promise<RoutingResult | null> {
  try {
    // OSRM expects coordinates in lng,lat format
    const startStr = `${start[1]},${start[0]}`;
    const endStr = `${end[1]},${end[0]}`;

    // overview=full gives the full path geometry
    // geometries=geojson makes it easier to parse
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson`
    );
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    
    // Convert GeoJSON [lng, lat] back to Leaflet [lat, lng]
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry,
    };
  } catch (error) {
    console.error('Routing error:', error);
    return null;
  }
}
