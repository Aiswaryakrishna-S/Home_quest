import React, { useState } from 'react';
import { propertyAPI } from './api';
import { KERALA_LOCATIONS, findKeralaLocation } from './keralaLocations';
import './AIPriceAdvisor.css';

export default function AIPriceAdvisor({
  propertyData = {},
  onApplyPrice,
  onLocationChange,
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [locationMode, setLocationMode] = useState('BENCHMARK'); // 'BENCHMARK' | 'CURRENT_GPS'

  // Determine current active city/location
  const currentCityName = propertyData.city || 'Kannur';
  const matchedLocation = findKeralaLocation(currentCityName);

  // When user clicks a Kerala location chip (e.g. Kannur)
  const handleSelectLocation = (loc) => {
    setLocationMode('BENCHMARK');
    setError(null);
    if (onLocationChange) {
      onLocationChange({
        city: loc.name,
        state: 'Kerala',
        latitude: loc.lat.toFixed(6),
        longitude: loc.lng.toFixed(6),
      });
    }
  };

  // When user clicks "Click for Current Location (GPS)"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        setLocationMode('CURRENT_GPS');
        const latStr = pos.coords.latitude.toFixed(6);
        const lngStr = pos.coords.longitude.toFixed(6);

        if (onLocationChange) {
          onLocationChange({
            latitude: latStr,
            longitude: lngStr,
          });
        }
      },
      (err) => {
        setLocatingGps(false);
        setError('Could not get current location: ' + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const payload = {
        city: propertyData.city || 'Kannur',
        property_type: propertyData.property_type || 'BUILDING',
        area_sqft: parseInt(propertyData.area_sqft) || 1500,
        latitude: propertyData.latitude ? parseFloat(propertyData.latitude) : null,
        longitude: propertyData.longitude ? parseFloat(propertyData.longitude) : null,
        current_price: propertyData.price ? parseFloat(propertyData.price) : null,
      };

      const result = await propertyAPI.predictPrice(payload);
      setAnalysis(result);
    } catch (err) {
      console.error('AI Valuation failed:', err);
      setError(
        err.response?.data?.error ||
        'Unable to calculate price. Please verify city or GPS coordinates.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (analysis && analysis.suggested_price) {
      onApplyPrice(analysis.suggested_price);
      setApplied(true);
      setTimeout(() => setApplied(false), 3500);
    }
  };

  return (
    <div className="ai-advisor-container">
      <div className="ai-advisor-header">
        <div className="ai-header-left">
          <span className="ai-badge-pulse">AI Powered</span>
          <h4 className="ai-title">Kerala Real Estate Price &amp; Increment Advisor</h4>
        </div>
        <button
          type="button"
          className={`ai-analyze-btn ${loading ? 'loading' : ''}`}
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="ai-spinner"></span>
              Analyzing Market Rates...
            </>
          ) : (
            <>Get AI Valuation &amp; Area Boost %</>
          )}
        </button>
      </div>

      <p className="ai-subtitle">
        Uses Scikit-Learn Random Forest calibrated on Kerala's 14 districts, NH 66 corridor distances, 
        and IT hubs (Infopark / Technopark / Cyberpark) to recommend market rates.
      </p>

      {/* ── LOCATION SELECTOR & GPS CONTROLLER ── */}
      <div className="ai-location-control-panel">
        <div className="ai-location-header-row">
          <span className="ai-location-sec-title">
            Select Location for AI Analysis:
          </span>
          <button
            type="button"
            className={`ai-gps-locate-btn ${locationMode === 'CURRENT_GPS' ? 'active' : ''} ${locatingGps ? 'locating' : ''}`}
            onClick={handleUseCurrentLocation}
            disabled={locatingGps}
            title="Click to detect device GPS coordinates"
          >
            {locatingGps ? (
              <>
                <span className="ai-mini-spinner" />
                Detecting GPS...
              </>
            ) : (
              <>🎯 Click for Current Location (GPS)</>
            )}
          </button>
        </div>

        {/* Quick-select Kerala Location Chips */}
        <div className="ai-location-chips-row">
          {KERALA_LOCATIONS.filter((l) => l.isPopular).map((loc) => {
            const isSelected =
              locationMode === 'BENCHMARK' &&
              currentCityName.toLowerCase().includes(loc.id);

            return (
              <button
                key={loc.id}
                type="button"
                className={`ai-location-chip ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectLocation(loc)}
              >
                <span>📍 {loc.name}</span>
                {isSelected && <span className="chip-check">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Active Analysis Location Indicator */}
        <div className="ai-active-target-badge">
          <div className="target-dot-pulse" />
          <div className="target-info-text">
            <span>
              Active Analysis Target:{' '}
              <strong className="target-location-name">
                {locationMode === 'CURRENT_GPS'
                  ? 'Current Device Location (GPS)'
                  : (matchedLocation?.name || currentCityName)}
              </strong>
            </span>
            {propertyData.latitude && propertyData.longitude ? (
              <span className="target-coords">
                {' '}• Coords: {propertyData.latitude}° N, {propertyData.longitude}° E
                {matchedLocation && locationMode === 'BENCHMARK' && (
                  <span className="target-tag"> ({matchedLocation.tag})</span>
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {error && <div className="ai-error-box">{error}</div>}

      {analysis && (
        <div className="ai-results-card">
          {/* Top Valuation Summary */}
          <div className="ai-summary-grid">
            <div className="ai-summary-item primary">
              <span className="summary-label">Suggested Market Price</span>
              <span className="summary-value highlight">
                {analysis.suggested_price_formatted}
              </span>
              <span className="summary-sub">
                Fair Range: {analysis.fair_range?.formatted}
              </span>
            </div>

            <div className="ai-summary-item">
              <span className="summary-label">Estimated Rate / Sq.Ft</span>
              <span className="summary-value">
                {analysis.rate_per_sqft_formatted}
              </span>
              <span className="summary-sub">
                District: <strong>{analysis.district}</strong>{' '}
                {analysis.location_source && `(${analysis.location_source})`}
              </span>
            </div>

            <div className="ai-summary-item action-box">
              <button
                type="button"
                className={`ai-apply-price-btn ${applied ? 'applied' : ''}`}
                onClick={handleApply}
              >
                {applied ? '✓ Price Applied!' : 'Apply Suggested Price'}
              </button>
              <span className="summary-sub text-center">
                Autofills form price input
              </span>
            </div>
          </div>

          {/* Verdict Banner */}
          {analysis.verdict && (
            <div className={`ai-verdict-banner verdict-${analysis.verdict.code}`}>
              <div className="verdict-icon">[V]</div>
              <div className="verdict-content">
                <strong>{analysis.verdict.title}</strong>
                <p>{analysis.verdict.message}</p>
              </div>
            </div>
          )}

          {/* Spatial Proximity Badges */}
          <div className="ai-spatial-strip">
            <div className="spatial-tag">
              <span className="tag-icon">[NH]</span>
              <div>
                <span className="tag-title">NH 66 Corridor</span>
                <span className="tag-val">
                  {analysis.spatial_distances?.dist_nh66_km} km away
                </span>
              </div>
            </div>

            <div className="spatial-tag">
              <span className="tag-icon">[IT]</span>
              <div>
                <span className="tag-title">Nearest IT / Tech Hub</span>
                <span className="tag-val">
                  {analysis.spatial_distances?.it_hub_name} (
                  {analysis.spatial_distances?.dist_it_hub_km} km)
                </span>
              </div>
            </div>

            <div className="spatial-tag">
              <span className="tag-icon">[DC]</span>
              <div>
                <span className="tag-title">District Center</span>
                <span className="tag-val">
                  {analysis.spatial_distances?.dist_center_km} km away
                </span>
              </div>
            </div>
          </div>

          {/* Area Increment Factors Breakdown */}
          {analysis.increments && analysis.increments.length > 0 && (
            <div className="ai-increments-section">
              <div className="increments-header">
                <h5>Area &amp; Infrastructure Increment Breakdown</h5>
                <span className="total-boost-tag">
                  Total Area Premium: +{analysis.total_area_boost_percentage}%
                </span>
              </div>

              <div className="increments-list">
                {analysis.increments.map((inc, idx) => (
                  <div
                    key={idx}
                    className={`increment-row ${inc.highlight ? 'highlight-row' : ''}`}
                  >
                    <div className="increment-left">
                      <div className="factor-title-box">
                        <span className="factor-name">{inc.factor}</span>
                        <span className="factor-boost-pill">
                          +{inc.percentage}% Price Boost
                        </span>
                      </div>
                      <p className="factor-desc">{inc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
