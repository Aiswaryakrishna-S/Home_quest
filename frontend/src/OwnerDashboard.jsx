import React, { useState, useEffect } from 'react';
import { propertyAPI, enquiryAPI, getPropertyImageUrl, PRESET_PROPERTY_IMAGES, CATEGORY_SAMPLE_IMAGES } from './api';
import AIPriceAdvisor from './AIPriceAdvisor';
import VisitScheduleManager from './VisitScheduleManager';
import PropertyAttributesForm from './PropertyAttributesForm';
import PropertyDetailModal from './PropertyDetailModal';
import ImageLightbox from './ImageLightbox';
import { KERALA_LOCATIONS, findKeralaLocation } from './keralaLocations';
import './OwnerDashboard.css';

const PROPERTY_TYPES = [
  { value: 'BUILDING', label: 'Building' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'PLOT', label: 'Plot' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
];

const formatPropertyType = (type) => {
  if (!type) return '';
  const match = PROPERTY_TYPES.find((t) => t.value === String(type).toUpperCase());
  return match ? match.label : type;
};

const formatTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const createInitialPhotoSlots = () => [
  { id: 'slot-1', file: null, preview: null, description: 'Living Room / Main Hall' },
  { id: 'slot-2', file: null, preview: null, description: 'Master Bedroom' },
  { id: 'slot-3', file: null, preview: null, description: 'Modular Kitchen & Dining' },
];

export default function OwnerDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'properties' | 'enquiries' | 'add'
  const [properties, setProperties] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('ALL');

  // Edit / Modal state
  const [editingProperty, setEditingProperty] = useState(null);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [lightboxData, setLightboxData] = useState(null);
  const [additionalPhotos, setAdditionalPhotos] = useState(createInitialPhotoSlots());

  const openPropertyLightbox = (prop, startIndex = 0) => {
    const imgs = [
      {
        url: getPropertyImageUrl(prop),
        description: `${prop.title} — Cover Photo`,
      },
      ...(Array.isArray(prop.gallery_images)
        ? prop.gallery_images.map((g, i) => ({
            url: getPropertyImageUrl(g.image, prop.property_type),
            description: g.description?.trim() || `${prop.title} — Photo ${i + 1}`,
          }))
        : []),
    ];
    setLightboxData({ images: imgs, index: startIndex });
  };
  const [propertyForm, setPropertyForm] = useState({
    title: '',
    category: 'HOUSES_APARTMENTS',
    property_type: 'APARTMENT',
    sub_type: 'Flats / Apartments',
    bhk: '',
    bathrooms: '',
    furnishing: '',
    project_status: '',
    listed_by: 'Owner',
    price: '',
    area_sqft: '',
    carpet_area: '',
    maintenance_monthly: '',
    total_floors: '',
    floor_no: '',
    car_parking: '',
    facing: '',
    project_name: '',
    address: '',
    city: 'Kannur',
    state: 'Kerala',
    zip_code: '',
    description: '',
    latitude: '11.874500',
    longitude: '75.370400',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 5000);
  };

  // Load dashboard data: strictly fetch ONLY the logged-in owner's properties & inquiries
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [propsData, enqData] = await Promise.all([
        propertyAPI.getMyProperties(),
        enquiryAPI.getMyEnquiries(),
      ]);
      const list = Array.isArray(propsData) ? propsData : propsData?.results || [];
      setProperties(list);
      setEnquiries(Array.isArray(enqData) ? enqData : enqData?.results || []);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Form
  const handleEditClick = (prop) => {
    setEditingProperty(prop);
    const resolvedCat =
      prop.property_type === 'PLOT'
        ? 'LANDS_PLOTS'
        : prop.property_type === 'RENTAL'
        ? 'RENTAL_HOMES'
        : prop.property_type === 'REAL_ESTATE'
        ? 'COMMERCIAL'
        : 'HOUSES_APARTMENTS';

    setPropertyForm({
      title: prop.title || '',
      category: resolvedCat,
      property_type: prop.property_type || 'APARTMENT',
      sub_type: prop.sub_type || '',
      bhk: prop.bhk !== null && prop.bhk !== undefined ? String(prop.bhk) : '',
      bathrooms: prop.bathrooms !== null && prop.bathrooms !== undefined ? String(prop.bathrooms) : '',
      furnishing: prop.furnishing || '',
      project_status: prop.project_status || '',
      listed_by: 'Owner',
      price: prop.price || '',
      area_sqft: prop.area_sqft || prop.area || '',
      carpet_area: prop.carpet_area || '',
      maintenance_monthly: prop.maintenance_monthly || '',
      total_floors: prop.total_floors || '',
      floor_no: prop.floor_no || '',
      car_parking: prop.car_parking || '',
      facing: prop.facing || '',
      project_name: prop.project_name || '',
      address: prop.address || '',
      city: prop.city || '',
      state: prop.state || 'Kerala',
      zip_code: prop.zip_code || '',
      description: prop.description || '',
      latitude: prop.latitude || '',
      longitude: prop.longitude || '',
    });
    setImagePreview(getPropertyImageUrl(prop));
    setSelectedImage(null);
    setAdditionalPhotos(createInitialPhotoSlots());
    setActiveSection('add');
  };

  const handleSelectPresetImage = async (preset) => {
    const labelStr = preset.label || preset.name || 'sample_property';
    try {
      const res = await fetch(preset.url);
      const blob = await res.blob();
      const file = new File([blob], `${labelStr.toLowerCase().replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(preset.url);
    } catch {
      setImagePreview(preset.url);
    }
  };

  // Reset Add/Edit Form
  const handleResetForm = () => {
    setEditingProperty(null);
    setAdditionalPhotos(createInitialPhotoSlots());
    setPropertyForm({
      title: '',
      category: 'HOUSES_APARTMENTS',
      property_type: 'APARTMENT',
      sub_type: 'Flats / Apartments',
      bhk: '',
      bathrooms: '',
      furnishing: '',
      project_status: '',
      listed_by: 'Owner',
      price: '',
      area_sqft: '',
      carpet_area: '',
      maintenance_monthly: '',
      total_floors: '',
      floor_no: '',
      car_parking: '',
      facing: '',
      project_name: '',
      address: '',
      city: 'Kannur',
      state: 'Kerala',
      zip_code: '',
      description: '',
      latitude: '11.874500',
      longitude: '75.370400',
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Handlers for Additional Gallery Photo Slots (2+ dedicated image fields)
  const handleSlotFileChange = (idx, file) => {
    if (!file) return;
    setAdditionalPhotos((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, file, preview: URL.createObjectURL(file) } : item
      )
    );
  };

  const handleClearSlot = (idx) => {
    setAdditionalPhotos((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, file: null, preview: null } : item))
    );
  };

  const handleRemoveSlot = (idx) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSlot = () => {
    setAdditionalPhotos((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}`,
        file: null,
        preview: null,
        description: `Additional Room / Feature ${prev.length + 1}`,
      },
    ]);
  };

  const handleUpdatePhotoDescription = (idx, desc) => {
    setAdditionalPhotos((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, description: desc } : item))
    );
  };

  const handleBatchPhotosSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setAdditionalPhotos((prev) => {
      const updated = [...prev];
      let fileIdx = 0;

      // Fill existing empty slots first
      for (let i = 0; i < updated.length && fileIdx < files.length; i++) {
        if (!updated[i].file) {
          updated[i] = {
            ...updated[i],
            file: files[fileIdx],
            preview: URL.createObjectURL(files[fileIdx]),
          };
          fileIdx++;
        }
      }

      // Append remaining files as new slots
      while (fileIdx < files.length) {
        updated.push({
          id: `slot-${Date.now()}-${fileIdx}`,
          file: files[fileIdx],
          preview: URL.createObjectURL(files[fileIdx]),
          description: `Additional Room / Feature ${updated.length + 1}`,
        });
        fileIdx++;
      }

      return updated;
    });

    e.target.value = '';
  };

  // Unified update handler for form fields & OLX chip clicks
  const handlePropertyFormChange = (fieldOrObj, val) => {
    if (typeof fieldOrObj === 'object' && fieldOrObj !== null) {
      setPropertyForm((prev) => ({ ...prev, ...fieldOrObj }));
    } else {
      setPropertyForm((prev) => ({ ...prev, [fieldOrObj]: val }));
    }
  };

  const [locatingGps, setLocatingGps] = useState(false);

  // Quick Select a Kerala Location (e.g. Kannur, Kochi, Kozhikode)
  const handleSelectKeralaLocation = (loc) => {
    setPropertyForm((prev) => ({
      ...prev,
      city: loc.name,
      state: 'Kerala',
      latitude: loc.lat.toFixed(6),
      longitude: loc.lng.toFixed(6),
    }));
    showAlert('success', `Location set to ${loc.name} (Benchmark: ${loc.lat}, ${loc.lng})`);
  };

  // When user types in City field, auto-sync coordinates if it matches a known district
  const handleCityInputChange = (e) => {
    const val = e.target.value;
    const match = findKeralaLocation(val);
    if (match) {
      setPropertyForm((prev) => ({
        ...prev,
        city: val,
        state: 'Kerala',
        latitude: match.lat.toFixed(6),
        longitude: match.lng.toFixed(6),
      }));
    } else {
      setPropertyForm((prev) => ({
        ...prev,
        city: val,
      }));
    }
  };

  // Explicitly fetch user's real current device GPS location on click
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      showAlert('error', 'Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const latStr = pos.coords.latitude.toFixed(6);
        const lngStr = pos.coords.longitude.toFixed(6);
        setPropertyForm((prev) => ({
          ...prev,
          latitude: latStr,
          longitude: lngStr,
        }));
        showAlert('success', `Current device GPS detected: ${latStr}, ${lngStr}`);
      },
      (err) => {
        setLocatingGps(false);
        showAlert('error', 'Could not detect current location: ' + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Form submit for Add / Edit Property
  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    const isPlot =
      propertyForm.category === 'LANDS_PLOTS' ||
      propertyForm.property_type === 'PLOT' ||
      (propertyForm.sub_type && (
        propertyForm.sub_type.toLowerCase().includes('plot') ||
        propertyForm.sub_type.toLowerCase().includes('land')
      ));

    Object.keys(propertyForm).forEach((key) => {
      if (key === 'category') return;
      if (isPlot && ['bhk', 'bathrooms', 'furnishing', 'project_status', 'carpet_area', 'total_floors', 'floor_no', 'car_parking'].includes(key)) {
        formData.append(key, '');
        return;
      }
      const val = propertyForm[key];
      if (val !== null && val !== undefined && val !== '') {
        formData.append(key, val);
      }
    });

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    // Append additional gallery images with their descriptions (contiguous keys)
    let galleryCount = 0;
    additionalPhotos.forEach((item) => {
      if (item.file) {
        formData.append(`gallery_image_${galleryCount}`, item.file);
        formData.append(`gallery_description_${galleryCount}`, (item.description || '').trim());
        galleryCount++;
      }
    });

    try {
      if (editingProperty) {
        const updated = await propertyAPI.updateProperty(editingProperty.id, formData);
        showAlert('success', 'Property listing updated successfully!');
        if (updated && updated.id) {
          setProperties((prev) =>
            prev.map((p) => (p.id === (updated.id || editingProperty.id) ? { ...p, ...updated } : p))
          );
        }
      } else {
        const created = await propertyAPI.createProperty(formData);
        showAlert('success', 'New property listed successfully!');
        if (created && created.id) {
          // Instantly prepend newly created property so it is immediately visible
          setProperties((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        }
      }
      handleResetForm();
      await loadDashboardData();
      setActiveSection('properties');
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Failed to save property.';
      showAlert('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Property
  const handleDeleteProperty = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await propertyAPI.deleteProperty(id);
      showAlert('success', 'Property listing deleted.');
      setProperties(properties.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to delete property.');
    }
  };

  // Update Enquiry Status
  const handleStatusChange = async (enquiryId, newStatus) => {
    try {
      await enquiryAPI.updateEnquiryStatus(enquiryId, newStatus);
      setEnquiries(
        enquiries.map((enq) =>
          enq.id === enquiryId ? { ...enq, status: newStatus } : enq
        )
      );
      showAlert('success', `Enquiry marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to update enquiry status.');
    }
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async (id) => {
    if (!window.confirm('Delete this enquiry record?')) return;
    try {
      await enquiryAPI.deleteEnquiry(id);
      setEnquiries(enquiries.filter((enq) => enq.id !== id));
      showAlert('success', 'Enquiry removed.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to delete enquiry.');
    }
  };

  // Filtered properties (robust against null or missing fields)
  const filteredProperties = properties.filter((prop) => {
    if (!prop) return false;
    const s = (searchTerm || '').trim().toLowerCase();
    const title = (prop.title || '').toLowerCase();
    const city = (prop.city || '').toLowerCase();
    const address = (prop.address || '').toLowerCase();
    const matchesSearch = !s || title.includes(s) || city.includes(s) || address.includes(s);
    const matchesType =
      typeFilter === 'ALL' ||
      String(prop.property_type || '').toUpperCase() === String(typeFilter).toUpperCase();
    return matchesSearch && matchesType;
  });

  // Filtered enquiries
  const filteredEnquiries = enquiries.filter((enq) => {
    if (enquiryStatusFilter === 'ALL') return true;
    return enq.status === enquiryStatusFilter;
  });

  // Calculate metrics
  const totalValue = properties.reduce(
    (acc, curr) => acc + (parseFloat(curr.price) || 0),
    0
  );
  const pendingEnquiries = enquiries.filter(
    (e) => (e.status || 'PENDING') === 'PENDING'
  ).length;

  return (
    <div className="owner-dashboard">
      {/* Top Navbar */}
      <header className="od-navbar">
        <div className="od-brand">
          <div className="brand-logo">HQ</div>
          <div>
            <h2>HomeQuest</h2>
            <span className="brand-tag">Owner & Seller Portal</span>
          </div>
        </div>

        <div className="od-user-panel">
          <div className="user-info">
            <span className="user-name">
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'Owner'}
            </span>
            <span className="badge role-seller">{user?.email || 'Verified Seller'}</span>
          </div>
          <button className="od-btn-logout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Global Alert */}
      {alert.message && (
        <div className={`od-alert od-alert-${alert.type}`}>{alert.message}</div>
      )}

      {/* Main Container with Sidebar + Content */}
      <div className="od-layout">
        {/* Sidebar Nav */}
        <aside className="od-sidebar">
          <button
            className={`od-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span>Dashboard Overview</span>
          </button>

          <button
            className={`od-nav-item ${activeSection === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveSection('properties')}
          >
            <span>My Properties</span>
            <span className="counter-pill">{properties.length}</span>
          </button>

          <button
            className={`od-nav-item ${activeSection === 'enquiries' ? 'active' : ''}`}
            onClick={() => setActiveSection('enquiries')}
          >
            <span>Client Enquiries</span>
            {pendingEnquiries > 0 && (
              <span className="counter-pill pill-alert">{pendingEnquiries}</span>
            )}
          </button>

          <button
            className={`od-nav-item ${activeSection === 'tours' ? 'active' : ''}`}
            onClick={() => setActiveSection('tours')}
          >
            <span>Visit Schedule</span>
          </button>

          <button
            className={`od-nav-item ${activeSection === 'add' ? 'active' : ''}`}
            onClick={() => {
              handleResetForm();
              setActiveSection('add');
            }}
          >
            <span>{editingProperty ? 'Edit Property' : '+ Add New Listing'}</span>
          </button>
        </aside>

        {/* Content Body */}
        <main className="od-content">
          {/* 1. OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <div className="od-section">
              <div className="od-section-header">
                <div>
                  <h1 className="section-title">
                    Welcome back, {user?.first_name || user?.username}!
                  </h1>
                  <p className="section-desc">
                    Here is a summary of your property listings and buyer enquiries.
                  </p>
                </div>
                <button
                  className="od-primary-btn"
                  onClick={() => {
                    handleResetForm();
                    setActiveSection('add');
                  }}
                >
                  + Add New Property
                </button>
              </div>

              {/* Stats Grid */}
              <div className="od-stats-grid">
                <div className="stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Active Listings</span>
                    <span className="stat-number">{properties.length}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Total Enquiries</span>
                    <span className="stat-number">{enquiries.length}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Pending Responses</span>
                    <span className="stat-number">{pendingEnquiries}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Portfolio Value</span>
                    <span className="stat-number">
                      ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Properties & Enquiries Overview */}
              <div className="overview-split">
                <div className="overview-box">
                  <div className="box-header">
                    <h3>Recent Properties</h3>
                    <button
                      className="link-btn"
                      onClick={() => setActiveSection('properties')}
                    >
                      View All →
                    </button>
                  </div>
                  {properties.length === 0 ? (
                    <div className="empty-state">
                      <p>You haven't listed any properties yet.</p>
                      <button
                        className="od-primary-btn small"
                        onClick={() => {
                          handleResetForm();
                          setActiveSection('add');
                        }}
                      >
                        Create Your First Listing
                      </button>
                    </div>
                  ) : (
                    <div className="mini-prop-list">
                      {properties.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="mini-prop-card"
                          onClick={() => setViewingProperty(p)}
                          title="Click to view full property details & photo gallery"
                        >
                          <img
                            src={getPropertyImageUrl(p)}
                            alt={p.title}
                            className="mini-thumb"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPropertyLightbox(p);
                            }}
                            title="Click to view full image"
                            style={{ cursor: 'zoom-in' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                            }}
                          />
                          <div className="mini-info">
                            <h4>{p.title}</h4>
                            <span className="mini-meta">
                              {formatTitleCase(p.city)} &bull; ₹{parseFloat(p.price || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="mini-badge">{formatPropertyType(p.property_type)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="overview-box">
                  <div className="box-header">
                    <h3>Recent Client Enquiries</h3>
                    <button
                      className="link-btn"
                      onClick={() => setActiveSection('enquiries')}
                    >
                      View All →
                    </button>
                  </div>
                  {enquiries.length === 0 ? (
                    <div className="empty-state">
                      <p>No client enquiries received yet.</p>
                    </div>
                  ) : (
                    <div className="mini-enq-list">
                      {enquiries.slice(0, 3).map((e) => (
                        <div key={e.id} className="mini-enq-card">
                          <div className="mini-enq-header">
                            <div>
                              <strong>{e.name}</strong>
                              {e.message?.includes('AI Express Interest') && (
                                <span className="ai-inquiry-tag" style={{ marginLeft: '6px' }}>AI Express</span>
                              )}
                            </div>
                            <span className={`status-pill status-${(e.status || 'pending').toLowerCase()}`}>
                              {e.status || 'PENDING'}
                            </span>
                          </div>
                          <p className="mini-msg">"{e.message?.replace(/^\[.*?\]\n?/, '')}"</p>
                          <span className="mini-date">
                            Property: {e.property_title || 'Listing #' + e.property}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. MY PROPERTIES SECTION */}
          {activeSection === 'properties' && (
            <div className="od-section">
              <div className="od-section-header">
                <div>
                  <h1 className="section-title">My Properties</h1>
                  <p className="section-desc">Manage, edit, or remove properties you have listed.</p>
                </div>
                <button
                  className="od-primary-btn"
                  onClick={() => {
                    handleResetForm();
                    setActiveSection('add');
                  }}
                >
                  + Add Property
                </button>
              </div>

              {/* Filters */}
              <div className="filter-bar">
                <input
                  type="text"
                  placeholder="Search by title, city, or address..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="select-input"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="loading-state">Loading your properties...</div>
              ) : filteredProperties.length === 0 ? (
                <div className="empty-state-card">
                  <span className="empty-icon">[ ]</span>
                  <h3>No Properties Found</h3>
                  <p>
                    {searchTerm || typeFilter !== 'ALL'
                      ? 'No listings match your search criteria.'
                      : 'You have not added any properties to your portfolio yet.'}
                  </p>
                  <button
                    className="od-primary-btn"
                    onClick={() => {
                      handleResetForm();
                      setActiveSection('add');
                    }}
                  >
                    Add Your First Property
                  </button>
                </div>
              ) : (
                <div className="properties-grid">
                  {filteredProperties.map((prop) => (
                    <div
                      key={prop.id}
                      className="property-card"
                      onClick={() => setViewingProperty(prop)}
                      title="Click to view full property details & photo gallery"
                    >
                      <div
                        className="prop-img-container"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPropertyLightbox(prop);
                        }}
                        title="Click image to view full photo"
                        style={{ cursor: 'zoom-in' }}
                      >
                        <img
                          src={getPropertyImageUrl(prop)}
                          alt={prop.title}
                          className="prop-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                          }}
                        />
                        <span className="prop-type-tag">{formatPropertyType(prop.property_type)}</span>
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(15, 23, 42, 0.72)',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.55rem',
                            borderRadius: '9999px',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          🔍 View Photo
                        </span>
                        <span className="prop-price-badge">
                          ₹{parseFloat(prop.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="prop-body">
                        <h3 className="prop-title">{prop.title}</h3>
                        <p className="prop-location">
                          {formatTitleCase(prop.city)}{prop.state ? `, ${formatTitleCase(prop.state)}` : ''}
                        </p>
                        {prop.address && <p className="prop-address">{prop.address}</p>}

                        <div className="prop-features">
                          {prop.sub_type && (
                            <span style={{ background: '#dbeafe', color: '#002f34', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.74rem' }}>
                              {prop.sub_type}
                            </span>
                          )}
                          {prop.property_type !== 'PLOT' && prop.bhk && <span>{prop.bhk} BHK</span>}
                          {prop.property_type !== 'PLOT' && prop.bathrooms && <span>{prop.bathrooms} Baths</span>}
                          {prop.property_type !== 'PLOT' && prop.furnishing && <span>{prop.furnishing}</span>}
                          {(prop.area_sqft || prop.area) && (
                            <span>{Number(prop.area_sqft || prop.area).toLocaleString('en-IN')} sq.ft</span>
                          )}
                          {prop.gallery_images && prop.gallery_images.length > 0 && (
                            <span>📷 {1 + prop.gallery_images.length} Photos</span>
                          )}
                          <span className="enquiry-tag">
                            {prop.enquiry_count || 0} Enquiries
                          </span>
                        </div>

                        {prop.description && (
                          <p className="prop-desc-snippet">{prop.description}</p>
                        )}

                        <div className="prop-card-actions">
                          <button
                            type="button"
                            className="btn-action btn-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingProperty(prop);
                            }}
                          >
                            👁 View Details
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(prop);
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProperty(prop.id, prop.title);
                            }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. ADD / EDIT PROPERTY FORM */}
          {activeSection === 'add' && (
            <div className="od-section">
              <div className="od-section-header">
                <div>
                  <h1 className="section-title">
                    {editingProperty ? 'Edit Property Listing' : 'Add New Property Listing'}
                  </h1>
                  <p className="section-desc">
                    {editingProperty
                      ? `Updating details for "${editingProperty.title}"`
                      : 'Fill in the property details to publish it on the marketplace.'}
                  </p>
                </div>
                {editingProperty && (
                  <button
                    className="od-secondary-btn"
                    onClick={() => {
                      handleResetForm();
                      setActiveSection('properties');
                    }}
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <form className="od-form-card" onSubmit={handlePropertySubmit}>
                <div className="form-row">
                  <div className="form-field flex-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ margin: 0 }}>Ad title / Property Title *</label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{(propertyForm.title || '').length} / 70</span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={70}
                      placeholder="e.g. Modern Sunset Luxury Villa in Kannur"
                      value={propertyForm.title}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, title: e.target.value })
                      }
                    />
                    <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                      Mention the key features of your property (e.g. brand, model, age, type)
                    </span>
                  </div>
                </div>

                {/* OLX-Style "INCLUDE SOME DETAILS" Attributes Card */}
                <PropertyAttributesForm
                  formState={propertyForm}
                  onChange={handlePropertyFormChange}
                />

                <div className="form-row">
                  <div className="form-field flex-1">
                    <label>Price (₹ INR / Total Value) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 7500000"
                      value={propertyForm.price}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, price: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field flex-2">
                    <label>Street Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 742 Evergreen Terrace"
                      value={propertyForm.address}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, address: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field flex-1">
                    <label>City / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kannur, Kochi, Kozhikode"
                      value={propertyForm.city}
                      onChange={handleCityInputChange}
                    />
                  </div>
                </div>

                {/* Quick Kerala District Benchmark Selectors */}
                <div className="kerala-quick-loc-strip">
                  <span className="quick-loc-label">Click Location Preset:</span>
                  <div className="quick-loc-pills">
                    {KERALA_LOCATIONS.filter((l) => l.isPopular).map((loc) => {
                      const isSelected = (propertyForm.city || '').toLowerCase().includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          className={`btn-loc-pill ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectKeralaLocation(loc)}
                        >
                          📍 {loc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>State / Province</label>
                    <input
                      type="text"
                      placeholder="Kerala"
                      value={propertyForm.state || 'Kerala'}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, state: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label>Zip / Postal Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 670001"
                      value={propertyForm.zip_code}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, zip_code: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <div className="label-with-gps">
                      <label>GPS Latitude (Leaflet Map)</label>
                      <button
                        type="button"
                        className={`btn-current-gps ${locatingGps ? 'locating' : ''}`}
                        onClick={handleDetectCurrentLocation}
                        disabled={locatingGps}
                        title="Click to detect current device GPS coordinates"
                      >
                        {locatingGps ? 'Detecting GPS...' : '🎯 Click for Current Location (GPS)'}
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 11.874500"
                      value={propertyForm.latitude || ''}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, latitude: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label>GPS Longitude (Leaflet Map)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 75.370400"
                      value={propertyForm.longitude || ''}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, longitude: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* AI Price & Area Increment Valuation Advisor */}
                <AIPriceAdvisor
                  propertyData={propertyForm}
                  onLocationChange={(locData) =>
                    setPropertyForm((prev) => ({ ...prev, ...locData }))
                  }
                  onApplyPrice={(suggestedPrice) =>
                    setPropertyForm((prev) => ({ ...prev, price: suggestedPrice }))
                  }
                />

                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ margin: 0 }}>Description *</label>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{(propertyForm.description || '').length} / 4096</span>
                  </div>
                  <textarea
                    rows="4"
                    maxLength={4096}
                    placeholder="Include condition, features and reason for selling..."
                    value={propertyForm.description}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, description: e.target.value })
                    }
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Highlight condition, luxury fittings, nearby access, and why this property is unique
                  </span>
                </div>

                {/* ── MULTI-IMAGE UPLOADER SECTION (COVER PHOTO + 2+ ADDITIONAL PHOTO FIELDS) ── */}
                <div className="property-photos-uploader-card">
                  <div className="photos-section-header">
                    <div>
                      <h3 className="section-title">
                        📸 Property Photos & Room Gallery (Add 2+ Photos)
                      </h3>
                      <p className="section-subtitle">
                        Add high-quality photos for each room or area with custom descriptions (e.g. Master Bedroom, Living Room, Modular Kitchen) to attract more buyers.
                      </p>
                    </div>
                    <div className="batch-actions">
                      <input
                        type="file"
                        id="batch-gallery-input"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleBatchPhotosSelect}
                      />
                      <button
                        type="button"
                        className="btn-batch-upload"
                        onClick={() => document.getElementById('batch-gallery-input').click()}
                        title="Select 2 or more photo files simultaneously from your device"
                      >
                        📁 Batch Select Multiple Images
                      </button>
                      <button
                        type="button"
                        className="btn-add-slot"
                        onClick={handleAddSlot}
                        title="Add another photo field"
                      >
                        ➕ Add Photo Field
                      </button>
                    </div>
                  </div>

                  {/* SLOT 1: COVER / MAIN PROPERTY PHOTO */}
                  <div className="photo-slot-card hero-slot">
                    <div className="slot-badge-bar">
                      <span className="slot-num-badge main">Photo 1 — Cover / Primary Property Photo *</span>
                      <span className="slot-role-tag">Featured Listing Hero</span>
                    </div>
                    <div className="slot-body">
                      <div className="slot-left-col">
                        <input
                          type="file"
                          accept="image/*"
                          id="property-img-upload"
                          className="file-input"
                          onChange={handleImageChange}
                        />
                        <label htmlFor="property-img-upload" className={`slot-file-btn ${selectedImage ? 'has-file' : ''}`}>
                          {selectedImage ? `📁 ${selectedImage.name}` : '📷 Choose Cover Photo or Drag Here'}
                        </label>

                        {/* Preset High-Res Kerala Sample Photos */}
                        <div className="presets-row">
                          <span className="presets-label">Or sample:</span>
                          {PRESET_PROPERTY_IMAGES.map((preset, idx) => {
                            const presetLabel = preset.label || preset.name || `Sample ${idx + 1}`;
                            return (
                              <button
                                key={presetLabel}
                                type="button"
                                className={`preset-pill ${imagePreview === preset.url ? 'active' : ''}`}
                                onClick={() => handleSelectPresetImage(preset)}
                              >
                                {presetLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {imagePreview ? (
                        <div
                          className="slot-thumb-preview"
                          onClick={() =>
                            setLightboxData({
                              images: [{ url: imagePreview, description: propertyForm.title || 'Cover Photo Preview' }],
                              index: 0,
                            })
                          }
                          title="Click to display full uncropped image"
                        >
                          <img src={imagePreview} alt="Cover Preview" />
                          <span className="zoom-hint">🔍 View Full</span>
                        </div>
                      ) : (
                        <div className="slot-thumb-placeholder">
                          <span>No cover photo chosen</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SLOTS 2, 3, 4, ...: DEDICATED ADDITIONAL PHOTO FIELDS */}
                  <div className="additional-slots-grid">
                    {additionalPhotos.map((item, idx) => {
                      const slotNum = idx + 2;
                      return (
                        <div key={item.id || idx} className="photo-slot-card">
                          <div className="slot-badge-bar">
                            <span className="slot-num-badge">Photo {slotNum}: Additional Room / Feature</span>
                            <div className="slot-header-actions">
                              {item.file && (
                                <button
                                  type="button"
                                  className="btn-slot-clear"
                                  onClick={() => handleClearSlot(idx)}
                                  title="Clear photo from this slot"
                                >
                                  Clear Photo
                                </button>
                              )}
                              {additionalPhotos.length > 2 && (
                                <button
                                  type="button"
                                  className="btn-slot-remove"
                                  onClick={() => handleRemoveSlot(idx)}
                                  title="Remove this photo field"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="slot-body">
                            <div className="slot-left-col">
                              <input
                                type="file"
                                accept="image/*"
                                id={`slot-file-${idx}`}
                                className="file-input"
                                onChange={(e) => handleSlotFileChange(idx, e.target.files[0])}
                              />
                              <label htmlFor={`slot-file-${idx}`} className={`slot-file-btn ${item.file ? 'has-file' : ''}`}>
                                {item.file ? `📁 ${item.file.name}` : `📷 Choose Photo ${slotNum}`}
                              </label>

                              <div className="desc-input-group">
                                <label className="desc-label">Photo Description / Room Caption:</label>
                                <input
                                  type="text"
                                  className="slot-desc-input"
                                  placeholder="e.g. Master Bedroom, Living Room, Modular Kitchen"
                                  value={item.description}
                                  onChange={(e) => handleUpdatePhotoDescription(idx, e.target.value)}
                                />
                                <div className="quick-room-chips">
                                  {['Living Room', 'Master Bed', 'Modular Kitchen', 'Balcony', 'Bathroom', 'Exterior View'].map((chip) => (
                                    <button
                                      key={chip}
                                      type="button"
                                      className="room-chip"
                                      onClick={() => handleUpdatePhotoDescription(idx, chip)}
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {item.preview ? (
                              <div
                                className="slot-thumb-preview"
                                onClick={() =>
                                  setLightboxData({
                                    images: additionalPhotos
                                      .filter((p) => p.preview)
                                      .map((p, pIdx) => ({
                                        url: p.preview,
                                        description: p.description || `Photo ${pIdx + 2}`,
                                      })),
                                    index: additionalPhotos.filter((p) => p.preview).findIndex((p) => p.id === item.id),
                                  })
                                }
                                title="Click to display full uncropped image"
                              >
                                <img src={item.preview} alt={`Photo ${slotNum}`} />
                                <span className="zoom-hint">🔍 View Full</span>
                              </div>
                            ) : (
                              <div className="slot-thumb-placeholder">
                                <span>No photo chosen</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="slots-bottom-bar">
                    <button
                      type="button"
                      className="btn-add-another-slot"
                      onClick={handleAddSlot}
                    >
                      ➕ Add Another Image Field (Photo {additionalPhotos.length + 2})
                    </button>
                    <span className="slots-counter">
                      {additionalPhotos.filter((p) => p.file).length + (selectedImage ? 1 : 0)} photos selected
                    </span>
                  </div>

                  {/* If editing an existing property with existing gallery photos */}
                  {editingProperty && editingProperty.gallery_images && editingProperty.gallery_images.length > 0 && (
                    <div className="saved-gallery-box">
                      <label className="saved-gallery-label">
                        Current Saved Gallery Photos ({editingProperty.gallery_images.length}):
                      </label>
                      <div className="saved-gallery-grid">
                        {editingProperty.gallery_images.map((gImg, gIdx) => (
                          <div key={gImg.id} className="saved-photo-item">
                            <img
                              src={getPropertyImageUrl(gImg.image, editingProperty.property_type)}
                              alt={gImg.description || 'Gallery Photo'}
                              onClick={() =>
                                setLightboxData({
                                  images: editingProperty.gallery_images.map((x, xIdx) => ({
                                    url: getPropertyImageUrl(x.image, editingProperty.property_type),
                                    description: x.description || `Photo ${xIdx + 1}`,
                                  })),
                                  index: gIdx,
                                })
                              }
                              title="Click to display full image"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = CATEGORY_SAMPLE_IMAGES.DEFAULT;
                              }}
                            />
                            <div className="saved-photo-caption">
                              📷 {gImg.description || 'Gallery Photo'}
                            </div>
                            <button
                              type="button"
                              className="saved-photo-delete"
                              onClick={async () => {
                                if (window.confirm('Delete this photo?')) {
                                  await propertyAPI.deletePropertyImage(editingProperty.id, gImg.id);
                                  const updatedGallery = editingProperty.gallery_images.filter((x) => x.id !== gImg.id);
                                  setEditingProperty({ ...editingProperty, gallery_images: updatedGallery });
                                  setProperties(properties.map((p) => (p.id === editingProperty.id ? { ...p, gallery_images: updatedGallery } : p)));
                                }
                              }}
                            >
                              ✕ Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="od-secondary-btn"
                    onClick={() => {
                      handleResetForm();
                      setActiveSection('properties');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="od-primary-btn" disabled={submitting}>
                    {submitting
                      ? 'Saving...'
                      : editingProperty
                      ? 'Update Property'
                      : 'Publish Property Listing'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 4. ENQUIRIES SECTION */}
          {activeSection === 'enquiries' && (
            <div className="od-section">
              <div className="od-section-header">
                <div>
                  <h1 className="section-title">Client Inquiries</h1>
                  <p className="section-desc">
                    Manage buyer interest, update statuses, and follow up with prospective clients.
                  </p>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="status-filter-tabs">
                {['ALL', 'PENDING', 'CONTACTED', 'RESOLVED'].map((status) => (
                  <button
                    key={status}
                    className={`status-tab-btn ${
                      enquiryStatusFilter === status ? 'active' : ''
                    }`}
                    onClick={() => setEnquiryStatusFilter(status)}
                  >
                    {status}
                    <span className="tab-count">
                      {status === 'ALL'
                        ? enquiries.length
                        : enquiries.filter((e) => (e.status || 'PENDING') === status).length}
                    </span>
                  </button>
                ))}
              </div>

              {filteredEnquiries.length === 0 ? (
                <div className="empty-state-card">
                  <span className="empty-icon">[ ]</span>
                  <h3>No Inquiries Found</h3>
                  <p>There are no client inquiries under the selected filter.</p>
                </div>
              ) : (
                <div className="enquiries-table-container">
                  <table className="od-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Property</th>
                        <th>Message</th>
                        <th>Received</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnquiries.map((enq) => (
                        <tr key={enq.id}>
                          <td>
                            <div className="client-cell">
                              <div>
                                <strong>{enq.name}</strong>
                                {enq.message?.includes('AI Express Interest') && (
                                  <span className="ai-inquiry-tag">AI Express Buyer</span>
                                )}
                              </div>
                              <a href={`mailto:${enq.email}`} className="cell-link">
                                {enq.email}
                              </a>
                              {enq.phone_number && (
                                <a href={`tel:${enq.phone_number}`} className="cell-link">
                                  {enq.phone_number}
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="prop-name-tag">
                              {enq.property_title || `Listing #${enq.property}`}
                            </span>
                            {enq.property_city && (
                              <span className="prop-city-sub">{enq.property_city}</span>
                            )}
                          </td>
                          <td className="message-cell">
                            <p className="enq-msg-text">"{enq.message?.replace(/^\[.*?\]\n?/, '')}"</p>
                          </td>
                          <td>
                            <span className="date-cell">
                              {new Date(enq.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <select
                              className={`status-select status-${(enq.status || 'pending').toLowerCase()}`}
                              value={enq.status || 'PENDING'}
                              onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="CONTACTED">Contacted</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                          </td>
                          <td>
                            <button
                              className="btn-icon-delete"
                              title="Delete inquiry"
                              onClick={() => handleDeleteEnquiry(enq.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. TOURS & VISIT SCHEDULE SECTION */}
          {activeSection === 'tours' && (
            <div className="od-section od-tours-section">
              <VisitScheduleManager
                user={user}
                onClose={() => setActiveSection('overview')}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── PROPERTY DETAIL & GALLERY VIEW MODAL ── */}
      {viewingProperty && (
        <PropertyDetailModal
          property={viewingProperty}
          onClose={() => setViewingProperty(null)}
          onEdit={(p) => {
            setViewingProperty(null);
            handleEditClick(p);
          }}
          onPropertyUpdated={(updatedProp) => {
            setViewingProperty(updatedProp);
            setProperties((prev) =>
              prev.map((item) => (item.id === updatedProp.id ? updatedProp : item))
            );
          }}
        />
      )}

      {/* ── FULL-SCREEN IMAGE LIGHTBOX ── */}
      {lightboxData && (
        <ImageLightbox
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
}
