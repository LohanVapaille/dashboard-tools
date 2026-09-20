import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import LocationSearchInput from "@/Components/Itinerary/LocationSearchInput";

// Modale de création / édition d'un séjour (étape de l'itinéraire)
export default function StayModal({ show, onClose, tripId, stay = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        location_name: stay?.location_name || "",
        latitude: stay?.latitude || "",
        longitude: stay?.longitude || "",
        arrival_date: stay?.arrival_date || "",
        departure_date: stay?.departure_date || "",
        notes: stay?.notes || "",
    });

    const close = () => {
        reset();
        onClose();
    };

    const submit = (e) => {
        e.preventDefault();
        if (stay) {
            put(route("stays.update", stay.id), {
                onSuccess: close,
                preserveScroll: true,
            });
        } else {
            post(route("stays.store", tripId), {
                onSuccess: close,
                preserveScroll: true,
            });
        }
    };

    return (
        <Modal show={show} onClose={close} maxWidth="lg">
            <form onSubmit={submit} className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stay ? "Modifier le séjour" : "Ajouter un séjour"}
                </h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lieu
                    </label>
                    <LocationSearchInput
                        value={data.location_name}
                        onChange={(v) => setData("location_name", v)}
                        onSelect={({ name, latitude, longitude }) => {
                            setData("location_name", name);
                            setData("latitude", latitude);
                            setData("longitude", longitude);
                        }}
                    />
                    {errors.latitude && (
                        <div className="text-red-500 text-xs mt-1">
                            Sélectionnez une suggestion pour définir la position
                            sur la carte.
                        </div>
                    )}
                    {errors.location_name && (
                        <div className="text-red-500 text-xs mt-1">
                            {errors.location_name}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Arrivée
                        </label>
                        <input
                            type="date"
                            value={data.arrival_date}
                            onChange={(e) =>
                                setData("arrival_date", e.target.value)
                            }
                            className="mt-1 w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            required
                        />
                        {errors.arrival_date && (
                            <div className="text-red-500 text-xs mt-1">
                                {errors.arrival_date}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Départ
                        </label>
                        <input
                            type="date"
                            value={data.departure_date}
                            onChange={(e) =>
                                setData("departure_date", e.target.value)
                            }
                            className="mt-1 w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            required
                        />
                        {errors.departure_date && (
                            <div className="text-red-500 text-xs mt-1">
                                {errors.departure_date}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notes (hôtel, camping, contact...)
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
                        {stay ? "Mettre à jour" : "Enregistrer"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
