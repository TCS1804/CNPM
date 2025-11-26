// client/src/component/DroneSimulationMap.jsx
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const DRONE_WS_BASE =
  import.meta.env.VITE_DRONE_WS_URL || "ws://localhost:5055/ws";

const DroneSimulationMap = ({
  isOpen,
  onClose,
  restaurantCoords, // { lat, lng }
  customerCoords,   // { lat, lng }
  orderId,
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const droneMarkerRef = useRef(null);
  const wsRef = useRef(null); // 🔥 WebSocket tới drone-service

  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!isOpen) return;
    if (!accessToken) {
      console.error("Thiếu VITE_MAPBOX_ACCESS_TOKEN trong .env");
      return;
    }
    if (
      !restaurantCoords?.lat ||
      !restaurantCoords?.lng ||
      !customerCoords?.lat ||
      !customerCoords?.lng
    ) {
      console.error("Thiếu toạ độ nhà hàng hoặc khách hàng");
      return;
    }

    mapboxgl.accessToken = accessToken;

    // ====== Khởi tạo map ======
    const center = {
      lng: (restaurantCoords.lng + customerCoords.lng) / 2,
      lat: (restaurantCoords.lat + customerCoords.lat) / 2,
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [center.lng, center.lat],
      zoom: 13,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // marker nhà hàng
    new mapboxgl.Marker({ color: "#ff5500" })
      .setLngLat([restaurantCoords.lng, restaurantCoords.lat])
      .setPopup(new mapboxgl.Popup().setHTML("<b>Nhà hàng</b>"))
      .addTo(map);

    // marker khách
    new mapboxgl.Marker({ color: "#00aa55" })
      .setLngLat([customerCoords.lng, customerCoords.lat])
      .setPopup(new mapboxgl.Popup().setHTML("<b>Khách hàng</b>"))
      .addTo(map);

    // marker drone (sẽ được cập nhật bằng WebSocket)
    const droneEl = document.createElement("div");
    droneEl.style.width = "24px";
    droneEl.style.height = "24px";
    droneEl.style.borderRadius = "999px";
    droneEl.style.background = "yellow";
    droneEl.style.border = "2px solid black";
    droneEl.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";

    const droneMarker = new mapboxgl.Marker({ element: droneEl })
      .setLngLat([restaurantCoords.lng, restaurantCoords.lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(`<b>Drone</b><br/>Order #${orderId}`)
      )
      .addTo(map);

    droneMarkerRef.current = droneMarker;

    // vẽ line route
    const route = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [restaurantCoords.lng, restaurantCoords.lat],
          [customerCoords.lng, customerCoords.lat],
        ],
      },
    };

    map.on("load", () => {
      map.addSource("drone-route", {
        type: "geojson",
        data: route,
      });

      map.addLayer({
        id: "drone-route-line",
        type: "line",
        source: "drone-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#f97316",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });

      // fit bounds cho đẹp
      map.fitBounds(
        [
          [restaurantCoords.lng, restaurantCoords.lat],
          [customerCoords.lng, customerCoords.lat],
        ],
        { padding: 80, duration: 800 }
      );
    });

    // ====== WebSocket tới drone-service ======
    const wsUrl = `${DRONE_WS_BASE}?orderId=${orderId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Drone WS] connected for order", orderId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "telemetry" && data.position) {
          const { lat, lng } = data.position;
          if (droneMarkerRef.current) {
            droneMarkerRef.current.setLngLat([lng, lat]);
          }
        }

        if (data.type === "completed") {
          console.log("[Drone WS] completed order", orderId);
        }
      } catch (e) {
        console.error("[Drone WS] parse error", e);
      }
    };

    ws.onerror = (err) => {
      console.error("[Drone WS] error", err);
    };

    ws.onclose = () => {
      console.log("[Drone WS] closed for order", orderId);
    };

    // cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (droneMarkerRef.current) {
        droneMarkerRef.current.remove();
        droneMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, accessToken, restaurantCoords, customerCoords, orderId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl h-[480px] flex flex-col">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">
            Drone Delivery – Order #{orderId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white px-2 py-1 rounded"
          >
            Đóng
          </button>
        </div>
        <div className="flex-1">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default DroneSimulationMap;
