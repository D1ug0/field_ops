"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPinned } from "lucide-react";
export type MapLocation = {
  id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  active: boolean;
  issues: number;
  critical: number;
  devices: number;
};
export function LocationMap({
  locations,
  compact = false,
}: {
  locations: MapLocation[];
  compact?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!container.current || !locations.length) return;
    let map: maplibregl.Map;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [locations[0].longitude, locations[0].latitude],
        zoom: 10,
        attributionControl: { compact: true },
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.on("error", () => setUnavailable(true));
      const bounds = new maplibregl.LngLatBounds();
      for (const l of locations) {
        const marker = document.createElement("button");
        marker.className = "map-marker";
        marker.style.backgroundColor = !l.active
          ? "#94a3b8"
          : l.critical
            ? "#e34d59"
            : l.issues
              ? "#e5a52e"
              : "#0e8b77";
        marker.setAttribute("aria-label", `Открыть ${l.name}`);
        marker.textContent = l.code.replace("FO-", "");
        const preview = document.createElement("div");
        preview.className = "map-preview";
        const heading = document.createElement("strong");
        heading.textContent = l.name;
        const address = document.createElement("p");
        address.textContent = l.address;
        const counts = document.createElement("p");
        counts.textContent = `${l.devices} устройств · ${l.issues} активных инцидентов`;
        const link = document.createElement("a");
        link.href = `/locations/${l.id}`;
        link.textContent = "Открыть объект →";
        preview.append(heading, address, counts, link);
        new maplibregl.Marker({ element: marker })
          .setLngLat([l.longitude, l.latitude])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setDOMContent(preview))
          .addTo(map);
        bounds.extend([l.longitude, l.latitude]);
      }
      if (locations.length > 1)
        map.fitBounds(bounds, {
          padding: compact ? 48 : 70,
          maxZoom: 12,
          duration: 0,
        });
    } catch {
      fallbackTimer = setTimeout(() => setUnavailable(true), 0);
    }
    return () => {
      clearTimeout(fallbackTimer);
      map?.remove();
    };
  }, [locations, compact]);
  return (
    <div className="map-wrap">
      <div
        ref={container}
        className={compact ? "map-container compact" : "map-container"}
        aria-label="Карта объектов учебной сети"
      />
      {unavailable && (
        <div className="map-unavailable">
          <MapPinned size={16} />
          Подложка карты недоступна. Список объектов доступен ниже.
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="green-dot" />
          Без инцидентов
        </span>
        <span>
          <i className="amber-dot" />
          Есть инциденты
        </span>
        <span>
          <i className="red-dot" />
          Критический
        </span>
        <span>
          <i className="gray-dot" />
          Отключён
        </span>
      </div>
    </div>
  );
}
