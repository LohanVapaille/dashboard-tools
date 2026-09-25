import React, { useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import TripMap from "@/Components/TripMap";
import StayCard from "@/Components/Itinerary/StayCard";
import TransitionCard from "@/Components/Itinerary/TransitionCard";
import LocationSearchInput from "@/Components/Itinerary/LocationSearchInput";
import { formatDate } from "@/Utils/formatters";
import {
    ArrowLeft,
    Plus,
    MapPin,
    Settings,
    Calendar,
    X,
    Edit3,
    Share2,
    Copy,
    Check,
    Trash2,
} from "lucide-react";
import axios from "axios";

export default function Show({ trip }) {
    const [isAddingStay, setIsAddingStay] = useState(false);
    const [arrivalDate, setArrivalDate] = useState("");
    const [departureDate, setDepartureDate] = useState("");

    const [locationData, setLocationData] = useState({
        name: "",
        latitude: null,
        longitude: null,
    });

    const [isEditingTrip, setIsEditingTrip] = useState(false);

    const editTripForm = useForm({
        title: trip.title || "",
        description: trip.description || "",
        start_date: trip.start_date || "",
        end_date: trip.end_date || "",
    });

    const [editingStay, setEditingStay] = useState(null);

    const editStayForm = useForm({
        location_name: "",
        latitude: null,
        longitude: null,
        arrival_date: "",
        departure_date: "",
    });

    // --- Partage du voyage ---
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [members, setMembers] = useState([]);
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);

    // Dans ton fetch de la modale de partage :
    const [isOwner, setIsOwner] = useState(false);

    const openShareModal = async () => {
        setIsShareModalOpen(true);
        try {
            const response = await axios.get(route("trips.members", trip.id));
            setMembers(response.data.members);
            setShareUrl(response.data.share_url);
            setIsOwner(response.data.is_owner); // Récupère si l'user est proprio
        } catch (error) {
            console.error("Erreur lors du chargement des membres", error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const updateRole = async (memberId, newRole) => {
        try {
            await axios.patch(
                route("trips.members.update", [trip.id, memberId]),
                { role: newRole },
            );
            setMembers(
                members.map((m) =>
                    m.id === memberId ? { ...m, role: newRole } : m,
                ),
            );
        } catch (error) {
            console.error("Erreur modification rôle", error);
        }
    };

    const removeMember = async (memberId) => {
        try {
            await axios.delete(
                route("trips.members.remove", [trip.id, memberId]),
            );
            setMembers(members.filter((m) => m.id !== memberId));
        } catch (error) {
            console.error("Erreur suppression membre", error);
        }
    };

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("viewer");
    const [inviteProcessing, setInviteProcessing] = useState(false);
    const [inviteError, setInviteError] = useState("");

    const inviteMember = async (e) => {
        e.preventDefault();
        setInviteProcessing(true);
        setInviteError("");
        try {
            await axios.post(route("trips.members.store", trip.id), {
                email: inviteEmail,
                role: inviteRole,
            });
            setInviteEmail("");
            setInviteRole("viewer");
            const response = await axios.get(route("trips.members", trip.id));
            setMembers(response.data.members);
        } catch (error) {
            console.error("Erreur lors de l'invitation", error);
            setInviteError(
                error.response?.data?.message ||
                    "Impossible d'inviter cette personne.",
            );
        } finally {
            setInviteProcessing(false);
        }
    };
    // --- Fin partage ---

    const handleOpenEditTrip = () => {
        editTripForm.setData({
            title: trip.title || "",
            description: trip.description || "",
            start_date: trip.start_date || "",
            end_date: trip.end_date || "",
        });

        setIsEditingTrip(true);
    };

    const handleUpdateTrip = (e) => {
        e.preventDefault();

        editTripForm.put(route("trips.update", trip.id), {
            onSuccess: () => setIsEditingTrip(false),
        });
    };

    const handleOpenAddStay = () => {
        setArrivalDate(trip.start_date || "");
        setDepartureDate(trip.end_date || "");
        setIsAddingStay(true);
    };

    const handleCreateStay = (e) => {
        e.preventDefault();

        if (!locationData.latitude || !locationData.longitude) {
            alert(
                "Veuillez sélectionner un lieu valide dans la liste déroulante.",
            );
            return;
        }

        router.post(
            route("stays.store", trip.id),
            {
                location_name: locationData.name,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                arrival_date: arrivalDate,
                departure_date: departureDate,
            },
            {
                onSuccess: () => {
                    setIsAddingStay(false);

                    setLocationData({
                        name: "",
                        latitude: null,
                        longitude: null,
                    });

                    setArrivalDate("");
                    setDepartureDate("");
                },
            },
        );
    };

    const handleOpenEditStay = (stay) => {
        setEditingStay(stay);

        editStayForm.setData({
            location_name: stay.location_name || "",
            latitude: stay.latitude || null,
            longitude: stay.longitude || null,
            arrival_date: stay.arrival_date || "",
            departure_date: stay.departure_date || "",
        });
    };

    const handleCloseEditStay = () => {
        setEditingStay(null);
        editStayForm.reset();
        editStayForm.clearErrors();
    };

    const handleUpdateStay = (e) => {
        e.preventDefault();

        if (!editStayForm.data.latitude || !editStayForm.data.longitude) {
            alert(
                "Veuillez sélectionner un lieu valide dans la liste déroulante.",
            );
            return;
        }

        editStayForm.put(route("stays.update", editingStay.id), {
            onSuccess: () => handleCloseEditStay(),
        });
    };

    return (
        <GuestLayout>
            <Head title={trip.title} />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* En-tête principal */}
                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {/* Boutons discrets, en haut à droite de la carte */}
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                        <button
                            onClick={openShareModal}
                            title="Partager le voyage"
                            className="p-1.5 text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleOpenEditTrip}
                            title="Modifier le voyage"
                            className="p-1.5 text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>

                    <div>
                        <Link
                            href={route("trips.index")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition mb-3"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour à la liste
                        </Link>

                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white pr-16">
                            {trip.title}
                        </h1>

                        {trip.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {trip.description}
                            </p>
                        )}

                        {(trip.start_date || trip.end_date) && (
                            <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />

                                <span>
                                    Du {formatDate(trip.start_date)} au{" "}
                                    {formatDate(trip.end_date)}
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleOpenAddStay}
                        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-md flex items-center gap-2 transition shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                        Ajouter un séjour
                    </button>
                </div>

                {/* Carte Leaflet */}
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <TripMap stays={trip.stays || []} />
                </div>

                {/* Timeline des séjours */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white px-1">
                        Programme du voyage
                    </h2>
                    {trip.stays && trip.stays.length > 0 ? (
                        trip.stays.map((stay, index) => {
                            const transition = trip.transitions?.find(
                                (t) => t.from_stay_id === stay.id,
                            );

                            return (
                                <React.Fragment key={stay.id}>
                                    <StayCard
                                        stay={stay}
                                        index={index}
                                        onEdit={() => handleOpenEditStay(stay)}
                                    />
                                    {transition && (
                                        <TransitionCard
                                            transition={transition}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />

                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                                Aucun séjour planifié
                            </h3>

                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                Commencez à construire votre itinéraire en
                                ajoutant votre première destination.
                            </p>

                            <button
                                onClick={handleOpenAddStay}
                                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter une destination
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal d'édition des informations du voyage */}
            {isEditingTrip && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Settings className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Paramètres du voyage
                                    </h3>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Modifiez le titre, la description et les
                                        dates globales.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsEditingTrip(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTrip} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                    Titre du voyage
                                </label>

                                <input
                                    type="text"
                                    value={editTripForm.data.title}
                                    onChange={(e) =>
                                        editTripForm.setData(
                                            "title",
                                            e.target.value,
                                        )
                                    }
                                    className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                    Description
                                </label>

                                <textarea
                                    value={editTripForm.data.description}
                                    onChange={(e) =>
                                        editTripForm.setData(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    rows="3"
                                    className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Date de début
                                    </label>

                                    <input
                                        type="date"
                                        value={editTripForm.data.start_date}
                                        onChange={(e) =>
                                            editTripForm.setData(
                                                "start_date",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Date de fin
                                    </label>

                                    <input
                                        type="date"
                                        value={editTripForm.data.end_date}
                                        onChange={(e) =>
                                            editTripForm.setData(
                                                "end_date",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end items-center gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingTrip(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    disabled={editTripForm.processing}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
                                >
                                    Enregistrer les modifications
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal d'édition d'un séjour */}
            {editingStay && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Edit3 className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Modifier le séjour
                                    </h3>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Mettez à jour le lieu ou les dates de
                                        cette étape.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleCloseEditStay}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStay} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                    Destination / Adresse
                                </label>

                                <LocationSearchInput
                                    value={editStayForm.data.location_name}
                                    onChange={(val) =>
                                        editStayForm.setData(
                                            "location_name",
                                            val,
                                        )
                                    }
                                    onSelectLocation={(loc) => {
                                        editStayForm.setData({
                                            ...editStayForm.data,
                                            location_name: loc.name,
                                            latitude: loc.latitude,
                                            longitude: loc.longitude,
                                        });
                                    }}
                                />

                                {editStayForm.errors.location_name && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {editStayForm.errors.location_name}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Date d'arrivée
                                    </label>

                                    <input
                                        type="date"
                                        value={editStayForm.data.arrival_date}
                                        min={trip.start_date || undefined}
                                        max={trip.end_date || undefined}
                                        onChange={(e) =>
                                            editStayForm.setData(
                                                "arrival_date",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />

                                    {editStayForm.errors.arrival_date && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {editStayForm.errors.arrival_date}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Date de départ
                                    </label>

                                    <input
                                        type="date"
                                        value={editStayForm.data.departure_date}
                                        min={
                                            editStayForm.data.arrival_date ||
                                            trip.start_date ||
                                            undefined
                                        }
                                        max={trip.end_date || undefined}
                                        onChange={(e) =>
                                            editStayForm.setData(
                                                "departure_date",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />

                                    {editStayForm.errors.departure_date && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {editStayForm.errors.departure_date}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end items-center gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={handleCloseEditStay}
                                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        editStayForm.processing ||
                                        !editStayForm.data.latitude
                                    }
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
                                >
                                    {editStayForm.processing
                                        ? "Enregistrement..."
                                        : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal d'ajout de séjour */}
            {isAddingStay && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <MapPin className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Nouveau séjour
                                    </h3>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Recherchez une ville ou un lieu pour
                                        calculer l'itinéraire.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsAddingStay(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStay} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                    Destination / Adresse
                                </label>

                                <LocationSearchInput
                                    value={locationData.name}
                                    onChange={(val) =>
                                        setLocationData((prev) => ({
                                            ...prev,
                                            name: val,
                                        }))
                                    }
                                    onSelectLocation={(loc) =>
                                        setLocationData(loc)
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Date d'arrivée
                                    </label>

                                    <input
                                        type="date"
                                        value={arrivalDate}
                                        min={trip.start_date || undefined}
                                        max={trip.end_date || undefined}
                                        onChange={(e) =>
                                            setArrivalDate(e.target.value)
                                        }
                                        className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Date de départ
                                    </label>

                                    <input
                                        type="date"
                                        value={departureDate}
                                        min={
                                            arrivalDate ||
                                            trip.start_date ||
                                            undefined
                                        }
                                        max={trip.end_date || undefined}
                                        onChange={(e) =>
                                            setDepartureDate(e.target.value)
                                        }
                                        className="w-full text-sm rounded-xl border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end items-center gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingStay(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    disabled={!locationData.latitude}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition"
                                >
                                    Ajouter au voyage
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de gestion du partage et des accès */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Share2 className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Gérer l'accès au voyage
                                    </h3>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Toute personne disposant du lien de
                                        partage pourra accéder au voyage de
                                        façon permanente.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsShareModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Lien de partage permanent */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Lien d'invitation permanent
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareUrl}
                                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 select-all"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                        {copied ? "Copié !" : "Copier"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Un(e) invité(e) via ce lien pourra créer un
                                    compte, se connecter, ou continuer en
                                    lecture seule sans compte.
                                </p>
                            </div>

                            {/* Ajout manuel d'un compte */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Ajouter un compte manuellement
                                </label>

                                <form
                                    onSubmit={inviteMember}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="email"
                                        required
                                        placeholder="email@exemple.com"
                                        value={inviteEmail}
                                        onChange={(e) =>
                                            setInviteEmail(e.target.value)
                                        }
                                        className="flex-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <select
                                        value={inviteRole}
                                        onChange={(e) =>
                                            setInviteRole(e.target.value)
                                        }
                                        className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-slate-700 dark:text-slate-300"
                                    >
                                        <option value="viewer">Lecteur</option>
                                        <option value="editor">Éditeur</option>
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={inviteProcessing}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition shrink-0"
                                    >
                                        {inviteProcessing ? "..." : "Inviter"}
                                    </button>
                                </form>

                                {inviteError && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {inviteError}
                                    </p>
                                )}
                            </div>

                            {/* Liste des membres ayant accès */}
                            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Personnes ayant accès ({members.length})
                                </label>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {members.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-4">
                                            Personne d'autre n'a encore accès à
                                            ce voyage.
                                        </p>
                                    )}
                                    {members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    {member.name ||
                                                        member.email}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {member.email}
                                                    {member.status ===
                                                        "pending" &&
                                                        " · en attente"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        updateRole(
                                                            member.id,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="editor">
                                                        Éditeur
                                                        (Lecture/Écriture)
                                                    </option>
                                                    <option value="viewer">
                                                        Lecteur (Read-only)
                                                    </option>
                                                </select>
                                                <button
                                                    onClick={() =>
                                                        removeMember(member.id)
                                                    }
                                                    title="Révoquer l'accès"
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsShareModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </GuestLayout>
    );
}
