import React, { useState } from 'react';
import { getPropertyImageUrl, CATEGORY_SAMPLE_IMAGES } from './api';
import './PropertyImageModal.css';

export default function PropertyImageModal({
  property,
  onClose,
  onExpressInterest,
  onBuyProperty,
}) {
  if (!property) return null;

  const mainImg = getPropertyImageUrl(property);

  // Generate a multi-angle gallery set for this property type
  const galleryImages = [
    { title: 'Main Elevation View', url: mainImg },
    {
      title: 'Architectural Perspective',
      url:
        property.property_type === 'APARTMENT'
          ? 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
          : property.property_type === 'PLOT'
          ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
          : property.property_type === 'RENTAL'
          ? 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
          : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Interior Living Space',
      url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Master Suite & Balcony',
      url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="pim-backdrop" onClick={onClose}>
      <div className="pim-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="pim-header">
          <div className="pim-header-info">
            <span className="pim-type-pill">{property.property_type || 'PROPERTY'}</span>
            <h3 className="pim-title">{property.title}</h3>
            <span className="pim-location">📍 {property.city}, Kerala</span>
          </div>
          <button className="pim-close-btn" onClick={onClose} aria-label="Close photo gallery">
            ✕
          </button>
        </div>

        {/* Main Image Stage */}
        <div className="pim-stage">
          <img
            src={galleryImages[activeIndex].url}
            alt={`${property.title} - ${galleryImages[activeIndex].title}`}
            className="pim-active-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
            }}
          />
          <div className="pim-stage-overlay">
            <span className="pim-stage-label">
              📷 {galleryImages[activeIndex].title} ({activeIndex + 1} / {galleryImages.length})
            </span>
            <span className="pim-stage-price">
              {property.formatted_price || `₹${parseFloat(property.price).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* Thumbnails Row */}
        <div className="pim-thumbs-strip">
          {galleryImages.map((imgObj, idx) => (
            <button
              key={idx}
              type="button"
              className={`pim-thumb-btn ${activeIndex === idx ? 'active' : ''}`}
              onClick={() => setActiveIndex(idx)}
            >
              <img
                src={imgObj.url}
                alt={imgObj.title}
                className="pim-thumb-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                }}
              />
              <span className="pim-thumb-caption">{imgObj.title}</span>
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pim-footer">
          <div className="pim-specs-row">
            <span>📐 {property.area_sqft || property.area || '—'} sq.ft</span>
            <span>👤 Seller: <strong>{property.seller_name || 'Verified Owner'}</strong></span>
            {property.distance_km && <span>🚗 {property.distance_km} km to City Hub</span>}
          </div>

          <div className="pim-actions-group">
            {onExpressInterest && (
              <button
                type="button"
                className="pim-btn-ai"
                onClick={() => {
                  onClose();
                  onExpressInterest(property);
                }}
              >
                ✨ Express Interest (AI)
              </button>
            )}
            {onBuyProperty && (
              <button
                type="button"
                className="pim-btn-buy"
                onClick={() => {
                  onClose();
                  onBuyProperty(property);
                }}
              >
                💳 Buy Property / Agreement
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
