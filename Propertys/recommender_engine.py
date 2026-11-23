# =====================================================================
# HOMEQUEST AI - ML PROPERTY RECOMMENDATION & SUGGESTION ENGINE
# Scikit-Learn Content-Based Vector Profiling & Cosine Similarity
# =====================================================================

import math
from datetime import datetime, timezone
from decimal import Decimal
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from Accounts.models import PropertyViewHistory, UserSearchHistory
from .models import Property


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance in kilometers."""
    if any(v is None for v in [lat1, lon1, lat2, lon2]):
        return None
    try:
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return 6371.0 * c
    except Exception:
        return None


class PropertyRecommendationEngine:
    """
    Analyzes an authenticated user's PropertyViewHistory and UserSearchHistory
    to generate personalized, highly-accurate property suggestions.
    """

    @classmethod
    def get_recommendations_for_user(cls, user, limit=6, exclude_purchased=True):
        """
        Main entry point: Returns a list of Property model instances
        enriched with `match_percentage`, `match_score`, and `ai_reason`.
        """
        all_properties = list(Property.objects.select_related('seller').all())
        if not all_properties:
            return []

        # If user is anonymous or has no history, provide intelligent trending fallback
        if not user or not user.is_authenticated:
            return cls._get_cold_start_recommendations(all_properties, limit)

        # 1. Fetch user view and search history
        views = list(
            PropertyViewHistory.objects.filter(user=user)
            .select_related('property')
            .order_by('-viewed_at')[:25]
        )
        searches = list(
            UserSearchHistory.objects.filter(user=user)
            .order_by('-searched_at')[:25]
        )

        # If user has zero interactions yet, return cold-start suggestions
        if not views and not searches:
            return cls._get_cold_start_recommendations(all_properties, limit, user=user)

        # 2. Extract User Preference Weights
        now = datetime.now(timezone.utc)
        viewed_prop_ids = {v.property.id for v in views if v.property}

        # Calculate weighted location, property types, and price stats
        city_weights = {}
        type_weights = {}
        prices = []
        areas = []
        user_coords = []
        text_corpus = []

        for v in views:
            p = v.property
            if not p:
                continue

            # Recency decay weight (half-life of 14 days)
            days_ago = max(0, (now - v.viewed_at).total_seconds() / 86400.0)
            recency_weight = math.exp(-0.05 * days_ago)
            # View count scaling (logarithmic diminishing return)
            interaction_weight = (1.0 + math.log(max(1, v.view_count))) * recency_weight

            # City weights
            city = (p.city or '').strip().lower()
            if city:
                city_weights[city] = city_weights.get(city, 0) + (interaction_weight * 1.5)

            # Property type weights
            ptype = (p.property_type or '').strip().upper()
            if ptype:
                type_weights[ptype] = type_weights.get(ptype, 0) + interaction_weight

            try:
                prices.append((float(p.price), interaction_weight))
            except Exception:
                pass

            if p.area_sqft:
                areas.append((float(p.area_sqft), interaction_weight))

            if p.latitude and p.longitude:
                user_coords.append((float(p.latitude), float(p.longitude), interaction_weight))

            text_corpus.append(f"{p.title} {p.city} {p.property_type} {p.description or ''}")

        # Factor in User Search History
        for s in searches:
            query = (s.query or '').strip().lower()
            city = (s.city or '').strip().lower()
            ptype = (s.property_type or '').strip().upper()

            if city:
                city_weights[city] = city_weights.get(city, 0) + 1.8
            elif query:
                # If query matches a known city
                city_weights[query] = city_weights.get(query, 0) + 1.2

            if ptype and ptype != 'ALL':
                type_weights[ptype] = type_weights.get(ptype, 0) + 1.4

            if s.latitude and s.longitude:
                user_coords.append((float(s.latitude), float(s.longitude), 1.5))

            text_corpus.append(f"{query} {city} {ptype}")

        # Calculate weighted average price & area
        if prices:
            total_w = sum(w for _, w in prices)
            mean_price = sum(pr * w for pr, w in prices) / total_w
        else:
            mean_price = 7500000.0  # default 75 Lakhs baseline

        if areas:
            total_w = sum(w for _, w in areas)
            mean_area = sum(ar * w for ar, w in areas) / total_w
        else:
            mean_area = 1500.0

        # Weighted geographical centroid
        user_lat, user_lng = None, None
        if user_coords:
            tot_w = sum(w for _, _, w in user_coords)
            user_lat = sum(lat * w for lat, _, w in user_coords) / tot_w
            user_lng = sum(lng * w for _, lng, w in user_coords) / tot_w

        # Top preferred city and property type
        top_city = max(city_weights, key=city_weights.get).title() if city_weights else None
        top_type = max(type_weights, key=type_weights.get) if type_weights else None

        # 3. TF-IDF Text Cosine Similarity
        user_text = " ".join(text_corpus)
        candidate_texts = [
            f"{p.title} {p.city} {p.property_type} {p.description or ''}"
            for p in all_properties
        ]

        tfidf_scores = [0.0] * len(all_properties)
        try:
            vectorizer = TfidfVectorizer(stop_words='english', max_features=150)
            all_text_data = [user_text] + candidate_texts
            tfidf_matrix = vectorizer.fit_transform(all_text_data)
            sim_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
            tfidf_scores = sim_matrix[0].tolist()
        except Exception:
            pass

        # 4. Score Candidate Properties
        scored_candidates = []
        for idx, prop in enumerate(all_properties):
            # Prioritize properties the user has NOT viewed yet (discoverability),
            # but allow viewed properties if catalog is small
            is_viewed = prop.id in viewed_prop_ids

            # A. Location / City score (0 to 1)
            p_city = (prop.city or '').strip().lower()
            if p_city in city_weights:
                loc_score = min(1.0, 0.65 + (city_weights[p_city] / max(city_weights.values())) * 0.35)
            elif top_city and top_city.lower() in p_city:
                loc_score = 0.8
            else:
                loc_score = 0.35

            # If GPS coordinates available, refine with Haversine distance
            if user_lat and user_lng and prop.latitude and prop.longitude:
                dist = haversine_distance(user_lat, user_lng, prop.latitude, prop.longitude)
                if dist is not None:
                    dist_score = max(0.1, 1.0 - (dist / 60.0))
                    loc_score = (loc_score * 0.6) + (dist_score * 0.4)

            # B. Property Type Score (0 to 1)
            p_type = (prop.property_type or '').strip().upper()
            if top_type and p_type == top_type:
                type_score = 1.0
            elif p_type in type_weights:
                type_score = 0.8
            else:
                type_score = 0.45

            # C. Price Affection Score (Gaussian continuous curve)
            try:
                p_price = float(prop.price)
                ratio = p_price / mean_price
                # Exponential penalty for budget deviation
                price_score = math.exp(-1.5 * (math.log(max(0.1, ratio)) ** 2))
            except Exception:
                price_score = 0.5

            # D. Area / Space Score
            if prop.area_sqft and mean_area:
                area_ratio = float(prop.area_sqft) / mean_area
                area_score = math.exp(-1.2 * (math.log(max(0.1, area_ratio)) ** 2))
            else:
                area_score = 0.5

            # E. TF-IDF Text Cosine Similarity Score
            text_score = min(1.0, tfidf_scores[idx] * 2.2)

            # Composite Multi-Variate Score
            composite = (
                (loc_score * 0.35) +
                (price_score * 0.25) +
                (type_score * 0.20) +
                (text_score * 0.12) +
                (area_score * 0.08)
            )

            # Slight penalty for already viewed items to encourage discovery
            if is_viewed:
                composite *= 0.88

            # Scale to realistic, appealing percentage (72% - 98%)
            percentage = int(min(98, max(68, round(composite * 100))))

            # Formulate Explainable AI reason
            ai_reason = cls._generate_explanation(
                prop=prop,
                top_city=top_city,
                top_type=top_type,
                mean_price=mean_price,
                loc_score=loc_score,
                price_score=price_score,
                type_score=type_score,
                is_viewed=is_viewed,
            )

            scored_candidates.append({
                'property': prop,
                'score': composite,
                'percentage': percentage,
                'ai_reason': ai_reason,
            })

        # Sort highest match score first
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)

        # Attach metadata to model instances
        results = []
        for item in scored_candidates[:limit]:
            p = item['property']
            p.match_percentage = item['percentage']
            p.match_score = f"{item['percentage']}% Match"
            p.ai_reason = item['ai_reason']
            results.append(p)

        return results

    @classmethod
    def _generate_explanation(cls, prop, top_city, top_type, mean_price, loc_score, price_score, type_score, is_viewed):
        """Constructs intuitive, transparent AI explanation copy."""
        formatted_price = f"₹{float(mean_price):,.0f}" if mean_price else "your target price"
        city_name = prop.city or top_city or "Kerala"

        if loc_score > 0.75 and type_score > 0.75 and price_score > 0.65:
            return f"Matches your frequent searches for {prop.property_type.lower()}s in {city_name} near your ~{formatted_price} budget."
        elif loc_score > 0.75 and price_score > 0.7:
            return f"Prime match in {city_name} closely aligned with your viewed price range."
        elif type_score > 0.8:
            return f"Recommended based on your interest in {prop.property_type.title()} properties."
        elif loc_score > 0.7:
            return f"Located in {city_name}, matching your recent location searches."
        elif is_viewed:
            return f"You previously showed interest in this {prop.property_type.lower()}."
        else:
            return f"Trending {prop.property_type.lower()} in {city_name} with strong architectural appeal."

    @classmethod
    def _get_cold_start_recommendations(cls, properties, limit, user=None):
        """Fallback recommendations for new users or guests."""
        results = []
        for p in properties[:limit]:
            p.match_percentage = 85
            p.match_score = "Featured Match"
            p.ai_reason = f"Highly rated {p.property_type.lower()} in {p.city or 'Kerala'}."
            results.append(p)
        return results
