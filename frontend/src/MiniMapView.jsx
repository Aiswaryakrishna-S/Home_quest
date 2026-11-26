import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPropertyImageUrl } from './api';
import './MiniMapView.css';

// Fix Leaflet's default marker asset paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom User GPS Pulsing Marker Icon
const userPulseIcon = L.divIcon({
  className: 'mini-user-marker',
  html: `<div class="mini-pulse-ring"></div><div class="mini-core-point"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const CITY_COORDINATES = {
  kannur: [11.8745, 75.3704],
  kochi: [9.9816, 76.2999],
  ernakulam: [9.9816, 76.2999],
  aluva: [10.1076, 76.3516],
  kakkanad: [10.0159, 76.3419],
  kozhikode: [11.2588, 75.7804],
  calicut: [11.2588, 75.7804],
  thiruvananthapuram: [8.5241, 76.9366],
  trivandrum: [8.5241, 76.9366],
  thrissur: [10.5276, 76.2144],
  kottayam: [9.5916, 76.5222],
  palakkad: [10.7867, 76.6548],
  alappuzha: [9.4981, 76.3388],
  kollam: [8.8932, 76.6141],
  malappuram: [11.0510, 76.0711],
  wayanad: [11.6103, 76.0827],
  kasaragod: [12.4996, 74.9869],
  pathanamthitta: [9.2648, 76.7870],
  idukki: [9.8959, 76.7184],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707],
  mumbai: [19.076, 72.8777],
  delhi: [28.7041, 77.1025],
};

export default function MiniMapView({
  properties = [],
  userCoords,
  isLocating,
  onLocateMe,
  onSelectProperty,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const markersRef = useRef([]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter = userCoords ? [userCoords.lat, userCoords.lng] : [20.5937, 78.9629];
      const initialZoom = userCoords ? 13 : 4;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false, // Cleaner small map look
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. React to User GPS Coordinate Changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) return;

    const latLng = [userCoords.lat, userCoords.lng];

    // Smoothly fly to user position
    map.flyTo(latLng, 14, { duration: 1.5 });

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    if (accuracyCircleRef.current) {
      map.removeLayer(accuracyCircleRef.current);
    }

    // Add glowing user pulse marker
    const uMarker = L.marker(latLng, { icon: userPulseIcon }).addTo(map);
    uMarker.bindPopup(`
      <div style="font-size:0.8rem; font-weight:700; text-align:center;">
        📍 You Are Here
      </div>
    `);
    userMarkerRef.current = uMarker;

    const circle = L.circle(latLng, {
      radius: Math.min(userCoords.accuracy || 800, 1000),
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 1.5,
    }).addTo(map);
    accuracyCircleRef.current = circle;
  }, [userCoords]);

  // 3. Render Properties as Mini Price Bubbles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const newMarkers = [];

    properties.forEach((prop, idx) => {
      let coords = null;
      if (prop.latitude && prop.longitude) {
        coords = [parseFloat(prop.latitude), parseFloat(prop.longitude)];
      } else if (prop.city) {
        const base = CITY_COORDINATES[prop.city.trim().toLowerCase()];
        if (base) {
          coords = [base[0] + (idx * 0.006 - 0.012), base[1] + (idx * 0.006 - 0.012)];
        }
      }

      if (coords) {
        const priceTag = L.divIcon({
          className: 'mini-prop-bubble',
          html: `<span>$${parseFloat(prop.price).toLocaleString()}</span>`,
          iconSize: [52, 24],
          iconAnchor: [26, 24],
        });

        const marker = L.marker(coords, { icon: priceTag }).addTo(map);

        const popupHtml = `
          <div class="mini-popup-box">
            <img src="${getPropertyImageUrl(prop)}" alt="${prop.title}" class="mini-popup-img" />
            <div class="mini-popup-info">
              <span class="mini-popup-badge">${prop.property_type || 'HOMES'}</span>
              <strong class="mini-popup-title">${prop.title}</strong>
              <span class="mini-popup-price">${prop.formatted_price || `₹${parseFloat(prop.price).toLocaleString('en-IN')}`}</span>
              ${prop.distance_km ? `<span class="mini-popup-dist">🚗 ${prop.distance_km} km away</span>` : ''}
              <button id="mini-inquire-${prop.id}" class="mini-popup-btn">Inquire</button>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 220 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`mini-inquire-${prop.id}`);
          if (btn && onSelectProperty) {
            btn.onclick = () => onSelectProperty(prop);
          }
        });

        newMarkers.push(marker);
      }
    });

    markersRef.current = newMarkers;
  }, [properties, onSelectProperty]);

  return (
    <div className="mini-map-card">
      <div className="mini-map-header">
        <div className="mini-map-title">
          <span className="live-gps-dot"></span>
          <span>Live Location Map</span>
        </div>
        <span className="mini-badge-props">{properties.length} Properties</span>
      </div>

      <div className="mini-map-container" ref={mapContainerRef}>
        {/* Floating Quick Action Button inside map */}
        <button
          className={`mini-gps-btn ${isLocating ? 'locating' : ''}`}
          onClick={onLocateMe}
          title="Center on my location"
          disabled={isLocating}
        >
          {isLocating ? (
            <span className="mini-spinner"></span>
          ) : (
            <>
              <span>🎯</span>
              <span>Near Me</span>
            </>
          )}
        </button>
      </div>

      <div className="mini-map-footer">
        <span className="mini-hint">
          {userCoords ? '📍 Map centered on your position' : 'Click "Near Me" to locate nearby properties'}
        </span>
      </div>
    </div>
  );
}
