import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
// @ts-ignore
import 'leaflet/dist/leaflet.css';
import { useBooking } from '../../../services/queryClient';
import { Header } from '../../../components/ui/Header';
import { Button } from '../../../components/ui/Button';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const UYO_CENTER: [number, number] = [5.0377, 7.9128];
const ROUTE_COORDS: [number, number][] = [
  [5.0148, 7.8902],
  [5.0215, 7.8985],
  [5.0298, 7.9058],
  [5.0377, 7.9128],
  [5.0452, 7.9205],
  [5.0525, 7.9288],
];

export default function TrackingMapScreenWeb() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(typeof id === 'string' ? id : '');

  const [routeProgress, setRouteProgress] = useState(35);

  useEffect(() => {
    const timer = setInterval(() => {
      setRouteProgress((prev) => (prev >= 95 ? 95 : prev + 2));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading || !booking) {
    return (
      <View style={styles.container}>
        <Header title="Tracking Job" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Button title="Loading Map..." onPress={() => {}} />
        </View>
      </View>
    );
  }

  const totalSegments = ROUTE_COORDS.length - 1;
  const progressFactor = routeProgress / 100;
  const idx = Math.min(Math.floor(progressFactor * totalSegments), totalSegments - 1);
  const frac = progressFactor * totalSegments - idx;
  const p1 = ROUTE_COORDS[idx];
  const p2 = ROUTE_COORDS[idx + 1];
  const currentCoord: [number, number] = [
    p1[0] + (p2[0] - p1[0]) * frac,
    p1[1] + (p2[1] - p1[1]) * frac,
  ];

  return (
    <View style={styles.container}>
      <Header title="Tracking Job" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        <MapContainer center={UYO_CENTER} zoom={13} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={ROUTE_COORDS} color="#002a63" weight={4} />
          
          {/* Hub */}
          <Marker position={ROUTE_COORDS[0]}>
            <Popup>Hub</Popup>
          </Marker>
          
          {/* Destination */}
          <Marker position={ROUTE_COORDS[ROUTE_COORDS.length - 1]}>
            <Popup>Destination</Popup>
          </Marker>

          {/* Current Provider Location */}
          <Marker position={currentCoord}>
            <Popup>{booking.provider?.name || 'Technician'}</Popup>
          </Marker>
        </MapContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
});

