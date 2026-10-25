import { Link, router, useForm } from "@inertiajs/react";
import { ArrowLeft, ExternalLink, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import AdminIcon from "@/Components/Admin/AdminIcon";
import RelationPicker from "@/Components/Admin/RelationPicker";
import { confirmDialog } from "@/Components/ConfirmDialog";
import { Badges } from "@/Pages/Admin/Resource/Index";

const INPUT = "w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const HTML_TYPES = { integer: "number", decimal: "number", date: "date", datetime: "datetime-local", time: "time", email: "email", url: "text", password: "password", text: "text" };

function Field({ field, value, onChange, error }) {
    const invalid = error ? "border-rose-400" : "";

    if (field.readonly) {
        return <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800">{value ? new Date(value).toLocaleString("fr-FR") : "—"}</p>;
    }

    switch (field.type) {
        case "boolean":
            return (
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    {value ? "Oui" : "Non"}
                </label>
            );
        case "select":
            return (
                <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={`${INPUT} ${invalid}`}>
                    {!field.required && <option value="">—</option>}
                    {field.required && (value ?? "") === "" && <option value="">Choisir…</option>}
                    {Object.entries(field.options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
            );
        case "textarea":
            return <textarea rows={4} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={`${INPUT} ${invalid}`} />;
        case "json":
            return <textarea rows={8} value={value ?? ""} onChange={(event) => onChange(event.target.value)} spellCheck={false} className={`${INPUT} font-mono text-xs ${invalid}`} placeholder='{"exemple": true}' />;
        case "relation":
            return <RelationPicker field={field} value={value} label={field.display?.label} onChange={onChange} invalid={Boolean(error)} />;
        case "image":
            return (
                <div className="flex flex-wrap items-center gap-3">
                    {field.display && <a href={field.display} target="_blank" rel="noreferrer"><img src={field.display} alt="" className="h-24 w-32 rounded-xl object-cover ring-1 ring-slate-200" /></a>}
                    <input type="file" accept="image/*" onChange={(event) => onChange(event.target.files[0] || null)} className="text-sm" />
                </div>
            );
        default:
            return (
                <input
                    type={HTML_TYPES[field.type] || "text"}
                    step={field.type === "decimal" ? "any" : undefined}
                    maxLength={field.max || undefined}
                    value={value ?? ""}
                    autoComplete={field.type === "password" ? "new-password" : undefined}
                    onChange={(event) => onChange(event.target.value)}
                    className={`${INPUT} ${invalid}`}
                />
            );
    }
}

// Inertia réutilise le composant d'une fiche à l'autre : la clé repart d'un formulaire neuf.
export default function ResourceFormPage(props) {
    return <ResourceForm key={`${props.resource.key}-${props.record?.id ?? "new"}`} {...props} />;
}

function ResourceForm({ resource, record, fields, children }) {
    const editable = fields.filter((field) => !field.readonly);
    // Les images ne sont envoyées que si un nouveau fichier est choisi.
    const form = useForm(Object.fromEntries(editable.map((field) => [field.name, field.type === "image" ? null : field.value])));

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, forceFormData: editable.some((field) => field.type === "image") };
        if (record) {
            form.transform((data) => ({ ...data, _method: "put" }));
            form.post(route("admin.resources.update", [resource.key, record.id]), options);
        } else {
            form.post(route("admin.resources.store", resource.key), options);
        }
    };

    const destroy = async () => {
        if (!(await confirmDialog({ title: `Supprimer « ${record.title} » ?`, message: "Cette action est définitive. Les éléments qui en dépendent (contenu d’un voyage…) peuvent être supprimés avec lui.", confirmLabel: "Supprimer" }))) return;
        router.delete(route("admin.resources.destroy", [resource.key, record.id]));
    };

    const title = record ? record.title : `Nouveau : ${resource.singular.toLowerCase()}`;

    return (
        <AdminLayout
            title={title}
            actions={
                <>
                    <Link href={route("admin.resources.index", resource.key)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        <ArrowLeft className="h-4 w-4" /> {resource.label}
                    </Link>
                    {record && (
                        <button onClick={destroy} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300">
                            <Trash2 className="h-4 w-4" /> Supprimer
                        </button>
                    )}
                </>
            }
        >
            {record && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{resource.singular} #{record.id}</span>
                    <Badges badges={record.badges} />
                    {record.links.map((link) => (
                        <a key={link.url} href={link.url} className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> {link.label}</a>
                    ))}
                </div>
            )}

            {children.length > 0 && (
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Contenu lié</h2>
                    <div className="flex flex-wrap gap-2">
                        {children.map((child) => (
                            <span key={`${child.resource}-${child.field}`} className="inline-flex items-center overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                                <Link href={route("admin.resources.index", { resource: child.resource, [child.field]: record.id })} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <AdminIcon name={child.icon} className="h-4 w-4 text-indigo-500" /> {child.label}
                                    <span className="rounded-full bg-slate-100 px-2 text-xs dark:bg-slate-800">{child.count}</span>
                                </Link>
                                <Link href={route("admin.resources.create", { resource: child.resource, [child.field]: record.id })} className="border-l border-slate-200 px-2.5 py-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:hover:bg-slate-800" title="Ajouter">
                                    <Plus className="h-4 w-4" />
                                </Link>
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <form onSubmit={submit} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="grid gap-x-6 gap-y-5 p-5 md:grid-cols-2">
                    {fields.map((field) => (
                        <div key={field.name} className={["textarea", "json"].includes(field.type) ? "md:col-span-2" : ""}>
                            <label className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                {field.label}
                                {field.required && <span className="text-rose-500">*</span>}
                                <span className="font-mono font-normal text-slate-400">{field.name}</span>
                            </label>
                            <Field
                                field={field}
                                value={field.readonly ? field.value : form.data[field.name]}
                                onChange={(value) => form.setData(field.name, value)}
                                error={form.errors[field.name]}
                            />
                            {field.help && <p className="mt-1 text-[11px] text-slate-400">{field.help}</p>}
                            {form.errors[field.name] && <p className="mt-1 text-xs text-rose-600">{form.errors[field.name]}</p>}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                    <button disabled={form.processing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {form.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {record ? "Enregistrer" : "Créer"}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
