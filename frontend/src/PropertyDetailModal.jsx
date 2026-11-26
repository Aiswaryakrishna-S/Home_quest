import React, { useState, useEffect } from 'react';
import { propertyAPI, getPropertyImageUrl, CATEGORY_SAMPLE_IMAGES } from './api';
import ImageLightbox from './ImageLightbox';
import './PropertyDetailModal.css';

const PROPERTY_TYPE_LABELS = {
  BUILDING: 'Building',
  APARTMENT: 'Apartment',
  RENTAL: 'Rental',
  PLOT: 'Plot',
  REAL_ESTATE: 'Commercial / Real Estate',
};

const isValidValue = (val) => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
};

const formatPropertyType = (type) => {
  if (!isValidValue(type)) return '';
  return PROPERTY_TYPE_LABELS[String(type).toUpperCase()] || type;
};

const formatTitleCase = (str) => {
  if (!isValidValue(str)) return '';
  return String(str)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatCompactPrice = (price) => {
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return '';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
  return '';
};

export default function PropertyDetailModal({
  property,
  onClose,
  onEdit,
  onPropertyUpdated,
}) {
  const [currentProperty, setCurrentProperty] = useState(property);
  const [galleryImages, setGalleryImages] = useState(property?.gallery_images || []);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // New photo upload state (supports 2+ images with descriptions)
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setCurrentProperty(property);
    setGalleryImages(property?.gallery_images || []);
    setSelectedPhotoIndex(0);
    if (property?.id) {
      loadLatestData(property.id);
    }
  }, [property?.id]);

  const loadLatestData = async (propId) => {
    try {
      const data = await propertyAPI.getProperty(propId);
      setCurrentProperty(data);
      setGalleryImages(data.gallery_images || []);
    } catch (err) {
      console.error('Failed to refresh property details:', err);
    }
  };

  if (!currentProperty) return null;

  // Compile full photo list: main cover image + gallery images
  const allPhotos = [
    {
      id: 'main',
      url: getPropertyImageUrl(currentProperty),
      description: `${currentProperty.title} (Main Cover Photo)`,
      isMain: true,
    },
    ...galleryImages.map((img) => ({
      id: img.id,
      url: getPropertyImageUrl(img.image, currentProperty.property_type),
      description: isValidValue(img.description) ? img.description : 'Property Photo',
      isMain: false,
    })),
  ];

  const activePhoto = allPhotos[selectedPhotoIndex] || allPhotos[0];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const items = files.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      description: '',
    }));
    setNewImageFiles((prev) => [...prev, ...items]);
    setStatusMsg({ type: '', text: '' });
    e.target.value = '';
  };

  const handleUpdateItemDesc = (idx, text) => {
    setNewImageFiles((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, description: text } : item))
    );
  };

  const handleRemovePendingFile = (idx) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!newImageFiles.length) {
      setStatusMsg({ type: 'error', text: 'Please select at least 1 image file to upload.' });
      return;
    }

    setUploading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      let created = [];
      if (newImageFiles.length === 1) {
        const single = await propertyAPI.addPropertyImage(
          currentProperty.id,
          newImageFiles[0].file,
          newImageFiles[0].description.trim()
        );
        created = [single];
      } else {
        const batch = await propertyAPI.addPropertyImagesBatch(
          currentProperty.id,
          newImageFiles
        );
        created = Array.isArray(batch) ? batch : [batch];
      }

      const updatedList = [...galleryImages, ...created];
      setGalleryImages(updatedList);
      setSelectedPhotoIndex(galleryImages.length); // Focus on first newly uploaded photo

      // Reset upload form
      setNewImageFiles([]);
      setShowAddPhoto(false);
      setStatusMsg({ type: 'success', text: `${created.length} photo(s) uploaded successfully!` });

      if (onPropertyUpdated) {
        onPropertyUpdated({ ...currentProperty, gallery_images: updatedList });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to upload photo(s). Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this gallery photo?')) return;

    try {
      await propertyAPI.deletePropertyImage(currentProperty.id, imageId);
      const updatedList = galleryImages.filter((img) => img.id !== imageId);
      setGalleryImages(updatedList);
      setSelectedPhotoIndex(0);
      setStatusMsg({ type: 'success', text: 'Photo deleted.' });

      if (onPropertyUpdated) {
        onPropertyUpdated({ ...currentProperty, gallery_images: updatedList });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to delete photo.' });
    }
  };

  // Build formatted location line using only valid fields
  const locationParts = [
    isValidValue(currentProperty.address) ? currentProperty.address.trim() : '',
    formatTitleCase(currentProperty.city),
    formatTitleCase(currentProperty.state),
  ].filter(Boolean);

  const locationLine =
    locationParts.join(', ') +
    (isValidValue(currentProperty.zip_code) ? ` - ${String(currentProperty.zip_code).trim()}` : '');

  // Format price
  const priceNum = parseFloat(currentProperty.price);
  const formattedPrice = !isNaN(priceNum)
    ? `₹${priceNum.toLocaleString('en-IN')}`
    : '';
  const compactPrice = formatCompactPrice(currentProperty.price);

  // Check if current property is land or plot
  const isPlot =
    currentProperty.property_type === 'PLOT' ||
    (currentProperty.sub_type && (
      currentProperty.sub_type.toLowerCase().includes('plot') ||
      currentProperty.sub_type.toLowerCase().includes('land')
    ));

  // Build dynamic specification items ONLY from valid values (excluding latitude/longitude)
  const specItems = [];

  if (isValidValue(currentProperty.property_type)) {
    specItems.push({
      label: 'Property Category',
      value: formatPropertyType(currentProperty.property_type),
    });
  }
  if (isValidValue(currentProperty.sub_type)) {
    specItems.push({ label: 'Property Type', value: currentProperty.sub_type });
  }
  const areaVal = currentProperty.area_sqft || currentProperty.area;
  if (isValidValue(areaVal)) {
    const numArea = Number(areaVal);
    specItems.push({
      label: isPlot ? 'Plot Area' : 'Built-up / Total Area',
      value: isNaN(numArea) ? `${areaVal} sq.ft` : `${numArea.toLocaleString('en-IN')} sq.ft`,
    });
  }
  if (!isPlot && isValidValue(currentProperty.carpet_area)) {
    const numCarpet = Number(currentProperty.carpet_area);
    specItems.push({
      label: 'Carpet Area',
      value: isNaN(numCarpet)
        ? `${currentProperty.carpet_area} sq.ft`
        : `${numCarpet.toLocaleString('en-IN')} sq.ft`,
    });
  }
  if (!isPlot && isValidValue(currentProperty.bhk)) {
    specItems.push({ label: 'BHK / Bedrooms', value: `${currentProperty.bhk} BHK` });
  }
  if (!isPlot && isValidValue(currentProperty.bathrooms)) {
    specItems.push({ label: 'Bathrooms', value: currentProperty.bathrooms });
  }
  if (!isPlot && isValidValue(currentProperty.furnishing)) {
    specItems.push({ label: 'Furnishing', value: currentProperty.furnishing });
  }
  if (!isPlot && isValidValue(currentProperty.project_status)) {
    specItems.push({ label: 'Project Status', value: currentProperty.project_status });
  }
  if (isValidValue(currentProperty.maintenance_monthly) && Number(currentProperty.maintenance_monthly) > 0) {
    specItems.push({
      label: 'Maintenance (Monthly)',
      value: `₹${parseFloat(currentProperty.maintenance_monthly).toLocaleString('en-IN')}`,
    });
  }
  if (!isPlot && isValidValue(currentProperty.total_floors)) {
    specItems.push({ label: 'Total Floors', value: currentProperty.total_floors });
  }
  if (!isPlot && isValidValue(currentProperty.floor_no)) {
    specItems.push({ label: 'Floor No', value: currentProperty.floor_no });
  }
  if (!isPlot && isValidValue(currentProperty.car_parking)) {
    specItems.push({ label: 'Car Parking', value: currentProperty.car_parking });
  }
  if (isValidValue(currentProperty.facing)) {
    specItems.push({ label: 'Facing', value: currentProperty.facing });
  }
  if (isValidValue(currentProperty.project_name)) {
    specItems.push({ label: 'Project Name', value: currentProperty.project_name });
  }
  if (isValidValue(currentProperty.address)) {
    specItems.push({ label: 'Address', value: currentProperty.address.trim() });
  }
  if (isValidValue(currentProperty.city)) {
    specItems.push({ label: 'City', value: formatTitleCase(currentProperty.city) });
  }
  if (isValidValue(currentProperty.state)) {
    specItems.push({ label: 'State / District', value: formatTitleCase(currentProperty.state) });
  }
  if (isValidValue(currentProperty.zip_code)) {
    specItems.push({ label: 'Pincode', value: String(currentProperty.zip_code).trim() });
  }
  if (isValidValue(currentProperty.seller_name)) {
    specItems.push({ label: 'Owner / Seller', value: currentProperty.seller_name });
  }
  if (isValidValue(currentProperty.created_at)) {
    const dt = new Date(currentProperty.created_at);
    if (!isNaN(dt.getTime())) {
      specItems.push({
        label: 'Listed On',
        value: dt.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      });
    }
  }

  return (
    <div className="pdm-backdrop" onClick={onClose}>
      <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="pdm-header">
          <div className="pdm-header-title-wrap">
            <div className="pdm-tag-group">
              {isValidValue(currentProperty.property_type) && (
                <span className="pdm-type-pill">
                  {formatPropertyType(currentProperty.property_type)}
                </span>
              )}
              {isValidValue(currentProperty.sub_type) && (
                <span className="pdm-subtype-pill">{currentProperty.sub_type}</span>
              )}
              {isValidValue(currentProperty.project_status) && (
                <span className="pdm-status-pill">{currentProperty.project_status}</span>
              )}
            </div>
            <h2 className="pdm-title">{currentProperty.title}</h2>
            {locationLine && <p className="pdm-location">📍 {locationLine}</p>}
          </div>
          <button className="pdm-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="pdm-body">
          {statusMsg.text && (
            <div className={`pdm-alert pdm-alert-${statusMsg.type}`}>
              {statusMsg.text}
            </div>
          )}

          {/* ── PHOTO GALLERY STAGE WITH DESCRIPTIONS ── */}
          <div className="pdm-gallery-section">
            <div
              className="pdm-gallery-stage"
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'zoom-in' }}
              title="Click to view full image"
            >
              {allPhotos.length > 1 && (
                <button
                  type="button"
                  className="pdm-stage-nav pdm-stage-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
                  }}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
              )}

              <img
                src={activePhoto.url}
                alt={activePhoto.description}
                className="pdm-main-view"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                }}
              />

              {allPhotos.length > 1 && (
                <button
                  type="button"
                  className="pdm-stage-nav pdm-stage-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIndex((prev) => (prev + 1) % allPhotos.length);
                  }}
                  aria-label="Next photo"
                >
                  ›
                </button>
              )}

              <button
                type="button"
                className="pdm-zoom-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
              >
                🔍 View Full Image
              </button>

              <div className="pdm-caption-overlay" onClick={(e) => e.stopPropagation()}>
                <span className="pdm-caption-text">
                  📷 {activePhoto.description} ({selectedPhotoIndex + 1} / {allPhotos.length})
                </span>
                {!activePhoto.isMain && (
                  <button
                    type="button"
                    className="pdm-delete-photo-btn"
                    onClick={() => handleDeletePhoto(activePhoto.id)}
                    title="Delete this photo"
                  >
                    🗑 Delete Photo
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="pdm-thumbnails-row">
              {allPhotos.map((p, idx) => (
                <button
                  key={`${p.id}-${idx}`}
                  type="button"
                  className={`pdm-thumb-btn ${idx === selectedPhotoIndex ? 'active' : ''}`}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  title={p.description}
                >
                  <img
                    src={p.url}
                    alt={p.description}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                    }}
                  />
                  {p.isMain && <span className="pdm-main-marker">Cover</span>}
                </button>
              ))}

              <button
                type="button"
                className="pdm-add-thumb-btn"
                onClick={() => setShowAddPhoto(!showAddPhoto)}
                title="Add more photos with description"
              >
                <span>+</span>
                <small>Add Photo</small>
              </button>
            </div>

            {/* ── ADD MORE PHOTOS ACCORDION ── */}
            {showAddPhoto && (
              <form className="pdm-add-photo-card" onSubmit={handleUploadPhoto}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 className="pdm-add-photo-title" style={{ margin: 0 }}>
                    Add Property Photos with Descriptions (2+ Photos)
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Select single or multiple photos at once
                  </span>
                </div>

                <div className="pdm-file-box" style={{ marginBottom: '1rem' }}>
                  <label className="pdm-form-label">
                    📁 Select 1 or Multiple Photos from Device (2+ Images):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="pdm-file-input"
                  />
                </div>

                {newImageFiles.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
                    {newImageFiles.map((item, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', position: 'relative' }}>
                        <div style={{ height: '120px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem', background: '#000' }}>
                          <img src={item.preview} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#002f34', display: 'block', marginBottom: '0.25rem' }}>
                          Photo {idx + 1} Description / Caption:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Master Bedroom, Living Room, Kitchen"
                          value={item.description}
                          onChange={(e) => handleUpdateItemDesc(idx, e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.82rem', border: '1px solid #94a3b8', borderRadius: '4px', boxSizing: 'border-box', color: '#0f172a' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(idx)}
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(220, 38, 38, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800 }}
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pdm-btn-row">
                  <button
                    type="submit"
                    className="pdm-upload-btn"
                    disabled={uploading || newImageFiles.length === 0}
                  >
                    {uploading ? 'Uploading...' : `✓ Save ${newImageFiles.length} Photo(s) to Property`}
                  </button>
                  <button
                    type="button"
                    className="pdm-cancel-btn"
                    onClick={() => {
                      setShowAddPhoto(false);
                      setNewImageFiles([]);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── PRICE & VALID KEY METRICS BANNER ── */}
          <div className="pdm-price-banner">
            <div>
              <span className="pdm-price-label">Price / Listing Value</span>
              <h3 className="pdm-price-value">
                {formattedPrice}
                {compactPrice && (
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857', marginLeft: '0.6rem' }}>
                    ({compactPrice})
                  </span>
                )}
              </h3>
            </div>
            <div className="pdm-quick-metrics">
              {!isPlot && isValidValue(currentProperty.bhk) && (
                <div className="pdm-metric-box">
                  <span className="pdm-m-num">{currentProperty.bhk} BHK</span>
                  <span className="pdm-m-lbl">Bedrooms</span>
                </div>
              )}
              {!isPlot && isValidValue(currentProperty.bathrooms) && (
                <div className="pdm-metric-box">
                  <span className="pdm-m-num">{currentProperty.bathrooms}</span>
                  <span className="pdm-m-lbl">Bathrooms</span>
                </div>
              )}
              {isValidValue(areaVal) && (
                <div className="pdm-metric-box">
                  <span className="pdm-m-num">
                    {Number(areaVal).toLocaleString('en-IN')}
                  </span>
                  <span className="pdm-m-lbl">{isPlot ? 'Plot Sq.Ft.' : 'Sq. Ft.'}</span>
                </div>
              )}
              {!isPlot && isValidValue(currentProperty.car_parking) && (
                <div className="pdm-metric-box">
                  <span className="pdm-m-num">{currentProperty.car_parking}</span>
                  <span className="pdm-m-lbl">Parking</span>
                </div>
              )}
              <div className="pdm-metric-box">
                <span className="pdm-m-num">{currentProperty.enquiry_count ?? 0}</span>
                <span className="pdm-m-lbl">Enquiries</span>
              </div>
            </div>
          </div>

          {/* ── VALID SPECIFICATIONS GRID ONLY ── */}
          {specItems.length > 0 && (
            <div className="pdm-section-card">
              <h4 className="pdm-section-heading">Property Details & Specifications</h4>
              <div className="pdm-specs-grid">
                {specItems.map((item) => (
                  <div key={item.label} className="pdm-spec-item">
                    <span className="pdm-spec-k">{item.label}</span>
                    <strong className="pdm-spec-v">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GALLERY DESCRIPTIONS LIST (When additional photos exist) ── */}
          {galleryImages.length > 0 && (
            <div className="pdm-section-card">
              <h4 className="pdm-section-heading">
                Uploaded Property Photos ({galleryImages.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.85rem' }}>
                {galleryImages.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setSelectedPhotoIndex(idx + 1);
                      setLightboxOpen(true);
                    }}
                    title="Click to display full image"
                    style={{
                      border: selectedPhotoIndex === idx + 1 ? '2px solid #002f34' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'zoom-in',
                      background: '#f8fafc',
                    }}
                  >
                    <img
                      src={getPropertyImageUrl(img.image, currentProperty.property_type)}
                      alt={img.description || 'Property Photo'}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                      }}
                    />
                    <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                      {isValidValue(img.description) ? img.description : 'Property Photo'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DESCRIPTION TEXT ── */}
          {isValidValue(currentProperty.description) && (
            <div className="pdm-section-card">
              <h4 className="pdm-section-heading">Description</h4>
              <p className="pdm-description-text">{currentProperty.description}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pdm-footer">
          <button
            type="button"
            className="pdm-btn-secondary"
            onClick={() => setShowAddPhoto(!showAddPhoto)}
          >
            📷 {showAddPhoto ? 'Close Photo Form' : '+ Add More Photos with Description'}
          </button>
          <div className="pdm-footer-right">
            <button type="button" className="pdm-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="pdm-btn-primary"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(currentProperty);
              }}
            >
              ✏️ Edit This Property
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Image Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={allPhotos}
          initialIndex={selectedPhotoIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
