import { useEffect, useState } from "react";
import { router, useForm } from "@inertiajs/react";
import axios from "axios";
import {
    AlertTriangle,
    BedDouble,
    Bus,
    Calendar,
    Image,
    LayoutGrid,
    LogOut,
    Minus,
    Plane,
    Plus,
    Settings,
    Trash2,
    Users,
    Wallet,
    X,
} from "lucide-react";
import DateRangePicker from "@/Components/DateRangePicker";
import LocationSearchInput from "@/Components/Itinerary/LocationSearchInput";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

const SECTIONS = [
    ["general", "Général", Settings],
    ["travel", "Voyageurs", Users],
    ["tabs", "Onglets", LayoutGrid],
    ["danger", "Zone sensible", AlertTriangle],
];

const TABS = [
    ["program", "Programme", "Étapes, journées et activités", Calendar, "bg-violet-500", true],
    ["transport", "Transports", "Recherche et achat de vols", Bus, "bg-sky-500", false],
    ["stays", "Logements", "Hôtels et locations réservables", BedDouble, "bg-emerald-500", false],
    ["budget", "Budget", "Prévisionnel et dépenses partagées", Wallet, "bg-orange-500", false],
    ["photos", "Photos", "Album partagé du voyage", Image, "bg-rose-500", false],
];

const Field = ({ label, error, children }) => (
    <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        {children}
        {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
);

export default function TripSettingsModal({ trip, visibleTabs, onTabsChange, initialSection = "general", onClose }) {
    const { isOwner } = useTripPermissions();
    const [section, setSection] = useState(initialSection);
    const [tabsSaving, setTabsSaving] = useState(false);
    const form = useForm({
        title: trip.title || "",
        description: trip.description || "",
        start_date: trip.start_date || "",
        end_date: trip.end_date || "",
        travelers: trip.travelers || 1,
        origin_name: trip.origin_name || "",
        origin_latitude: trip.origin_latitude ?? null,
        origin_longitude: trip.origin_longitude ?? null,
    });

    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const submit = (event) => {
        event.preventDefault();
        const originIncomplete = form.data.origin_name && !form.data.origin_latitude;
        form.transform((data) => (originIncomplete ? { ...data, origin_name: trip.origin_name, origin_latitude: trip.origin_latitude, origin_longitude: trip.origin_longitude } : data));
        form.put(route("trips.update", trip.id), { preserveScroll: true, onSuccess: onClose });
    };

    const toggleTab = async (key, checked) => {
        const next = checked ? [...visibleTabs, key] : visibleTabs.filter((tab) => tab !== key);
        const previous = visibleTabs;
        onTabsChange(next);
        setTabsSaving(true);
        try {
            await axios.patch(route("trips.tabs.update", trip.id), { visible_tabs: next });
        } catch {
            onTabsChange(previous);
        } finally {
            setTabsSaving(false);
        }
    };

    const destroy = () => {
        if (window.prompt(`Pour supprimer définitivement ce voyage, tapez son nom : ${trip.title}`) === trip.title) {
            router.delete(route("trips.destroy", trip.id));
        }
    };

    const leave = () => {
        if (window.confirm("Quitter ce voyage ? Vous n’y aurez plus accès, sauf nouvelle invitation.")) router.delete(route("trips.leave", trip.id));
    };

    const errors = form.errors;
    const formSections = ["general", "travel"];

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-2.5 text-white shadow dark:from-slate-600 dark:to-slate-800"><Settings className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Réglages du voyage</h3>
                            <p className="text-xs text-slate-500">{trip.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    <nav className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 dark:border-slate-800 sm:w-48 sm:shrink-0 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
                        {SECTIONS.map(([key, label, Icon]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSection(key)}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${section === key ? (key === "danger" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300") : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                            >
                                <Icon className="h-4 w-4" /> {label}
                            </button>
                        ))}
                    </nav>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {formSections.includes(section) && (
                            <form onSubmit={submit} className="flex h-full flex-col">
                                <div className="flex-1 space-y-5 p-6">
                                    {section === "general" && (
                                        <>
                                            <Field label="Nom du voyage" error={errors.title}>
                                                <input
                                                    value={form.data.title}
                                                    onChange={(event) => form.setData("title", event.target.value)}
                                                    required
                                                    maxLength={191}
                                                    className="w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </Field>
                                            <Field label="Description" error={errors.description}>
                                                <textarea
                                                    value={form.data.description}
                                                    onChange={(event) => form.setData("description", event.target.value)}
                                                    rows={3}
                                                    placeholder="L’idée du voyage, les envies du groupe…"
                                                    className="w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </Field>
                                            <div>
                                                <DateRangePicker
                                                    label="Dates du voyage"
                                                    startDate={form.data.start_date}
                                                    endDate={form.data.end_date}
                                                    onChange={(start_date, end_date) => form.setData((data) => ({ ...data, start_date, end_date }))}
                                                />
                                                {(errors.start_date || errors.end_date) && <p className="mt-1 text-xs text-rose-600">{errors.start_date || errors.end_date}</p>}
                                                <p className="mt-1.5 text-[11px] text-slate-400">Les étapes existantes ne sont pas déplacées automatiquement.</p>
                                            </div>
                                        </>
                                    )}

                                    {section === "travel" && (
                                        <>
                                            <Field label="Nombre de voyageurs" error={errors.travelers}>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => form.setData("travelers", Math.max(1, form.data.travelers - 1))} className="rounded-xl border border-slate-300 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Minus className="h-4 w-4" /></button>
                                                    <span className="w-12 text-center text-2xl font-black text-slate-900 dark:text-white">{form.data.travelers}</span>
                                                    <button type="button" onClick={() => form.setData("travelers", Math.min(16, form.data.travelers + 1))} className="rounded-xl border border-slate-300 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="h-4 w-4" /></button>
                                                    <span className="text-xs text-slate-500">Utilisé par défaut pour les vols et les logements.</span>
                                                </div>
                                            </Field>
                                            <Field label="Ville de départ" error={errors.origin_name || errors.origin_latitude}>
                                                <LocationSearchInput
                                                    value={form.data.origin_name}
                                                    required={false}
                                                    placeholder="D’où partez-vous ?"
                                                    onChange={(value) => form.setData((data) => ({ ...data, origin_name: value, origin_latitude: null, origin_longitude: null }))}
                                                    onSelectLocation={(location) => form.setData((data) => ({ ...data, origin_name: location.name, origin_latitude: location.latitude, origin_longitude: location.longitude }))}
                                                />
                                                <span className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400"><Plane className="h-3 w-3" /> Sert à proposer l’aéroport le plus proche dans l’onglet Transports.</span>
                                            </Field>
                                        </>
                                    )}
                                </div>
                                <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                                    {form.recentlySuccessful && <span className="mr-auto text-xs font-semibold text-emerald-600">Enregistré</span>}
                                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">Annuler</button>
                                    <button disabled={form.processing || !form.isDirty} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50">
                                        {form.processing ? "Enregistrement…" : "Enregistrer"}
                                    </button>
                                </footer>
                            </form>
                        )}

                        {section === "tabs" && (
                            <div className="space-y-3 p-6">
                                <p className="text-sm text-slate-500">Affichez seulement ce qui sert à votre voyage. Le programme reste toujours visible.</p>
                                {TABS.map(([key, label, hint, Icon, color, required]) => {
                                    const enabled = visibleTabs.includes(key);
                                    return (
                                        <div key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                                            <span className={`rounded-xl p-2 text-white ${color}`}><Icon className="h-4 w-4" /></span>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
                                                <p className="text-xs text-slate-500">{hint}</p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={enabled}
                                                aria-label={label}
                                                disabled={required || tabsSaving}
                                                onClick={() => toggleTab(key, !enabled)}
                                                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed ${enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"} ${required ? "opacity-50" : ""}`}
                                            >
                                                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {section === "danger" && (
                            <div className="space-y-4 p-6">
                                {isOwner ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-900 dark:bg-rose-950/20">
                                        <h4 className="flex items-center gap-2 font-black text-rose-800 dark:text-rose-200"><Trash2 className="h-4 w-4" /> Supprimer le voyage</h4>
                                        <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-300/80">Le programme, les notes, les photos et les accès des participants seront supprimés définitivement. Les réservations déjà payées restent valables et visibles dans « Réservations ».</p>
                                        <button onClick={destroy} className="mt-4 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-rose-700">Supprimer définitivement</button>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/20">
                                        <h4 className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-200"><LogOut className="h-4 w-4" /> Quitter le voyage</h4>
                                        <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-300/80">Le voyage disparaîtra de votre liste. Le propriétaire pourra vous réinviter.</p>
                                        <button onClick={leave} className="mt-4 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-amber-700">Quitter ce voyage</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
