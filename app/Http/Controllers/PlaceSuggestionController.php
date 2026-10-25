<?php

namespace App\Http\Controllers;

use App\Services\Places\MajorCities;
use Illuminate\Http\Request;

class PlaceSuggestionController extends Controller
{
    /**
     * Destination trop large pour chercher un logement (pays, région) : propose les grandes villes.
     * mode = country (le lieu est un pays) | nearby (grandes villes autour du point) | null (rien à proposer).
     */
    public function cities(Request $request, MajorCities $cities)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'country_code' => ['nullable', 'string', 'size:2'],
            'kind' => ['nullable', 'string', 'max:40'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'nearby' => ['nullable', 'boolean'],
        ]);

        // Le code pays seul ne suffit pas : « Reykjavík » a aussi le code IS. Il ne compte que si le lieu est un pays.
        $country = $cities->country($data['name'] ?? null, ($data['kind'] ?? null) === 'country' ? ($data['country_code'] ?? null) : null);

        if ($country) {
            return response()->json(['mode' => 'country', 'country' => ['code' => $country['code'], 'name' => $country['name']], 'cities' => $country['cities']]);
        }

        if ($request->boolean('nearby') && isset($data['latitude'], $data['longitude'])) {
            $nearby = $cities->nearby((float) $data['latitude'], (float) $data['longitude']);

            return response()->json(['mode' => $nearby ? 'nearby' : null, 'country' => null, 'cities' => $nearby]);
        }

        return response()->json(['mode' => null, 'country' => null, 'cities' => []]);
    }
}
