import React, { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix des icônes par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Ajuste le zoom automatiquement pour englober tous les séjours
function AutoFitBounds({ stays }) {
    const map = useMap();
    useEffect(() => {
        if (stays && stays.length > 0) {
            const points = stays.map((s) => [s.latitude, s.longitude]);
            if (points.length === 1) {
                map.setView(points[0], 10);
            } else {
                map.fitBounds(points, { padding: [40, 40] });
            }
        }
    }, [stays, map]);
    return null;
}

export default function TripMap({ stays = [] }) {
    const [routeGeometry, setRouteGeometry] = useState([]);

    // Calcul de l'itinéraire réel avec OSRM
    useEffect(() => {
        if (!stays || stays.length < 2) {
            setRouteGeometry([]);
            return;
        }

        // Format OSRM : lon,lat;lon,lat
        const coordinatesQuery = stays
            .map((s) => `${s.longitude},${s.latitude}`)
            .join(";");

        fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinatesQuery}?overview=full&geometries=geojson`,
        )
            .then((res) => res.json())
            .then((data) => {
                if (data.routes && data.routes[0]) {
                    // Leaflet prend [lat, lon], OSRM renvoie [lon, lat]
                    const latLngs = data.routes[0].geometry.coordinates.map(
                        (coord) => [coord[1], coord[0]],
                    );
                    setRouteGeometry(latLngs);
                }
            })
            .catch((err) =>
                console.error("Erreur calcul d'itinéraire OSRM :", err),
            );
    }, [stays]);

    const defaultCenter =
        stays.length > 0
            ? [stays[0].latitude, stays[0].longitude]
            : [48.8566, 2.3522];

    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <MapContainer
                center={defaultCenter}
                zoom={6}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <AutoFitBounds stays={stays} />

                {/* Marqueurs des étapes */}
                {stays.map((stay, index) => (
                    <Marker
                        key={stay.id || index}
                        position={[stay.latitude, stay.longitude]}
                    >
                        <Popup>
                            <div className="font-bold text-sm">
                                {stay.location_name}
                            </div>
                            <div className="text-xs text-slate-500">
                                Étape {index + 1}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Tracé réel de l'itinéraire */}
                {routeGeometry.length > 0 && (
                    <Polyline
                        positions={routeGeometry}
                        pathOptions={{
                            color: "#6366F1",
                            weight: 5,
                            opacity: 0.8,
                        }}
                    />
                )}
            </MapContainer>
        </div>
    );
}
