import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatPrice } from "@/Utils/flights";

function FitBounds({ center, properties }) {
    const map = useMap();
    useEffect(() => {
        const points = properties.slice(0, 200).map((property) => [property.lat, property.lng]);
        if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
        else map.setView(center, 14);
    }, [center[0], center[1], properties.length]);
    return null;
}

export default function StaysMap({ center, properties, highlighted, onOpen, onHover }) {
    return (
        <div className="h-full min-h-[24rem] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds center={center} properties={properties} />
                <CircleMarker center={center} radius={7} pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 1, weight: 3 }}>
                    <Tooltip>Centre de la recherche</Tooltip>
                </CircleMarker>
                {properties.map((property) => {
                    const active = highlighted === property.id;
                    const color = property.bookable ? "#059669" : "#0f172a";
                    return (
                        <CircleMarker
                            key={property.id}
                            center={[property.lat, property.lng]}
                            radius={active ? 11 : property.bookable ? 8 : 6}
                            pathOptions={{ color: "#fff", weight: 2, fillColor: active ? "#f59e0b" : color, fillOpacity: 0.95 }}
                            eventHandlers={{
                                click: () => onOpen(property),
                                mouseover: () => onHover?.(property.id),
                                mouseout: () => onHover?.(null),
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -6]}>
                                <strong>{property.name}</strong>
                                {property.price && <> · {formatPrice(property.price.total_amount, property.price.currency)}</>}
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
