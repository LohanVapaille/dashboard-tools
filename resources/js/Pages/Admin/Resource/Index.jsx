import { useState } from "react";
import { Link, router } from "@inertiajs/react";
import { ArrowUpDown, Check, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import { confirmDialog } from "@/Components/ConfirmDialog";

const BADGE_TONES = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300",
};

export function Badges({ badges }) {
    return badges?.map((badge) => (
        <span key={badge.label} className={`ml-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE_TONES[badge.tone] || "bg-slate-100 text-slate-600"}`}>{badge.label}</span>
    ));
}

function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
    );
}

function Cell({ column, value }) {
    if (value === null || value === undefined || value === "") return <span className="text-slate-300 dark:text-slate-600">—</span>;
    if (column.type === "boolean") return value ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300" />;
    if (column.type === "image") return <img src={value} alt="" className="h-10 w-14 rounded-lg object-cover" loading="lazy" />;
    if (column.type === "relation") {
        return (
            <Link href={route("admin.resources.edit", [column.resource, value.id])} onClick={(event) => event.stopPropagation()} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                {value.label}
            </Link>
        );
    }
    return <span className="break-words">{String(value)}</span>;
}

export default function ResourceIndexPage(props) {
    return <ResourceIndex key={props.resource.key} {...props} />;
}

function ResourceIndex({ resource, columns, filters, query, rows, pagination }) {
    const [search, setSearch] = useState(query.q || "");
    const params = { ...Object.fromEntries(filters.map((filter) => [filter.field, filter.value])) };
    const visit = (extra) => router.get(route("admin.resources.index", resource.key), { ...params, q: search || undefined, sort: query.sort, dir: query.dir, ...extra }, { preserveState: true, preserveScroll: true });

    const sortBy = (name) => visit({ sort: name, dir: query.sort === name && query.dir === "desc" ? "asc" : "desc" });

    const destroy = async (row) => {
        if (!(await confirmDialog({ title: `Supprimer « ${row.title} » ?`, message: "Cette action est définitive. Les éléments qui en dépendent peuvent être supprimés avec lui.", confirmLabel: "Supprimer" }))) return;
        router.delete(route("admin.resources.destroy", [resource.key, row.id]), { preserveScroll: true });
    };

    const toggle = (row, field) => router.patch(route("admin.resources.toggle", [resource.key, row.id]), { field }, { preserveScroll: true, preserveState: true });

    return (
        <AdminLayout
            title={resource.label}
            actions={
                <Link href={route("admin.resources.create", { resource: resource.key, ...params })} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                    <Plus className="h-4 w-4" /> Ajouter
                </Link>
            }
        >
            <div className="flex flex-wrap items-center gap-2">
                {resource.searchable && (
                    <form onSubmit={(event) => { event.preventDefault(); visit({ page: undefined }); }} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:max-w-md">
                        <Search className="h-4 w-4 shrink-0 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher (texte ou n°)…" className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm focus:ring-0" />
                    </form>
                )}
                {filters.map((filter) => (
                    <span key={filter.field} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                        {filter.label} :
                        <Link href={route("admin.resources.edit", [filter.resource, filter.value])} className="underline">{filter.title}</Link>
                        <button onClick={() => router.get(route("admin.resources.index", resource.key), { ...params, [filter.field]: undefined })} aria-label="Retirer le filtre"><X className="h-3.5 w-3.5" /></button>
                    </span>
                ))}
                <span className="ml-auto text-xs text-slate-500">{pagination.total.toLocaleString("fr-FR")} résultat{pagination.total > 1 ? "s" : ""}</span>
            </div>

            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/60">
                        <tr>
                            <th className="px-4 py-3"><button onClick={() => sortBy("id")} className="inline-flex items-center gap-1 font-bold">N° <ArrowUpDown className="h-3 w-3" /></button></th>
                            {columns.map((column) => (
                                <th key={column.name} className="px-4 py-3">
                                    <button onClick={() => sortBy(column.name)} className={`inline-flex items-center gap-1 font-bold ${query.sort === column.name ? "text-indigo-600" : ""}`}>{column.label} <ArrowUpDown className="h-3 w-3" /></button>
                                </th>
                            ))}
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.length === 0 && (
                            <tr><td colSpan={columns.length + 2} className="px-4 py-12 text-center text-sm text-slate-400">Aucun élément.</td></tr>
                        )}
                        {rows.map((row) => (
                            <tr key={row.id} onClick={() => router.visit(route("admin.resources.edit", [resource.key, row.id]))} className="cursor-pointer align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">#{row.id}</td>
                                {columns.map((column, index) => (
                                    <td key={column.name} className="max-w-xs px-4 py-3">
                                        {resource.toggles.includes(column.name) ? (
                                            <span onClick={(event) => event.stopPropagation()}><Toggle checked={Boolean(row.values[column.name])} onChange={() => toggle(row, column.name)} /></span>
                                        ) : (
                                            <Cell column={column} value={row.values[column.name]} />
                                        )}
                                        {index === 0 && <Badges badges={row.badges} />}
                                    </td>
                                ))}
                                <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                                    <Link href={route("admin.resources.edit", [resource.key, row.id])} className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" title="Modifier"><Pencil className="h-4 w-4" /></Link>
                                    <button onClick={() => destroy(row)} className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination.last > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{pagination.from}–{pagination.to} sur {pagination.total.toLocaleString("fr-FR")}</span>
                    <div className="flex gap-2">
                        <Link href={pagination.prev || "#"} preserveScroll disabled={!pagination.prev} className={`inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 font-bold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${pagination.prev ? "" : "pointer-events-none opacity-40"}`}><ChevronLeft className="h-4 w-4" /> Précédent</Link>
                        <span className="px-2 py-2 font-semibold">Page {pagination.current} / {pagination.last}</span>
                        <Link href={pagination.next || "#"} preserveScroll disabled={!pagination.next} className={`inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 font-bold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${pagination.next ? "" : "pointer-events-none opacity-40"}`}>Suivant <ChevronRight className="h-4 w-4" /></Link>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
