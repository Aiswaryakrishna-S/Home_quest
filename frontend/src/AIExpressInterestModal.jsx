import React, { useState, useEffect } from 'react';
import { chatbotAPI, getPropertyImageUrl } from './api';
import './AIExpressInterestModal.css';

const QUICK_REQUESTS = [
  { id: 'ready', icon: '⚡', label: 'Ready Cash Buyer', text: 'I am a serious buyer with organized financing and am prepared to move forward promptly.' },
  { id: 'visit', icon: '📅', label: 'Weekend Site Visit', text: 'I would like to schedule an in-person site inspection this coming weekend to inspect the property.' },
  { id: 'legal', icon: '💼', label: 'Legal & Title Review', text: 'I am interested in reviewing the title deed, encumbrance certificate (EC), and municipal approvals.' },
  { id: 'negotiate', icon: '💰', label: 'Price Discussion', text: 'I have keen interest in this property and would like to discuss price flexibility for prompt closing.' },
];

export default function AIExpressInterestModal({
  property,
  user,
  onClose,
  onSuccess,
}) {
  // 1. Automatically find who is sending from user credentials (Props or LocalStorage)
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const activeUser = user || storedUser;

  const senderName = activeUser?.first_name
    ? `${activeUser.first_name} ${activeUser.last_name || ''}`.trim()
    : activeUser?.username || 'Verified HomeQuest Buyer';
  const senderEmail = activeUser?.email || 'buyer@homequest.ai';
  const senderPhone = activeUser?.phone_number || '+91 (Not Provided)';
  const senderRole = activeUser?.role || 'BUYER';

  const [userRequest, setUserRequest] = useState(
    'I have strong purchase interest with organized financing and would like to schedule a site inspection.'
  );
  const [selectedQuickId, setSelectedQuickId] = useState('ready');
  const [aiExplanation, setAiExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-generate AI explanation based on detected credentials + user request
  useEffect(() => {
    if (property) {
      handleGenerateExplanation(userRequest);
    }
  }, [property]);

  const handleGenerateExplanation = async (requestText) => {
    if (!property) return;
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await chatbotAPI.draftInquiry({
        property_id: property.id,
        buyer_name: senderName,
        buyer_email: senderEmail,
        buyer_phone: senderPhone,
        user_request: requestText,
        intent_tone: selectedQuickId === 'legal' ? 'professional' : selectedQuickId === 'visit' ? 'site_visit' : selectedQuickId === 'negotiate' ? 'negotiation' : 'ready_to_buy',
      });

      if (res && res.draft_message) {
        setAiExplanation(res.draft_message);
      }
    } catch (err) {
      console.warn('AI explanation error:', err);
      const owner = property.seller_name || 'Property Owner';
      const fallback = `Hello ${owner}, my name is ${senderName}. I am actively inquiring about your property "${property.title}" in ${property.city} (${property.formatted_price || '₹' + property.price}). Regarding my interest: ${requestText} Please contact me via phone (${senderPhone}) or email (${senderEmail}) to coordinate next steps.`;
      setAiExplanation(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectQuick = (item) => {
    setSelectedQuickId(item.id);
    setUserRequest(item.text);
    handleGenerateExplanation(item.text);
  };

  const handleSendNow = async () => {
    setIsSending(true);
    setErrorMsg('');

    try {
      const res = await chatbotAPI.autoSendInquiry({
        property_id: property.id,
        user_request: userRequest,
        buyer_name: senderName,
        buyer_email: senderEmail,
        buyer_phone: senderPhone,
        intent_tone: selectedQuickId === 'legal' ? 'professional' : selectedQuickId === 'visit' ? 'site_visit' : selectedQuickId === 'negotiate' ? 'negotiation' : 'ready_to_buy',
      });

      if (res && res.success) {
        setSentSuccess(true);
        if (onSuccess) {
          onSuccess(property, res);
        }
      }
    } catch (err) {
      console.error('Failed to auto-send inquiry:', err);
      const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to dispatch inquiry. Please try again.';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsSending(false);
    }
  };

  if (!property) return null;

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-header-title">
            <span className="ai-badge-header">⚡ Automated AI Purchase Inquiry</span>
            <h2>AI Express Interest & Purchase Proposal</h2>
            <p className="ai-header-sub">
              The AI automatically detected your credentials and prepared an inquiry based on your requirement.
            </p>
          </div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {sentSuccess ? (
          /* SUCCESS STATE */
          <div className="ai-success-pane">
            <div className="success-icon-bounce">🚀</div>
            <h3>Inquiry Automatically Dispatched!</h3>
            <p className="success-text">
              The AI has created and delivered your tailored purchase inquiry directly to <strong>{property.seller_name || 'the seller'}</strong>.
            </p>

            <div className="success-recap-box">
              <div className="recap-row">
                <span className="recap-label">👤 Inquiring Buyer:</span>
                <span className="recap-val"><strong>{senderName}</strong></span>
              </div>
              <div className="recap-row">
                <span className="recap-label">✉️ Contact Delivered:</span>
                <span className="recap-val">{senderEmail} {senderPhone !== '+91 (Not Provided)' ? `• ${senderPhone}` : ''}</span>
              </div>
              <div className="recap-row">
                <span className="recap-label">🏡 Target Property:</span>
                <span className="recap-val">{property.title} ({property.city})</span>
              </div>
              <div className="recap-row">
                <span className="recap-label">💰 Listed Price:</span>
                <span className="recap-val">{property.formatted_price || `₹${parseFloat(property.price).toLocaleString()}`}</span>
              </div>
              <div className="recap-row">
                <span className="recap-label">👤 Seller Notified:</span>
                <span className="recap-val"><strong>{property.seller_name || 'Property Owner'}</strong> (Dashboard Inbox)</span>
              </div>
            </div>

            <div className="ai-success-actions">
              <button className="btn-ai-done" onClick={onClose}>
                Done & Return to Listings
              </button>
            </div>
          </div>
        ) : (
          /* AUTOMATIC INQUIRY SCREEN (NO ASKING FOR DETAILS) */
          <div className="ai-modal-body">
            {errorMsg && <div className="ai-alert-error">⚠️ {errorMsg}</div>}

            {/* 1. Target Property Card */}
            <div className="ai-prop-preview">
              <img
                src={getPropertyImageUrl(property)}
                alt={property.title}
                className="ai-prop-thumb"
              />
              <div className="ai-prop-info">
                <span className="ai-prop-type-badge">{property.property_type || 'PROPERTY'}</span>
                <h4 className="ai-prop-title">{property.title}</h4>
                <div className="ai-prop-specs">
                  <span>📍 {property.city}</span>
                  <span>📐 {property.area_sqft || property.area || '—'} sq.ft</span>
                  <span>👤 Seller: <strong>{property.seller_name || 'Owner'}</strong></span>
                </div>
                <div className="ai-prop-price-tag">
                  {property.formatted_price || `₹${parseFloat(property.price).toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* 2. AUTOMATICALLY DETECTED SENDER CREDENTIALS (Zero manual typing) */}
            <div className="ai-detected-sender-card">
              <div className="detected-sender-avatar">👤</div>
              <div className="detected-sender-meta">
                <div className="detected-badge-row">
                  <span className="detected-title">Identified Sender Credentials</span>
                  <span className="verified-badge-pill">🛡️ {senderRole} Account</span>
                </div>
                <div className="sender-credentials-display">
                  <strong className="sender-name-text">{senderName}</strong>
                  <span className="sender-contact-text">✉️ {senderEmail}</span>
                  {senderPhone && senderPhone !== '+91 (Not Provided)' && (
                    <span className="sender-contact-text">📞 {senderPhone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. YOUR REQUIREMENT / MOTIVATION (Quick 1-Tap Chips) */}
            <div className="ai-section-box">
              <div className="section-box-header">
                <span className="sec-icon">🎯</span>
                <h4>Your Requirement / Intent for this Property</h4>
                <span className="sec-sub-note">Click a requirement to tailor the explanation</span>
              </div>
              <div className="quick-req-grid">
                {QUICK_REQUESTS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`quick-req-pill ${selectedQuickId === q.id ? 'active' : ''}`}
                    onClick={() => handleSelectQuick(q)}
                    disabled={isGenerating || isSending}
                  >
                    <span className="req-icon">{q.icon}</span>
                    <span className="req-label">{q.label}</span>
                  </button>
                ))}
              </div>
              <div className="custom-req-input-wrap">
                <input
                  type="text"
                  className="custom-req-input"
                  placeholder="Or customize your requirement: e.g. looking for 3-BHK with immediate payment..."
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  onBlur={() => handleGenerateExplanation(userRequest)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateExplanation(userRequest);
                    }
                  }}
                  disabled={isGenerating || isSending}
                />
              </div>
            </div>

            {/* 4. AI-GENERATED EXPLANATION & PROPOSAL */}
            <div className="ai-section-box">
              <div className="message-header-row">
                <div className="section-box-header" style={{ marginBottom: 0 }}>
                  <span className="sec-icon">✨</span>
                  <h4>AI Tailored Explanation for Seller</h4>
                </div>
                <span className="ai-live-badge">
                  {isGenerating ? '⚡ Drafting with AI...' : '✓ AI Calibrated'}
                </span>
              </div>

              <div className="ai-explanation-bubble">
                {isGenerating ? (
                  <div className="ai-bubble-loading">
                    <span className="pulse-dot"></span>
                    <span>AI is crafting a personalized explanation based on your request...</span>
                  </div>
                ) : (
                  <p className="ai-bubble-text">"{aiExplanation}"</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="ai-modal-footer">
              <button type="button" className="btn-ai-cancel" onClick={onClose} disabled={isSending}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-ai-submit"
                onClick={handleSendNow}
                disabled={isSending || isGenerating}
              >
                {isSending ? '🚀 Dispatched to Owner...' : '🚀 Send AI Inquiry to Owner'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
