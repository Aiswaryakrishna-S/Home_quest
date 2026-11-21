import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { propertyAPI } from './api';
import './LocationMap.css';

// Fix Leaflet's default marker asset paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom User GPS Location Pulsing Marker
const userMarkerIcon = L.divIcon({
  className: 'user-marker-icon-wrapper',
  html: `<div class="user-pulse"></div><div class="user-core-dot"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// City coordinate approximations for properties that don't have exact lat/lng
const CITY_COORDINATES = {
  mumbai: [19.076, 72.8777],
  delhi: [28.7041, 77.1025],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  kochi: [9.9312, 76.2673],
  chicago: [41.8781, -87.6298],
  'new york': [40.7128, -74.006],
  london: [51.5074, -0.1278],
};

export default function LocationMap({ properties = [], onSelectProperty, onLocationDetected }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const propertyMarkersRef = useRef([]);

  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Default initial center (e.g. general default)
  const defaultCenter = [20.5937, 78.9629]; // Default India/Global overview

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

  // 2. Render Property Markers on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous property markers
    propertyMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    propertyMarkersRef.current = [];

    const newMarkers = [];

    properties.forEach((prop, idx) => {
      let coords = null;

      // Check if property has explicit lat/lng or approximate by city
      if (prop.latitude && prop.longitude) {
        coords = [parseFloat(prop.latitude), parseFloat(prop.longitude)];
      } else if (prop.city) {
        const cityKey = prop.city.trim().toLowerCase();
        const base = CITY_COORDINATES[cityKey];
        if (base) {
          // Add small jitter so multiple properties in same city don't stack directly on top
          coords = [base[0] + (idx * 0.007 - 0.015), base[1] + (idx * 0.007 - 0.015)];
        }
      }

      if (coords) {
        const customPropIcon = L.divIcon({
          className: 'custom-property-pin',
          html: `<div class="prop-pin-bubble"><span>$${parseFloat(prop.price).toLocaleString()}</span></div>`,
          iconSize: [60, 30],
          iconAnchor: [30, 30],
        });

        const marker = L.marker(coords, { icon: customPropIcon }).addTo(map);

        // Rich Popup Window
        const popupContent = `
          <div class="map-popup-card">
            <img src="${prop.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}" alt="${prop.title}" class="popup-thumb" />
            <div class="popup-body">
              <span class="popup-type">${prop.property_type || 'PROPERTY'}</span>
              <h4 class="popup-title">${prop.title}</h4>
              <p class="popup-price">$${parseFloat(prop.price).toLocaleString()}</p>
              <p class="popup-loc">📍 ${prop.city || ''} &bull; ${prop.area_sqft || prop.area || ''} sqft</p>
              ${prop.distance_km ? `<p class="popup-dist">🚗 ${prop.distance_km} km from you</p>` : ''}
              <button id="popup-btn-${prop.id}" class="popup-inquire-btn">Contact Owner</button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 260, minWidth: 220 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`popup-btn-${prop.id}`);
          if (btn && onSelectProperty) {
            btn.onclick = () => onSelectProperty(prop);
          }
        });

        newMarkers.push(marker);
      }
    });

    propertyMarkersRef.current = newMarkers;
  }, [properties, onSelectProperty]);

  // 3. Reverse Geocode Coordinates using OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      if (data && data.address) {
        const city =
          data.address.city ||
          data.address.town ||
          data.address.suburb ||
          data.address.village ||
          data.address.state ||
          '';
        const formatted = [city, data.address.country].filter(Boolean).join(', ');
        setLocationName(formatted || data.display_name || '');
        if (city && onLocationDetected) {
          onLocationDetected(city, { lat, lng });
        }
      }
    } catch (err) {
      console.warn('Reverse geocode failed:', err);
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // 4. Trigger HTML5 Geolocation using Leaflet
  const handleDetectLocation = () => {
    setErrorMsg('');
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latLng = [latitude, longitude];

        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setLocating(false);

        const map = mapInstanceRef.current;
        if (map) {
          // Smoothly fly to user's location
          map.flyTo(latLng, 14, { duration: 1.8 });

          // Remove existing user marker if present
          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }
          if (accuracyCircleRef.current) {
            map.removeLayer(accuracyCircleRef.current);
          }

          // Add user pulse marker
          const uMarker = L.marker(latLng, { icon: userMarkerIcon }).addTo(map);
          uMarker.bindPopup(`
            <div style="font-size:0.85rem; font-weight:700; text-align:center;">
              📍 You Are Here
              <div style="font-size:0.75rem; color:#64748b; font-weight:500;">
                Accuracy: &plusmn;${Math.round(accuracy)}m
              </div>
            </div>
          `).openPopup();
          userMarkerRef.current = uMarker;

          // Add subtle accuracy radius circle
          const circle = L.circle(latLng, {
            radius: Math.min(accuracy, 1000),
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
          accuracyCircleRef.current = circle;
        }

        // Call backend to fetch properties sorted by latitude and longitude proximity
        try {
          const nearbyData = await propertyAPI.getAllProperties({ lat: latitude, lng: longitude });
          const nearbyList = Array.isArray(nearbyData) ? nearbyData : nearbyData.results || [];
          if (onLocationDetected) {
            onLocationDetected('', { lat: latitude, lng: longitude }, nearbyList);
          }
        } catch (fetchErr) {
          console.warn('Backend proximity fetch fallback:', fetchErr);
        }

        // Fetch location name
        await reverseGeocode(latitude, longitude);
      },
      (err) => {
        setLocating(false);
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          setErrorMsg('Location permission denied. Please allow location access in your browser.');
        } else if (err.code === 2) {
          setErrorMsg('Location unavailable. Please check your network or GPS.');
        } else {
          setErrorMsg('Location request timed out. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // 5. Reset map to overview
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(defaultCenter, 4, { duration: 1.2 });
    }
  };

  return (
    <div className="location-map-section" id="location-map">
      <div className="map-header-block">
        <div>
          <span className="map-badge">LEAFLET GEOLOCATION & MAP</span>
          <h2 className="map-heading">Find Properties Near Your Current Location</h2>
          <p className="map-subheading">
            Detect your live GPS position and explore homes, apartments, and lands listed in your vicinity.
          </p>
        </div>

        <div className="map-controls">
          <button
            className={`btn-locate-me ${locating ? 'loading' : ''}`}
            onClick={handleDetectLocation}
            disabled={locating}
          >
            {locating ? (
              <>
                <span className="map-spinner"></span>
                Detecting GPS...
              </>
            ) : (
              <>
                <span className="gps-icon">📍</span>
                Locate My Position
              </>
            )}
          </button>

          {userLocation && (
            <button className="btn-reset-map" onClick={handleResetView}>
              Reset View
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {(userLocation || errorMsg) && (
        <div className={`map-status-bar ${errorMsg ? 'status-error' : 'status-success'}`}>
          {errorMsg ? (
            <span>⚠️ {errorMsg}</span>
          ) : (
            <div className="status-success-content">
              <span className="status-badge">✅ Location Detected</span>
              <span className="status-place">
                <strong>{locationName || 'Current Location'}</strong> &bull; Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div className="map-wrapper-card">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot user-dot"></span>
            <span>Your Current Location</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot prop-dot"></span>
            <span>Property Listings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
