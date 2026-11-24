import React, { useState } from 'react';
import { purchaseAPI, getPropertyImageUrl } from './api';
import './PropertyBuyModal.css';

export default function PropertyBuyModal({
  property,
  user,
  onClose,
  onSuccess,
}) {
  if (!property) return null;

  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const activeUser = user || storedUser;

  const buyerName = activeUser?.first_name
    ? `${activeUser.first_name} ${activeUser.last_name || ''}`.trim()
    : activeUser?.username || 'Verified Buyer';
  const buyerEmail = activeUser?.email || 'buyer@homequest.ai';
  const buyerPhone = activeUser?.phone_number || '+91 98765 43210';
  const buyerAddress = activeUser?.address || 'Kerala, India';

  const basePrice = parseFloat(property.price) || 0;
  const stampDuty = basePrice * 0.08;
  const regFee = basePrice * 0.02;
  const totalCost = basePrice + stampDuty + regFee;

  const [tokenAmount, setTokenAmount] = useState(50000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInitiatePurchase = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await purchaseAPI.createPurchase({
        property: property.id,
        agreed_price: basePrice,
        token_amount: tokenAmount,
        payment_method: paymentMethod,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        buyer_address: buyerAddress,
        settlement_days: 60,
      });

      setPurchaseResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      console.error('Purchase initiation error:', err);
      const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate purchase agreement.';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="pbm-backdrop" onClick={onClose}>
      <div className="pbm-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pbm-header">
          <div>
            <span className="pbm-badge">📜 Legal Agreement & Escrow</span>
            <h2>Property Purchase & Sale Deed</h2>
            <p className="pbm-sub">
              Secure your property and generate an official Kerala Real Estate Agreement.
            </p>
          </div>
          <button className="pbm-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {purchaseResult ? (
          /* GENERATED LEGAL SALE AGREEMENT DOCUMENT VIEWER */
          <div className="pbm-agreement-pane">
            <div className="pbm-success-banner">
              <span className="pbm-check-icon">✅</span>
              <div>
                <h4>Agreement Generated Successfully!</h4>
                <p>Agreement Reference: <strong>{purchaseResult.agreement_number}</strong></p>
              </div>
              <button className="pbm-btn-print" onClick={handlePrintDocument}>
                🖨️ Print / Save PDF
              </button>
            </div>

            <div className="pbm-deed-viewer">
              <pre className="pbm-deed-text">{purchaseResult.agreement_document}</pre>
            </div>

            <div className="pbm-agreement-footer">
              <div className="pbm-deed-status">
                <span>Status: <strong className="status-badge">AGREEMENT GENERATED</strong></span>
                <span>Registry Deadline: <strong>{purchaseResult.settlement_deadline}</strong></span>
              </div>
              <button className="pbm-btn-done" onClick={onClose}>
                Done & Return to Listings
              </button>
            </div>
          </div>
        ) : (
          /* PURCHASE FORM & FEE CALCULATION */
          <div className="pbm-body">
            {errorMsg && <div className="pbm-alert-error">⚠️ {errorMsg}</div>}

            {/* Property Highlight */}
            <div className="pbm-prop-banner">
              <img
                src={getPropertyImageUrl(property)}
                alt={property.title}
                className="pbm-prop-thumb"
              />
              <div className="pbm-prop-info">
                <span className="pbm-prop-tag">{property.property_type || 'BUILDING'}</span>
                <h4>{property.title}</h4>
                <p>📍 {property.city}, Kerala ({property.address})</p>
                <div className="pbm-prop-prices">
                  <span className="pbm-price-main">
                    {property.formatted_price || `₹${basePrice.toLocaleString('en-IN')}`}
                  </span>
                  <span>📐 {property.area_sqft || property.area || '—'} sq.ft</span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown (Kerala Statutory Fees) */}
            <div className="pbm-box">
              <h4 className="pbm-box-title">📊 Kerala Real Estate Financial Breakdown</h4>
              <div className="pbm-fee-grid">
                <div className="fee-item">
                  <span>Base Listed Price:</span>
                  <strong>₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="fee-item">
                  <span>Kerala Stamp Duty (8%):</span>
                  <strong>₹{stampDuty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="fee-item">
                  <span>Sub-Registrar Fee (2%):</span>
                  <strong>₹{regFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="fee-item total-fee">
                  <span>Total Estimated Outlay:</span>
                  <strong className="total-highlight">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            {/* Buyer Identification */}
            <div className="pbm-box">
              <h4 className="pbm-box-title">👤 Purchasing Party (Auto-Identified)</h4>
              <div className="pbm-buyer-row">
                <span>Name: <strong>{buyerName}</strong></span>
                <span>Email: <strong>{buyerEmail}</strong></span>
                <span>Phone: <strong>{buyerPhone}</strong></span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pbm-footer-actions">
              <button type="button" className="pbm-btn-cancel" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="pbm-btn-submit"
                onClick={handleInitiatePurchase}
                disabled={submitting}
              >
                {submitting ? '⏳ Generating Agreement Deed...' : '📜 Generate Legal Sale Agreement'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
