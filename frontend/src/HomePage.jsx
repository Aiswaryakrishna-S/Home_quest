import React, { useState, useEffect, useRef } from 'react';
import { propertyAPI, enquiryAPI, historyAPI, getPropertyImageUrl } from './api';
import AIExpressInterestModal from './AIExpressInterestModal';
import PropertyImageModal from './PropertyImageModal';
import PropertyBuyModal from './PropertyBuyModal';
import ScheduleVisitModal from './ScheduleVisitModal';
import VisitScheduleManager from './VisitScheduleManager';
import SearchHistoryModal from './SearchHistoryModal';
import ScrollVilla3D from './ScrollVilla3D';
import './HomePage.css';

const PROPERTY_TYPES = [
  { value: 'ALL', label: 'All' },
  { value: 'PLOT', label: '🌳 Plots & Land' },
  { value: 'BUILDING', label: '🏢 Buildings & Commercial' },
  { value: 'APARTMENT', label: '🏠 Apartments' },
  { value: 'RENTAL', label: '🔑 Rentals' },
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
  const [budgetTier, setBudgetTier] = useState('ALL'); // 'ALL' | 'MID' | 'LUXURY' | 'ULTRA'
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inquire & interaction modal states
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [aiInterestProperty, setAiInterestProperty] = useState(null);
  const [galleryProperty, setGalleryProperty] = useState(null);
  const [buyProperty, setBuyProperty] = useState(null);

  // Visit & tour calendar states
  const [tourProperty, setTourProperty] = useState(null);
  const [showVisitManager, setShowVisitManager] = useState(false);

  // Authenticated user history states
  const [recentViews, setRecentViews] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // AI recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    message: '',
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquiryStatus, setEnquiryStatus] = useState({ type: '', text: '' });

  // Nearby Live GPS Search State
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyActive, setNearbyActive] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState([]);
  const [userLocationName, setUserLocationName] = useState('');
  const [nearbyNotice, setNearbyNotice] = useState('');

  // User Liked Properties State (persisted & synced with backend)
  const [likedIds, setLikedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('hq_liked_property_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync server-side liked properties with state
  useEffect(() => {
    if (properties && properties.length > 0) {
      const serverLikedIds = properties.filter((p) => p.is_liked).map((p) => p.id);
      if (serverLikedIds.length > 0) {
        setLikedIds((prev) => Array.from(new Set([...prev, ...serverLikedIds])));
      }
    }
  }, [properties]);

  const handleToggleLike = async (property, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!property?.id) return;

    const propId = property.id;
    const isCurrentlyLiked = likedIds.includes(propId);
    const newLikedIds = isCurrentlyLiked
      ? likedIds.filter((id) => id !== propId)
      : [...likedIds, propId];

    setLikedIds(newLikedIds);
    try {
      localStorage.setItem('hq_liked_property_ids', JSON.stringify(newLikedIds));
    } catch {}

    const delta = isCurrentlyLiked ? -1 : 1;
    const updateLikeFields = (list) =>
      list.map((p) =>
        p.id === propId
          ? {
              ...p,
              is_liked: !isCurrentlyLiked,
              likes_count: Math.max(0, (p.likes_count || 0) + delta),
            }
          : p
      );

    setProperties(updateLikeFields);
    setNearbyProperties(updateLikeFields);
    setRecommendations(updateLikeFields);

    try {
      await propertyAPI.toggleLikeProperty(propId, isCurrentlyLiked ? 'unlike' : 'like');
    } catch (err) {
      console.warn('Like toggle sync notice:', err);
    }

    // Re-calculate AI recommendations in real-time based on the updated likes
    fetchRecommendations(newLikedIds);
  };

  const executeNearbySearch = async (lat, lng, locLabel) => {
    setIsLocating(true);
    setNearbyNotice('');
    try {
      // First try 100km radius
      let data = await propertyAPI.getNearbyProperties(lat, lng, 100);
      let list = data?.results || (Array.isArray(data) ? data : []);

      // If no properties within 100km, automatically expand radius to cover all listings across the state
      if (list.length === 0) {
        data = await propertyAPI.getNearbyProperties(lat, lng, 1000);
        list = data?.results || (Array.isArray(data) ? data : []);
      }

      setNearbyProperties(list);
      setNearbyActive(true);
      setUserLocationName(locLabel || 'Your Live Location');

      // Scroll smoothly down to curated listings
      setTimeout(() => {
        const el = document.getElementById('curated-listings');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err) {
      console.error('Error in nearby search:', err);
      setNearbyNotice('Could not fetch nearby properties. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleFindNearby = () => {
    setIsLocating(true);
    setNearbyNotice('');

    if (!navigator.geolocation) {
      setNearbyNotice('GPS not supported by your browser. Showing nearest from Central Kerala benchmark.');
      executeNearbySearch(11.2588, 75.7804, 'Central Kerala (Kozhikode)');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        executeNearbySearch(latitude, longitude, 'Your GPS Location');
      },
      (err) => {
        console.warn('Geolocation access denied or timed out:', err);
        setNearbyNotice('Location permission not granted. Showing nearest properties from Central Kerala benchmark.');
        executeNearbySearch(11.2588, 75.7804, 'Central Kerala Benchmark');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleResetNearby = () => {
    setNearbyActive(false);
    setNearbyProperties([]);
    setUserLocationName('');
    setNearbyNotice('');
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchRecommendations();
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

  const fetchRecommendations = async (overrideLikedIds = null) => {
    setLoadingRecs(true);
    const activeLikedIds = overrideLikedIds !== null ? overrideLikedIds : likedIds;
    try {
      const res = await propertyAPI.getRecommendations(6, activeLikedIds);
      setRecommendations(res?.recommendations || []);
    } catch (err) {
      console.warn('Could not load AI recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Fetch browsing & search history strictly when user is authenticated
  useEffect(() => {
    if (user) {
      historyAPI
        .getHistory()
        .then((data) => {
          setRecentViews(data?.recent_properties || []);
          setRecentSearches(data?.recent_searches || []);
        })
        .catch(() => {});
      fetchRecommendations();
    } else {
      setRecentViews([]);
      setRecentSearches([]);
      fetchRecommendations();
    }
  }, [user]);

  const handleRecordPropertyView = (prop) => {
    if (!user || !prop?.id) return;
    historyAPI.recordView(prop.id).then(() => {
      fetchRecommendations();
    }).catch(() => {});
  };

  // Filter properties based on search query, category, and nearby proximity
  const baseList = nearbyActive ? nearbyProperties : properties;
  const filteredProperties = baseList.filter((p) => {
    const term = (navSearch || heroCity).toLowerCase();
    const matchLocation =
      nearbyActive ||
      !term ||
      p.city?.toLowerCase().includes(term) ||
      p.title?.toLowerCase().includes(term) ||
      p.address?.toLowerCase().includes(term) ||
      p.state?.toLowerCase().includes(term);

    let matchType = heroType === 'ALL';
    if (!matchType) {
      if (heroType === 'PLOT') {
        matchType =
          p.property_type === 'PLOT' ||
          String(p.sub_type || '').toLowerCase().includes('plot') ||
          String(p.sub_type || '').toLowerCase().includes('land');
      } else if (heroType === 'BUILDING') {
        matchType =
          p.property_type === 'BUILDING' ||
          p.property_type === 'REAL_ESTATE';
      } else {
        matchType = p.property_type === heroType;
      }
    }
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

  // Top featured spotlight property (first luxury property or fallback)
  const spotlightProp = properties[0] || {
    id: 999,
    title: 'The Velorum Glass Villa',
    city: 'Aluva Riverfront',
    formatted_price: '₹4.85 Cr',
    price: 48500000,
    property_type: 'VILLA',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    bedrooms: 5,
    bathrooms: 6,
    area_sqft: 6400,
  };

  // Featured Suggested for You (either first recommendation or top property)
  const heroSuggested = recommendations[0] || properties[0] || {
    id: 998,
    title: 'The Eden Courtyard Villa',
    city: 'Kadavanthra, Kochi',
    formatted_price: '₹6.20 Cr',
    price: 62000000,
    property_type: 'BUILDING',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    area_sqft: 5200,
    bhk: '4',
    bathrooms: '5',
    match_percentage: 95,
    match_score: '95% Match',
    ai_reason: 'Matches your interest in premium verified residences.',
  };

  return (
    <div className="home-page">
      {/* ── TOP LUXURY NAVBAR ── */}
      <header className="hq-navbar">
        <div className="hq-nav-container">
          <div className="hq-brand-wrap" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="hq-brand-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div>
              <div className="hq-brand-title">HomeQuest <span>AI</span></div>
              <div className="hq-brand-subtitle">Find the right home, the smart way</div>
            </div>
          </div>

          <div className="hq-nav-user-actions">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  className="hq-nav-auth-btn"
                  onClick={() => onNavigateDashboard(user.role === 'SELLER' || user.role === 'ADMIN' ? 'owner-dashboard' : 'profile')}
                >
                  {user.role === 'SELLER' || user.role === 'ADMIN' ? 'Dashboard' : 'Profile'}
                </button>
                <button
                  style={{
                    background: 'none',
                    border: '1px solid #dfc7b6',
                    borderRadius: '9999px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#581825',
                  }}
                  onClick={onLogout}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="hq-nav-auth-btn"
                  onClick={() => onNavigateAuth('login')}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Capsule Search Bar */}
        <div className="hq-nav-search-bar" ref={searchContainerRef}>
          <div className="hq-nav-search-capsule">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#746764' }}>Search</span>
            <input
              type="text"
              placeholder="Enter city, title, or landmark..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              onFocus={() => setSearchDropdownOpen(true)}
            />
            {navSearch && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d8f8c' }}
                onClick={() => setNavSearch('')}
              >
                ✕
              </button>
            )}
            <button
              type="button"
              className={`hq-nav-nearby-btn ${isLocating ? 'locating' : ''} ${nearbyActive ? 'active' : ''}`}
              onClick={handleFindNearby}
              title="Find nearest plots, buildings, and properties near your location"
            >
              {isLocating ? '⏳ Locating...' : nearbyActive ? '📍 Nearby ✓' : '📍 Nearby'}
            </button>
            <button
              className="hq-nav-search-btn-circle"
              onClick={() => {
                const el = document.getElementById('curated-listings');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Search
            </button>
          </div>
        </div>
      </header>

      {/* ── FIRST LANDING SECTION: PURE WHITE SCROLL-DRIVEN 3D VILLA ── */}
      <ScrollVilla3D />

      {/* ── HERO SECTION ── */}
      <section className="hq-hero-section">
        <div className="hq-hero-layout-grid">
          <div>
            <div className="hq-hero-badge-pill">
              <span>●</span> ALL SYSTEMS LIVE · 99.9% UPTIME · DIRECT OWNER
            </div>

            <h1 className="hq-hero-title">
              Find Your Dream Home With <br />
              <em>Confidence</em> <span className="hq-ai-accent">& AI</span>
            </h1>

            <p className="hq-hero-desc">
              Direct-owner verified luxury residences, waterfront villas, penthouses, and residential plots without broker markups.
            </p>

            {/* Hero Interactive Search & Filter Card */}
            <div className="hq-hero-search-card">
              <div className="hq-search-field-main">
                <input
                  type="text"
                  placeholder="Enter city or area (e.g. Kannur, Kochi, Kozhikode)..."
                  value={heroCity}
                  onChange={(e) => setHeroCity(e.target.value)}
                />
                {heroCity && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d8f8c', padding: '0 0.5rem' }}
                    onClick={() => setHeroCity('')}
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  className={`hq-hero-nearby-btn ${isLocating ? 'locating' : ''} ${nearbyActive ? 'active' : ''}`}
                  onClick={handleFindNearby}
                  title="Find nearest plots, buildings, and homes using your live GPS location"
                >
                  {isLocating ? '⏳ Locating...' : nearbyActive ? '📍 Nearby Active ✓' : '📍 Find Nearby'}
                </button>
              </div>

              {/* Quick Kerala District Location Pills */}
              <div className="hq-quick-cities-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#746764', alignSelf: 'center', marginRight: '0.25rem' }}>
                  Quick:
                </span>
                {['Kannur', 'Kochi', 'Kozhikode', 'Thiruvananthapuram', 'Thrissur', 'Kottayam'].map((cityName) => {
                  const isSelected = heroCity.toLowerCase() === cityName.toLowerCase();
                  return (
                    <button
                      key={cityName}
                      type="button"
                      style={{
                        background: isSelected ? '#581825' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#581825',
                        border: '1px solid #dfc7b6',
                        borderRadius: '9999px',
                        padding: '0.2rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setHeroCity(isSelected ? '' : cityName)}
                    >
                      📍 {cityName}
                    </button>
                  );
                })}
              </div>

              <div className="hq-search-category-row">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    className={`hq-search-cat-pill ${heroType === t.value ? 'active' : ''}`}
                    onClick={() => setHeroType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="hq-search-budget-row">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#746764' }}>Budget Tier:</span>
                <div className="hq-budget-chips">
                  <button
                    className={`hq-budget-chip ${budgetTier === 'ALL' ? 'active' : ''}`}
                    onClick={() => setBudgetTier('ALL')}
                  >
                    All
                  </button>
                  <button
                    className={`hq-budget-chip ${budgetTier === 'MID' ? 'active' : ''}`}
                    onClick={() => setBudgetTier('MID')}
                  >
                    ₹50L - ₹1Cr
                  </button>
                  <button
                    className={`hq-budget-chip ${budgetTier === 'LUXURY' ? 'active' : ''}`}
                    onClick={() => setBudgetTier('LUXURY')}
                  >
                    ₹1Cr - ₹3Cr
                  </button>
                  <button
                    className={`hq-budget-chip ${budgetTier === 'ULTRA' ? 'active' : ''}`}
                    onClick={() => setBudgetTier('ULTRA')}
                  >
                    ₹3Cr+
                  </button>
                </div>
              </div>

              <button
                className="hq-hero-submit-cta"
                onClick={() => {
                  const el = document.getElementById('curated-listings');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Explore Verified Homes</span>
                <span>→</span>
              </button>
            </div>

            {/* 4-Item Quick Trust Strip */}
            <div className="hq-hero-trust-strip">
              <div className="hq-trust-box">
                <div className="hq-trust-icon">[T]</div>
                <div className="hq-trust-meta">
                  <strong>100% Certified</strong>
                  <span>Direct Title Ownership</span>
                </div>
              </div>

              <div className="hq-trust-box">
                <div className="hq-trust-icon">[0%]</div>
                <div className="hq-trust-meta">
                  <strong>0.0% Brokerage</strong>
                  <span>Zero Middleman Fees</span>
                </div>
              </div>

              <div className="hq-trust-box">
                <div className="hq-trust-icon">[AI]</div>
                <div className="hq-trust-meta">
                  <strong>AI Valuation Sync</strong>
                  <span>Real-Time Comps Match</span>
                </div>
              </div>

              <div className="hq-trust-box">
                <div className="hq-trust-icon">[T]</div>
                <div className="hq-trust-meta">
                  <strong>Instant Live Tours</strong>
                  <span>Direct Owner Calendar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Spotlight Card */}
          <div
            className="hq-hero-spotlight-card"
            onClick={() => {
              setGalleryProperty(spotlightProp);
              handleRecordPropertyView(spotlightProp);
            }}
            style={{
              backgroundImage: `url(${getPropertyImageUrl(spotlightProp)})`,
              cursor: 'pointer',
            }}
          >
            <div className="hq-spotlight-top-tags">
              <span className="hq-spotlight-pill">● AI Verified · Direct Owner</span>
              <span className="hq-spotlight-price-pill">
                {spotlightProp.formatted_price || `₹${parseFloat(spotlightProp.price).toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="hq-spotlight-bottom">
              <div>
                <h3 className="hq-spotlight-title">{spotlightProp.title}</h3>
                <p className="hq-spotlight-sub">{spotlightProp.city} &bull; {spotlightProp.area_sqft || 6400} sq.ft</p>
              </div>
              <button
                className="hq-spotlight-cta-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEnquiry(spotlightProp);
                }}
              >
                Inquire Now →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURAL & FINANCIAL SECURITY ── */}
      <section className="hq-security-section">
        <div className="hq-section-head">
          <span className="hq-section-tag">AI DEEP AUDIT & ENCRYPTION</span>
          <h2 className="hq-section-title">Architectural & Financial Security</h2>
          <p style={{ fontSize: '0.88rem', color: '#746764', marginTop: '0.35rem' }}>
            Centralized intelligence command console for deed validation and algorithmic price verification.
          </p>
        </div>

        <div className="hq-security-stack">
          {/* Card 1 */}
          <div className="hq-security-card">
            <div className="hq-sec-icon-circle">DOC</div>
            <div className="hq-sec-content">
              <div className="hq-sec-header">
                <span className="hq-sec-title">Title & Deed Verification</span>
                <span className="hq-sec-badge">SHA-256</span>
              </div>
              <p className="hq-sec-text">
                30-Year encumbrance and cadastral boundary verification synced with state registrar databases.
              </p>
              <div className="hq-sec-metric-bar">
                <span>100% Clean Audit Score</span>
                <span style={{ color: '#746764' }}>&bull; Zero encumbrance</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="hq-security-card">
            <div className="hq-sec-icon-circle">VAL</div>
            <div className="hq-sec-content">
              <div className="hq-sec-header">
                <span className="hq-sec-title">AI Valuation Fairness Engine</span>
                <span className="hq-sec-badge">Active Sync</span>
              </div>
              <p className="hq-sec-text">
                Hyper-localized comps algorithmic assessment to guarantee fair market square-foot pricing without inflated broker quotes.
              </p>
              <div className="hq-sec-metric-bar">
                <span>Estimated Fair Price: ₹4,150/sq.ft</span>
                <span style={{ color: '#746764' }}>&bull; 94% High Confidence Match</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="hq-security-card">
            <div className="hq-sec-icon-circle">GEO</div>
            <div className="hq-sec-content">
              <div className="hq-sec-header">
                <span className="hq-sec-title">Cadastral Boundary Geo-Lock</span>
                <span className="hq-sec-badge">Geo-Locked</span>
              </div>
              <p className="hq-sec-text">
                Purayidam and plot boundary geo-coordinates digitally locked against master revenue survey maps.
              </p>
              <div className="hq-sec-metric-bar">
                <span>Boundary Coordinates Verified</span>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="hq-security-card">
            <div className="hq-sec-icon-circle">AES</div>
            <div className="hq-sec-content">
              <div className="hq-sec-header">
                <span className="hq-sec-title">256-Bit AES Document Vault</span>
                <span className="hq-sec-badge">Enterprise</span>
              </div>
              <p className="hq-sec-text">
                End-to-end encrypted possession certificates, floor plans, and tax receipts accessible only to authenticated parties.
              </p>
              <div className="hq-sec-metric-bar">
                <span>Bank-Grade Encryption Protocol</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUGGESTED FOR YOU (EDITORIAL CAROUSEL SHOWCASE) ── */}
      <section className="hq-suggested-section">
        <div className="hq-section-head">
          <span className="hq-section-tag">✨ PERSONALIZED ALGORITHM</span>
          <h2 className="hq-section-title">Suggested For You</h2>
          <p style={{ fontSize: '0.88rem', color: '#746764', marginTop: '0.35rem' }}>
            Curated based on your browsing patterns and local real estate comps.
          </p>
        </div>

        <div className="hq-suggested-card">
          <div
            className="hq-suggested-img-wrap"
            style={{ backgroundImage: `url(${getPropertyImageUrl(heroSuggested)})`, cursor: 'pointer' }}
            onClick={() => {
              setGalleryProperty(heroSuggested);
              handleRecordPropertyView(heroSuggested);
            }}
          >
            <span className="hq-suggested-top-badge">
              ● {heroSuggested.match_score || `${heroSuggested.match_percentage || 95}% MATCH`}
            </span>
            <button
              type="button"
              className={`hq-like-btn hq-hero-like-btn ${likedIds.includes(heroSuggested.id) ? 'liked' : ''}`}
              onClick={(e) => handleToggleLike(heroSuggested, e)}
              title={likedIds.includes(heroSuggested.id) ? 'Unlike property' : 'Like property'}
            >
              <span className="hq-heart-icon">{likedIds.includes(heroSuggested.id) ? '❤️' : '🤍'}</span>
              <span className="hq-like-count">{heroSuggested.likes_count || (likedIds.includes(heroSuggested.id) ? 1 : 0)}</span>
            </button>
            <span className="hq-suggested-price-bottom">
              {heroSuggested.formatted_price || `₹${parseFloat(heroSuggested.price || 0).toLocaleString('en-IN')}`}
            </span>
          </div>

          <div className="hq-suggested-body">
            <div className="hq-suggested-title-row">
              <h3 className="hq-suggested-title">{heroSuggested.title}</h3>
              <span className="hq-suggested-price-large">
                {heroSuggested.formatted_price || `₹${parseFloat(heroSuggested.price || 0).toLocaleString('en-IN')}`}
              </span>
            </div>
            <p className="hq-suggested-loc">
              📍 {heroSuggested.city}{heroSuggested.state ? `, ${heroSuggested.state}` : ''}
              {heroSuggested.sub_type ? ` · ${heroSuggested.sub_type}` : ''}
            </p>

            {heroSuggested.ai_reason && (
              <div className="hq-ai-match-reason-badge">
                <span className="ai-sparkle">✨</span>
                <span><strong>AI Match Insight:</strong> {heroSuggested.ai_reason}</span>
              </div>
            )}

            <div className="hq-suggested-specs-grid">
              <div className="hq-spec-item">
                <strong>{heroSuggested.area_sqft || heroSuggested.area || '—'}</strong>
                <span>{heroSuggested.property_type === 'PLOT' ? 'PLOT SQFT' : 'SQ.FT'}</span>
              </div>
              {heroSuggested.property_type === 'PLOT' ? (
                <>
                  <div className="hq-spec-item">
                    <strong>FREEHOLD</strong>
                    <span>TITLE</span>
                  </div>
                  <div className="hq-spec-item">
                    <strong>VERIFIED</strong>
                    <span>BOUNDARY</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="hq-spec-item">
                    <strong>{heroSuggested.bhk || heroSuggested.bedrooms || '—'}</strong>
                    <span>BEDS / BHK</span>
                  </div>
                  <div className="hq-spec-item">
                    <strong>{heroSuggested.bathrooms || '—'}</strong>
                    <span>BATHS</span>
                  </div>
                </>
              )}
              <div className="hq-spec-item">
                <strong style={{ color: '#047857' }}>
                  {heroSuggested.match_percentage ? `${heroSuggested.match_percentage}%` : '95%'}
                </strong>
                <span>MATCH</span>
              </div>
            </div>

            <div className="hq-suggested-actions">
              <button
                className="hq-suggested-btn-primary"
                onClick={() => {
                  setTourProperty(heroSuggested);
                  handleRecordPropertyView(heroSuggested);
                }}
              >
                <span>Schedule In-Person Tour</span>
              </button>
              <button
                className="hq-suggested-btn-share"
                onClick={() => handleOpenEnquiry(heroSuggested)}
                title="Send Enquiry to Owner"
              >
                Inquire
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CURATED VERIFIED LISTINGS ── */}
      <section className="hq-marketplace-section" id="curated-listings">
        <div className="hq-section-head">
          <span className="hq-section-tag">
            {nearbyActive ? 'LIVE GPS PROXIMITY DISCOVERY' : 'PREMIUM SELECTION'}
          </span>
          <h2 className="hq-section-title">
            {nearbyActive ? 'Nearest Properties to Your Location' : 'Curated Verified Listings'}
          </h2>
        </div>

        {nearbyActive && (
          <div className="hq-nearby-active-banner">
            <div className="hq-nearby-active-info">
              <span className="hq-nearby-pulse-dot"></span>
              <div>
                <strong style={{ color: '#002f34', fontSize: '0.95rem', display: 'block' }}>
                  📍 Showing {filteredProperties.length} properties ordered by distance (nearest first)
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Live proximity search active {userLocationName ? `near ${userLocationName}` : ''}. Use the category filters below to switch between plots, buildings, or apartments.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="hq-nearby-reset-btn"
              onClick={handleResetNearby}
            >
              ✕ Show All Properties
            </button>
          </div>
        )}

        {nearbyNotice && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ℹ️ {nearbyNotice}</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontWeight: 'bold' }} onClick={() => setNearbyNotice('')}>✕</button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="hq-filter-pills-row">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t.value}
              className={`hq-filter-pill-btn ${heroType === t.value ? 'active' : ''}`}
              onClick={() => setHeroType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#746764' }}>
            <p>Loading curated properties...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #eddcd0' }}>
            <h4 style={{ fontFamily: 'Playfair Display', fontSize: '1.25rem', color: '#1c1417', marginBottom: '0.5rem' }}>No Listings Found</h4>
            <p style={{ fontSize: '0.85rem', color: '#746764', marginBottom: '1rem' }}>No properties match the selected criteria.</p>
            <button
              className="hq-nav-auth-btn"
              onClick={() => {
                setNavSearch('');
                setHeroCity('');
                setHeroType('ALL');
                handleResetNearby();
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="hq-listings-stack">
            {filteredProperties.map((prop) => (
              <div key={prop.id} className="hq-listing-card">
                <div
                  className="hq-listing-img-box"
                  style={{ backgroundImage: `url(${getPropertyImageUrl(prop)})`, cursor: 'pointer' }}
                  onClick={() => {
                    setGalleryProperty(prop);
                    handleRecordPropertyView(prop);
                  }}
                >
                  <div className="hq-listing-top-left-pills">
                    <span className="hq-listing-pill">● Verified</span>
                    <span className="hq-listing-pill">{prop.property_type}</span>
                    {prop.distance_km !== undefined && prop.distance_km !== null && (
                      <span className="hq-listing-pill hq-distance-pill">
                        📍 {parseFloat(prop.distance_km) < 1 ? `${Math.round(parseFloat(prop.distance_km) * 1000)} m` : `${parseFloat(prop.distance_km).toFixed(1)} km`} away
                      </span>
                    )}
                  </div>

                  {/* Like / Unlike Heart Button */}
                  <button
                    type="button"
                    className={`hq-like-btn ${likedIds.includes(prop.id) ? 'liked' : ''}`}
                    onClick={(e) => handleToggleLike(prop, e)}
                    title={likedIds.includes(prop.id) ? 'Unlike this property' : 'Like this property'}
                  >
                    <span className="hq-heart-icon">{likedIds.includes(prop.id) ? '❤️' : '🤍'}</span>
                    <span className="hq-like-count">{prop.likes_count || (likedIds.includes(prop.id) ? 1 : 0)}</span>
                  </button>

                  <span className="hq-listing-val-pill">94% Fair Price Score</span>
                </div>

                <div className="hq-listing-body">
                  <div className="hq-listing-title-row">
                    <h4 className="hq-listing-title">{prop.title}</h4>
                    <span className="hq-listing-price">
                      {prop.formatted_price || `₹${parseFloat(prop.price).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <p className="hq-listing-meta-text">
                    {prop.city}{prop.state ? `, ${prop.state}` : ''} &bull; {prop.area_sqft || prop.area || '—'} sqft
                    {prop.property_type !== 'PLOT' && !String(prop.sub_type || '').toLowerCase().includes('plot') && !String(prop.sub_type || '').toLowerCase().includes('land') && (
                      <>{prop.bhk ? ` • ${prop.bhk} BHK` : (prop.bedrooms ? ` • ${prop.bedrooms} BHK` : '')}</>
                    )}
                    {prop.sub_type ? ` • ${prop.sub_type}` : ''}
                  </p>

                  <div className="hq-listing-btn-row">
                    <button
                      className="hq-listing-btn-primary"
                      onClick={() => handleOpenEnquiry(prop)}
                    >
                      Inquire Direct
                    </button>
                    <button
                      className="hq-listing-btn-secondary"
                      onClick={() => {
                        setTourProperty(prop);
                        handleRecordPropertyView(prop);
                      }}
                    >
                      Schedule Tour
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer className="hq-editorial-footer">
        <div className="hq-footer-inner">
          <div className="hq-footer-top-brand">
            <div className="hq-brand-wrap">
              <div className="hq-brand-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div>
                <div className="hq-brand-title">HomeQuest <span>AI</span></div>
                <div className="hq-brand-subtitle">Centralized verified real estate intelligence</div>
              </div>
            </div>
          </div>

          <p className="hq-footer-desc">
            HomeQuest connects verified property owners directly with buyers through machine learning valuation benchmarks, automated title auditing, and transparent direct communication.
          </p>

          <div className="hq-footer-links-grid">
            <div className="hq-footer-col">
              <h5>Marketplace</h5>
              <ul>
                <li><button onClick={() => setHeroType('APARTMENT')}>Luxury Apartments</button></li>
                <li><button onClick={() => setHeroType('VILLA')}>Waterfront Villas</button></li>
                <li><button onClick={() => setHeroType('BUILDING')}>Penthouses</button></li>
                <li><button onClick={() => setHeroType('PLOT')}>Residential Plots</button></li>
              </ul>
            </div>

            <div className="hq-footer-col">
              <h5>Verification & Security</h5>
              <ul>
                <li><a href="#">Deed Audit Engine</a></li>
                <li><a href="#">Cadastral Geo-Lock</a></li>
                <li><a href="#">Document Vault</a></li>
                <li><a href="#">Algorithmic Comps</a></li>
              </ul>
            </div>

            <div className="hq-footer-col">
              <h5>Operations</h5>
              <ul>
                <li><button onClick={() => onNavigateAuth('login')}>Operations Console</button></li>
                <li><button onClick={() => onNavigateAuth('register')}>Request Partner Access</button></li>
                <li><button onClick={() => setShowVisitManager(true)}>Tour Calendar</button></li>
              </ul>
            </div>

            <div className="hq-footer-col">
              <h5>Contact & Support</h5>
              <ul>
                <li><span>Email: support@homequest.ai</span></li>
                <li><span>Phone: +91 484 290 8000</span></li>
                <li><span>Location: Kochi Infopark & Bangalore</span></li>
              </ul>
            </div>
          </div>

          <div className="hq-footer-compliance-callout">
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#581825' }}>[AUDIT]</span>
            <div style={{ fontSize: '0.75rem', color: '#746764' }}>
              All property listings and documentation are subject to cryptographic validation and owner identity confirmation in accordance with real estate regulatory standards.
            </div>
          </div>

          <div className="hq-footer-bottom-copy">
            <span>© {new Date().getFullYear()} HomeQuest AI Technologies Inc. All rights reserved.</span>
            <span>v2.4.8 Enterprise · 256-bit AES</span>
          </div>
        </div>
      </footer>

      {/* ── FIXED MOBILE / BOTTOM NAV BAR (Matching image bottom strip) ── */}
      <nav className="hq-fixed-bottom-bar">
        <button
          className="hq-bottom-nav-item active"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>Home</span>
        </button>

        <button
          className="hq-bottom-nav-item"
          onClick={() => {
            const el = document.getElementById('curated-listings');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Explore</span>
        </button>

        <button
          className="hq-bottom-nav-item"
          onClick={() => setShowVisitManager(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Tours</span>
        </button>

        <button
          className="hq-bottom-nav-item"
          onClick={() => {
            if (user) {
              onNavigateDashboard(user.role === 'SELLER' || user.role === 'ADMIN' ? 'owner-dashboard' : 'profile');
            } else {
              onNavigateAuth('login');
            }
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Account</span>
        </button>
      </nav>

      {/* ── INQUIRY MODAL DIALOG ── */}
      {selectedProperty && (
        <div className="hp-modal-backdrop" onClick={handleCloseEnquiry}>
          <div className="hp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hp-modal-header">
              <div>
                <h3>Direct Owner Inquiry</h3>
                <p className="modal-sub">
                  Inquiring about <strong>{selectedProperty.title}</strong> ({selectedProperty.formatted_price || `₹${parseFloat(selectedProperty.price).toLocaleString('en-IN')}`})
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label>Email *</label>
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
                <div>
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={enquiryForm.phone_number}
                    onChange={(e) =>
                      setEnquiryForm({ ...enquiryForm, phone_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Message to Owner *</label>
                <textarea
                  rows="3"
                  required
                  value={enquiryForm.message}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, message: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                className="hp-modal-submit-btn"
                disabled={submittingEnquiry}
              >
                {submittingEnquiry ? 'Sending Direct Inquiry...' : 'Send Inquiry to Owner'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS (EXISTING FUNCTIONALITY PRESERVED) ── */}
      {aiInterestProperty && (
        <AIExpressInterestModal
          isOpen={true}
          property={aiInterestProperty}
          user={user}
          onClose={() => setAiInterestProperty(null)}
          onEnquirySent={() => fetchRecommendations()}
        />
      )}

      {galleryProperty && (
        <PropertyImageModal
          isOpen={true}
          property={galleryProperty}
          isLiked={likedIds.includes(galleryProperty.id)}
          onToggleLike={(e) => handleToggleLike(galleryProperty, e)}
          onClose={() => setGalleryProperty(null)}
          onOpenEnquiry={handleOpenEnquiry}
        />
      )}

      {buyProperty && (
        <PropertyBuyModal
          isOpen={true}
          property={buyProperty}
          user={user}
          onClose={() => setBuyProperty(null)}
          onSuccess={() => {
            fetchProperties();
            fetchRecommendations();
          }}
        />
      )}

      {tourProperty && (
        <ScheduleVisitModal
          isOpen={true}
          property={tourProperty}
          user={user}
          onClose={() => setTourProperty(null)}
          onScheduleSuccess={() => {
            setShowVisitManager(true);
            fetchRecommendations();
          }}
        />
      )}

      {showVisitManager && (
        <VisitScheduleManager
          isOpen={true}
          user={user}
          onClose={() => setShowVisitManager(false)}
        />
      )}

      {showHistoryModal && (
        <SearchHistoryModal
          isOpen={true}
          user={user}
          onClose={() => setShowHistoryModal(false)}
          onSelectSearch={(query, city, propertyType) => {
            setNavSearch(query);
            if (city) setHeroCity(city);
            if (propertyType && propertyType !== 'ALL') setHeroType(propertyType);
          }}
          onSelectProperty={(prop) => {
            setGalleryProperty(prop);
            handleRecordPropertyView(prop);
          }}
        />
      )}
    </div>
  );
}
