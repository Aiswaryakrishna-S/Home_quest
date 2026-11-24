import React, { useState, useEffect } from 'react';
import { historyAPI, getPropertyImageUrl } from './api';
import './SearchHistoryModal.css';

export default function SearchHistoryModal({
  user,
  onClose,
  onSelectSearch,
  onSelectProperty,
}) {
  const [activeTab, setActiveTab] = useState('searches'); // 'searches' | 'properties'
  const [searches, setSearches] = useState([]);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await historyAPI.getHistory();
      setSearches(data?.recent_searches || []);
      setViews(data?.recent_properties || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleDeleteSearch = async (id, e) => {
    e.stopPropagation();
    try {
      await historyAPI.deleteSearchItem(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
      showNotification('Search item removed.');
    } catch (err) {
      console.error('Delete search error:', err);
    }
  };

  const handleDeleteView = async (id, e) => {
    e.stopPropagation();
    try {
      await historyAPI.deleteViewItem(id);
      setViews((prev) => prev.filter((v) => v.id !== id));
      showNotification('Viewed property removed.');
    } catch (err) {
      console.error('Delete view error:', err);
    }
  };

  const handleClearSearches = async () => {
    if (!window.confirm('Clear all your search history?')) return;
    try {
      await historyAPI.clearHistory('searches');
      setSearches([]);
      showNotification('Search history cleared.');
    } catch (err) {
      console.error('Clear searches error:', err);
    }
  };

  const handleClearViews = async () => {
    if (!window.confirm('Clear all your viewed properties history?')) return;
    try {
      await historyAPI.clearHistory('properties');
      setViews([]);
      showNotification('Viewed properties history cleared.');
    } catch (err) {
      console.error('Clear views error:', err);
    }
  };

  // Filter lists based on quick search
  const filteredSearches = searches.filter((s) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      s.query?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.property_type?.toLowerCase().includes(q)
    );
  });

  const filteredViews = views.filter((v) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      v.title?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.property_type?.toLowerCase().includes(q)
    );
  });

  // Calculate quick stats
  const topCity = (() => {
    if (!searches.length) return 'None';
    const counts = {};
    searches.forEach((s) => {
      const c = s.city || s.query;
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : 'None';
  })();

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="shm-backdrop" onClick={onClose}>
      <div className="shm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shm-header">
          <div className="shm-header-info">
            <span className="shm-badge">🕒 Activity & History</span>
            <h2>My Activity History</h2>
            <p>
              Review your recent searches, viewed listings, and jump back into your property journey.
            </p>
          </div>
          <button className="shm-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Stats Strip */}
        <div className="shm-stats-strip">
          <div className="shm-stat-pill">
            <span className="stat-label">Total Searches</span>
            <span className="stat-value">{searches.length}</span>
          </div>
          <div className="shm-stat-pill">
            <span className="stat-label">Top Location</span>
            <span className="stat-value highlight">{topCity}</span>
          </div>
          <div className="shm-stat-pill">
            <span className="stat-label">Properties Viewed</span>
            <span className="stat-value">{views.length}</span>
          </div>
        </div>

        {/* Action Notification */}
        {actionMsg && <div className="shm-toast">ℹ️ {actionMsg}</div>}

        {/* Tabs Bar & Search / Clear Toolbar */}
        <div className="shm-toolbar">
          <div className="shm-tabs">
            <button
              className={`shm-tab-btn ${activeTab === 'searches' ? 'active' : ''}`}
              onClick={() => setActiveTab('searches')}
            >
              🔍 Search History ({searches.length})
            </button>
            <button
              className={`shm-tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              🏡 Viewed Properties ({views.length})
            </button>
          </div>

          <div className="shm-actions-right">
            <input
              type="text"
              className="shm-filter-input"
              placeholder="Filter history..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {activeTab === 'searches' ? (
              searches.length > 0 && (
                <button
                  type="button"
                  className="shm-clear-all-btn"
                  onClick={handleClearSearches}
                  title="Clear all searches"
                >
                  🗑️ Clear Searches
                </button>
              )
            ) : (
              views.length > 0 && (
                <button
                  type="button"
                  className="shm-clear-all-btn"
                  onClick={handleClearViews}
                  title="Clear all viewed properties"
                >
                  🗑️ Clear Viewed
                </button>
              )
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="shm-content-body">
          {loading ? (
            <div className="shm-loading-state">
              <span className="shm-spinner"></span>
              <p>Loading your activity history...</p>
            </div>
          ) : activeTab === 'searches' ? (
            /* 1. SEARCH HISTORY LIST */
            filteredSearches.length === 0 ? (
              <div className="shm-empty-state">
                <span className="empty-icon">🔍</span>
                <h4>No Search History Found</h4>
                <p>
                  {filterText
                    ? `No searches matched "${filterText}".`
                    : 'Your search history is currently empty. Start exploring properties to see your past queries here!'}
                </p>
              </div>
            ) : (
              <div className="shm-searches-list">
                {filteredSearches.map((s) => (
                  <div
                    key={s.id}
                    className="shm-search-card"
                    onClick={() => {
                      if (onSelectSearch) {
                        onSelectSearch(s);
                        onClose();
                      }
                    }}
                  >
                    <div className="shm-search-main">
                      <div className="shm-search-icon">📍</div>
                      <div className="shm-search-details">
                        <div className="shm-search-title-row">
                          <h4 className="shm-search-query">{s.query || s.city || 'All Properties'}</h4>
                          {s.property_type && s.property_type !== 'ALL' && (
                            <span className="shm-type-pill">{s.property_type}</span>
                          )}
                          {s.city && s.city !== s.query && (
                            <span className="shm-city-pill">{s.city}</span>
                          )}
                        </div>
                        <div className="shm-search-meta">
                          <span>🕒 {formatRelativeTime(s.searched_at)}</span>
                          <span>•</span>
                          <span>
                            {s.results_count !== undefined
                              ? `${s.results_count} listings found`
                              : 'Explored'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shm-search-actions">
                      <button
                        type="button"
                        className="shm-btn-rerun"
                        onClick={() => {
                          if (onSelectSearch) {
                            onSelectSearch(s);
                            onClose();
                          }
                        }}
                        title="Re-run this search"
                      >
                        ⚡ Search Again
                      </button>
                      <button
                        type="button"
                        className="shm-btn-delete"
                        onClick={(e) => handleDeleteSearch(s.id, e)}
                        title="Delete this search entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* 2. VIEWED PROPERTIES LIST */
            filteredViews.length === 0 ? (
              <div className="shm-empty-state">
                <span className="empty-icon">🏡</span>
                <h4>No Viewed Properties Yet</h4>
                <p>
                  {filterText
                    ? `No viewed properties matched "${filterText}".`
                    : 'Properties you browse while logged in will automatically appear here.'}
                </p>
              </div>
            ) : (
              <div className="shm-views-grid">
                {filteredViews.map((item) => {
                  const prop = item.property || item;
                  return (
                    <div
                      key={item.id}
                      className="shm-view-card"
                      onClick={() => {
                        if (onSelectProperty) {
                          onSelectProperty(prop);
                          onClose();
                        }
                      }}
                    >
                      <img
                        src={getPropertyImageUrl(prop)}
                        alt={prop.title || 'Property'}
                        className="shm-view-thumb"
                      />
                      <div className="shm-view-content">
                        <span className="shm-view-type">{prop.property_type || 'BUILDING'}</span>
                        <h4 className="shm-view-title">{prop.title}</h4>
                        <p className="shm-view-loc">📍 {prop.city || 'Kerala'}</p>
                        <div className="shm-view-price-row">
                          <span className="shm-view-price">
                            {prop.formatted_price || `₹${parseFloat(prop.price || 0).toLocaleString('en-IN')}`}
                          </span>
                          <span className="shm-view-count">
                            👁️ {item.view_count || 1} {item.view_count === 1 ? 'view' : 'views'}
                          </span>
                        </div>
                        <div className="shm-view-footer">
                          <span className="shm-view-time">{formatRelativeTime(item.viewed_at)}</span>
                          <button
                            type="button"
                            className="shm-btn-delete-view"
                            onClick={(e) => handleDeleteView(item.id, e)}
                            title="Remove from history"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="shm-footer">
          <span className="shm-footer-note">
            💡 <strong>Privacy Note:</strong> Your search and view history is strictly private to your account and powers your personalized recommendations.
          </span>
          <button type="button" className="shm-btn-done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
