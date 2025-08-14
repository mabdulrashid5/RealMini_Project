export const searchPlaces = async (query, apiKey) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${apiKey}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching places:', error);
    return { predictions: [] };
  }
};

export const getPlaceDetails = async (placeId, apiKey) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`
    );
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

export const getDirections = async (origin, destination, apiKey, options = {}) => {
  try {
    const {
      avoidTolls = false,
      avoidHighways = false,
      avoidFerries = false,
      mode = 'driving', // driving, walking, bicycling, transit
      alternatives = true,
      trafficModel = 'best_guess', // best_guess, pessimistic, optimistic
      departureTime = 'now'
    } = options;

    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      key: apiKey,
      mode,
      alternatives,
      traffic_model: trafficModel,
      departure_time: departureTime
    });

    if (avoidTolls) params.append('avoid', 'tolls');
    if (avoidHighways) params.append('avoid', 'highways');
    if (avoidFerries) params.append('avoid', 'ferries');

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting directions:', error);
    return { routes: [] };
  }
};

// Get nearby places by category
export const getNearbyPlaces = async (location, apiKey, options = {}) => {
  try {
    const {
      radius = 5000, // 5km default
      type = 'point_of_interest',
      keyword = '',
      minprice = 0,
      maxprice = 4,
      opennow = false
    } = options;

    const params = new URLSearchParams({
      location: `${location.latitude},${location.longitude}`,
      radius,
      key: apiKey
    });

    if (type) params.append('type', type);
    if (keyword) params.append('keyword', keyword);
    if (minprice) params.append('minprice', minprice);
    if (maxprice) params.append('maxprice', maxprice);
    if (opennow) params.append('opennow', opennow);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting nearby places:', error);
    return { results: [] };
  }
};

// Get traffic information for a route
export const getTrafficInfo = async (route, apiKey) => {
  try {
    const waypoints = route.map(point => `${point.latitude},${point.longitude}`).join('|');
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${route[0].latitude},${route[0].longitude}&destination=${route[route.length - 1].latitude},${route[route.length - 1].longitude}&waypoints=${waypoints}&departure_time=now&traffic_model=best_guess&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.routes && data.routes[0]) {
      return {
        duration: data.routes[0].legs[0].duration.text,
        durationInTraffic: data.routes[0].legs[0].duration_in_traffic?.text || data.routes[0].legs[0].duration.text,
        trafficConditions: getTrafficCondition(data.routes[0].legs[0].duration.value, data.routes[0].legs[0].duration_in_traffic?.value)
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting traffic info:', error);
    return null;
  }
};

// Helper to determine traffic conditions
const getTrafficCondition = (normalDuration, trafficDuration) => {
  if (!trafficDuration) return 'unknown';
  const ratio = trafficDuration / normalDuration;
  if (ratio < 1.2) return 'light';
  if (ratio < 1.5) return 'moderate';
  return 'heavy';
};

// Enhanced autocomplete with categories
export const getPlaceAutocomplete = async (input, apiKey, location = null, options = {}) => {
  try {
    const {
      radius = 50000, // 50km
      types = '', // establishment, geocode, address
      strictbounds = false,
      components = '' // country:us
    } = options;

    const params = new URLSearchParams({
      input,
      key: apiKey
    });

    if (location) {
      params.append('location', `${location.latitude},${location.longitude}`);
      params.append('radius', radius);
    }
    if (types) params.append('types', types);
    if (strictbounds) params.append('strictbounds', strictbounds);
    if (components) params.append('components', components);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting autocomplete:', error);
    return { predictions: [] };
  }
};
