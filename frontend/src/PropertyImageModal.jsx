import React, { useState, useEffect } from 'react';
import { getPropertyImageUrl, CATEGORY_SAMPLE_IMAGES } from './api';
import ImageLightbox from './ImageLightbox';
import './PropertyImageModal.css';

const TYPE_LABELS = {
  BUILDING: 'Building',
  APARTMENT: 'Apartment',
  RENTAL: 'Rental',
  PLOT: 'Plot',
  REAL_ESTATE: 'Commercial / Real Estate',
};

const formatTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export default function PropertyImageModal({
  property,
  isLiked = false,
  onToggleLike,
  onClose,
  onOpenEnquiry,
  onExpressInterest,
  onBuyProperty,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
  }, [property?.id]);

  if (!property) return null;

  const mainImg = getPropertyImageUrl(property);
  const uploadedGallery = Array.isArray(property.gallery_images)
    ? property.gallery_images
    : [];

  // Use real main image + real uploaded gallery images with their descriptions
  const galleryImages = [
    {
      title: `${property.title} — Cover Photo`,
      description: `${property.title} — Cover Photo`,
      url: mainImg,
    },
    ...uploadedGallery.map((g, idx) => {
      const caption = g.description?.trim() || `Property Photo ${idx + 1}`;
      return {
        title: caption,
        description: caption,
        url: getPropertyImageUrl(g.image, property.property_type),
      };
    }),
  ];

  const safeIndex = activeIndex < galleryImages.length ? activeIndex : 0;
  const activePhoto = galleryImages[safeIndex];
  const typeLabel =
    TYPE_LABELS[(property.property_type || '').toUpperCase()] ||
    property.property_type ||
    'Property';
  const locText = [formatTitleCase(property.city), formatTitleCase(property.state)]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="pim-backdrop" onClick={onClose}>
      <div className="pim-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="pim-header">
          <div className="pim-header-info">
            <span className="pim-type-pill">
              {typeLabel}
              {property.sub_type ? ` • ${property.sub_type}` : ''}
            </span>
            <h3 className="pim-title">{property.title}</h3>
            {locText && <span className="pim-location">📍 {locText}</span>}
          </div>
          <button className="pim-close-btn" onClick={onClose} aria-label="Close photo gallery">
            ✕
          </button>
        </div>

        {/* Main Image Stage */}
        <div
          className="pim-stage"
          onClick={() => setLightboxOpen(true)}
          style={{ cursor: 'zoom-in' }}
          title="Click to display full image"
        >
          {galleryImages.length > 1 && (
            <button
              type="button"
              className="pim-nav-btn pim-nav-prev"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
              }}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={activePhoto.url}
            alt={`${property.title} - ${activePhoto.title}`}
            className="pim-active-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
            }}
          />

          {galleryImages.length > 1 && (
            <button
              type="button"
              className="pim-nav-btn pim-nav-next"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev + 1) % galleryImages.length);
              }}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <button
            type="button"
            className="pim-zoom-btn"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            🔍 Full Image
          </button>

          <div className="pim-stage-overlay" onClick={(e) => e.stopPropagation()}>
            <span className="pim-stage-label">
              📷 {activePhoto.title} ({safeIndex + 1} / {galleryImages.length})
            </span>
            <span className="pim-stage-price">
              {property.formatted_price ||
                `₹${parseFloat(property.price || 0).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* Thumbnails Row (shown when multiple photos exist) */}
        {galleryImages.length > 1 && (
          <div className="pim-thumbs-strip">
            {galleryImages.map((imgObj, idx) => (
              <button
                key={idx}
                type="button"
                className={`pim-thumb-btn ${safeIndex === idx ? 'active' : ''}`}
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
        )}

        {/* Footer Actions */}
        <div className="pim-footer">
          <div className="pim-specs-row">
            {(property.area_sqft || property.area) && (
              <span>
                📐 {Number(property.area_sqft || property.area).toLocaleString('en-IN')} sq.ft
              </span>
            )}
            {property.bhk && <span>🛏 {property.bhk} BHK</span>}
            {property.furnishing && <span>🛋 {property.furnishing}</span>}
            {property.seller_name && (
              <span>
                👤 Seller: <strong>{property.seller_name}</strong>
              </span>
            )}
          </div>

          <div className="pim-actions-group">
            {onToggleLike && (
              <button
                type="button"
                className={`pim-btn-like ${isLiked ? 'liked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(property, e);
                }}
                title={isLiked ? 'Unlike property' : 'Like property'}
              >
                <span>{isLiked ? '❤️ Liked' : '🤍 Like'}</span>
              </button>
            )}
            {onOpenEnquiry && (
              <button
                type="button"
                className="pim-btn-ai"
                onClick={() => {
                  onClose();
                  onOpenEnquiry(property);
                }}
              >
                📩 Inquire Direct
              </button>
            )}
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

      {/* Full-Screen Uncropped Image View */}
      {lightboxOpen && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={safeIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
