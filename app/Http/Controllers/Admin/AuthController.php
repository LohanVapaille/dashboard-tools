<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureBackofficeAdmin;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function create(Request $request)
    {
        if (EnsureBackofficeAdmin::check($request)) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Admin/Login', ['configured' => filled(config('admin.password'))]);
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:191'],
            'password' => ['required', 'string', 'max:191'],
        ]);

        $expected = (string) config('admin.password');
        // hash_equals sur les deux champs : pas d'indice par le temps de réponse.
        $valid = $expected !== ''
            & hash_equals((string) config('admin.username'), $credentials['username'])
            & hash_equals($expected, $credentials['password']);

        if (!$valid) {
            throw ValidationException::withMessages([
                'username' => $expected === '' ? 'Le back-office est désactivé : définissez ADMIN_PASSWORD dans le fichier .env.' : 'Identifiant ou mot de passe incorrect.',
            ]);
        }

        $request->session()->regenerate();
        $request->session()->put(EnsureBackofficeAdmin::SESSION_KEY, true);

        return redirect()->intended(route('admin.dashboard'));
    }

    public function destroy(Request $request)
    {
        $request->session()->forget(EnsureBackofficeAdmin::SESSION_KEY);
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
