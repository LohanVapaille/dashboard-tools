import React, { useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import DynamicIcon from "./DynamicIcon";
import ActivityItem from "./ActivityItem";

const PERIOD_LABELS = {
    matin: "Matin",
    midi: "Midi",
    apres_midi: "Après-midi",
    soir: "Soir",
    nuit: "Nuit",
};

export default function PeriodSlot({
    periodKey,
    dayId,
    activities = [],
    onActivityAdded,
    onActivityDeleted,
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("autre");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");

    const filteredActivities = activities.filter((a) => a.period === periodKey);

    const handleAdd = (e) => {
        e.preventDefault();
        axios
            .post(route("activities.store", dayId), {
                title,
                period: periodKey,
                category,
                price: price || 0,
                description,
            })
            .then((response) => {
                if (onActivityAdded) onActivityAdded(response.data);
                setIsAdding(false);
                setTitle("");
                setPrice("");
                setDescription("");
            })
            .catch((error) => {
                console.error("Erreur lors de l'ajout :", error);
            });
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2 h-full flex flex-col">
            {/* En-tête (Titre du moment) - Hors de la zone de drop, reste fixe */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <DynamicIcon
                        name={periodKey}
                        className="w-4 h-4 text-amber-500"
                    />
                    {PERIOD_LABELS[periodKey]}
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Zone de drop UNIQUEMENT pour la liste des activités sous le titre */}
            <Droppable droppableId={periodKey}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 flex-1 min-h-[60px] rounded-lg transition-colors ${
                            snapshot.isDraggingOver
                                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-dashed border-indigo-300 dark:border-indigo-700 p-1"
                                : ""
                        }`}
                    >
                        {filteredActivities.map((act, index) => (
                            <Draggable
                                key={act.id}
                                draggableId={String(act.id)}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                            ...provided.draggableProps.style,
                                        }}
                                        className={`${snapshot.isDragging ? "shadow-2xl opacity-90 scale-[1.02] cursor-grabbing" : ""}`}
                                    >
                                        <ActivityItem
                                            activity={act}
                                            onDelete={onActivityDeleted}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {/* Formulaire d'ajout */}
            {isAdding && (
                <form
                    onSubmit={handleAdd}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 space-y-2 mt-2"
                >
                    <input
                        type="text"
                        placeholder="Titre de l'activité..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-xs rounded border-slate-300 dark:bg-slate-900 dark:text-white"
                        required
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="text-xs rounded border-slate-300 dark:bg-slate-900 dark:text-white"
                        >
                            <option value="visite">Visite / Activité</option>
                            <option value="manger">Restaurant / Repas</option>
                            <option value="hotel">Hébergement</option>
                            <option value="transport">Transport</option>
                            <option value="autre">Autre</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Prix (€)"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="text-xs rounded border-slate-300 dark:bg-slate-900 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="text-xs text-slate-500 px-2 py-1"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded font-medium"
                        >
                            Ajouter
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
