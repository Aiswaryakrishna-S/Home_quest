import React from 'react';
import './PropertyAttributesForm.css';

// Main property categories matching user specification & OLX design
export const MAIN_CATEGORIES = [
  { id: 'HOUSES_APARTMENTS', label: 'Houses & Apartments', icon: '🏠', mainType: 'APARTMENT' },
  { id: 'LANDS_PLOTS', label: 'Lands & Plots', icon: '🌳', mainType: 'PLOT' },
  { id: 'RENTAL_HOMES', label: 'Rental Estates', icon: '🔑', mainType: 'RENTAL' },
  { id: 'COMMERCIAL', label: 'Commercial & Retail', icon: '🏢', mainType: 'REAL_ESTATE' },
];

const HOUSE_APARTMENT_SUBTYPES = [
  'Flats / Apartments',
  'Independent / Builder Floors',
  'Farm House',
  'House & Villa',
  'Duplex',
];

const PLOT_SUBTYPES = [
  'Residential Plot',
  'Commercial Land',
  'Agricultural / Farm Land',
  'Gated Layout Plot',
];

const COMMERCIAL_SUBTYPES = [
  'Office Space',
  'Retail Shop',
  'Showroom',
  'Warehouse / Godown',
  'Industrial Building',
];

const RENTAL_SUBTYPES = [
  'Flats / Apartments',
  'Independent / Builder Floors',
  'House & Villa',
];

const BHK_OPTIONS = ['1', '2', '3', '4', '5+'];
const BATHROOM_OPTIONS = ['1', '2', '3', '4', '5+'];
const FURNISHING_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished'];
const PROJECT_STATUS_OPTIONS = ['Ready to Move', 'Under Construction'];
const PARKING_OPTIONS = ['0', '1', '2', '3', '3+'];
const FACING_OPTIONS = [
  'East',
  'North',
  'North-East',
  'North-West',
  'South',
  'South-East',
  'South-West',
  'West',
];

export default function PropertyAttributesForm({ formState = {}, onChange }) {
  // Safe helper to propagate updates
  const setField = (field, value) => {
    if (typeof onChange === 'function') {
      onChange(field, value);
    }
  };

  const setMultipleFields = (updates) => {
    if (typeof onChange === 'function') {
      // Support object format or field-by-field fallback
      onChange(updates);
    }
  };

  // Determine current active category
  let activeCategoryId = 'HOUSES_APARTMENTS';
  if (formState.category) {
    activeCategoryId = formState.category;
  } else if (formState.property_type === 'PLOT') {
    activeCategoryId = 'LANDS_PLOTS';
  } else if (formState.property_type === 'RENTAL') {
    activeCategoryId = 'RENTAL_HOMES';
  } else if (formState.property_type === 'REAL_ESTATE') {
    activeCategoryId = 'COMMERCIAL';
  } else {
    activeCategoryId = 'HOUSES_APARTMENTS';
  }

  // Active sub-type and attribute resolution (respect empty values when editing)
  const currentSubType = formState.sub_type ?? '';
  const currentBhk =
    formState.bhk !== undefined && formState.bhk !== null ? String(formState.bhk) : '';
  const currentBathrooms =
    formState.bathrooms !== undefined && formState.bathrooms !== null
      ? String(formState.bathrooms)
      : '';
  const currentFurnishing = formState.furnishing ?? '';
  const currentStatus = formState.project_status ?? '';
  const currentParking =
    formState.car_parking !== undefined && formState.car_parking !== null
      ? String(formState.car_parking)
      : '';

  // Handle Category Switching
  const handleCategorySwitch = (cat) => {
    let defaultSub = 'Flats / Apartments';
    if (cat.id === 'LANDS_PLOTS') {
      defaultSub = 'Residential Plot';
      setMultipleFields({
        category: cat.id,
        property_type: 'PLOT',
        sub_type: defaultSub,
        bhk: '',
        bathrooms: '',
        furnishing: '',
        project_status: '',
        carpet_area: '',
        total_floors: '',
        floor_no: '',
        car_parking: '',
      });
      return;
    }

    if (cat.id === 'COMMERCIAL') defaultSub = 'Office Space';
    else if (cat.id === 'RENTAL_HOMES') defaultSub = 'Flats / Apartments';

    setMultipleFields({
      category: cat.id,
      property_type: cat.mainType,
      sub_type: defaultSub,
    });
  };

  // Handle Sub-type Click
  const handleSubTypeClick = (st) => {
    let newPropType = formState.property_type;
    if (activeCategoryId === 'HOUSES_APARTMENTS') {
      if (st === 'Flats / Apartments' || st === 'Independent / Builder Floors') {
        newPropType = 'APARTMENT';
      } else {
        newPropType = 'BUILDING';
      }
    }
    setMultipleFields({
      sub_type: st,
      property_type: newPropType,
    });
  };

  // Condition to check if this property type is an apartment/floor unit
  const isApartmentType =
    currentSubType === 'Flats / Apartments' ||
    currentSubType === 'Independent / Builder Floors' ||
    currentSubType === 'Office Space';

  return (
    <div className="olx-details-card">
      {/* ── STEP 1: CHOOSE CATEGORY BUTTONS ── */}
      <div className="olx-attribute-group">
        <div className="olx-header-row">
          <label className="olx-attribute-label">
            Selected Category <span className="olx-req-star">*</span>
          </label>
          <span className="olx-category-badge">
            {MAIN_CATEGORIES.find((c) => c.id === activeCategoryId)?.label || 'Houses & Apartments'}
          </span>
        </div>
        <div className="olx-category-buttons-row">
          {MAIN_CATEGORIES.map((cat) => {
            const isSelected = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`olx-category-btn ${isSelected ? 'active' : ''}`}
                onClick={() => handleCategorySwitch(cat)}
                aria-pressed={isSelected}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
                {isSelected && <span className="cat-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <h3 className="olx-details-title">INCLUDE SOME DETAILS</h3>

      {/* ── SUB-TYPE (Flats / Apartments, House & Villa, Farm House, Duplex) ── */}
      <div className="olx-attribute-group">
        <label className="olx-attribute-label">
          Type <span className="olx-req-star">*</span>
        </label>
        <div className="olx-chips-row">
          {(activeCategoryId === 'LANDS_PLOTS'
            ? PLOT_SUBTYPES
            : activeCategoryId === 'COMMERCIAL'
            ? COMMERCIAL_SUBTYPES
            : activeCategoryId === 'RENTAL_HOMES'
            ? RENTAL_SUBTYPES
            : HOUSE_APARTMENT_SUBTYPES
          ).map((type) => {
            const isSelected = currentSubType === type;
            return (
              <button
                key={type}
                type="button"
                className={`olx-chip-btn ${isSelected ? 'active' : ''}`}
                onClick={() => handleSubTypeClick(type)}
                aria-pressed={isSelected}
              >
                <span>{type}</span>
                {isSelected && <span className="chip-tick">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── HOUSES & APARTMENTS / RENTAL ATTRIBUTES ── */}
      {(activeCategoryId === 'HOUSES_APARTMENTS' || activeCategoryId === 'RENTAL_HOMES') && (
        <>
          {/* BHK */}
          <div className="olx-attribute-group">
            <label className="olx-attribute-label">BHK / Bedrooms</label>
            <div className="olx-chips-row">
              {BHK_OPTIONS.map((val) => {
                const isSelected = currentBhk === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`olx-chip-btn btn-sm ${isSelected ? 'active' : ''}`}
                    onClick={() => setField('bhk', val)}
                    aria-pressed={isSelected}
                  >
                    <span>{val}</span>
                    {isSelected && <span className="chip-tick">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="olx-field-wrap" style={{ marginTop: '0.45rem', maxWidth: '320px' }}>
              <input
                type="text"
                className="olx-input-control"
                placeholder="Or type BHK / Bedrooms (e.g. 2, 3, 4)"
                value={formState.bhk || ''}
                onChange={(e) => setField('bhk', e.target.value)}
              />
            </div>
          </div>

          {/* Bathrooms */}
          <div className="olx-attribute-group">
            <label className="olx-attribute-label">Bathrooms</label>
            <div className="olx-chips-row">
              {BATHROOM_OPTIONS.map((val) => {
                const isSelected = currentBathrooms === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`olx-chip-btn btn-sm ${isSelected ? 'active' : ''}`}
                    onClick={() => setField('bathrooms', val)}
                    aria-pressed={isSelected}
                  >
                    <span>{val}</span>
                    {isSelected && <span className="chip-tick">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="olx-field-wrap" style={{ marginTop: '0.45rem', maxWidth: '320px' }}>
              <input
                type="text"
                className="olx-input-control"
                placeholder="Enter / edit number of bathrooms (e.g. 1, 2, 3, 4)"
                value={formState.bathrooms || ''}
                onChange={(e) => setField('bathrooms', e.target.value)}
              />
            </div>
          </div>

          {/* Furnishing */}
          <div className="olx-attribute-group">
            <label className="olx-attribute-label">Furnishing</label>
            <div className="olx-chips-row">
              {FURNISHING_OPTIONS.map((val) => {
                const isSelected = currentFurnishing === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`olx-chip-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setField('furnishing', val)}
                    aria-pressed={isSelected}
                  >
                    <span>{val}</span>
                    {isSelected && <span className="chip-tick">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Status (Only for Houses & Apartments Sale) */}
          {activeCategoryId === 'HOUSES_APARTMENTS' && (
            <div className="olx-attribute-group">
              <label className="olx-attribute-label">Project Status</label>
              <div className="olx-chips-row">
                {PROJECT_STATUS_OPTIONS.map((val) => {
                  const isSelected = currentStatus === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`olx-chip-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setField('project_status', val)}
                      aria-pressed={isSelected}
                    >
                      <span>{val}</span>
                      {isSelected && <span className="chip-tick">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── COMMERCIAL ATTRIBUTES ── */}
      {activeCategoryId === 'COMMERCIAL' && (
        <>
          <div className="olx-attribute-group">
            <label className="olx-attribute-label">Furnishing</label>
            <div className="olx-chips-row">
              {['Furnished', 'Semi-Furnished', 'Bare Shell'].map((val) => {
                const isSelected = currentFurnishing === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`olx-chip-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setField('furnishing', val)}
                    aria-pressed={isSelected}
                  >
                    <span>{val}</span>
                    {isSelected && <span className="chip-tick">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="olx-attribute-group">
            <label className="olx-attribute-label">Bathrooms / Washrooms</label>
            <div className="olx-chips-row">
              {['0', '1', '2', '3', '4', '5+'].map((val) => {
                const isSelected = currentBathrooms === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`olx-chip-btn btn-sm ${isSelected ? 'active' : ''}`}
                    onClick={() => setField('bathrooms', val)}
                    aria-pressed={isSelected}
                  >
                    <span>{val}</span>
                    {isSelected && <span className="chip-tick">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="olx-field-wrap" style={{ marginTop: '0.45rem', maxWidth: '320px' }}>
              <input
                type="text"
                className="olx-input-control"
                placeholder="Enter / edit bathrooms / washrooms (e.g. 2, 4)"
                value={formState.bathrooms || ''}
                onChange={(e) => setField('bathrooms', e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* ── AREA FIELDS (Super Builtup & Carpet Area) ── */}
      <div className="olx-grid-2">
        <div className="olx-attribute-group">
          <label className="olx-attribute-label">
            {activeCategoryId === 'LANDS_PLOTS' ? 'Plot Area (sq.ft) *' : 'Super Builtup area sqft *'}
          </label>
          <div className="olx-field-wrap">
            <input
              type="number"
              required
              className="olx-input-control"
              value={formState.area_sqft || ''}
              onChange={(e) => setField('area_sqft', e.target.value)}
              placeholder={activeCategoryId === 'LANDS_PLOTS' ? 'e.g. 2400' : 'e.g. 1650'}
            />
          </div>
        </div>

        {activeCategoryId !== 'LANDS_PLOTS' && (
          <div className="olx-attribute-group">
            <label className="olx-attribute-label">Carpet Area sqft</label>
            <div className="olx-field-wrap">
              <input
                type="number"
                className="olx-input-control"
                value={formState.carpet_area || ''}
                onChange={(e) => setField('carpet_area', e.target.value)}
                placeholder="e.g. 1350"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── MAINTENANCE (MONTHLY) ── */}
      {activeCategoryId !== 'LANDS_PLOTS' && (
        <div className="olx-attribute-group">
          <label className="olx-attribute-label">Maintenance (Monthly ₹)</label>
          <div className="olx-field-wrap">
            <input
              type="number"
              className="olx-input-control"
              value={formState.maintenance_monthly || ''}
              onChange={(e) => setField('maintenance_monthly', e.target.value)}
              placeholder="e.g. 2500"
            />
          </div>
        </div>
      )}

      {/* ── TOTAL FLOORS & FLOOR NO ── */}
      {activeCategoryId !== 'LANDS_PLOTS' && (
        <div className="olx-grid-2">
          <div className="olx-attribute-group">
            <label className="olx-attribute-label">Total Floors</label>
            <div className="olx-field-wrap">
              <input
                type="number"
                className="olx-input-control"
                value={formState.total_floors || ''}
                onChange={(e) => setField('total_floors', e.target.value)}
                placeholder={isApartmentType ? 'e.g. 14' : 'e.g. 2'}
              />
            </div>
          </div>

          {isApartmentType && (
            <div className="olx-attribute-group">
              <label className="olx-attribute-label">Floor No</label>
              <div className="olx-field-wrap">
                <input
                  type="number"
                  className="olx-input-control"
                  value={formState.floor_no || ''}
                  onChange={(e) => setField('floor_no', e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CAR PARKING ── */}
      {activeCategoryId !== 'LANDS_PLOTS' && (
        <div className="olx-attribute-group">
          <label className="olx-attribute-label">Car Parking</label>
          <div className="olx-chips-row">
            {PARKING_OPTIONS.map((val) => {
              const isSelected = currentParking === val;
              return (
                <button
                  key={val}
                  type="button"
                  className={`olx-chip-btn btn-sm ${isSelected ? 'active' : ''}`}
                  onClick={() => setField('car_parking', val)}
                  aria-pressed={isSelected}
                >
                  <span>{val}</span>
                  {isSelected && <span className="chip-tick">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FACING ── */}
      <div className="olx-attribute-group">
        <label className="olx-attribute-label">Facing</label>
        <div className="olx-field-wrap">
          <select
            className="olx-select-control"
            value={formState.facing || ''}
            onChange={(e) => setField('facing', e.target.value)}
          >
            <option value="">Select Facing Direction</option>
            {FACING_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PROJECT NAME ── */}
      <div className="olx-attribute-group">
        <label className="olx-attribute-label">Project Name</label>
        <div className="olx-field-wrap">
          <input
            type="text"
            maxLength={70}
            className="olx-input-control"
            value={formState.project_name || ''}
            onChange={(e) => setField('project_name', e.target.value)}
            placeholder="e.g. Skyline Imperial, Asset Homes Enclave"
          />
          <div className="olx-meta-footer">
            <span className="olx-sub-caption">Residential / Builder project identity</span>
            <span className="olx-char-count">{(formState.project_name || '').length} / 70</span>
          </div>
        </div>
      </div>
    </div>
  );
}
