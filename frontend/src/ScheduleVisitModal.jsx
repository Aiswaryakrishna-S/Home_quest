import React, { useState } from 'react';
import { tourAPI, getPropertyImageUrl } from './api';
import './ScheduleVisitModal.css';

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
];

export default function ScheduleVisitModal({ property, user, onClose, onSuccess, onOpenScheduleManager }) {
  // Tomorrow's date formatted as YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const [scheduledDate, setScheduledDate] = useState(minDate);
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 11:00 AM');
  const [visitorName, setVisitorName] = useState(
    user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || ''
  );
  const [visitorPhone, setVisitorPhone] = useState(user?.phone_number || '');
  const [visitorEmail, setVisitorEmail] = useState(user?.email || '');
  const [buyerNotes, setBuyerNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedTour, setConfirmedTour] = useState(null);

  if (!property) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Please sign in to schedule an in-person tour.');
      return;
    }

    if (!scheduledDate) {
      setError('Please select a visit date.');
      return;
    }

    setLoading(true);
    try {
      const tour = await tourAPI.createTour({
        property_id: property.id,
        scheduled_date: scheduledDate,
        time_slot: timeSlot,
        visitor_name: visitorName,
        visitor_phone: visitorPhone,
        visitor_email: visitorEmail,
        buyer_notes: buyerNotes,
      });
      setConfirmedTour(tour);
      if (onSuccess) onSuccess(tour);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to schedule tour. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="schedule-modal-close" onClick={onClose}>
          ✕
        </button>

        {confirmedTour ? (
          <div className="schedule-success-view">
            <div className="schedule-success-icon">🎉</div>
            <h2>Site Visit Tour Scheduled!</h2>
            <p className="schedule-success-sub">
              Your appointment with the property owner has been booked and added to your dedicated visit calendar.
            </p>

            <div className="schedule-confirmed-card">
              <img
                src={getPropertyImageUrl(property)}
                alt={property.title}
                className="confirmed-prop-thumb"
              />
              <div className="confirmed-prop-details">
                <span className="confirmed-badge">CONFIRMED APPOINTMENT</span>
                <h4>{property.title}</h4>
                <p className="confirmed-loc">📍 {property.address}, {property.city}</p>
                <div className="confirmed-time-box">
                  <span>📅 <strong>{new Date(confirmedTour.scheduled_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                  <span>⏰ <strong>{confirmedTour.time_slot}</strong></span>
                </div>
              </div>
            </div>

            <div className="schedule-readiness-tip">
              <span>📋</span>
              <div>
                <strong>Visit-Readiness Checklist Available</strong>
                <p>Track your ID proof, financing pre-approval, and structural inquiry notes inside your Visit Schedule Manager.</p>
              </div>
            </div>

            <div className="schedule-success-actions">
              <button
                type="button"
                className="schedule-btn-secondary"
                onClick={onClose}
              >
                Done
              </button>
              {onOpenScheduleManager && (
                <button
                  type="button"
                  className="schedule-btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenScheduleManager();
                  }}
                >
                  📅 View in Visit Calendar
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="schedule-form">
            <div className="schedule-header">
              <div className="schedule-title-row">
                <span className="schedule-calendar-icon">📅</span>
                <div>
                  <h2>Schedule an In-Person Tour</h2>
                  <p className="subtitle">Choose a convenient date & slot for your site inspection</p>
                </div>
              </div>
            </div>

            {error && <div className="schedule-error-alert">⚠️ {error}</div>}

            {/* Target Property Preview */}
            <div className="schedule-prop-preview">
              <img
                src={getPropertyImageUrl(property)}
                alt={property.title}
                className="preview-thumb"
              />
              <div className="preview-info">
                <span className="preview-type">{property.property_type}</span>
                <h4 className="preview-title">{property.title}</h4>
                <p className="preview-location">📍 {property.city}{property.state ? `, ${property.state}` : ''}</p>
                <span className="preview-price">
                  {property.formatted_price || `₹${parseFloat(property.price).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            <div className="schedule-grid-2">
              <div className="form-group">
                <label>Select Date *</label>
                <input
                  type="date"
                  min={minDate}
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="schedule-date-input"
                />
              </div>

              <div className="form-group">
                <label>Select Time Slot *</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="schedule-select-input"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="schedule-grid-3">
              <div className="form-group">
                <label>Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Your Full Name"
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Special Requests or Questions for Owner (Optional)</label>
              <textarea
                rows="2"
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                placeholder="e.g. Bringing contractor for renovation estimation, request key access to rooftop..."
              />
            </div>

            <div className="schedule-modal-footer">
              <button
                type="button"
                className="schedule-btn-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="schedule-btn-submit"
                disabled={loading}
              >
                {loading ? 'Confirming Tour...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
