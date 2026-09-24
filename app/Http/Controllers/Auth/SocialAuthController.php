<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Trip;
use App\Models\TripUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    // Redirige vers Google ou Facebook
    public function redirectToProvider($provider)
    {
        return Socialite::driver($provider)->redirect();
    }

    // Récupère les données du fournisseur
    public function handleProviderCallback(Request $request, $provider)
    {
        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (\Exception $e) {
            return redirect()->route('login')->with('error', 'Échec de l\'authentification. Veuillez réessayer.');
        }

        // 1. Chercher si l'utilisateur existe déjà par email
        $user = User::where('email', $socialUser->getEmail())->first();

        if (!$user) {
            // S'il n'existe pas, on crée son compte automatiquement
            $user = User::create([
                'name' => $socialUser->getName() ?? 'Utilisateur',
                'email' => $socialUser->getEmail(),
                'avatar' => $socialUser->getAvatar(),
                'password' => bcrypt(Str::random(24)), // Mot de passe aléatoire sécurisé
                'email_verified_at' => now(),
            ]);
        } else {
            // Mettre à jour l'avatar si nécessaire
            if (!$user->avatar && $socialUser->getAvatar()) {
                $user->update(['avatar' => $socialUser->getAvatar()]);
            }
        }

        // 2. Connecter l'utilisateur
        Auth::login($user);

        // 3. 🔥 Le "Magic Trick" : Fusionner les voyages de l'invité non inscrit
        $this->mergeGuestDataToUser($user, $request);

        return redirect()->intended('/trips');
    }

    // Fonction de fusion des données anonymes
    protected function mergeGuestDataToUser($user, Request $request)
    {
        $guestToken = $request->cookie('guest_token');

        if ($guestToken) {
            // Rattacher les voyages créés anonymement
            Trip::where('guest_token', $guestToken)->update([
                'user_id' => $user->id,
                'guest_token' => null
            ]);

            // Rattacher les participations (rôles) anonymes
            TripUser::where('guest_token', $guestToken)->update([
                'user_id' => $user->id,
                'guest_token' => null
            ]);

            // Supprimer le cookie invité
            Cookie::queue(Cookie::forget('guest_token'));
        }
    }
}