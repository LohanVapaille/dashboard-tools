<?php

namespace App\Http\Controllers;

use App\Models\Day;
use App\Models\DayBlock;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DayBlockController extends Controller
{
    // Si tes voyages appartiennent à un utilisateur, ajoute ici une policy / un authorize()

    public function store(Request $request, Day $day)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(DayBlock::TYPES)],
        ]);

        $defaults = DayBlock::defaults($data['type']);

        $day->blocks()->create([
            'type' => $data['type'],
            'title' => $defaults['title'],
            'content' => $defaults['content'],
            'position' => ($day->blocks()->max('position') ?? -1) + 1,
        ]);

        return back();
    }

    public function update(Request $request, DayBlock $dayBlock)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:100'],
            'content' => ['sometimes', 'array'],
            'content.text' => ['nullable', 'string', 'max:5000'],
            'content.url' => ['nullable', 'string', 'max:2048'],
            'content.reference' => ['nullable', 'string', 'max:100'],
            'content.time' => ['nullable', 'string', 'max:5'],
            'content.items' => ['nullable', 'array', 'max:100'],
            'content.items.*.id' => ['required', 'string', 'max:40'],
            'content.items.*.text' => ['required', 'string', 'max:200'],
            'content.items.*.done' => ['nullable', 'boolean'],
            'content.items.*.amount' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
        ]);

        $dayBlock->update($data);

        return back();
    }

    public function destroy(DayBlock $dayBlock)
    {
        $dayBlock->delete();

        return back();
    }
}