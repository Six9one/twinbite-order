import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Twin Pizza location
const TWIN_PIZZA_LOCATION = {
  lng: 1.0024,
  lat: 49.3569,
  address: '60 Rue Georges Clemenceau, 76530 Grand-Couronne'
};
interface DeliveryZone {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  zone_type: string | null;
  delivery_fee: number;
  estimated_time: string;
  radius: number | null;
  color: string | null;
}
export function DeliveryMapSection() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);

  // Fetch delivery zones from database
  useEffect(() => {
    async function fetchZones() {
      const {
        data,
        error
      } = await supabase.from('delivery_zones').select('*').eq('is_active', true);
      if (data) {
        // Filter zones that have valid coordinates
        const validZones = data.filter(z => z.latitude && z.longitude);
        setZones(validZones);
      }
    }
    fetchZones();
  }, []);
  useEffect(() => {
    async function initMap() {
      if (!mapContainer.current) return;
      try {
        // Fetch Mapbox token from edge function
        const {
          data,
          error: fetchError
        } = await supabase.functions.invoke('get-mapbox-token');
        if (fetchError || !data?.token) {
          setError('Configuration de la carte en cours...');
          setLoading(false);
          return;
        }
        mapboxgl.accessToken = data.token;
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [TWIN_PIZZA_LOCATION.lng, TWIN_PIZZA_LOCATION.lat],
          zoom: 12.5,
          pitch: 20
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl({
          visualizePitch: true
        }), 'top-right');

        // When map loads
        map.current.on('load', () => {
          setLoading(false);
          if (!map.current) return;

          // Add main marker for Twin Pizza
          const el = document.createElement('div');
          el.className = 'twin-pizza-marker';
          el.innerHTML = `
            <div style="width: 48px; height: 48px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 4px solid white; animation: pulse 2s infinite;">
              <span style="font-size: 24px;">🍕</span>
            </div>
          `;
          new mapboxgl.Marker(el).setLngLat([TWIN_PIZZA_LOCATION.lng, TWIN_PIZZA_LOCATION.lat]).setPopup(new mapboxgl.Popup({
            offset: 25
          }).setHTML(`
                <div style="padding: 8px;">
                  <strong style="color: #d97706;">Twin Pizza</strong><br/>
                  <span style="font-size: 12px; color: #666;">${TWIN_PIZZA_LOCATION.address}</span>
                </div>
              `)).addTo(map.current);

          // Add circle zones from database
          zones.forEach((zone, index) => {
            if (!map.current || !zone.latitude || !zone.longitude) return;

            // Use database values or defaults (reduced default sizes)
            const radius = zone.radius || (zone.zone_type === 'main' ? 1000 : zone.zone_type === 'near' ? 800 : 600);
            const color = zone.color || (zone.zone_type === 'main' ? '#f59e0b' : zone.zone_type === 'near' ? '#fbbf24' : '#fcd34d');

            // Add zone source
            map.current.addSource(`zone-${index}`, {
              type: 'geojson',
              data: createCircle([zone.longitude, zone.latitude], radius)
            });

            // Add zone fill
            map.current.addLayer({
              id: `zone-fill-${index}`,
              type: 'fill',
              source: `zone-${index}`,
              paint: {
                'fill-color': color,
                'fill-opacity': 0.15
              }
            });

            // Add zone border
            map.current.addLayer({
              id: `zone-border-${index}`,
              type: 'line',
              source: `zone-${index}`,
              paint: {
                'line-color': color,
                'line-width': 2,
                'line-opacity': 0.6
              }
            });

            // Add zone label
            map.current.addLayer({
              id: `zone-label-${index}`,
              type: 'symbol',
              source: `zone-${index}`,
              layout: {
                'text-field': zone.name,
                'text-size': 12,
                'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular']
              },
              paint: {
                'text-color': '#78350f',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2
              }
            });

            // Hover effects
            map.current.on('mouseenter', `zone-fill-${index}`, () => {
              if (map.current) {
                map.current.setPaintProperty(`zone-fill-${index}`, 'fill-opacity', 0.35);
                map.current.setPaintProperty(`zone-border-${index}`, 'line-width', 4);
              }
              setHoveredZone(zone.name);
            });
            map.current.on('mouseleave', `zone-fill-${index}`, () => {
              if (map.current) {
                map.current.setPaintProperty(`zone-fill-${index}`, 'fill-opacity', 0.15);
                map.current.setPaintProperty(`zone-border-${index}`, 'line-width', 2);
              }
              setHoveredZone(null);
            });
          });
        });
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Impossible de charger la carte');
        setLoading(false);
      }
    }
    initMap();
    return () => {
      map.current?.remove();
    };
  }, [zones]);

  // Helper function to create a circle GeoJSON
  function createCircle(center: [number, number], radiusInMeters: number): GeoJSON.FeatureCollection {
    const points = 64;
    const coords: [number, number][] = [];
    const distanceX = radiusInMeters / (111320 * Math.cos(center[1] * Math.PI / 180));
    const distanceY = radiusInMeters / 110540;
    for (let i = 0; i < points; i++) {
      const theta = i / points * 2 * Math.PI;
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]);
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      }]
    };
  }
  return <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            <span className="text-amber-500">Zones</span> de Livraison
          </h2>
          <p className="max-w-2xl mx-auto text-secondary-foreground">
            Nous livrons dans Grand-Couronne et les communes environnantes. 
            Survolez les zones pour voir nos secteurs de livraison.
          </p>
        </div>

        {/* Map Container */}
        <div className="relative max-w-5xl mx-auto">
          <div ref={mapContainer} className="w-full h-[400px] md:h-[500px] rounded-2xl shadow-xl overflow-hidden border border-border" />
          
          {/* Loading State */}
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-2xl">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Chargement de la carte...</span>
              </div>
            </div>}
          
          {/* Error State */}
          {error && !loading && <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-2xl">
              <div className="text-center p-6">
                <MapPin className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Zones: Grand-Couronne, Petit-Couronne, Le Moulineaux, Les Essarts, Oissel, Les Boutières
                </p>
              </div>
            </div>}
          
          {/* Hovered Zone Indicator */}
          {hoveredZone && !loading && <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-foreground">{hoveredZone}</span>
              </div>
            </div>}

          {/* Legend - Dynamic based on zones */}
          {!error && !loading && zones.length > 0 && <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border max-w-[180px]">
              <p className="text-xs font-medium text-foreground mb-2">Zones de livraison</p>
              <div className="space-y-1">
                {zones.map(zone => <div key={zone.id} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                backgroundColor: zone.color || '#f59e0b'
              }} />
                    <span className="text-xs text-muted-foreground truncate">{zone.name}</span>
                  </div>)}
              </div>
            </div>}
        </div>

        {/* Note about address */}
        <p className="text-center text-muted-foreground mt-6 text-base font-bold">
          📍 <strong>Notre adresse:</strong> {TWIN_PIZZA_LOCATION.address}
        </p>
      </div>
    </section>;
}