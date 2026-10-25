import { Link } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AdminIcon from "@/Components/Admin/AdminIcon";

const date = (value) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

function RecentList({ title, resource, items, render }) {
    return (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <h2 className="text-sm font-black">{title}</h2>
                <Link href={route("admin.resources.index", resource)} className="text-xs font-bold text-indigo-600 hover:underline">Tout voir</Link>
            </header>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-400">Rien pour le moment.</li>}
                {items.map((item) => (
                    <li key={item.id}>
                        <Link href={route("admin.resources.edit", [resource, item.id])} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            {render(item)}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function AdminDashboard({ stats, recentUsers, recentTrips }) {
    return (
        <AdminLayout title="Tableau de bord">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {stats.map((stat) => (
                    <Link key={stat.label} href={route("admin.resources.index", stat.resource)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300 dark:bg-slate-900 dark:ring-slate-800">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><AdminIcon name={stat.icon} className="h-4 w-4 text-indigo-500" /> {stat.label}</p>
                        <p className="mt-2 text-3xl font-black">{stat.value.toLocaleString("fr-FR")}</p>
                        <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
                    </Link>
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <RecentList title="Derniers inscrits" resource="users" items={recentUsers} render={(user) => (
                    <>
                        <span className="min-w-0"><span className="block truncate font-semibold">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></span>
                        <span className="shrink-0 text-xs text-slate-400">{date(user.created_at)}</span>
                    </>
                )} />
                <RecentList title="Derniers voyages" resource="trips" items={recentTrips} render={(trip) => (
                    <>
                        <span className="min-w-0"><span className="block truncate font-semibold">{trip.title}</span><span className="block truncate text-xs text-slate-500">{trip.user?.name || "Invité"}</span></span>
                        <span className="shrink-0 text-xs text-slate-400">{date(trip.created_at)}</span>
                    </>
                )} />
            </div>
        </AdminLayout>
    );
}
