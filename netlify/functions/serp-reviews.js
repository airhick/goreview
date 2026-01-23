// Netlify serverless function for Serp API reviews with 24h cache
// This function fetches Google reviews, popular_times, competitors from Serp API and caches in Supabase

const SERP_API_KEY = '5bc189964fa257cc0b795902e7f773cee227f8aecd33902ecfc37ff185070bc6';
const SERP_API_URL = 'https://serpapi.com/search.json';
const SUPABASE_URL = 'https://vigutqmfosxbpncussie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZ3V0cW1mb3N4YnBuY3Vzc2llIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NDc1MiwiZXhwIjoyMDc3MTYwNzUyfQ.WPhspJ5LQ7E6k9sUFJsaISU6eVcJnIPGYv0GPGQfd98';

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { account_id, business_id } = event.queryStringParameters || {};
        
        if (!account_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'account_id parameter is required' })
            };
        }

        // First, check Supabase for cached data
        const supabaseUrl = `${SUPABASE_URL}/rest/v1/accounts?id=eq.${account_id}&select=*`;
        
        const supabaseResponse = await fetch(supabaseUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const accountData = await supabaseResponse.json();
        
        let cached_rating = null;
        let cached_reviews = null;
        let business_details_edited_at_str = null;
        let stored_business_id = business_id;
        let cached_business_details = null;

        if (accountData && accountData.length > 0) {
            const account = accountData[0];
            const cached_rating_raw = account.current_rating;
            const cached_reviews_raw = account.tot_review;
            
            cached_rating = cached_rating_raw && cached_rating_raw !== '' ? parseFloat(cached_rating_raw) : null;
            cached_reviews = cached_reviews_raw && cached_reviews_raw !== '' ? parseInt(cached_reviews_raw, 10) : null;
            
            business_details_edited_at_str = account.business_details_edited_at;
            let review_data_date_str = account.review_data_date;
            stored_business_id = account.business_id || business_id;
            cached_business_details = account.business_details;
            let cached_review_data = account.review_data;

            console.log(`[SERP] Cache check - business_details_edited_at: ${business_details_edited_at_str}, review_data_date: ${review_data_date_str}`);
        
            // Check business details cache (24h)
            let business_details_fresh = false;
        if (business_details_edited_at_str && cached_business_details) {
            const last_updated = new Date(business_details_edited_at_str);
            const now = new Date();
            const hours_since_update = (now - last_updated) / (1000 * 60 * 60);
            
                if (hours_since_update < 24) {
                    business_details_fresh = true;
                    console.log(`[SERP] ✅ Business details cache fresh (${hours_since_update.toFixed(1)}h old)`);
                } else {
                    console.log(`[SERP] ⚠️ Business details cache expired (${hours_since_update.toFixed(1)}h old)`);
                }
            }
            
            // Check review data cache (24h)
            let review_data_fresh = false;
            if (review_data_date_str && cached_review_data) {
                const last_review_update = new Date(review_data_date_str);
                const now = new Date();
                const hours_since_review_update = (now - last_review_update) / (1000 * 60 * 60);
                
                if (hours_since_review_update < 24) {
                    review_data_fresh = true;
                    console.log(`[SERP] ✅ Review data cache fresh (${hours_since_review_update.toFixed(1)}h old)`);
                } else {
                    console.log(`[SERP] ⚠️ Review data cache expired (${hours_since_review_update.toFixed(1)}h old)`);
                }
            }
            
            // If both caches are fresh, return cached data
            if (business_details_fresh && review_data_fresh) {
                console.log(`[SERP] ✅ Using fully cached data - NO API CALL`);
                
                // Parse cached business_details and review_data
                let cached_details = {};
                let parsed_review_data = [];
                try {
                    cached_details = typeof cached_business_details === 'string' 
                        ? JSON.parse(cached_business_details) 
                        : cached_business_details;
                } catch (e) {
                    cached_details = {};
                }
                
                try {
                    parsed_review_data = typeof cached_review_data === 'string'
                        ? JSON.parse(cached_review_data)
                        : (Array.isArray(cached_review_data) ? cached_review_data : []);
                } catch (e) {
                    parsed_review_data = [];
                }
                
                const cached_rating_from_details = cached_details.rating;
                const cached_reviews_from_details = cached_details.reviews;
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        cached: true,
                        rating: cached_rating_from_details ? parseFloat(cached_rating_from_details) : (cached_rating ? parseFloat(cached_rating) : null),
                        reviews: cached_reviews_from_details ? parseInt(cached_reviews_from_details) : (cached_reviews ? parseInt(cached_reviews) : null),
                        last_updated: business_details_edited_at_str,
                        review_data_updated: review_data_date_str,
                        business_details: cached_details,
                        // Include all enriched data from cache
                        popular_times: cached_details.popular_times || null,
                        user_reviews: parsed_review_data,
                        rating_summary: cached_details.rating_summary || null,
                        competitors: cached_details.competitors || null,
                        time_spent: cached_details.time_spent || null,
                        extensions: cached_details.extensions || null
                    })
                };
            }
        }

        // If we get here, we need to fetch from Serp API
        if (!stored_business_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'business_id is required for Serp API',
                    cached_rating: cached_rating ? parseFloat(cached_rating) : null,
                    cached_reviews: cached_reviews ? parseInt(cached_reviews) : null
                })
            };
        }

        console.log(`[SERP] Fetching from Serp API for business_id: ${stored_business_id}`);

        // Build Serp API request for Google Maps with all data
        const serpParams = new URLSearchParams({
            engine: 'google_maps',
            place_id: stored_business_id,
            api_key: SERP_API_KEY,
            hl: 'fr' // French language for reviews
        });

        const serpUrl = `${SERP_API_URL}?${serpParams.toString()}`;

        // Make request to Serp API
        const serpResponse = await fetch(serpUrl, {
            headers: {
                'User-Agent': 'GoReview/1.0'
            }
        });

        if (!serpResponse.ok) {
            const errorText = await serpResponse.text();
            console.error(`[SERP] HTTP Error: ${serpResponse.status} - ${errorText}`);
            throw new Error(`Serp API error: ${serpResponse.status}`);
        }

        const serpData = await serpResponse.json();

        // Debug: log the full response structure
        console.log('[SERP] Full API response keys:', Object.keys(serpData));

        // Extract data from Serp API response
        let rating = null;
        let reviews = null;
        let placeData = null;

        // Serp API returns data in 'place_results'
        if (serpData.place_results) {
            placeData = serpData.place_results;
        } else if (serpData.local_results && Array.isArray(serpData.local_results) && serpData.local_results.length > 0) {
            placeData = serpData.local_results[0];
        }

        if (placeData && typeof placeData === 'object') {
            console.log('[SERP] Place data keys:', Object.keys(placeData));
            
            rating = placeData.rating;
            reviews = placeData.reviews;
            
            // Type conversions
            if (rating !== null && rating !== undefined) {
                if (typeof rating === 'string') {
                    rating = parseFloat(rating) || null;
                } else if (typeof rating !== 'number') {
                    rating = null;
                }
            }
            
            if (reviews !== null && reviews !== undefined) {
                if (typeof reviews === 'string') {
                    reviews = parseInt(reviews.replace(/,/g, ''), 10) || null;
                } else if (typeof reviews !== 'number') {
                    reviews = parseInt(reviews, 10) || null;
                }
            }
            
            console.log(`[SERP] Extracted - rating: ${rating}, reviews: ${reviews}`);
        }

        // Extract ALL enriched business details from Serp API response
        let businessDetails = {};
        if (placeData && typeof placeData === 'object') {
            // Basic info
            if (placeData.title) businessDetails.name = placeData.title;
            else if (placeData.name) businessDetails.name = placeData.name;
            
            if (placeData.address) businessDetails.address = placeData.address;
            if (placeData.phone) businessDetails.phone = placeData.phone;
            if (placeData.website) businessDetails.website = placeData.website;
            
            // Working hours
            if (placeData.hours && Array.isArray(placeData.hours)) {
                businessDetails.working_hours = placeData.hours;
            }
            
            // Open state
            if (placeData.open_state) businessDetails.open_state = placeData.open_state;
            
            // Place ID and GPS
            if (placeData.place_id) businessDetails.place_id = placeData.place_id;
            if (placeData.gps_coordinates) businessDetails.gps_coordinates = placeData.gps_coordinates;
            
            // Type/Category
            if (placeData.type) {
                businessDetails.type = Array.isArray(placeData.type) ? placeData.type : [placeData.type];
            }
            
            // Plus code
            if (placeData.plus_code) businessDetails.plus_code = placeData.plus_code;
            
            // Rating and reviews for reference
            if (placeData.rating) businessDetails.rating = placeData.rating;
            if (placeData.reviews) businessDetails.reviews = placeData.reviews;
            
            // ═══════════════════════════════════════════════════════════════════
            // ENRICHED DATA - Module 1: Réputation & IA
            // ═══════════════════════════════════════════════════════════════════
            
            // User Reviews (for sentiment analysis)
            if (placeData.user_reviews && Array.isArray(placeData.user_reviews)) {
                businessDetails.user_reviews = placeData.user_reviews.map(review => ({
                    name: review.name || review.username || 'Anonyme',
                    rating: review.rating,
                    date: review.date,
                    iso_date: review.iso_date,
                    description: review.description || review.snippet || review.text || '',
                    response: review.response || null,
                    likes: review.likes || 0,
                    images: review.images || [],
                    local_guide: review.local_guide || false,
                    link: review.link,
                    review_id: review.review_id,
                    user_link: review.user?.link || review.user_link
                }));
                console.log(`[SERP] Extracted ${businessDetails.user_reviews.length} user reviews`);
            }
            
            // Rating Summary (distribution des étoiles)
            if (placeData.rating_summary) {
                businessDetails.rating_summary = placeData.rating_summary;
                console.log('[SERP] Extracted rating_summary:', businessDetails.rating_summary);
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // ENRICHED DATA - Module 2: Optimisation Opérationnelle
            // ═══════════════════════════════════════════════════════════════════
            
            // Popular Times (affluence)
            if (placeData.popular_times && typeof placeData.popular_times === 'object') {
                businessDetails.popular_times = placeData.popular_times;
                console.log('[SERP] Extracted popular_times for days:', Object.keys(placeData.popular_times));
            }
            
            // Time spent (durée de visite)
            if (placeData.time_spent || placeData.typical_time_spent) {
                businessDetails.time_spent = placeData.time_spent || placeData.typical_time_spent;
                console.log('[SERP] Extracted time_spent:', businessDetails.time_spent);
            }
            
            // Live busyness (if available)
            if (placeData.live_busyness !== undefined) {
                businessDetails.live_busyness = placeData.live_busyness;
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // ENRICHED DATA - Module 3: Benchmark Concurrentiel
            // ═══════════════════════════════════════════════════════════════════
            
            // People also search for (competitors)
            if (placeData.people_also_search_for && Array.isArray(placeData.people_also_search_for)) {
                businessDetails.competitors = placeData.people_also_search_for.map(comp => ({
                    name: comp.title || comp.name,
                    place_id: comp.place_id,
                    rating: comp.rating,
                    reviews: comp.reviews,
                    type: comp.type,
                    address: comp.address,
                    thumbnail: comp.thumbnail
                }));
                console.log(`[SERP] Extracted ${businessDetails.competitors.length} competitors`);
            }
            
            // Also look in serpData root for people_also_search_for
            if (!businessDetails.competitors && serpData.people_also_search_for) {
                businessDetails.competitors = serpData.people_also_search_for.map(comp => ({
                    name: comp.title || comp.name,
                    place_id: comp.place_id,
                    rating: comp.rating,
                    reviews: comp.reviews,
                    type: comp.type,
                    address: comp.address,
                    thumbnail: comp.thumbnail
                }));
                console.log(`[SERP] Extracted ${businessDetails.competitors.length} competitors from root`);
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // ENRICHED DATA - Module 4: Marketing & Communication
            // ═══════════════════════════════════════════════════════════════════
            
            // Extensions (attributes like NFC, payments, etc.)
            if (placeData.extensions) {
                businessDetails.extensions = placeData.extensions;
                console.log('[SERP] Extracted extensions:', businessDetails.extensions);
            }
            
            // Service options
            if (placeData.service_options) {
                businessDetails.service_options = placeData.service_options;
            }
            
            // Thumbnail/Images for social posts
            if (placeData.thumbnail) businessDetails.thumbnail = placeData.thumbnail;
            if (placeData.images && Array.isArray(placeData.images)) {
                businessDetails.images = placeData.images;
            }
            
            console.log('[SERP] Complete business details extracted');
        }

        // ═══════════════════════════════════════════════════════════════════
        // FETCH REVIEWS FROM SEPARATE ENDPOINT (for more reviews)
        // ═══════════════════════════════════════════════════════════════════
        
        // If we don't have enough reviews, fetch from google_maps_reviews endpoint
        if (!businessDetails.user_reviews || businessDetails.user_reviews.length < 5) {
            console.log('[SERP] Fetching additional reviews from google_maps_reviews endpoint...');
            
            try {
                const reviewsParams = new URLSearchParams({
                    engine: 'google_maps_reviews',
                    place_id: stored_business_id,
                    api_key: SERP_API_KEY,
                    hl: 'fr',
                    sort_by: 'newestFirst' // Get newest reviews first
                });
                
                const reviewsUrl = `${SERP_API_URL}?${reviewsParams.toString()}`;
                const reviewsResponse = await fetch(reviewsUrl, {
                    headers: { 'User-Agent': 'GoReview/1.0' }
                });
                
                if (reviewsResponse.ok) {
                    const reviewsData = await reviewsResponse.json();
                    
                    if (reviewsData.reviews && Array.isArray(reviewsData.reviews)) {
                        businessDetails.user_reviews = reviewsData.reviews.map(review => ({
                            name: review.user?.name || review.username || 'Anonyme',
                            rating: review.rating,
                            date: review.date || review.iso_date,
                            iso_date: review.iso_date,
                            description: review.snippet || review.text || '',
                            response: review.response?.snippet || review.response?.text || null,
                            likes: review.likes || 0,
                            images: review.images || [],
                            local_guide: review.user?.local_guide || false,
                            reviews_count: review.user?.reviews || 0,
                            link: review.link,
                            review_id: review.review_id,
                            user_link: review.user?.link
                        }));
                        console.log(`[SERP] Fetched ${businessDetails.user_reviews.length} reviews from reviews endpoint`);
                    }
                    
                    // Rating histogram from reviews endpoint
                    if (reviewsData.rating_histogram) {
                        businessDetails.rating_summary = reviewsData.rating_histogram;
                    }
                }
            } catch (reviewsError) {
                console.warn('[SERP] Failed to fetch additional reviews:', reviewsError.message);
            }
        }

        // Update Supabase with new data
        const now_iso = new Date().toISOString();
        const updateData = {};
        
        // Store rating and reviews if available
        if (rating !== null && rating !== undefined) {
            updateData.current_rating = String(rating);
        }
        if (reviews !== null && reviews !== undefined) {
            updateData.tot_review = String(reviews);
        }
        
        // Store complete business_details
        updateData.business_details = Object.keys(businessDetails).length > 0 ? JSON.stringify(businessDetails) : null;
        updateData.business_details_edited_at = now_iso;
        
        // Store review_data separately with its own timestamp
        updateData.review_data = businessDetails.user_reviews ? JSON.stringify(businessDetails.user_reviews) : null;
        updateData.review_data_date = now_iso;

        const updateUrl = `${SUPABASE_URL}/rest/v1/accounts?id=eq.${account_id}`;
        
        try {
            await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });
            console.log('[SERP] Updated Supabase with enriched data');
        } catch (updateError) {
            console.warn('[SERP] Warning: Failed to update Supabase:', updateError);
        }

        // Return complete response with all enriched data
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                cached: false,
                rating: rating ? parseFloat(rating) : null,
                reviews: reviews ? parseInt(reviews) : null,
                last_updated: now_iso,
                business_details: businessDetails,
                // Direct access to enriched modules
                popular_times: businessDetails.popular_times || null,
                user_reviews: businessDetails.user_reviews || null,
                rating_summary: businessDetails.rating_summary || null,
                competitors: businessDetails.competitors || null,
                time_spent: businessDetails.time_spent || null,
                extensions: businessDetails.extensions || null
            })
        };

    } catch (error) {
        console.error('[SERP] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error'
            })
        };
    }
};
