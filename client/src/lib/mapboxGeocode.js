import axios from "axios";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export async function geocodeAddress(query) {
  if (!MAPBOX_TOKEN) {
    throw new Error("Thiếu VITE_MAPBOX_ACCESS_TOKEN trong .env");
  }
  if (!query || !query.trim()) return [];

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json`;

  const res = await axios.get(url, {
    params: {
      access_token: MAPBOX_TOKEN,
      limit: 5,
      country: "VN",        // 🔥 chỉ Việt Nam
      language: "vi",       // ưu tiên tiếng Việt
      // types: "address,poi,place", // nếu muốn bó hẹp thêm
    },
  });

  const features = res.data?.features || [];
  return features.map((f) => ({
    label: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }));
}

export async function reverseGeocode(lat, lng) {
  if (!MAPBOX_TOKEN) throw new Error("Thiếu token Mapbox!");

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;

  const res = await axios.get(url, {
    params: {
      access_token: MAPBOX_TOKEN,
      limit: 1,
    },
  });

  const item = res.data?.features?.[0];
  if (!item) return null;

  return {
    address: item.place_name,
    lat,
    lng
  };
}
