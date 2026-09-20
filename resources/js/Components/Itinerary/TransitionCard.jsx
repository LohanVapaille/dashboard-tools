import React from "react";
import { router } from "@inertiajs/react";
import { ArrowDown, Trash2 } from "lucide-react";
import DynamicIcon from "./DynamicIcon";

export default function TransitionCard({ transition }) {
    const handleDelete = () => {
        if (confirm("Supprimer cette étape de transport ?")) {
            router.delete(route("transitions.destroy", transition.id));
        }
    };

    return (
        <div className="my-4 flex items-center justify-center">
            <div className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white px-5 py-2.5 rounded-full shadow-md flex items-center gap-3 text-xs font-semibold">
                <ArrowDown className="w-4 h-4 animate-bounce" />
                <DynamicIcon
                    name={transition.transport_mode}
                    className="w-4 h-4"
                />
                <span className="uppercase">{transition.transport_mode}</span>
                {transition.duration_minutes && (
                    <span>• {transition.duration_minutes} min</span>
                )}
                {transition.cost > 0 && <span>• {transition.cost} €</span>}
                <button
                    onClick={handleDelete}
                    className="ml-2 hover:text-red-200 transition"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
