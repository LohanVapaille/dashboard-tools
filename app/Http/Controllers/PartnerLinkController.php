<?php

namespace App\Http\Controllers;

use App\Services\Affiliate\PartnerLinks;
use Illuminate\Http\Request;

class PartnerLinkController extends Controller
{
    /** Lien affilié pour une marque partenaire, ouvert ensuite dans la fenêtre partenaire. */
    public function __invoke(Request $request, PartnerLinks $links)
    {
        $data = $request->validate([
            'url' => ['required', 'url:https', 'max:2048'],
            'sub_id' => ['nullable', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);

        abort_unless(PartnerLinks::allowed($data['url']), 422, 'Lien partenaire non reconnu.');

        return response()->json(['url' => $links->convert($data['url'], $data['sub_id'] ?? null)]);
    }
}
