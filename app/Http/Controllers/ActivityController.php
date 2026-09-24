<?php

namespace App\Http\Controllers;

use App\Models\Day;
use App\Models\Activity;
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
        ]);

        $activity->update($validated);

        return back();
    }

    public function updatePeriod(Request $request, Activity $activity)
    {
        $validated = $request->validate([
            'period' => 'required|in:matin,midi,apres_midi,soir,nuit',
        ]);

        $activity->update([
            'period' => $validated['period']
        ]);

        return response()->json($activity);
    }

    public function destroy(Activity $activity)
    {
        $activity->delete();

        // Si la requête est en AJAX/Axios, un statut 200 vide ou noContent convient parfaitement
        return response()->noContent();
    }
}