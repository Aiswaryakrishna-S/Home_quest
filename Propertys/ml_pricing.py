# =====================================================================
# HOMEQUEST AI - KERALA REAL ESTATE ML PRICING & INCREMENT ENGINE
# Specially Calibrated for Kerala's 14 Districts, NH 66 Corridor, 
# NH 544, MC Road, and Major IT Corridors (Infopark, Technopark, Cyberpark)
# =====================================================================

import os
import math
import random
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score, mean_absolute_percentage_error

# Base directories
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
MODEL_FILE = DATA_DIR / 'kerala_price_model.pkl'
CSV_FILE = DATA_DIR / 'kerala_real_estate_data.csv'

# ── 1. KERALA DISTRICTS & REFERENCE CITY COORDINATES ──
KERALA_DISTRICTS = {
    'ernakulam': {'name': 'Ernakulam', 'lat': 9.9816, 'lng': 76.2999, 'base_sqft': 5800, 'tier': 'Tier-1'},
    'kochi': {'name': 'Ernakulam', 'lat': 9.9816, 'lng': 76.2999, 'base_sqft': 6400, 'tier': 'Tier-1'},
    'kakkanad': {'name': 'Ernakulam', 'lat': 10.0159, 'lng': 76.3419, 'base_sqft': 6000, 'tier': 'Tier-1'},
    'edappally': {'name': 'Ernakulam', 'lat': 10.0261, 'lng': 76.3125, 'base_sqft': 6800, 'tier': 'Tier-1'},
    'aluva': {'name': 'Ernakulam', 'lat': 10.1076, 'lng': 76.3516, 'base_sqft': 5200, 'tier': 'Tier-1'},
    'thiruvananthapuram': {'name': 'Thiruvananthapuram', 'lat': 8.5241, 'lng': 76.9366, 'base_sqft': 5500, 'tier': 'Tier-1'},
    'trivandrum': {'name': 'Thiruvananthapuram', 'lat': 8.5241, 'lng': 76.9366, 'base_sqft': 5500, 'tier': 'Tier-1'},
    'kazhakkoottam': {'name': 'Thiruvananthapuram', 'lat': 8.5686, 'lng': 76.8731, 'base_sqft': 5800, 'tier': 'Tier-1'},
    'kozhikode': {'name': 'Kozhikode', 'lat': 11.2588, 'lng': 75.7804, 'base_sqft': 4900, 'tier': 'Tier-1'},
    'calicut': {'name': 'Kozhikode', 'lat': 11.2588, 'lng': 75.7804, 'base_sqft': 4900, 'tier': 'Tier-1'},
    'thrissur': {'name': 'Thrissur', 'lat': 10.5276, 'lng': 76.2144, 'base_sqft': 4600, 'tier': 'Tier-2'},
    'kottayam': {'name': 'Kottayam', 'lat': 9.5916, 'lng': 76.5222, 'base_sqft': 4200, 'tier': 'Tier-2'},
    'kollam': {'name': 'Kollam', 'lat': 8.8932, 'lng': 76.6141, 'base_sqft': 3900, 'tier': 'Tier-2'},
    'alappuzha': {'name': 'Alappuzha', 'lat': 9.4981, 'lng': 76.3388, 'base_sqft': 3800, 'tier': 'Tier-2'},
    'palakkad': {'name': 'Palakkad', 'lat': 10.7867, 'lng': 76.6548, 'base_sqft': 3600, 'tier': 'Tier-2'},
    'malappuram': {'name': 'Malappuram', 'lat': 11.0510, 'lng': 76.0711, 'base_sqft': 3500, 'tier': 'Tier-2'},
    'kannur': {'name': 'Kannur', 'lat': 11.8745, 'lng': 75.3704, 'base_sqft': 3800, 'tier': 'Tier-2'},
    'kasaragod': {'name': 'Kasaragod', 'lat': 12.4996, 'lng': 74.9869, 'base_sqft': 3100, 'tier': 'Tier-3'},
    'pathanamthitta': {'name': 'Pathanamthitta', 'lat': 9.2648, 'lng': 76.7870, 'base_sqft': 3200, 'tier': 'Tier-3'},
    'idukki': {'name': 'Idukki', 'lat': 9.8959, 'lng': 76.7184, 'base_sqft': 2800, 'tier': 'Tier-3'},
    'wayanad': {'name': 'Wayanad', 'lat': 11.6103, 'lng': 76.0827, 'base_sqft': 2900, 'tier': 'Tier-3'},
}

# ── 2. MAJOR KERALA HIGHWAY WAYPOINTS (NH 66, NH 544, MC ROAD) ──
# NH 66 6-Lane Expansion Corridor Waypoints across Kerala:
NH66_WAYPOINTS = [
    (8.3000, 77.0800), # Parasala (Kerala Border)
    (8.4000, 77.0100), # Neyyattinkara
    (8.5686, 76.8731), # Kazhakkoottam (Trivandrum)
    (8.6964, 76.8143), # Attingal
    (8.8050, 76.7400), # Kallambalam / Parippally
    (8.8932, 76.6141), # Kollam Bypass
    (9.0537, 76.5358), # Karunagappally
    (9.1729, 76.5013), # Kayamkulam
    (9.2844, 76.4589), # Haripad
    (9.3831, 76.3639), # Ambalapuzha
    (9.4981, 76.3388), # Alappuzha Bypass
    (9.6847, 76.3323), # Cherthala
    (9.8734, 76.3056), # Aroor
    (9.9368, 76.3168), # Kundannoor (Kochi)
    (9.9678, 76.3182), # Vyttila
    (10.0261, 76.3125), # Edappally
    (10.0768, 76.2731), # Varapuzha
    (10.2241, 76.1963), # Kodungallur
    (10.5947, 76.0234), # Chavakkad
    (10.7674, 75.9254), # Ponnani
    (10.9754, 75.8672), # Tirur
    (11.1500, 75.8400), # Ramanattukara
    (11.2588, 75.8200), # Kozhikode Bypass
    (11.4428, 75.6978), # Koyilandy
    (11.6044, 75.5908), # Vadakara
    (11.7491, 75.4890), # Thalassery
    (11.8745, 75.3704), # Kannur
    (12.1028, 75.2016), # Payyanur
    (12.3090, 75.0910), # Kanhangad
    (12.4996, 74.9869), # Kasaragod
    (12.7500, 74.9100), # Manjeshwar / Karnataka border
]

# NH 544 (Salem - Kochi 4/6 Lane Highway) Waypoints:
NH544_WAYPOINTS = [
    (10.0261, 76.3125), # Edappally
    (10.1076, 76.3516), # Aluva
    (10.1960, 76.3860), # Angamaly
    (10.3070, 76.3330), # Chalakudy
    (10.4500, 76.2800), # Paliakkara (Thrissur)
    (10.5276, 76.2144), # Thrissur Bypass
    (10.5940, 76.4950), # Vadakkencherry
    (10.6450, 76.5450), # Alathur
    (10.7867, 76.6548), # Palakkad
    (10.8250, 76.8500), # Walayar Border
]

# MC Road (State Highway 1) Waypoints:
MCROAD_WAYPOINTS = [
    (8.5300, 76.9350), # Kesavadasapuram (Trivandrum)
    (8.6780, 76.9140), # Venjaramoodu
    (8.7660, 76.8790), # Kilimanoor
    (8.9980, 76.7720), # Kottarakkara
    (9.1530, 76.7350), # Adoor
    (9.2310, 76.6830), # Pandalam
    (9.3170, 76.6140), # Chengannur
    (9.3830, 76.5740), # Thiruvalla
    (9.4440, 76.5390), # Changanassery
    (9.5916, 76.5222), # Kottayam
    (9.6670, 76.5610), # Ettumanoor
    (9.7540, 76.5680), # Kuravilangad
    (9.8630, 76.5890), # Koothattukulam
    (9.9810, 76.5780), # Muvattupuzha
    (10.1130, 76.4780), # Perumbavoor
    (10.1960, 76.3860), # Angamaly
]

# Major IT & Commercial Hubs in Kerala:
KERALA_HUBS = {
    'infopark_kochi': {'name': 'Infopark & SmartCity (Kakkanad)', 'lat': 10.0105, 'lng': 76.3630},
    'technopark_tvm': {'name': 'Technopark (Kazhakkoottam)', 'lat': 8.5581, 'lng': 76.8812},
    'cyberpark_clt': {'name': 'Cyberpark & UL CyberPark (Palazhi)', 'lat': 11.2642, 'lng': 75.8394},
    'cial_airport': {'name': 'Cochin Int. Airport (CIAL)', 'lat': 10.1518, 'lng': 76.3930},
    'kochi_metro': {'name': 'Kochi Metro Line (Aluva - MG Road)', 'lat': 10.0050, 'lng': 76.3100},
}


# ── 3. GEOSPATIAL HELPER FUNCTIONS ──
def haversine(lat1, lon1, lat2, lon2):
    """Calculates distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def min_dist_to_polyline(lat, lng, waypoints):
    """Finds minimum distance from a point to a corridor defined by waypoints (in km)."""
    min_dist = float('inf')
    for wlat, wlng in waypoints:
        d = haversine(lat, lng, wlat, wlng)
        if d < min_dist:
            min_dist = d
    return round(min_dist, 2)


def get_kerala_spatial_metrics(lat, lng, district_hint=''):
    """
    Computes key spatial distances for any coordinate in Kerala:
    - Distance to NH 66 corridor
    - Distance to NH 544
    - Distance to MC Road
    - Distance to nearest major IT hub
    - Best matching district
    """
    d_nh66 = min_dist_to_polyline(lat, lng, NH66_WAYPOINTS)
    d_nh544 = min_dist_to_polyline(lat, lng, NH544_WAYPOINTS)
    d_mcroad = min_dist_to_polyline(lat, lng, MCROAD_WAYPOINTS)
    d_highway = min(d_nh66, d_nh544, d_mcroad)

    # Nearest IT hub
    hub_dists = []
    for hub_key, hub_data in KERALA_HUBS.items():
        d = haversine(lat, lng, hub_data['lat'], hub_data['lng'])
        hub_dists.append((d, hub_data['name']))
    hub_dists.sort(key=lambda x: x[0])
    nearest_hub_dist, nearest_hub_name = hub_dists[0]

    # Nearest district center
    district_dists = []
    for d_key, d_info in KERALA_DISTRICTS.items():
        d = haversine(lat, lng, d_info['lat'], d_info['lng'])
        district_dists.append((d, d_info['name'], d_info['base_sqft'], d_info['tier']))
    district_dists.sort(key=lambda x: x[0])
    center_dist, district_name, base_rate, tier = district_dists[0]

    # If district hint was provided, match preferred name
    if district_hint:
        hint_clean = district_hint.strip().lower()
        if hint_clean in KERALA_DISTRICTS:
            district_name = KERALA_DISTRICTS[hint_clean]['name']
            base_rate = KERALA_DISTRICTS[hint_clean]['base_sqft']
            tier = KERALA_DISTRICTS[hint_clean]['tier']

    return {
        'dist_nh66_km': d_nh66,
        'dist_nh544_km': d_nh544,
        'dist_mcroad_km': d_mcroad,
        'dist_highway_km': d_highway,
        'nearest_it_hub_km': round(nearest_hub_dist, 2),
        'nearest_it_hub_name': nearest_hub_name,
        'dist_center_km': round(center_dist, 2),
        'district': district_name,
        'base_sqft_rate': base_rate,
        'tier': tier
    }


# ── 4. DATASET GENERATION (REALISTIC KERALA BENCHMARK) ──
def generate_kerala_dataset(num_samples=5000, output_path=CSV_FILE):
    """
    Generates a calibrated synthetic/benchmark dataset of 5,000 real estate properties
    across Kerala, incorporating real highway proximity multipliers and micro-market rates.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    random.seed(42)
    np.random.seed(42)

    rows = []
    district_keys = list(KERALA_DISTRICTS.keys())
    property_types = ['BUILDING', 'PLOT', 'RENTAL', 'APARTMENT', 'REAL_ESTATE']

    for i in range(num_samples):
        # Pick a location around a Kerala district / city
        d_key = random.choice(district_keys)
        d_info = KERALA_DISTRICTS[d_key]
        
        # Add random GPS jitter within ±15 km radius
        lat_jitter = random.uniform(-0.12, 0.12)
        lng_jitter = random.uniform(-0.12, 0.12)
        lat = round(d_info['lat'] + lat_jitter, 6)
        lng = round(d_info['lng'] + lng_jitter, 6)

        p_type = random.choice(property_types)
        
        # Area in Sq Ft
        if p_type == 'APARTMENT':
            area = random.choice([850, 1100, 1250, 1450, 1650, 1850, 2200])
        elif p_type == 'BUILDING':  # Independent House / Villa
            area = random.choice([1200, 1500, 1800, 2200, 2600, 3200, 4000])
        elif p_type == 'PLOT':
            # In Kerala plots: typically 3 to 15 cents (1 cent = ~435.6 sq ft)
            cents = random.uniform(3, 15)
            area = int(round(cents * 435.6))
        elif p_type == 'RENTAL':
            area = random.choice([700, 950, 1200, 1500, 1900])
        else: # REAL_ESTATE / Commercial
            area = random.choice([1500, 2500, 3500, 5000, 8000])

        # Compute spatial features
        spatial = get_kerala_spatial_metrics(lat, lng, d_key)
        dist_nh66 = spatial['dist_nh66_km']
        dist_hw = spatial['dist_highway_km']
        dist_hub = spatial['nearest_it_hub_km']
        dist_center = spatial['dist_center_km']
        base_sqft = spatial['base_sqft_rate']

        # ── Kerala Price Calculation Formula ──
        # 1. Base rate per sqft for this district
        rate = base_sqft

        # 2. Highway Proximity Premium:
        # Properties within 0-1 km of NH 66 have seen +25% boom
        if dist_nh66 <= 1.0:
            rate *= random.uniform(1.22, 1.35)
        elif dist_nh66 <= 2.5:
            rate *= random.uniform(1.12, 1.20)
        elif dist_hw <= 1.5: # Other highways (NH 544 / MC Road)
            rate *= random.uniform(1.10, 1.18)
        elif dist_hw > 6.0:
            rate *= random.uniform(0.85, 0.95)

        # 3. IT Hub Proximity:
        if dist_hub <= 3.0:
            rate *= random.uniform(1.12, 1.22)
        elif dist_hub <= 6.0:
            rate *= random.uniform(1.05, 1.10)

        # 4. City Center Proximity:
        if dist_center <= 3.0:
            rate *= random.uniform(1.10, 1.20)
        elif dist_center > 10.0:
            rate *= random.uniform(0.88, 0.96)

        # 5. Property Type Multiplier:
        if p_type == 'REAL_ESTATE':
            rate *= 1.35  # Prime commercial value
        elif p_type == 'APARTMENT':
            rate *= 1.05
        elif p_type == 'PLOT':
            rate *= 0.85  # Raw land without built structure
        elif p_type == 'RENTAL':
            # For rentals, price is monthly rent (roughly 0.35% to 0.45% of property value per month)
            pass

        # Final Price
        if p_type == 'RENTAL':
            # Monthly rent in Kerala: ₹12,000 to ₹65,000 / mo
            monthly_rent = int(round((area * (rate * 0.0035)) / 500) * 500)
            price = max(8000, monthly_rent)
        else:
            total_price = int(round(area * rate, -3)) # Round to nearest thousand
            price = max(1000000, total_price)

        rows.append({
            'district': spatial['district'],
            'city': d_key.capitalize(),
            'property_type': p_type,
            'area_sqft': area,
            'latitude': lat,
            'longitude': lng,
            'dist_nh66_km': dist_nh66,
            'dist_highway_km': dist_hw,
            'dist_it_hub_km': dist_hub,
            'dist_center_km': dist_center,
            'rate_per_sqft': round(price / area if p_type != 'RENTAL' else (price * 12) / area, 2),
            'price': price
        })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"✅ Generated Kerala Real Estate Dataset with {len(df)} records at {output_path}")
    return df


# ── 5. MODEL TRAINING & PERSISTENCE ──
def train_kerala_model():
    """Trains a Random Forest Regressor on Kerala real estate data and saves the model."""
    if not CSV_FILE.exists():
        df = generate_kerala_dataset()
    else:
        df = pd.read_csv(CSV_FILE)

    # Feature definitions
    cat_features = ['property_type', 'district']
    num_features = ['area_sqft', 'dist_nh66_km', 'dist_highway_km', 'dist_it_hub_km', 'dist_center_km']

    X = df[cat_features + num_features]
    y = df['price']

    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_features),
            ('num', 'passthrough', num_features)
        ]
    )

    # Random Forest Regressor Pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(
            n_estimators=100,
            max_depth=16,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1
        ))
    ])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    pipeline.fit(X_train, y_train)

    # Evaluation
    preds = pipeline.predict(X_test)
    r2 = r2_score(y_test, preds)
    mape = mean_absolute_percentage_error(y_test, preds)

    print(f"🎯 Model Trained! R² Score: {r2:.4f} | MAPE: {mape:.2%}")

    # Save trained pipeline
    joblib.dump(pipeline, MODEL_FILE)
    print(f"💾 Model saved to {MODEL_FILE}")
    return pipeline


# ── 6. SINGLETON MODEL LOADER ──
_loaded_model = None

def get_kerala_model():
    global _loaded_model
    if _loaded_model is None:
        if not MODEL_FILE.exists():
            _loaded_model = train_kerala_model()
        else:
            try:
                _loaded_model = joblib.load(MODEL_FILE)
            except Exception as e:
                print(f"Warning loading model: {e}. Retraining...")
                _loaded_model = train_kerala_model()
    return _loaded_model


# ── 7. FORMATTING HELPERS (LAKHS / CRORES) ──
def format_inr(amount):
    """Formats number in standard Indian notation (₹ Lakhs / ₹ Crores)."""
    if amount is None:
        return "₹0"
    amt = float(amount)
    if amt >= 10000000:
        cr = amt / 10000000
        return f"₹{cr:.2f} Cr"
    elif amt >= 100000:
        lakhs = amt / 100000
        return f"₹{lakhs:.2f} Lakhs"
    else:
        return f"₹{amt:,.0f}"


# ── 8. AI PRICE PREDICTION & INCREMENT ENGINE ──
def predict_and_analyze_property(
    city='Kochi',
    property_type='BUILDING',
    area_sqft=1500,
    latitude=None,
    longitude=None,
    current_price=None
):
    """
    Main function used by Django View to:
    1. Resolve Kerala coordinates (from lat/lng or city name)
    2. Compute exact distances to NH 66, NH 544, MC Road, and IT hubs
    3. Run Random Forest ML model to predict fair market value
    4. Calculate percentage increment breakdowns (% boost due to NH 66, IT hub, Urban zone)
    5. Compare with owner's asking price and return verdict + actionable advice
    """
    model = get_kerala_model()

    # 1. Resolve coordinates & location preference
    city_str = (city or '').strip().lower()
    location_source = 'City Benchmark'

    matched_district_key = None
    if city_str:
        for d_k in KERALA_DISTRICTS.keys():
            if d_k == city_str or d_k in city_str or city_str in d_k:
                matched_district_key = d_k
                break

    if latitude is not None and longitude is not None:
        lat = float(latitude)
        lng = float(longitude)

        if matched_district_key:
            city_info = KERALA_DISTRICTS[matched_district_key]
            d_to_city = haversine(lat, lng, city_info['lat'], city_info['lng'])
            if d_to_city <= 45.0:
                location_source = f"{city_info['name']} (Pinpoint GPS)"
            else:
                # Prioritize selected city (e.g. Kannur) over stale/distant GPS coordinates
                lat = city_info['lat']
                lng = city_info['lng']
                location_source = f"{city_info['name']} (District Benchmark)"
        else:
            # Reverse-match nearest district to the GPS coordinates
            district_dists = []
            for d_k, d_info in KERALA_DISTRICTS.items():
                d = haversine(lat, lng, d_info['lat'], d_info['lng'])
                district_dists.append((d, d_k))
            district_dists.sort(key=lambda x: x[0])
            matched_district_key = district_dists[0][1]
            location_source = f"Current Device GPS ({KERALA_DISTRICTS[matched_district_key]['name']})"
    else:
        if matched_district_key:
            city_info = KERALA_DISTRICTS[matched_district_key]
            lat = city_info['lat']
            lng = city_info['lng']
            location_source = f"{city_info['name']} (District Benchmark)"
        else:
            lat = 9.9816 # Default Kochi
            lng = 76.2999
            matched_district_key = 'kochi'
            location_source = 'Kochi (Default Benchmark)'

    # 2. Extract spatial metrics
    spatial = get_kerala_spatial_metrics(lat, lng, matched_district_key)
    dist_nh66 = spatial['dist_nh66_km']
    dist_hw = spatial['dist_highway_km']
    dist_hub = spatial['nearest_it_hub_km']
    hub_name = spatial['nearest_it_hub_name']
    dist_center = spatial['dist_center_km']
    district = spatial['district']
    base_sqft = spatial['base_sqft_rate']

    area = max(100, int(area_sqft))
    p_type = property_type.upper() if property_type else 'BUILDING'

    # 3. Model Prediction
    input_data = pd.DataFrame([{
        'property_type': p_type,
        'district': district,
        'area_sqft': area,
        'dist_nh66_km': dist_nh66,
        'dist_highway_km': dist_hw,
        'dist_it_hub_km': dist_hub,
        'dist_center_km': dist_center
    }])

    raw_prediction = float(model.predict(input_data)[0])
    suggested_price = int(round(raw_prediction, -3))

    # Fair value range (±5% margin)
    min_fair = int(round(suggested_price * 0.95, -3))
    max_fair = int(round(suggested_price * 1.05, -3))

    is_rental = (p_type == 'RENTAL')
    rate_per_sqft = round(suggested_price / area, 2) if not is_rental else round((suggested_price * 12) / area, 2)

    # 4. Increment & Factor Breakdown (% Boosts)
    increments = []
    total_boost_pct = 0.0

    # (A) NH 66 6-Lane Expansion Factor
    if dist_nh66 <= 1.0:
        boost = 24.5
        increments.append({
            'factor': f'NH 66 6-Lane Corridor (Direct Frontage / {dist_nh66} km)',
            'percentage': boost,
            'type': 'highway',
            'highlight': True,
            'description': 'Direct proximity to the expanding NH 66 corridor drives massive commercial value, high accessibility, and premium appreciation.'
        })
        total_boost_pct += boost
    elif dist_nh66 <= 2.5:
        boost = 16.0
        increments.append({
            'factor': f'NH 66 Corridor Access ({dist_nh66} km)',
            'percentage': boost,
            'type': 'highway',
            'highlight': True,
            'description': 'Under 2.5 km from NH 66 arterial route provides optimal connectivity without transit congestion.'
        })
        total_boost_pct += boost
    elif dist_hw <= 2.0:
        boost = 12.0
        increments.append({
            'factor': f'Highway Access (NH 544 / MC Road within {dist_hw} km)',
            'percentage': boost,
            'type': 'highway',
            'highlight': True,
            'description': 'Close proximity to major Kerala state/national arterial highway.'
        })
        total_boost_pct += boost

    # (B) IT & Tech Hub Factor
    if dist_hub <= 3.5:
        boost = 15.0
        increments.append({
            'factor': f'IT Hub Corridor ({hub_name} - {dist_hub} km)',
            'percentage': boost,
            'type': 'hub',
            'highlight': False,
            'description': 'High rental yields and sustained demand from IT & tech professional workforce.'
        })
        total_boost_pct += boost
    elif dist_hub <= 7.0:
        boost = 7.5
        increments.append({
            'factor': f'Secondary IT Hub Proximity ({dist_hub} km)',
            'percentage': boost,
            'type': 'hub',
            'highlight': False,
            'description': 'Commutable reach to premier Kerala employment parks.'
        })
        total_boost_pct += boost

    # (C) Urban Center Factor
    if dist_center <= 3.0:
        boost = 10.0
        increments.append({
            'factor': f'Central Urban District Zone ({dist_center} km)',
            'percentage': boost,
            'type': 'center',
            'highlight': False,
            'description': 'Immediate access to premier schools, specialty hospitals, and shopping centers.'
        })
        total_boost_pct += boost

    # (D) District Baseline Factor
    if spatial['tier'] == 'Tier-1':
        boost = 8.0
        increments.append({
            'factor': f'{district} Prime Metro Market Status',
            'percentage': boost,
            'type': 'market',
            'highlight': False,
            'description': f'{district} is a Tier-1 high-liquidity real estate hub in Kerala.'
        })
        total_boost_pct += boost

    # 5. Price comparison & verdict
    verdict = {
        'status': 'FAIR',
        'code': 'fair',
        'diff_percentage': 0.0,
        'diff_amount': 0,
        'title': 'Fairly Priced',
        'message': 'Your asking price is aligned with the prevailing Kerala market valuation.'
    }

    if current_price is not None and float(current_price) > 0:
        curr = float(current_price)
        diff_amount = curr - suggested_price
        diff_pct = round((diff_amount / suggested_price) * 100, 1)

        if diff_pct < -15:
            verdict = {
                'status': 'UNDERPRICED_HIGH',
                'code': 'underpriced',
                'diff_percentage': diff_pct,
                'diff_amount': diff_amount,
                'title': f'Underpriced by {abs(diff_pct)}%',
                'message': f'You are pricing {format_inr(abs(diff_amount))} below the AI estimated market value. You can increase your price for higher returns!'
            }
        elif diff_pct < -4:
            verdict = {
                'status': 'UNDERPRICED_SLIGHT',
                'code': 'competitive',
                'diff_percentage': diff_pct,
                'diff_amount': diff_amount,
                'title': f'Competitively Priced ({abs(diff_pct)}% below market)',
                'message': 'Slightly under market average — great strategy if you want to close a fast deal with serious buyers.'
            }
        elif diff_pct <= 6:
            verdict = {
                'status': 'FAIR',
                'code': 'fair',
                'diff_percentage': diff_pct,
                'diff_amount': diff_amount,
                'title': 'Accurately Market Aligned',
                'message': 'Your price perfectly matches our Kerala machine learning benchmark.'
            }
        elif diff_pct <= 20:
            verdict = {
                'status': 'PREMIUM',
                'code': 'premium',
                'diff_percentage': diff_pct,
                'diff_amount': diff_amount,
                'title': f'Premium Pricing (+{diff_pct}% above average)',
                'message': 'Priced in the higher bracket. Ensure your listing photos and description highlight luxury amenities.'
            }
        else:
            verdict = {
                'status': 'OVERPRICED',
                'code': 'overpriced',
                'diff_percentage': diff_pct,
                'diff_amount': diff_amount,
                'title': f'High Market Premium (+{diff_pct}%)',
                'message': f'Your price is {format_inr(diff_amount)} above the estimated market rate. This might reduce inquiry volume.'
            }

    return {
        'success': True,
        'district': district,
        'city': (city or district).capitalize(),
        'location_source': location_source,
        'coordinates': {'lat': round(lat, 6), 'lng': round(lng, 6)},
        'property_type': p_type,
        'area_sqft': area,
        'suggested_price': suggested_price,
        'suggested_price_formatted': format_inr(suggested_price) + ("/mo" if is_rental else ""),
        'fair_range': {
            'min': min_fair,
            'max': max_fair,
            'formatted': f"{format_inr(min_fair)} - {format_inr(max_fair)}" + ("/mo" if is_rental else "")
        },
        'rate_per_sqft': rate_per_sqft,
        'rate_per_sqft_formatted': f"₹{rate_per_sqft:,.0f} / sq.ft",
        'spatial_distances': {
            'dist_nh66_km': dist_nh66,
            'dist_highway_km': dist_hw,
            'dist_it_hub_km': dist_hub,
            'it_hub_name': hub_name,
            'dist_center_km': dist_center
        },
        'increments': increments,
        'total_area_boost_percentage': round(total_boost_pct, 1),
        'verdict': verdict
    }


if __name__ == '__main__':
    # Test script directly
    print("Testing Kerala Pricing Engine...")
    test_result = predict_and_analyze_property(
        city='Kochi',
        property_type='BUILDING',
        area_sqft=1600,
        latitude=10.0159,
        longitude=76.3419,
        current_price=6500000
    )
    import json
    print(json.dumps(test_result, indent=2))
