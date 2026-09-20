import { PERIODS } from "@/Constants/itinerary";
import PeriodSlot from "@/Components/Itinerary/PeriodSlot";

// Carte d'un jour au sein d'un séjour : date + 5 créneaux (matin, midi, après-midi, soir, nuit)
export default function DayCard({ day }) {
    const activitiesByPeriod = (period) =>
        (day.activities || []).filter((a) => a.period === period);

    const formattedDate = new Date(day.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 capitalize">
                    Jour {day.day_number} — {formattedDate}
                </h4>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
                {PERIODS.map((period) => (
                    <PeriodSlot
                        key={period.key}
                        dayId={day.id}
                        period={period.key}
                        activities={activitiesByPeriod(period.key)}
                    />
                ))}
            </div>
        </div>
    );
}
