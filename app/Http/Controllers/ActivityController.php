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

        $day->activities()->create($validated);

        return back();
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

    public function destroy(Activity $activity)
    {
        $activity->delete();
        return back();
    }
}