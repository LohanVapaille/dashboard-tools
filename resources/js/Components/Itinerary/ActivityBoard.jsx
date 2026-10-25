import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { DragDropContext } from "@hello-pangea/dnd";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

// Activités de tout le programme, rangées par jour : un seul contexte de glisser-déposer
// permet de déplacer une activité d'une période ou d'une journée à une autre.
const ActivityBoardContext = createContext(null);

export const droppableIdFor = (dayId, period) => `${dayId}|${period}`;
const parseDroppableId = (id) => {
    const [dayId, period] = id.split("|");
    return { dayId: Number(dayId), period };
};

const dayPlaces = (stays) =>
    Object.fromEntries((stays || []).flatMap((stay) => (stay.days || []).map((day) => [day.id, { city: stay.location_name.split(",")[0].trim(), date: day.date }])));

const groupByDay = (stays) =>
    Object.fromEntries((stays || []).flatMap((stay) => (stay.days || []).map((day) => [day.id, day.activities || []])));

export function ActivityBoard({ stays, children }) {
    const { canEdit } = useTripPermissions();
    const [byDay, setByDay] = useState(() => groupByDay(stays));
    const [error, setError] = useState("");

    // Le programme rechargé par Inertia (ajout d'étape, IA…) fait foi.
    useEffect(() => setByDay(groupByDay(stays)), [stays]);

    const setDayActivities = useCallback((dayId, update) => {
        setByDay((current) => ({
            ...current,
            [dayId]: typeof update === "function" ? update(current[dayId] || []) : update,
        }));
    }, []);

    const handleDragEnd = ({ destination, source, draggableId }) => {
        if (!canEdit || !destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const from = parseDroppableId(source.droppableId);
        const to = parseDroppableId(destination.droppableId);
        const activityId = Number(draggableId);
        const previous = byDay;
        const moved = (byDay[from.dayId] || []).find((activity) => activity.id === activityId);
        if (!moved) return;

        const updated = { ...moved, day_id: to.dayId, period: to.period };
        const next = { ...byDay, [from.dayId]: (byDay[from.dayId] || []).filter((activity) => activity.id !== activityId) };
        const target = next[to.dayId] || [];
        const samePeriod = target.filter((activity) => activity.period === to.period);
        samePeriod.splice(destination.index, 0, updated);
        next[to.dayId] = [...target.filter((activity) => activity.period !== to.period), ...samePeriod];

        setByDay(next);
        setError("");

        axios
            .patch(route("activities.update-period", activityId), {
                period: to.period,
                day_id: to.dayId,
                order: samePeriod.map((activity) => activity.id),
            })
            .catch((requestError) => {
                setByDay(previous);
                setError(requestError.response?.data?.message || "Impossible de déplacer cette activité.");
            });
    };

    return (
        <ActivityBoardContext.Provider value={{ byDay, setDayActivities, places: dayPlaces(stays) }}>
            {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
            )}
            <DragDropContext onDragEnd={handleDragEnd}>{children}</DragDropContext>
        </ActivityBoardContext.Provider>
    );
}

/** Activités d'une journée et leur setter, partagés avec le reste du programme. */
export function useDayActivities(day) {
    const { byDay, setDayActivities } = useContext(ActivityBoardContext);

    return [byDay[day.id] || [], (update) => setDayActivities(day.id, update)];
}

/** Ville et date de la journée d'une activité. */
export function useDayPlace(dayId) {
    return useContext(ActivityBoardContext)?.places[dayId] || null;
}
