/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Filter producers by distance from a given location
 * @param {Array} producers - Array of producer objects with latitude/longitude
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} rangeKm - Maximum distance in kilometers
 * @returns {Array} Array of producer IDs within range
 */
exports.getProducersWithinRange = (producers, userLat, userLon, rangeKm) => {
  const producerIds = [];
  
  for (const producer of producers) {
    if (producer.latitude && producer.longitude) {
      const distance = exports.calculateDistance(
        userLat,
        userLon,
        producer.latitude,
        producer.longitude
      );
      
      if (distance <= rangeKm) {
        producerIds.push(producer.id);
      }
    }
  }
  
  return producerIds;
};
