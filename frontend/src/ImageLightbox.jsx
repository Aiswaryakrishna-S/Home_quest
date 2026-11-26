import React, { useState, useEffect } from 'react';
import { CATEGORY_SAMPLE_IMAGES } from './api';
import './ImageLightbox.css';

export default function ImageLightbox({
  images = [],
  initialIndex = 0,
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  if (!images || images.length === 0) return null;

  const safeIdx = currentIndex >= 0 && currentIndex < images.length ? currentIndex : 0;
  const activeItem = images[safeIdx];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="imglb-backdrop" onClick={onClose}>
      <div className="imglb-topbar" onClick={(e) => e.stopPropagation()}>
        <span className="imglb-counter">
          {safeIdx + 1} / {images.length}
        </span>
        <button
          type="button"
          className="imglb-close-btn"
          onClick={onClose}
          aria-label="Close full image view"
        >
          ✕ Close
        </button>
      </div>

      <div className="imglb-stage" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            type="button"
            className="imglb-nav-btn imglb-prev"
            onClick={handlePrev}
            aria-label="Previous image"
          >
            ‹
          </button>
        )}

        <img
          src={activeItem.url}
          alt={activeItem.description || 'Property Photo'}
          className="imglb-full-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
          }}
        />

        {images.length > 1 && (
          <button
            type="button"
            className="imglb-nav-btn imglb-next"
            onClick={handleNext}
            aria-label="Next image"
          >
            ›
          </button>
        )}
      </div>

      {activeItem.description && (
        <div className="imglb-caption-bar" onClick={(e) => e.stopPropagation()}>
          <span>📷 {activeItem.description}</span>
        </div>
      )}
    </div>
  );
}
