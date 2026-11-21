import React, { useState, useEffect } from 'react';
import { propertyAPI, enquiryAPI } from './api';
import AIPriceAdvisor from './AIPriceAdvisor';
import './OwnerDashboard.css';

const PROPERTY_TYPES = [
  { value: 'BUILDING', label: 'Building' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'PLOT', label: 'Plot' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
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
  const [propertyForm, setPropertyForm] = useState({
    title: '',
    property_type: 'APARTMENT',
    price: '',
    area_sqft: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    description: '',
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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [propsData, enqData] = await Promise.all([
        propertyAPI.getMyProperties(),
        enquiryAPI.getMyEnquiries(),
      ]);
      setProperties(Array.isArray(propsData) ? propsData : propsData.results || []);
      setEnquiries(Array.isArray(enqData) ? enqData : enqData.results || []);
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
    setPropertyForm({
      title: prop.title || '',
      property_type: prop.property_type || 'APARTMENT',
      price: prop.price || '',
      area_sqft: prop.area_sqft || '',
      address: prop.address || '',
      city: prop.city || '',
      state: prop.state || '',
      zip_code: prop.zip_code || '',
      description: prop.description || '',
      latitude: prop.latitude || '',
      longitude: prop.longitude || '',
    });
    setImagePreview(prop.image || null);
    setSelectedImage(null);
    setActiveSection('add');
  };

  // Reset Add/Edit Form
  const handleResetForm = () => {
    setEditingProperty(null);
    setPropertyForm({
      title: '',
      property_type: 'APARTMENT',
      price: '',
      area_sqft: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      description: '',
      latitude: '',
      longitude: '',
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Auto-detect GPS coordinates
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      showAlert('error', 'Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPropertyForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        showAlert('success', 'GPS coordinates fetched from device!');
      },
      (err) => {
        showAlert('error', 'Could not detect location: ' + err.message);
      }
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
    Object.keys(propertyForm).forEach((key) => {
      if (propertyForm[key] !== null && propertyForm[key] !== undefined) {
        formData.append(key, propertyForm[key]);
      }
    });

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      if (editingProperty) {
        await propertyAPI.updateProperty(editingProperty.id, formData);
        showAlert('success', 'Property listing updated successfully!');
      } else {
        await propertyAPI.createProperty(formData);
        showAlert('success', 'New property listed successfully!');
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

  // Filtered properties
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch =
      prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prop.address && prop.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || prop.property_type === typeFilter;
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
          <div className="brand-logo">🏡</div>
          <div>
            <h2>HomeQuest</h2>
            <span className="brand-tag">Owner & Seller Portal</span>
          </div>
        </div>

        <div className="od-user-panel">
          <div className="user-info">
            <span className="user-name">
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
            </span>
            <span className="badge role-seller">Verified Seller</span>
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
            <span className="icon">📊</span>
            <span>Dashboard Overview</span>
          </button>

          <button
            className={`od-nav-item ${activeSection === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveSection('properties')}
          >
            <span className="icon">🏢</span>
            <span>My Properties</span>
            <span className="counter-pill">{properties.length}</span>
          </button>

          <button
            className={`od-nav-item ${activeSection === 'enquiries' ? 'active' : ''}`}
            onClick={() => setActiveSection('enquiries')}
          >
            <span className="icon">📩</span>
            <span>Client Enquiries</span>
            {pendingEnquiries > 0 && (
              <span className="counter-pill pill-alert">{pendingEnquiries}</span>
            )}
          </button>

          <button
            className={`od-nav-item ${activeSection === 'add' ? 'active' : ''}`}
            onClick={() => {
              handleResetForm();
              setActiveSection('add');
            }}
          >
            <span className="icon">➕</span>
            <span>{editingProperty ? 'Edit Property' : 'Add New Listing'}</span>
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
                    Welcome back, {user?.first_name || user?.username}! 👋
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
                  <div className="stat-icon-wrapper bg-blue">🏢</div>
                  <div className="stat-content">
                    <span className="stat-label">Active Listings</span>
                    <span className="stat-number">{properties.length}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper bg-green">📩</div>
                  <div className="stat-content">
                    <span className="stat-label">Total Enquiries</span>
                    <span className="stat-number">{enquiries.length}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper bg-orange">⏳</div>
                  <div className="stat-content">
                    <span className="stat-label">Pending Responses</span>
                    <span className="stat-number">{pendingEnquiries}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper bg-purple">💰</div>
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
                      View All &rarr;
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
                        <div key={p.id} className="mini-prop-card">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'}
                            alt={p.title}
                            className="mini-thumb"
                          />
                          <div className="mini-info">
                            <h4>{p.title}</h4>
                            <span className="mini-meta">
                              {p.city} &bull; ₹{parseFloat(p.price).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="mini-badge">{p.property_type}</span>
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
                      View All &rarr;
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
                            <strong>{e.name}</strong>
                            <span className={`status-pill status-${(e.status || 'pending').toLowerCase()}`}>
                              {e.status || 'PENDING'}
                            </span>
                          </div>
                          <p className="mini-msg">"{e.message}"</p>
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
                  <p className="section-desc">Manage, edit, or remove your listed listings.</p>
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
                  placeholder="🔍 Search by title, city, or address..."
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
                  <span className="empty-icon">🏠</span>
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
                    <div key={prop.id} className="property-card">
                      <div className="prop-img-container">
                        <img
                          src={
                            prop.image ||
                            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={prop.title}
                          className="prop-img"
                        />
                        <span className="prop-type-tag">{prop.property_type}</span>
                        <span className="prop-price-badge">
                          ₹{parseFloat(prop.price).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="prop-body">
                        <h3 className="prop-title">{prop.title}</h3>
                        <p className="prop-location">
                          📍 {prop.city}{prop.state ? `, ${prop.state}` : ''}
                        </p>
                        <p className="prop-address">{prop.address}</p>

                        <div className="prop-features">
                          <span>📐 {prop.area_sqft || prop.area || 'N/A'} sqft</span>
                          <span className="enquiry-tag">
                            📩 {prop.enquiry_count || 0} Enquiries
                          </span>
                        </div>

                        {prop.description && (
                          <p className="prop-desc-snippet">{prop.description}</p>
                        )}

                        <div className="prop-card-actions">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleEditClick(prop)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => handleDeleteProperty(prop.id, prop.title)}
                          >
                            🗑️ Delete
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
                  <div className="form-field flex-2">
                    <label>Property Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Modern Sunset Luxury Villa"
                      value={propertyForm.title}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field flex-1">
                    <label>Property Type *</label>
                    <select
                      value={propertyForm.property_type}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, property_type: e.target.value })
                      }
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
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

                  <div className="form-field">
                    <label>Area (Square Feet) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1600"
                      value={propertyForm.area_sqft}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, area_sqft: e.target.value })
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
                    <label>City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Springfield"
                      value={propertyForm.city}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, city: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>State / Province</label>
                    <input
                      type="text"
                      placeholder="e.g. Illinois"
                      value={propertyForm.state}
                      onChange={(e) =>
                        setPropertyForm({ ...propertyForm, state: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label>Zip / Postal Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 62704"
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
                      <button type="button" className="btn-auto-gps" onClick={handleDetectGPS}>
                        📍 Auto-Detect GPS
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 19.076090"
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
                      placeholder="e.g. 76.299900"
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
                  onApplyPrice={(suggestedPrice) =>
                    setPropertyForm((prev) => ({ ...prev, price: suggestedPrice }))
                  }
                />

                <div className="form-field">
                  <label>Description</label>
                  <textarea
                    rows="4"
                    placeholder="Highlight features: bedrooms, amenities, neighborhood, views..."
                    value={propertyForm.description}
                    onChange={(e) =>
                      setPropertyForm({ ...propertyForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Property Photo</label>
                  <div className="file-upload-box">
                    <input
                      type="file"
                      accept="image/*"
                      id="property-img-upload"
                      className="file-input"
                      onChange={handleImageChange}
                    />
                    <label htmlFor="property-img-upload" className="file-upload-label">
                      📁 {selectedImage ? selectedImage.name : 'Choose Image File or Drag Here'}
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="preview-container">
                      <img src={imagePreview} alt="Preview" className="img-preview" />
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
                  <span className="empty-icon">📬</span>
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
                              <strong>{enq.name}</strong>
                              <a href={`mailto:${enq.email}`} className="cell-link">
                                ✉️ {enq.email}
                              </a>
                              {enq.phone_number && (
                                <a href={`tel:${enq.phone_number}`} className="cell-link">
                                  📞 {enq.phone_number}
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
                            <p className="enq-msg-text">"{enq.message}"</p>
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
                              🗑️
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
        </main>
      </div>
    </div>
  );
}
