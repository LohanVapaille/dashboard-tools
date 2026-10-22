import { useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import TripMap from "@/Components/TripMap";
import TripNotes from "@/Components/Itinerary/TripNotes";
import LocationSearchInput from "@/Components/Itinerary/LocationSearchInput";
import GuestLimitModal from "@/Components/GuestLimitModal";
import AvatarStack from "@/Components/AvatarStack";
import {
    TripPermissionsProvider,
    useTripPermissions,
} from "@/Contexts/TripPermissionsContext";
import { formatDate } from "@/Utils/formatters";
import {
    ArrowLeft,
    BedDouble,
    Bus,
    Calendar,
    ChevronRight,
    Edit3,
    Flag,
    Home,
    Hourglass,
    Image,
    MapPin,
    Settings,
    SlidersHorizontal,
    Sparkles,
    UserPlus,
    Users,
    Wallet,
    X,
} from "lucide-react";
import AIItineraryModal from "@/Components/Itinerary/AIItineraryModal";
import ProgramTab from "@/Components/Itinerary/ProgramTab";
import TransportTab from "@/Components/Itinerary/TransportTab";
import StaysTab from "@/Components/Itinerary/StaysTab";
import PhotosTab from "@/Components/Itinerary/PhotosTab";
import BudgetTab from "@/Components/Budget/BudgetTab";
import DateRangePicker from "@/Components/DateRangePicker";
import ShareTripModal from "@/Components/Trips/ShareTripModal";
import TripSettingsModal from "@/Components/Trips/TripSettingsModal";

const dayNumber = (date) => {
    const [year, month, day] = date.split("-").map(Number);
    return Math.round(Date.UTC(year, month - 1, day) / 86400000);
};

function tripStatus(start, end) {
    if (!start || !end) return null;
    const now = new Date();
    const today = Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    const [from, to] = [dayNumber(start), dayNumber(end)];
    if (today < from) {
        const left = from - today;
        return { Icon: Hourglass, label: left === 1 ? "Départ demain" : `Départ dans ${left} jours`, className: "bg-amber-300 text-amber-950" };
    }
    if (today <= to) return { Icon: Sparkles, label: `En cours · jour ${today - from + 1}/${to - from + 1}`, className: "bg-emerald-300 text-emerald-950" };
    return { Icon: Flag, label: "Voyage terminé", className: "bg-white/15 backdrop-blur" };
}

function ShowContent({ trip }) {
    const { canEdit, canViewShareLink } = useTripPermissions();

    const { props } = usePage();
    const authenticated = Boolean(props.auth?.user);
    const [guestWarning, setGuestWarning] = useState(
        props.guestWarning ?? null,
    );

    const [isAddingStay, setIsAddingStay] = useState(false);
    const [isAIItineraryOpen, setIsAIItineraryOpen] = useState(false);
    const defaultTabs = ["program", "transport", "stays", "budget", "photos"];
    const [visibleTabs, setVisibleTabs] = useState(
        trip.visible_tabs?.length ? trip.visible_tabs : defaultTabs,
    );
    const [activeTab, setActiveTab] = useState("program");
    const [settingsSection, setSettingsSection] = useState(null);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [arrivalDate, setArrivalDate] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [locationData, setLocationData] = useState({
        name: "",
        latitude: null,
        longitude: null,
    });
    const [editingStay, setEditingStay] = useState(null);
    const editStayForm = useForm({
        location_name: "",
        latitude: null,
        longitude: null,
        arrival_date: "",
        departure_date: "",
    });

    const itinerary = [
        ...(trip.origin_name ? [{ label: trip.origin_name.split(",")[0], origin: true }] : []),
        ...(trip.stays || []).map((stay) => ({ label: stay.location_name.split(",")[0] })),
    ];
    const status = tripStatus(trip.start_date, trip.end_date);

    const handleOpenAddStay = () => {
        if (!canEdit) return;
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
        if (!canEdit) return;
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
        <>
            {isAIItineraryOpen && (
                <AIItineraryModal
                    trip={trip}
                    authenticated={authenticated}
                    onClose={() => setIsAIItineraryOpen(false)}
                    onStored={() => {
                        setIsAIItineraryOpen(false);
                        router.reload({ preserveScroll: true });
                    }}
                />
            )}
            {guestWarning && (
                <GuestLimitModal
                    remaining={guestWarning.remaining}
                    onClose={() => setGuestWarning(null)}
                />
            )}

            <GuestLayout>
                <Head title={trip.title} />

                <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
                        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

                        <div className="relative flex flex-wrap items-center justify-between gap-3">
                            <Link href={route("trips.index")} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur transition hover:bg-white/25">
                                <ArrowLeft className="h-3.5 w-3.5" /> Mes voyages
                            </Link>
                            <div className="flex items-center gap-2">
                                {trip.avatars?.length > 0 && (
                                    <button type="button" onClick={() => canViewShareLink && setIsShareOpen(true)} className="mr-1 rounded-full" title="Participants">
                                        <AvatarStack people={trip.avatars} />
                                    </button>
                                )}
                                {canViewShareLink && (
                                    <button onClick={() => setIsShareOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50">
                                        <UserPlus className="h-4 w-4" /> Partager
                                    </button>
                                )}
                                {canEdit && (
                                    <button onClick={() => setSettingsSection("general")} title="Réglages du voyage" className="rounded-xl bg-white/15 p-2.5 backdrop-blur transition hover:bg-white/25">
                                        <Settings className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="relative mt-6">
                            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{trip.title}</h1>
                            {trip.description && <p className="mt-2 max-w-2xl text-sm text-indigo-100">{trip.description}</p>}

                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                                {trip.start_date && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                                        <Calendar className="h-3.5 w-3.5" /> {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
                                    </span>
                                )}
                                {status && (
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${status.className}`}>
                                        <status.Icon className="h-3.5 w-3.5" /> {status.label}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                                    <Users className="h-3.5 w-3.5" /> {trip.travelers || 1} voyageur{(trip.travelers || 1) > 1 ? "s" : ""}
                                </span>
                            </div>

                            {itinerary.length > 1 && (
                                <ol className="mt-5 flex flex-wrap items-center gap-1.5">
                                    {itinerary.map((point, index) => (
                                        <li key={`${point.label}-${index}`} className="flex items-center gap-1.5">
                                            {index > 0 && <ChevronRight className="h-4 w-4 text-white/50" />}
                                            <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ${point.origin ? "bg-slate-900/25 text-indigo-50" : "bg-white text-slate-800 shadow"}`}>
                                                {point.origin ? <Home className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5 text-fuchsia-500" />}
                                                {point.label}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </section>

                    <TripNotes trip={trip} />

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <TripMap stays={trip.stays || []} />
                    </div>

                    <div className="flex flex-wrap items-end gap-1 border-b border-slate-200 dark:border-slate-700">
                        {[
                            ["program", "Programme", Calendar, "text-violet-600 dark:text-violet-400", "bg-violet-500"],
                            ["transport", "Transports", Bus, "text-sky-600 dark:text-sky-400", "bg-sky-500"],
                            ["stays", "Logements", BedDouble, "text-emerald-600 dark:text-emerald-400", "bg-emerald-500"],
                            ["budget", "Budget", Wallet, "text-orange-600 dark:text-orange-400", "bg-orange-500"],
                            ["photos", "Photos", Image, "text-rose-600 dark:text-rose-400", "bg-rose-500"],
                        ].filter(([key]) => visibleTabs.includes(key)).map(([key, label, Icon, activeText, bar]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`relative -mb-px inline-flex items-center gap-2 overflow-hidden rounded-t-lg border px-4 py-3 text-sm font-semibold transition ${activeTab === key ? `border-slate-200 border-b-white bg-white ${activeText} dark:border-slate-700 dark:border-b-slate-800 dark:bg-slate-800` : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-700/50"}`}
                            >
                                {activeTab === key && <span className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />}
                                <Icon className={`h-4 w-4 ${activeTab === key ? "" : activeText}`} /> {label}
                            </button>
                        ))}
                        {canEdit && (
                            <button onClick={() => setSettingsSection("tabs")} className="ml-auto mb-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700" title="Gérer les onglets">
                                <SlidersHorizontal className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {activeTab === "program" && (
                        <ProgramTab
                            trip={trip}
                            canEdit={canEdit}
                            onOpenAI={() => setIsAIItineraryOpen(true)}
                            onOpenAddStay={handleOpenAddStay}
                            onEditStay={handleOpenEditStay}
                        />
                    )}

                    {activeTab === "transport" && <TransportTab trip={trip} />}

                    {activeTab === "stays" && <StaysTab trip={trip} />}

                    {activeTab === "budget" && <BudgetTab trip={trip} canEdit={canEdit} />}

                    {activeTab === "photos" && <PhotosTab trip={trip} />}

                {settingsSection && canEdit && (
                    <TripSettingsModal
                        trip={trip}
                        visibleTabs={visibleTabs}
                        initialSection={settingsSection}
                        onTabsChange={(next) => {
                            setVisibleTabs(next);
                            if (!next.includes(activeTab)) setActiveTab("program");
                        }}
                        onClose={() => setSettingsSection(null)}
                    />
                )}

                {isShareOpen && canViewShareLink && <ShareTripModal trip={trip} onClose={() => setIsShareOpen(false)} />}

                {editingStay && canEdit && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                                            Mettez à jour le lieu ou les dates
                                            de cette étape.
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

                            <form
                                onSubmit={handleUpdateStay}
                                className="space-y-4"
                            >
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
                                        onSelectLocation={(loc) =>
                                            editStayForm.setData({
                                                ...editStayForm.data,
                                                location_name: loc.name,
                                                latitude: loc.latitude,
                                                longitude: loc.longitude,
                                            })
                                        }
                                    />
                                    {editStayForm.errors.location_name && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {editStayForm.errors.location_name}
                                        </p>
                                    )}
                                </div>

                                <DateRangePicker
                                    startDate={editStayForm.data.arrival_date}
                                    endDate={editStayForm.data.departure_date}
                                    minDate={trip.start_date || undefined}
                                    maxDate={trip.end_date || undefined}
                                    onChange={(arrival_date, departure_date) =>
                                        editStayForm.setData({
                                            ...editStayForm.data,
                                            arrival_date,
                                            departure_date,
                                        })
                                    }
                                />

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

                {isAddingStay && canEdit && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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

                            <form
                                onSubmit={handleCreateStay}
                                className="space-y-4"
                            >
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

                                <DateRangePicker
                                    startDate={arrivalDate}
                                    endDate={departureDate}
                                    minDate={trip.start_date || undefined}
                                    maxDate={trip.end_date || undefined}
                                    onChange={(arrival, departure) => {
                                        setArrivalDate(arrival);
                                        setDepartureDate(departure);
                                    }}
                                />

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

                </div>
            </GuestLayout>
        </>
    );
}

export default function Show({ trip }) {
    return (
        <TripPermissionsProvider permissions={trip.permissions}>
            <ShowContent trip={trip} />
        </TripPermissionsProvider>
    );
}
