import React, { useState } from "react";
import { geocodeAddress } from "../lib/mapboxGeocode";

const AddressPicker = ({ value, onChangeAddress, onChangeCoords }) => {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSearch = async () => {
    try {
      setLoading(true);
      setErr("");
      const list = await geocodeAddress(query);
      setResults(list);
      if (list.length === 0) setErr("Không tìm thấy địa chỉ phù hợp");
    } catch (e) {
      console.error("geocode error", e);
      setErr("Lỗi khi gọi Mapbox");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    onChangeAddress?.(item.label);
    onChangeCoords?.({ lat: item.lat, lng: item.lng, label: item.label });
    setQuery(item.label);
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-1">
        Địa chỉ
      </label>

      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập địa chỉ, ví dụ: 273 An Dương Vương, Quận 5..."
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-2 rounded bg-yellow-500 text-black hover:bg-yellow-600 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Đang tìm..." : "Lấy tọa độ"}
        </button>
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}

      {results.length > 0 && (
        <div className="mt-1 bg-gray-900 rounded border border-gray-700 max-h-48 overflow-auto text-sm">
          {results.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSelect(item)}
              className="block w-full text-left px-3 py-2 hover:bg-gray-800"
            >
              {item.label}{" "}
              <span className="text-[10px] text-gray-400">
                ({item.lat.toFixed(5)}, {item.lng.toFixed(5)})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressPicker;
