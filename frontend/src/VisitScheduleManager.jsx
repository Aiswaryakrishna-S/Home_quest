import React, { useState, useEffect } from 'react';
import { tourAPI, getPropertyImageUrl } from './api';
import './VisitScheduleManager.css';

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
];

export default function VisitScheduleManager({ user, onClose, onViewProperty }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED'
  const [activeRole, setActiveRole] = useState(user?.role === 'SELLER' ? 'host' : 'all'); // 'all' | 'visitor' | 'host'

  // Reschedule state
  const [reschedulingTourId, setReschedulingTourId] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    new_date: '',
    new_time_slot: '10:00 AM - 11:00 AM',
    reason: '',
  });
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionAlert, setActionAlert] = useState({ type: '', text: '' });

  // Tomorrow for minimum reschedule date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    fetchTours();
  }, [activeRole]);

  const showFeedback = (type, text) => {
    setActionAlert({ type, text });
    setTimeout(() => setActionAlert({ type: '', text: '' }), 4000);
  };

  const fetchTours = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeRole !== 'all') {
        params.role = activeRole;
      }
      const data = await tourAPI.getMyTours(params);
      setTours(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load tour schedules:', err);
      showFeedback('error', 'Could not load your visits schedule.');
    } finally {
      setLoading(false);
    }
  };

  // Filter tours by status tab
  const filteredTours = tours.filter((t) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'UPCOMING') return t.status === 'UPCOMING' || t.status === 'CONFIRMED';
    return t.status === activeFilter;
  });

  // One-click Reschedule handler
  const handleStartReschedule = (tour) => {
    setReschedulingTourId(tour.id);
    setRescheduleData({
      new_date: tour.scheduled_date,
      new_time_slot: tour.time_slot,
      reason: '',
    });
  };

  const handleConfirmReschedule = async (tourId) => {
    if (!rescheduleData.new_date) {
      alert('Please choose a new tour date.');
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await tourAPI.rescheduleTour(tourId, rescheduleData);
      showFeedback('success', res.message || 'Tour rescheduled successfully!');
      setReschedulingTourId(null);
      fetchTours();
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to reschedule tour.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Status update handler (Confirm, Complete, Cancel)
  const handleUpdateStatus = async (tourId, newStatus) => {
    const confirmPrompt =
      newStatus === 'CANCELLED'
        ? window.confirm('Are you sure you want to cancel this scheduled tour?')
        : true;
    if (!confirmPrompt) return;

    setSubmittingAction(true);
    try {
      await tourAPI.updateTourStatus(tourId, newStatus);
      showFeedback('success', `Tour marked as ${newStatus.toLowerCase()}.`);
      fetchTours();
    } catch (err) {
      showFeedback('error', 'Failed to update tour status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Interactive Checklist Item Toggle
  const handleToggleChecklist = async (tourId, role, itemKey, currentChecked) => {
    try {
      // Optimistic UI update
      setTours((prev) =>
        prev.map((t) => {
          if (t.id === tourId) {
            const checklistField = role === 'seller' ? 'seller_checklist' : 'buyer_checklist';
            const updated = { ...t[checklistField] };
            if (updated[itemKey]) {
              updated[itemKey] = { ...updated[itemKey], checked: !currentChecked };
            }
            return { ...t, [checklistField]: updated };
          }
          return t;
        })
      );

      await tourAPI.updateChecklist(tourId, {
        role,
        item_key: itemKey,
        checked: !currentChecked,
      });
    } catch (err) {
      console.error('Checklist update error:', err);
      fetchTours();
    }
  };

  // Google Calendar URL Generator
  const generateGoogleCalendarUrl = (tour) => {
    const title = encodeURIComponent(`Site Visit: ${tour.property_title || 'Property Tour'}`);
    const details = encodeURIComponent(
      `HomeQuest AI Property Tour\nAddress: ${tour.property_address}, ${tour.property_city}\nHost: ${tour.seller_name} (${tour.seller_phone})\nNotes: ${tour.buyer_notes || 'None'}`
    );
    const location = encodeURIComponent(`${tour.property_address}, ${tour.property_city}`);
    const dateStr = (tour.scheduled_date || '').replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateStr}T100000Z/${dateStr}T110000Z`;
  };

  return (
    <div className="vsm-modal-overlay" onClick={onClose}>
      <div className="vsm-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vsm-header">
          <div className="vsm-title-row">
            <span className="vsm-icon-badge">📅</span>
            <div>
              <h2>Visit Calendar & Tour Management</h2>
              <p className="vsm-subtitle">
                Track upcoming site visits, reschedule appointments with 1-click, and verify visit-readiness checklists
              </p>
            </div>
          </div>
          <button className="vsm-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Global Feedback Alert */}
        {actionAlert.text && (
          <div className={`vsm-alert alert-${actionAlert.type}`}>
            {actionAlert.type === 'success' ? '✅' : '⚠️'} {actionAlert.text}
          </div>
        )}

        {/* Navigation & Filter Bar */}
        <div className="vsm-filters-bar">
          <div className="vsm-status-tabs">
            {[
              { id: 'ALL', label: 'All Tours' },
              { id: 'UPCOMING', label: 'Upcoming' },
              { id: 'RESCHEDULED', label: 'Rescheduled' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`vsm-tab-btn ${activeFilter === tab.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Role Toggle if Owner/Seller */}
          {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
            <div className="vsm-role-toggle">
              <button
                className={`role-chip ${activeRole === 'all' ? 'active' : ''}`}
                onClick={() => setActiveRole('all')}
              >
                All Roles
              </button>
              <button
                className={`role-chip ${activeRole === 'host' ? 'active' : ''}`}
                onClick={() => setActiveRole('host')}
              >
                🏠 As Host / Owner
              </button>
              <button
                className={`role-chip ${activeRole === 'visitor' ? 'active' : ''}`}
                onClick={() => setActiveRole('visitor')}
              >
                👤 As Visitor / Buyer
              </button>
            </div>
          )}
        </div>

        {/* Tour List View */}
        <div className="vsm-body">
          {loading ? (
            <div className="vsm-loading">
              <div className="vsm-spinner"></div>
              <p>Loading tour calendar...</p>
            </div>
          ) : filteredTours.length === 0 ? (
            <div className="vsm-empty-view">
              <span className="vsm-empty-icon">🗓️</span>
              <h3>No Tours Found</h3>
              <p>
                {activeFilter === 'ALL'
                  ? "You don't have any site visits scheduled yet. Browse listings and click 'Schedule Tour' to book your first inspection!"
                  : `No ${activeFilter.toLowerCase()} tours found.`}
              </p>
            </div>
          ) : (
            <div className="vsm-tours-list">
              {filteredTours.map((tour) => {
                const isHost = user && tour.seller === user.id;
                const isBuyer = user && tour.buyer === user.id;
                const isRescheduling = reschedulingTourId === tour.id;

                // Checklist calculation
                const checklistObj = isHost ? tour.seller_checklist : tour.buyer_checklist;
                const itemsList = Object.entries(checklistObj || {});
                const completedCount = itemsList.filter(([_, item]) => item?.checked).length;
                const totalCount = itemsList.length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return (
                  <div key={tour.id} className={`vsm-tour-card status-${tour.status.toLowerCase()}`}>
                    {/* Top Row: Property & Status */}
                    <div className="vsm-card-top">
                      <div className="vsm-prop-info">
                        <img
                          src={getPropertyImageUrl(tour.property_image)}
                          alt={tour.property_title}
                          className="vsm-card-thumb"
                        />
                        <div>
                          <div className="vsm-badges-row">
                            <span className={`vsm-status-badge badge-${tour.status.toLowerCase()}`}>
                              {tour.status === 'CONFIRMED' && '✅ '}
                              {tour.status === 'UPCOMING' && '⏳ '}
                              {tour.status === 'RESCHEDULED' && '🔄 '}
                              {tour.status === 'COMPLETED' && '🏁 '}
                              {tour.status === 'CANCELLED' && '❌ '}
                              {tour.status}
                            </span>
                            <span className="vsm-prop-type-badge">{tour.property_type}</span>
                            {isHost ? (
                              <span className="vsm-role-tag host-tag">YOU ARE HOST</span>
                            ) : (
                              <span className="vsm-role-tag buyer-tag">YOU ARE VISITOR</span>
                            )}
                          </div>
                          <h3
                            className="vsm-prop-title"
                            onClick={() => onViewProperty && onViewProperty(tour.property)}
                            style={{ cursor: onViewProperty ? 'pointer' : 'default' }}
                          >
                            {tour.property_title}
                          </h3>
                          <p className="vsm-prop-address">
                            📍 {tour.property_address}, {tour.property_city} &bull; ₹{parseFloat(tour.property_price || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Appointment Time Badge */}
                      <div className="vsm-schedule-badge-box">
                        <div className="schedule-date-pill">
                          📅 {new Date(tour.scheduled_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="schedule-slot-pill">
                          ⏰ {tour.time_slot}
                        </div>
                      </div>
                    </div>

                    {/* Reschedule alert banner if applicable */}
                    {tour.rescheduled_count > 0 && tour.previous_date && (
                      <div className="vsm-reschedule-history-banner">
                        <span>🔄</span>
                        <div>
                          <strong>Rescheduled ({tour.rescheduled_count} {tour.rescheduled_count === 1 ? 'time' : 'times'}):</strong>
                          <span> Moved from {new Date(tour.previous_date).toLocaleDateString()} ({tour.previous_time_slot}).</span>
                          {tour.reschedule_reason && <em> Reason: "{tour.reschedule_reason}"</em>}
                        </div>
                      </div>
                    )}

                    {/* Host & Visitor Contact Bar */}
                    <div className="vsm-contacts-bar">
                      <div className="contact-item">
                        <span className="contact-label">HOST / OWNER:</span>
                        <strong className="contact-name">{tour.seller_name}</strong>
                        <span className="contact-meta">📞 {tour.seller_phone}</span>
                      </div>
                      <div className="contact-item">
                        <span className="contact-label">VISITOR:</span>
                        <strong className="contact-name">{tour.visitor_name}</strong>
                        <span className="contact-meta">📞 {tour.visitor_phone} &bull; ✉️ {tour.visitor_email}</span>
                      </div>
                    </div>

                    {/* Notes if provided */}
                    {tour.buyer_notes && (
                      <div className="vsm-notes-callout">
                        <strong>Visitor Notes:</strong> {tour.buyer_notes}
                      </div>
                    )}

                    {/* ── VISIT-READINESS CHECKLIST ── */}
                    <div className="vsm-checklist-container">
                      <div className="checklist-header">
                        <div className="checklist-title">
                          <span>📋</span>
                          <strong>{isHost ? 'Host Preparation Checklist' : 'Visitor Readiness Checklist'}</strong>
                        </div>
                        <div className="checklist-progress-text">
                          {completedCount} of {totalCount} Ready ({progressPct}%)
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="checklist-progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: progressPct === 100 ? '#10b981' : '#2563eb',
                          }}
                        ></div>
                      </div>

                      {/* Interactive Checklist Items */}
                      <div className="checklist-items-grid">
                        {itemsList.map(([key, item]) => (
                          <label key={key} className={`checklist-item-row ${item?.checked ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={!!item?.checked}
                              disabled={tour.status === 'COMPLETED' || tour.status === 'CANCELLED'}
                              onChange={() =>
                                handleToggleChecklist(
                                  tour.id,
                                  isHost ? 'seller' : 'buyer',
                                  key,
                                  !!item?.checked
                                )
                              }
                            />
                            <span className="checklist-item-label">{item?.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ── ONE-CLICK RESCHEDULE ACCORDION ── */}
                    {isRescheduling && (
                      <div className="vsm-reschedule-panel">
                        <h4>🔄 Reschedule Appointment</h4>
                        <div className="reschedule-grid">
                          <div className="form-group">
                            <label>New Date</label>
                            <input
                              type="date"
                              min={minDate}
                              value={rescheduleData.new_date}
                              onChange={(e) =>
                                setRescheduleData({ ...rescheduleData, new_date: e.target.value })
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>New Time Slot</label>
                            <select
                              value={rescheduleData.new_time_slot}
                              onChange={(e) =>
                                setRescheduleData({ ...rescheduleData, new_time_slot: e.target.value })
                              }
                            >
                              {TIME_SLOTS.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Reason for Rescheduling (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Schedule clash, requested later morning slot..."
                            value={rescheduleData.reason}
                            onChange={(e) =>
                              setRescheduleData({ ...rescheduleData, reason: e.target.value })
                            }
                          />
                        </div>

                        <div className="reschedule-actions">
                          <button
                            type="button"
                            className="vsm-btn-secondary"
                            onClick={() => setReschedulingTourId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="vsm-btn-confirm-reschedule"
                            disabled={submittingAction}
                            onClick={() => handleConfirmReschedule(tour.id)}
                          >
                            {submittingAction ? 'Updating...' : 'Confirm New Schedule'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="vsm-card-footer">
                      <div className="footer-left-actions">
                        {/* Google Calendar Link */}
                        <a
                          href={generateGoogleCalendarUrl(tour)}
                          target="_blank"
                          rel="noreferrer"
                          className="vsm-link-calendar"
                          title="Add this tour to Google Calendar"
                        >
                          📅 Add to Google Calendar
                        </a>
                      </div>

                      <div className="footer-right-buttons">
                        {/* One-Click Reschedule Button */}
                        {tour.status !== 'COMPLETED' && tour.status !== 'CANCELLED' && !isRescheduling && (
                          <button
                            type="button"
                            className="vsm-btn-reschedule"
                            onClick={() => handleStartReschedule(tour)}
                          >
                            🔄 Reschedule Tour
                          </button>
                        )}

                        {/* Host Confirmation Button */}
                        {isHost && tour.status === 'UPCOMING' && (
                          <button
                            type="button"
                            className="vsm-btn-confirm"
                            disabled={submittingAction}
                            onClick={() => handleUpdateStatus(tour.id, 'CONFIRMED')}
                          >
                            ✅ Confirm Tour
                          </button>
                        )}

                        {/* Mark Completed Button */}
                        {(isHost || isBuyer) && (tour.status === 'CONFIRMED' || tour.status === 'RESCHEDULED' || tour.status === 'UPCOMING') && (
                          <button
                            type="button"
                            className="vsm-btn-complete"
                            disabled={submittingAction}
                            onClick={() => handleUpdateStatus(tour.id, 'COMPLETED')}
                          >
                            🏁 Mark Completed
                          </button>
                        )}

                        {/* Cancel Button */}
                        {tour.status !== 'COMPLETED' && tour.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            className="vsm-btn-cancel"
                            disabled={submittingAction}
                            onClick={() => handleUpdateStatus(tour.id, 'CANCELLED')}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
