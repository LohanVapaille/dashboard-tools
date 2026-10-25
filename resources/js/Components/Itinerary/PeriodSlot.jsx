import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { EyeOff, Plus } from "lucide-react";
import ActivityItem from "./ActivityItem";
import ActivityForm from "./ActivityForm";
import ActivitySheet from "./ActivitySheet";
import { droppableIdFor } from "./ActivityBoard";
import { periodStyle } from "./activityMeta";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

/** Un moment de la journée : libellé à gauche, activités (glisser-déposer) à droite. */
export default function PeriodSlot({ periodKey, dayId, activities = [], onActivityAdded, onActivityDeleted, onActivityUpdated, onHide }) {
    const { canEdit } = useTripPermissions();
    const [adding, setAdding] = useState(false);
    const period = periodStyle(periodKey);
    const items = activities.filter((activity) => activity.period === periodKey);

    return (
        <div className="group/period grid gap-2 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start sm:pt-3">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <period.Icon className={`h-4 w-4 ${period.tint}`} /> {period.label}
                </span>
                {canEdit && (
                    <div className="flex items-center gap-1 sm:mt-2">
                        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-violet-600 transition hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40">
                            <Plus className="h-3.5 w-3.5" /> Ajouter
                        </button>
                        {onHide && (
                            <button onClick={onHide} title={`Masquer « ${period.label} »`} className="rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 sm:opacity-0 sm:group-hover/period:opacity-100 dark:hover:bg-slate-800">
                                <EyeOff className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Droppable droppableId={droppableIdFor(dayId, periodKey)} isDropDisabled={!canEdit}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[3.25rem] space-y-2 rounded-2xl p-1 transition-colors border-2 ${snapshot.isDraggingOver ? "border-dashed border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30" : "border-transparent"}`}
                    >
                        {items.map((activity, index) => (
                            <Draggable key={activity.id} draggableId={String(activity.id)} index={index} isDragDisabled={!canEdit}>
                                {(draggable, state) => (
                                    <div ref={draggable.innerRef} {...draggable.draggableProps} className={state.isDragging ? "rotate-1 opacity-90 shadow-2xl" : ""}>
                                        <ActivityItem activity={activity} dragHandle={draggable.dragHandleProps} onDelete={onActivityDeleted} onUpdated={onActivityUpdated} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        {!items.length && !snapshot.isDraggingOver && (
                            canEdit ? (
                                <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-400 transition hover:border-violet-300 hover:text-violet-600 dark:border-slate-700">
                                    <Plus className="h-4 w-4" /> Rien de prévu
                                </button>
                            ) : (
                                <p className="rounded-2xl border-2 border-dashed border-slate-200 py-3 text-center text-xs text-slate-400 dark:border-slate-700">Rien de prévu</p>
                            )
                        )}
                    </div>
                )}
            </Droppable>

            {adding && (
                <ActivitySheet title="Nouvelle activité" subtitle={period.label} Icon={period.Icon} onClose={() => setAdding(false)}>
                    <ActivityForm
                        dayId={dayId}
                        period={periodKey}
                        onCancel={() => setAdding(false)}
                        onSaved={(activity) => {
                            onActivityAdded?.(activity);
                            setAdding(false);
                        }}
                    />
                </ActivitySheet>
            )}
        </div>
    );
}
