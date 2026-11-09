import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix des icônes par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const COLORS = { start: "#10B981", end: "#F43F5E", home: "#0F172A", stay: "#6366F1" };

// Pastille ronde avec un contenu (numéro ou pictogramme) et, au besoin, une étiquette dessous.
const pin = (content, color, label = null) =>
    L.divIcon({
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
        html: `
            <div style="position:relative;width:34px;height:34px">
                <div style="width:34px;height:34px;border-radius:9999px;background:${color};color:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;font:800 13px/1 system-ui,sans-serif">${content}</div>
                ${label ? `<div style="position:absolute;top:36px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${color};color:#fff;border-radius:6px;padding:2px 6px;font:700 10px/1.3 system-ui,sans-serif;box-shadow:0 1px 4px rgba(15,23,42,.3)">${label}</div>` : ""}
            </div>`,
    });

const FLAG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/></svg>`;
const FINISH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4"/><path d="M4 4h16v9H4"/><path d="M8 4v9M12 4v9M16 4v9M4 8.5h16"/></svg>`;
const HOME = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`;

const toPoint = (lat, lng) => {
    const point = [Number(lat), Number(lng)];
    return Number.isFinite(point[0]) && Number.isFinite(point[1]) && (point[0] || point[1]) ? point : null;
};

// Ajuste le zoom automatiquement pour englober tout le trajet
function AutoFitBounds({ points }) {
    const map = useMap();
    const key = points.map((point) => point.join(",")).join(";");
    useEffect(() => {
        if (!points.length) return;
        if (points.length === 1) map.setView(points[0], 10);
        else map.fitBounds(points, { padding: [50, 50] });
    }, [key, map]);
    return null;
}

/**
 * Carte du voyage : point de départ, étapes numérotées dans l'ordre, point d'arrivée et tracé.
 * Si le voyage a un lieu de départ (origin), on part de là et on y revient ; sinon la première
 * étape sert de départ et la dernière d'arrivée.
 */
export default function TripMap({ stays = [], origin = null }) {
    const [routeGeometry, setRouteGeometry] = useState([]);

    const steps = useMemo(
        () => stays.map((stay) => ({ stay, point: toPoint(stay.latitude, stay.longitude) })).filter((step) => step.point),
        [stays],
    );
    const home = origin ? toPoint(origin.latitude, origin.longitude) : null;
    const stepKey = steps.map((step) => step.point.join(",")).join(";");

    // Tracé routier réel entre les étapes avec OSRM (repli en ligne droite si indisponible).
    useEffect(() => {
        setRouteGeometry([]);
        if (steps.length < 2) return;
        const controller = new AbortController();
        const coordinates = steps.map(({ point }) => `${point[1]},${point[0]}`).join(";");

        fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => {
                const route = data.routes?.[0]?.geometry?.coordinates;
                if (route?.length) setRouteGeometry(route.map(([lng, lat]) => [lat, lng]));
            })
            .catch(() => {});
        return () => controller.abort();
    }, [stepKey]);

    const allPoints = [...(home ? [home] : []), ...steps.map((step) => step.point)];
    const defaultCenter = allPoints[0] || [48.8566, 2.3522];
    const first = steps[0];
    const last = steps[steps.length - 1];
    const sameSpot = (a, b) => a && b && Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4;

    const stepIcon = (index) => {
        if (home) return pin(index + 1, COLORS.stay);
        if (steps.length === 1) return pin(FLAG, COLORS.start, "Départ & arrivée");
        if (index === 0) return pin(FLAG, COLORS.start, "Départ");
        if (index === steps.length - 1) return pin(FINISH, COLORS.end, "Arrivée");
        return pin(index + 1, COLORS.stay);
    };

    return (
        <div className="w-full">
            <div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <MapContainer center={defaultCenter} zoom={6} scrollWheelZoom={false} className="h-full w-full">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <AutoFitBounds points={allPoints} />

                    {/* Aller et retour depuis le lieu de départ : en pointillés, le moyen de transport n'étant pas forcément la route. */}
                    {home && first && !sameSpot(home, first.point) && (
                        <Polyline positions={[home, first.point]} pathOptions={{ color: COLORS.start, weight: 3, opacity: 0.9, dashArray: "8 8" }} />
                    )}
                    {home && last && !sameSpot(home, last.point) && (
                        <Polyline positions={[last.point, home]} pathOptions={{ color: COLORS.end, weight: 3, opacity: 0.9, dashArray: "8 8" }} />
                    )}

                    {/* Tracé entre les étapes */}
                    {steps.length > 1 && (
                        <Polyline
                            positions={routeGeometry.length ? routeGeometry : steps.map((step) => step.point)}
                            pathOptions={{ color: COLORS.stay, weight: routeGeometry.length ? 5 : 3, opacity: 0.8, dashArray: routeGeometry.length ? null : "4 8" }}
                        />
                    )}

                    {home && (
                        <Marker position={home} icon={pin(HOME, COLORS.home, "Départ & retour")} zIndexOffset={1000}>
                            <Popup>
                                <div className="text-sm font-bold">{origin.name}</div>
                                <div className="text-xs text-slate-500">Point de départ et de retour</div>
                            </Popup>
                        </Marker>
                    )}

                    {steps.map(({ stay, point }, index) => (
                        <Marker key={stay.id || index} position={point} icon={stepIcon(index)} zIndexOffset={index === 0 || index === steps.length - 1 ? 500 : 0}>
                            <Popup>
                                <div className="text-sm font-bold">{stay.location_name}</div>
                                <div className="text-xs text-slate-500">
                                    Étape {index + 1}
                                    {!home && index === 0 && " · départ"}
                                    {!home && index === steps.length - 1 && index > 0 && " · arrivée"}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {steps.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500">
                    {home ? (
                        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COLORS.home }} /> Départ & retour : <strong className="text-slate-700 dark:text-slate-200">{origin.name?.split(",")[0]}</strong></span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COLORS.start }} /> Départ : <strong className="text-slate-700 dark:text-slate-200">{first.stay.location_name.split(",")[0]}</strong></span>
                            {steps.length > 1 && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COLORS.end }} /> Arrivée : <strong className="text-slate-700 dark:text-slate-200">{last.stay.location_name.split(",")[0]}</strong></span>}
                        </>
                    )}
                    {steps.length > 1 && <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: COLORS.stay }} /> Trajet entre étapes</span>}
                </div>
            )}
        </div>
    );
}
