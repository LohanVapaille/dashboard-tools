<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Équipe d'assistance : toutes les conversations en direct.
Broadcast::channel('support.agents', fn ($user) => $user->isSupportAgent());
