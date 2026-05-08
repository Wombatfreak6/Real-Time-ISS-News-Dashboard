/**
 * Calculates the great-circle distance between two points on a sphere
 * using the Haversine formula.
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates speed in km/h given two points and time difference
 * @param {number} distance - Distance in kilometers
 * @param {number} timeDiffMs - Time difference in milliseconds
 * @returns {number} Speed in km/h
 */
export const calculateSpeed = (distance, timeDiffMs) => {
  if (timeDiffMs <= 0) return 0;
  const timeHours = timeDiffMs / (1000 * 60 * 60);
  return distance / timeHours;
};
