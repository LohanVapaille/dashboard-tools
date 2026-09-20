import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import { TRANSPORT_MODES } from "@/Constants/itinerary";
import DynamicIcon from "@/Components/Itinerary/DynamicIcon";

// Modale de création / édition du trajet entre deux séjours consécutifs
export default function TransitionModal({
    show,
    onClose,
    tripId,
    fromStay,
    toStay,
    transition = null,
}) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        from_stay_id: fromStay?.id,
        to_stay_id: toStay?.id,
        transport_mode: transition?.transport_mode || "car",
        distance_km: transition?.distance_km || "",
        duration_minutes: transition?.duration_minutes || "",
        cost: transition?.cost || "",
        notes: transition?.notes || "",
    });

    const close = () => {
        reset();
        onClose();
    };

    const submit = (e) => {
        e.preventDefault();
        if (transition) {
            put(route("transitions.update", transition.id), {
                onSuccess: close,
                preserveScroll: true,
            });
        } else {
            post(route("transitions.store", tripId), {
                onSuccess: close,
                preserveScroll: true,
            });
        }
    };

    return (
        <Modal show={show} onClose={close} maxWidth="md">
            <form onSubmit={submit} className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Trajet : {fromStay?.location_name} → {toStay?.location_name}
                </h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Moyen de transport
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TRANSPORT_MODES.map((mode) => (
                            <button
                                key={mode.key}
                                type="button"
                                onClick={() =>
                                    setData("transport_mode", mode.key)
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition ${
                                    data.transport_mode === mode.key
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                                }`}
                            >
                                <DynamicIcon
                                    name={mode.icon}
                                    className="w-4 h-4"
                                />
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Distance (km)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={data.distance_km}
                            onChange={(e) =>
                                setData("distance_km", e.target.value)
                            }
                            className="mt-1 w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Durée (min)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={data.duration_minutes}
                            onChange={(e) =>
                                setData("duration_minutes", e.target.value)
                            }
                            className="mt-1 w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Coût (€)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.cost}
                            onChange={(e) => setData("cost", e.target.value)}
                            className="mt-1 w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notes (numéro de vol, réservation...)
                    </label>
                    <textarea
                        value={data.notes}
                        onChange={(e) => setData("notes", e.target.value)}
                        rows="2"
                        className="mt-1 w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={close}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {transition ? "Mettre à jour" : "Enregistrer"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
