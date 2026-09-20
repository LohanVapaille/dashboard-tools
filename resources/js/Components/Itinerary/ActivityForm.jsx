import { useForm } from "@inertiajs/react";
import { CATEGORIES } from "@/Constants/itinerary";
import DynamicIcon from "@/Components/Itinerary/DynamicIcon";

// Formulaire d'ajout/édition d'une activité pour une période donnée d'un jour
export default function ActivityForm({
    dayId,
    period,
    activity = null,
    onClose,
}) {
    const { data, setData, post, put, processing, errors } = useForm({
        period,
        category: activity?.category || "autre",
        title: activity?.title || "",
        description: activity?.description || "",
        price: activity?.price ?? "",
        location_name: activity?.location_name || "",
        start_time: activity?.start_time?.slice(0, 5) || "",
    });

    const submit = (e) => {
        e.preventDefault();
        if (activity) {
            put(route("activities.update", activity.id), {
                onSuccess: onClose,
                preserveScroll: true,
            });
        } else {
            post(route("activities.store", dayId), {
                onSuccess: onClose,
                preserveScroll: true,
            });
        }
    };

    return (
        <form
            onSubmit={submit}
            className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
        >
            <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.key}
                        type="button"
                        onClick={() => setData("category", cat.key)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition ${
                            data.category === cat.key
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        }`}
                    >
                        <DynamicIcon name={cat.icon} className="w-3.5 h-3.5" />
                        {cat.label}
                    </button>
                ))}
            </div>

            <input
                type="text"
                placeholder="Titre (ex: Visite du musée)"
                value={data.title}
                onChange={(e) => setData("title", e.target.value)}
                className="w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                required
            />
            {errors.title && (
                <div className="text-red-500 text-xs">{errors.title}</div>
            )}

            <div className="grid grid-cols-3 gap-2">
                <input
                    type="time"
                    value={data.start_time}
                    onChange={(e) => setData("start_time", e.target.value)}
                    className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Prix (€)"
                    value={data.price}
                    onChange={(e) => setData("price", e.target.value)}
                    className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <input
                    type="text"
                    placeholder="Lieu"
                    value={data.location_name}
                    onChange={(e) => setData("location_name", e.target.value)}
                    className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
            </div>

            <textarea
                placeholder="Informations complémentaires (adresse, réservation, contact...)"
                value={data.description}
                onChange={(e) => setData("description", e.target.value)}
                rows="2"
                className="w-full text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {activity ? "Mettre à jour" : "Ajouter"}
                </button>
            </div>
        </form>
    );
}
