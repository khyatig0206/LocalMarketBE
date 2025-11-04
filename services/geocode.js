const fetch = globalThis.fetch;

/**
 * Geocode a free-form address string using OpenStreetMap Nominatim.
 * Returns { latitude, longitude } or null if not found.
 */
async function geocodeAddress(address) {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const resp = await fetch(url, {
    headers: {
      // Identify your app per Nominatim usage policy
      "User-Agent": "e-marketplace/1.0 (contact@example.com)",
      "Accept": "application/json",
    },
  });
  if (!resp.ok) return null;
  const data = await resp.json().catch(() => []);
  if (!Array.isArray(data) || data.length === 0) return null;
  const best = data[0];
  const lat = parseFloat(best.lat);
  const lon = parseFloat(best.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { latitude: lat, longitude: lon };
  return null;
}

module.exports = { geocodeAddress };
