import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapPicker = ({ isOpen, onClose, onConfirm, initialLocation }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedLatLng, setSelectedLatLng] = useState(
    initialLocation
      ? {
          lat: initialLocation.latitude ?? initialLocation.lat,
          lng: initialLocation.longitude ?? initialLocation.lng,
        }
      : null
  );

  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  /**
   * Hàm reverse geocode chung:
   *  - Input: lat, lng
   *  - Kết quả: cập nhật selectedAddress = địa chỉ từ Mapbox
   */
  const reverseGeocode = async (lat, lng) => {
    if (!accessToken) return;

    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${lng},${lat}.json?access_token=${accessToken}&language=vi`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setSelectedAddress(data.features[0].place_name);
      } else {
        setSelectedAddress('Địa chỉ không xác định');
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
      setSelectedAddress('Địa chỉ không xác định');
    }
  };

  // Khởi tạo Mapbox khi mở popup
  useEffect(() => {
    if (!isOpen) return;
    if (!accessToken) {
      console.error('Thiếu VITE_MAPBOX_ACCESS_TOKEN trong .env');
      return;
    }
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = accessToken;

    // Toạ độ mặc định: HCM
    const center = selectedLatLng || { lat: 10.776889, lng: 106.700806 };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [center.lng, center.lat],
      zoom: 16,
    });

    mapInstanceRef.current = map;

    // Marker có thể kéo
    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([center.lng, center.lat])
      .addTo(map);

    markerRef.current = marker;
    setSelectedLatLng(center);

    // Gọi reverse geocode lần đầu cho vị trí đang focus
    reverseGeocode(center.lat, center.lng);

    // Click trên map để chọn điểm mới
    const handleMapClick = (e) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      setSelectedLatLng({ lat, lng });
      reverseGeocode(lat, lng);
    };

    map.on('click', handleMapClick);

    // Kéo marker xong thì cập nhật lat/lng + reverse geocode
    const handleDragEnd = () => {
      const pos = marker.getLngLat();
      const newPos = { lat: pos.lat, lng: pos.lng };
      setSelectedLatLng(newPos);
      reverseGeocode(newPos.lat, newPos.lng);
    };

    marker.on('dragend', handleDragEnd);

    // Cleanup khi đóng
    return () => {
      marker.remove();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessToken]);

  useEffect(() => {
    if (!initialLocation) return;

    const lat = initialLocation.latitude ?? initialLocation.lat;
    const lng = initialLocation.longitude ?? initialLocation.lng;

    setSelectedLatLng({ lat, lng });

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      mapInstanceRef.current.setCenter([lng, lat]);
    }
  }, [initialLocation]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ lấy vị trí hiện tại.');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (!mapInstanceRef.current || !markerRef.current) {
          setLoading(false);
          return;
        }

        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 16 });
        markerRef.current.setLngLat([lng, lat]);
        setSelectedLatLng({ lat, lng });

        // Chỉ dùng hàm reverseGeocode chung
        await reverseGeocode(lat, lng);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        alert('Không lấy được vị trí hiện tại.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedLatLng) return;
    onConfirm({
      lat: selectedLatLng.lat,
      lng: selectedLatLng.lng,
      address: selectedAddress,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl p-4 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Chọn vị trí giao hàng</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Đóng
          </button>
        </div>

        <p className="text-gray-300 text-sm mb-2">
          Bạn có thể dùng vị trí hiện tại hoặc click/kéo trên bản đồ để chọn điểm giao.
        </p>

        <div className="mb-3 flex gap-2">
          <button
            onClick={handleUseCurrentLocation}
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-sm text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
          </button>
        </div>

        <div className="w-full h-96 rounded-lg overflow-hidden mb-3">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        <div className="mb-3 text-sm text-gray-200">
          <div>
            <span className="font-semibold">Địa chỉ:</span>{' '}
            {selectedAddress || 'Chưa xác định'}
          </div>
          {selectedLatLng && (
            <div className="mt-1 text-xs text-gray-400">
              Lat: {selectedLatLng.lat.toFixed(6)} – Lng:{' '}
              {selectedLatLng.lng.toFixed(6)}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLatLng}
            className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-black text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Xác nhận vị trí
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;
