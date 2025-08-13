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

export const getDirections = async (origin, destination, apiKey) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting directions:', error);
    return { routes: [] };
  }
};
