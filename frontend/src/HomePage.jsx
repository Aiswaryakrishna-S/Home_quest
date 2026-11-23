import React, { useState, useEffect } from 'react';
import { propertyAPI, enquiryAPI, getPropertyImageUrl, CATEGORY_SAMPLE_IMAGES } from './api';
import LocationMap from './LocationMap';
import MiniMapView from './MiniMapView';
import AIExpressInterestModal from './AIExpressInterestModal';
import PropertyImageModal from './PropertyImageModal';
import PropertyBuyModal from './PropertyBuyModal';
import './HomePage.css';

const PROPERTY_TYPES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'APARTMENT', label: 'Apartments' },
  { value: 'BUILDING', label: 'Buildings' },
  { value: 'RENTAL', label: 'Rentals' },
  { value: 'PLOT', label: 'Plots' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
];

export default function HomePage({
  user,
  onNavigateAuth,
  onNavigateDashboard,
  onLogout,
}) {
  const [navSearch, setNavSearch] = useState('');
  const [heroCity, setHeroCity] = useState('');
  const [heroType, setHeroType] = useState('ALL');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // GPS & Live Map States
  const [userCoords, setUserCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [heroTab, setHeroTab] = useState('map'); // 'map' | 'image'

  // Inquire modal state
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [aiInterestProperty, setAiInterestProperty] = useState(null);
  const [galleryProperty, setGalleryProperty] = useState(null);
  const [buyProperty, setBuyProperty] = useState(null);
  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    message: '',
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquiryStatus, setEnquiryStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await propertyAPI.getAllProperties();
      setProperties(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching public properties:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter properties based on search query or category
  const filteredProperties = properties.filter((p) => {
    const term = (navSearch || heroCity).toLowerCase();
    const matchLocation =
      p.city?.toLowerCase().includes(term) ||
      p.title?.toLowerCase().includes(term) ||
      p.address?.toLowerCase().includes(term) ||
      p.state?.toLowerCase().includes(term);

    const matchType = heroType === 'ALL' || p.property_type === heroType;
    return matchLocation && matchType;
  });

  const handleOpenEnquiry = (property) => {
    setSelectedProperty(property);
    setEnquiryStatus({ type: '', text: '' });
    setEnquiryForm({
      name: user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      message: `Hi, I am interested in "${property.title}" located in ${property.city}. Please share more details.`,
    });
  };

  const handleLocationDetected = (detectedCity, coords, nearbyList) => {
    if (detectedCity) {
      setHeroCity(detectedCity);
    }
    if (nearbyList && nearbyList.length > 0) {
      setProperties(nearbyList);
    }
  };

  const handleLocateNearMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);
        setHeroTab('map');

        // Fetch proximity-ordered listings from backend
        try {
          const nearbyData = await propertyAPI.getAllProperties({ lat: latitude, lng: longitude });
          const list = Array.isArray(nearbyData) ? nearbyData : nearbyData.results || [];
          if (list.length > 0) {
            setProperties(list);
          }
        } catch (e) {
          console.warn('Backend geo fetch error:', e);
        }

        // Reverse geocode city for search inputs
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`
          );
          const data = await res.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.suburb ||
            data?.address?.state ||
            '';
          if (city) {
            setNavSearch(city);
            setHeroCity(city);
          }
        } catch {
          // ignore
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Could not acquire location: ' + err.message + '. Please enable browser location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCloseEnquiry = () => {
    setSelectedProperty(null);
    setEnquiryStatus({ type: '', text: '' });
  };

  const handleSendEnquiry = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setSubmittingEnquiry(true);
    try {
      await enquiryAPI.createEnquiry({
        property: selectedProperty.id,
        name: enquiryForm.name,
        email: enquiryForm.email,
        phone_number: enquiryForm.phone_number,
        message: enquiryForm.message,
      });
      setEnquiryStatus({
        type: 'success',
        text: 'Your enquiry was sent directly to the property owner!',
      });
      setTimeout(() => {
        handleCloseEnquiry();
      }, 2500);
    } catch (err) {
      console.error(err);
      setEnquiryStatus({
        type: 'error',
        text: 'Failed to send enquiry. Please check your contact information.',
      });
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  return (
    <div className="home-page">
      {/* ── TOP NAVBAR ── */}
      <header className="hp-navbar">
        <div className="hp-nav-container">
          <div className="hp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="hp-logo-icon">🏡</span>
            <div className="hp-brand-text">
              <span className="hp-brand-name">HomeQuest</span>
              <span className="hp-brand-tagline">Real Estate & Living</span>
            </div>
          </div>

          {/* Search bar inside Navbar */}
          <div className="hp-nav-search">
            <span className="hp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by city, title, or address..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
            />
            {navSearch && (
              <button className="hp-clear-btn" onClick={() => setNavSearch('')}>
                ✕
              </button>
            )}
            <button
              type="button"
              className={`hp-nav-nearme-btn ${isLocating ? 'locating' : ''}`}
              onClick={handleLocateNearMe}
              title="Locate properties near your GPS position"
            >
              {isLocating ? '⏳' : '📍 Near Me'}
            </button>
          </div>

          {/* Nav links & Auth buttons */}
          <nav className="hp-nav-actions">
            <a href="#location-map" className="hp-nav-link">
              📍 Map View
            </a>
            <a href="#properties-section" className="hp-nav-link">
              Explore Listings
            </a>
            <a href="#why-section" className="hp-nav-link">
              Why Us
            </a>

            {user ? (
              <div className="hp-user-menu">
                {user.role === 'SELLER' || user.role === 'ADMIN' ? (
                  <button
                    className="hp-btn-dashboard"
                    onClick={() => onNavigateDashboard('owner-dashboard')}
                  >
                    🏢 Owner Dashboard
                  </button>
                ) : (
                  <button
                    className="hp-btn-dashboard"
                    onClick={() => onNavigateDashboard('profile')}
                  >
                    👤 My Profile
                  </button>
                )}
                <button className="hp-btn-logout" onClick={onLogout}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="hp-auth-btns">
                <button
                  className="hp-btn-login"
                  onClick={() => onNavigateAuth('login')}
                >
                  Log In
                </button>
                <button
                  className="hp-btn-register"
                  onClick={() => onNavigateAuth('register')}
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="hp-hero">
        <div className="hp-hero-overlay"></div>
        <div className="hp-hero-content">
          <div className="hp-hero-badge">
            <span className="pulse-dot"></span>
            Direct Owner Real Estate Platform
          </div>

          <h1 className="hp-hero-title">
            Find Your Dream Home With <span className="highlight">Confidence</span>
          </h1>

          <p className="hp-hero-subtitle">
            Browse verified luxury villas, modern apartments, residential plots,
            and rental homes directly from certified property owners without brokerage.
          </p>

          {/* Quick Filter Box in Hero with Near Me Action */}
          <div className="hp-hero-search-box">
            <div className="search-field">
              <div className="label-with-action">
                <label>📍 Location / City</label>
                <button
                  type="button"
                  className={`hero-nearme-pill ${isLocating ? 'locating' : ''}`}
                  onClick={handleLocateNearMe}
                  disabled={isLocating}
                >
                  {isLocating ? '⏳ Locating...' : '🎯 Near Me'}
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. New York, Chicago, Mumbai..."
                value={heroCity}
                onChange={(e) => setHeroCity(e.target.value)}
              />
            </div>

            <div className="search-field">
              <label>🏷️ Property Type</label>
              <select
                value={heroType}
                onChange={(e) => setHeroType(e.target.value)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <a href="#properties-section" className="hp-hero-search-btn">
              🔍 Explore Listings
            </a>
          </div>

          {/* Quick Stats Banner */}
          <div className="hp-hero-stats">
            <div className="hero-stat-item">
              <span className="stat-value">{properties.length || 24}+</span>
              <span className="stat-desc">Active Listings</span>
            </div>
            <div className="stat-separator"></div>
            <div className="hero-stat-item">
              <span className="stat-value">100%</span>
              <span className="stat-desc">Verified Owners</span>
            </div>
            <div className="stat-separator"></div>
            <div className="hero-stat-item">
              <span className="stat-value">0%</span>
              <span className="stat-desc">Middleman Brokerage</span>
            </div>
            <div className="stat-separator"></div>
            <div className="hero-stat-item">
              <span className="stat-value">24/7</span>
              <span className="stat-desc">Instant Email Inquiries</span>
            </div>
          </div>
        </div>

        {/* Hero Right Side: Small Map View with Tab Switcher */}
        <div className="hp-hero-image-wrapper">
          <div className="hero-view-switcher">
            <button
              type="button"
              className={`switch-tab ${heroTab === 'map' ? 'active' : ''}`}
              onClick={() => setHeroTab('map')}
            >
              🗺️ Small Map View
            </button>
            <button
              type="button"
              className={`switch-tab ${heroTab === 'image' ? 'active' : ''}`}
              onClick={() => setHeroTab('image')}
            >
              🏡 Luxury Villa View
            </button>
          </div>

          {heroTab === 'map' ? (
            <MiniMapView
              properties={filteredProperties.length > 0 ? filteredProperties : properties}
              userCoords={userCoords}
              isLocating={isLocating}
              onLocateMe={handleLocateNearMe}
              onSelectProperty={handleOpenEnquiry}
            />
          ) : (
            <div className="hp-hero-card">
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
                alt="HomeQuest Luxury Dream Villa"
                className="hp-hero-main-img"
              />
              <div className="hp-floating-tag tag-top">
                <span className="tag-icon">✨</span>
                <div>
                  <strong>Modern Architecture</strong>
                  <span>Verified Clean Title</span>
                </div>
              </div>
              <div className="hp-floating-tag tag-bottom">
                <span className="tag-icon">🤝</span>
                <div>
                  <strong>Direct Owner Deals</strong>
                  <span>Contact Owners in 1-Click</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PURPOSE & VALUE PILLARS ── */}
      <section className="hp-why-section" id="why-section">
        <div className="hp-section-header">
          <span className="hp-section-tag">PROJECT MISSION</span>
          <h2>The Smarter Way to Buy, Rent & Sell Real Estate</h2>
          <p>
            HomeQuest is built to connect property owners and home seekers directly,
            ensuring transparency, zero unwanted broker fees, and verified credentials.
          </p>
        </div>

        <div className="hp-pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon bg-blue">🏡</div>
            <h3>Diverse Property Portfolio</h3>
            <p>
              From modern luxury apartments and standalone villas to residential plots
              and rental spaces, discover spaces that suit every budget and lifestyle.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon bg-green">🔒</div>
            <h3>Verified Security & OTP Auth</h3>
            <p>
              Users and owners are authenticated using secure 6-digit email OTPs
              and JWT tokens, ensuring safe interactions for everyone.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon bg-purple">⚡</div>
            <h3>Direct Owner Communication</h3>
            <p>
              No annoying brokers or spam calls. Inquire directly on any property
              and communicate directly with the verified owner.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon bg-amber">📊</div>
            <h3>Dedicated Owner Suite</h3>
            <p>
              Property owners get an integrated real-time dashboard to manage listings,
              upload photos, track inquiries, and update response statuses.
            </p>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE LEAFLET LOCATION MAP ── */}
      <LocationMap
        properties={properties}
        onSelectProperty={handleOpenEnquiry}
        onLocationDetected={handleLocationDetected}
      />

      {/* ── FEATURED PROPERTIES LISTINGS ── */}
      <section className="hp-properties-section" id="properties-section">
        <div className="hp-section-header">
          <span className="hp-section-tag">EXPLORE MARKETPLACE</span>
          <h2>Featured Property Listings</h2>
          <p>Hand-picked, high-value properties available for purchase and lease.</p>
        </div>

        {/* Category Pills */}
        <div className="hp-category-pills">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t.value}
              className={`pill-btn ${heroType === t.value ? 'active' : ''}`}
              onClick={() => setHeroType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="hp-loading-box">
            <div className="hp-spinner"></div>
            <p>Loading the latest properties...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="hp-empty-listings">
            <span className="empty-emoji">🏡</span>
            <h3>No Properties Found</h3>
            <p>
              {navSearch || heroCity
                ? `No properties matched "${navSearch || heroCity}". Try clearing the search.`
                : 'No property listings are currently available.'}
            </p>
            {(navSearch || heroCity || heroType !== 'ALL') && (
              <button
                className="hp-btn-reset"
                onClick={() => {
                  setNavSearch('');
                  setHeroCity('');
                  setHeroType('ALL');
                }}
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="hp-properties-grid">
            {filteredProperties.map((prop) => (
              <div key={prop.id} className="hp-property-card">
                <div
                  className="hp-prop-image-box"
                  onClick={() => setGalleryProperty(prop)}
                  title="Click to view photo gallery & high-res image"
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={getPropertyImageUrl(prop)}
                    alt={prop.title}
                    className="hp-prop-img"
                    loading="lazy"
                  />
                  <span className="hp-prop-type-badge">{prop.property_type}</span>
                  <span className="hp-prop-price-tag">
                    {prop.formatted_price || `₹${parseFloat(prop.price).toLocaleString('en-IN')}`}
                  </span>
                  <div className="hp-image-gallery-badge">
                    <span>📷 View Photos</span>
                  </div>
                  {prop.distance_km && (
                    <span className="hp-distance-pill">
                      🚗 {prop.distance_km} km away
                    </span>
                  )}
                </div>

                <div className="hp-prop-details">
                  <h3 className="hp-prop-title">{prop.title}</h3>
                  <p className="hp-prop-location">
                    📍 {prop.city}{prop.state ? `, ${prop.state}` : ''}
                  </p>
                  <p className="hp-prop-address">{prop.address}</p>

                  <div className="hp-prop-specs">
                    <span>📐 {prop.area_sqft || prop.area || 'N/A'} sqft</span>
                    <span>👤 Owner: {prop.seller_name || 'Verified'}</span>
                  </div>

                  {prop.description && (
                    <p className="hp-prop-desc">{prop.description}</p>
                  )}

                  <div className="hp-prop-footer">
                    <button
                      className="hp-btn-buy"
                      onClick={() => setBuyProperty(prop)}
                      title="Buy Property & Generate Kerala Legal Agreement Deed"
                    >
                      💳 Buy Property
                    </button>
                    <button
                      className="hp-btn-ai-interest"
                      onClick={() => setAiInterestProperty(prop)}
                      title="Express Interest & Send AI Inquiry to Owner"
                    >
                      ✨ Express Interest
                    </button>
                    <button
                      className="hp-btn-inquire"
                      onClick={() => handleOpenEnquiry(prop)}
                      title="Direct message to owner"
                    >
                      📩 Contact
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── CALL TO ACTION BANNER ── */}
      <section className="hp-cta-banner">
        <div className="hp-cta-content">
          <h2>Are You a Property Owner or Landlord?</h2>
          <p>
            List your apartment, building, or land on HomeQuest. Reach thousands of
            qualified buyers and tenants with zero broker commissions and full control.
          </p>
          <div className="hp-cta-buttons">
            <button
              className="hp-cta-btn-primary"
              onClick={() => onNavigateAuth('register')}
            >
              🚀 Register as a Seller
            </button>
            <button
              className="hp-cta-btn-secondary"
              onClick={() => onNavigateAuth('login')}
            >
              Sign In to Owner Portal
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="hp-footer">
        <div className="hp-footer-container">
          {/* Brand Info */}
          <div className="hp-footer-col brand-col">
            <div className="hp-brand footer-brand">
              <span className="hp-logo-icon">🏡</span>
              <span className="hp-brand-name">HomeQuest</span>
            </div>
            <p className="footer-about">
              HomeQuest is a modern real estate platform connecting property owners
              directly with buyers and renters with verified trust, security, and transparent communication.
            </p>
            <div className="footer-badges">
              <span className="badge-item">🛡️ 100% Verified Listings</span>
              <span className="badge-item">⚡ Direct Seller Chat</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="hp-footer-col">
            <h4>Quick Navigation</h4>
            <ul>
              <li><a href="#properties-section">Browse Properties</a></li>
              <li><a href="#why-section">Why Choose Us</a></li>
              <li><button className="footer-link-btn" onClick={() => onNavigateAuth('login')}>Owner Sign In</button></li>
              <li><button className="footer-link-btn" onClick={() => onNavigateAuth('register')}>Create Free Account</button></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="hp-footer-col">
            <h4>Property Categories</h4>
            <ul>
              <li><a href="#properties-section" onClick={() => setHeroType('APARTMENT')}>Luxury Apartments</a></li>
              <li><a href="#properties-section" onClick={() => setHeroType('BUILDING')}>Independent Buildings</a></li>
              <li><a href="#properties-section" onClick={() => setHeroType('RENTAL')}>Rental Homes</a></li>
              <li><a href="#properties-section" onClick={() => setHeroType('PLOT')}>Residential Plots</a></li>
              <li><a href="#properties-section" onClick={() => setHeroType('REAL_ESTATE')}>Commercial Real Estate</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="hp-footer-col">
            <h4>Contact & Support</h4>
            <p className="contact-item">📧 support@homequest.com</p>
            <p className="contact-item">📞 +1 (800) 456-7890</p>
            <p className="contact-item">📍 100 Innovation Way, Suite 400</p>
            <p className="contact-item">🕒 Mon - Fri: 9:00 AM - 6:00 PM</p>
          </div>
        </div>

        <div className="hp-footer-bottom">
          <p>© {new Date().getFullYear()} HomeQuest Real Estate Platform. All rights reserved.</p>
          <div className="footer-legal-links">
            <a href="#">Privacy Policy</a>
            <span>&bull;</span>
            <a href="#">Terms of Service</a>
            <span>&bull;</span>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>

      {/* ── INQUIRY MODAL DIALOG ── */}
      {selectedProperty && (
        <div className="hp-modal-backdrop" onClick={handleCloseEnquiry}>
          <div className="hp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hp-modal-header">
              <div>
                <h3>Contact Property Owner</h3>
                <p className="modal-sub">
                  Inquiring about <strong>{selectedProperty.title}</strong> (${parseFloat(selectedProperty.price).toLocaleString()})
                </p>
              </div>
              <button className="hp-modal-close" onClick={handleCloseEnquiry}>
                ✕
              </button>
            </div>

            {enquiryStatus.text && (
              <div className={`modal-alert alert-${enquiryStatus.type}`}>
                {enquiryStatus.text}
              </div>
            )}

            <form onSubmit={handleSendEnquiry} className="hp-modal-form">
              <div className="form-group">
                <label>Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={enquiryForm.name}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, name: e.target.value })
                  }
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Your Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={enquiryForm.email}
                    onChange={(e) =>
                      setEnquiryForm({ ...enquiryForm, email: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={enquiryForm.phone_number}
                    onChange={(e) =>
                      setEnquiryForm({ ...enquiryForm, phone_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Message *</label>
                <textarea
                  rows="4"
                  required
                  value={enquiryForm.message}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, message: e.target.value })
                  }
                />
              </div>

              <div className="hp-modal-actions">
                <button
                  type="button"
                  className="hp-modal-cancel"
                  onClick={handleCloseEnquiry}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hp-modal-submit"
                  disabled={submittingEnquiry}
                >
                  {submittingEnquiry ? 'Sending...' : 'Send Inquiry to Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI EXPRESS INTEREST & BUY MODAL ── */}
      {aiInterestProperty && (
        <AIExpressInterestModal
          property={aiInterestProperty}
          user={user}
          onClose={() => setAiInterestProperty(null)}
          onSuccess={() => {
            // Success handled inside modal
          }}
        />
      )}

      {/* ── PROPERTY IMAGE GALLERY LIGHTBOX ── */}
      {galleryProperty && (
        <PropertyImageModal
          property={galleryProperty}
          onClose={() => setGalleryProperty(null)}
          onExpressInterest={(p) => setAiInterestProperty(p)}
          onBuyProperty={(p) => setBuyProperty(p)}
        />
      )}

      {/* ── PROPERTY BUY & SALE DEED MODAL ── */}
      {buyProperty && (
        <PropertyBuyModal
          property={buyProperty}
          user={user}
          onClose={() => setBuyProperty(null)}
          onSuccess={(purchase) => {
            console.log('Purchase agreement created:', purchase);
          }}
        />
      )}
    </div>
  );
}
