<?php

namespace App\Http\Controllers;

use App\Models\Day;
use Illuminate\Http\Request;

class DayController extends Controller
{
    public function update(Request $request, Day $day)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $day->update($validated);

        return redirect()->back();
    }
}
