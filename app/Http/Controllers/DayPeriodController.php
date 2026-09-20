<?php

namespace App\Http\Controllers;

use App\Models\Day;
use Illuminate\Http\Request;

class DayPeriodController extends Controller
{
    public function update(Request $request, Day $day)
    {
        $data = $request->validate([
            'period' => ['required', 'string', 'max:30'],
            'hidden' => ['required', 'boolean'],
        ]);

        $hidden = collect($day->hidden_periods ?? [])
            ->reject(fn($p) => $p === $data['period']);

        if ($data['hidden']) {
            $hidden->push($data['period']);
        }

        $day->update(['hidden_periods' => $hidden->values()->all()]);

        return back();
    }
}