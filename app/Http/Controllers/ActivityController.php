<?php

namespace App\Http\Controllers;

use App\Models\Day;
use App\Models\Activity;
use App\Models\Trip;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function store(Request $request, Day $day)
    {


        $validated = $request->validate([
            'title' => 'required|string|max:191',
            'period' => 'required|in:matin,midi,apres_midi,soir,nuit',
            'category' => 'required|string',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'location_name' => 'nullable|string',
            'source_url' => 'nullable|url:http,https|max:2048',
            'start_time' => 'nullable|date_format:H:i',
        ]);

        // Crée et récupère l'activité fraîchement insérée
        $activity = $day->activities()->create($validated);

        // Retourne l'objet JSON (nécessaire pour l'affichage dynamique front-end)
        return response()->json($activity, 201);
    }

    public function update(Request $request, Activity $activity)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:191',
            'period' => 'required|in:matin,midi,apres_midi,soir,nuit',
            'category' => 'required|string',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'location_name' => 'nullable|string',
            'source_url' => 'nullable|url:http,https|max:2048',
            'start_time' => 'nullable|date_format:H:i',
        ]);

        $activity->update($validated);

        return $request->wantsJson() ? response()->json($activity->fresh()) : back();
    }

    public function updatePeriod(Request $request, Activity $activity)
    {
        $validated = $request->validate([
            'period' => 'required|in:matin,midi,apres_midi,soir,nuit',
            'day_id' => 'sometimes|integer|exists:days,id',
            // Identifiants de la période d'arrivée, dans l'ordre affiché après le déplacement.
            'order' => 'sometimes|array|max:200',
            'order.*' => 'integer',
        ]);

        // Changement de journée : uniquement vers un jour du même voyage.
        if (isset($validated['day_id'])) {
            $tripId = $activity->day->stay->trip_id;
            abort_unless(
                Day::whereKey($validated['day_id'])->whereHas('stay', fn ($query) => $query->where('trip_id', $tripId))->exists(),
                422,
                'Cette journée n’appartient pas à ce voyage.'
            );
        }

        $activity->update(collect($validated)->except('order')->all());

        if (isset($validated['order'])) {
            $siblings = Activity::where('day_id', $activity->day_id)->where('period', $activity->period)->pluck('id')->map(fn ($id) => (int) $id)->all();
            $position = 0;
            foreach ($validated['order'] as $id) {
                if (in_array($id, $siblings, true)) {
                    Activity::whereKey($id)->update(['order_index' => $position++]);
                }
            }
        }

        return response()->json($activity->fresh());
    }

    public function destroy(Activity $activity)
    {
        $activity->delete();

        // Si la requête est en AJAX/Axios, un statut 200 vide ou noContent convient parfaitement
        return response()->noContent();
    }

    /** Vide tout le programme du voyage (activités de toutes les journées), étapes et infos conservées. */
    public function destroyAll(Trip $trip)
    {
        $deleted = Activity::whereIn('day_id', Day::whereIn('stay_id', $trip->stays()->select('id'))->select('id'))->delete();

        return response()->json(['deleted' => $deleted]);
    }
}