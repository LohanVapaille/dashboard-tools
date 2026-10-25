<?php

namespace App\Admin;

use App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Registre du back-office : une entrée par table gérée.
 * Les champs sont déduits du schéma de la base (types, nullabilité, enum) puis
 * complétés par les surcharges de chaque ressource : un CRUD reste à jour quand une migration ajoute une colonne.
 */
class AdminResources
{
    /** Colonnes de clé étrangère => ressource liée. */
    private const RELATIONS = [
        'user_id' => 'users',
        'trip_id' => 'trips',
        'stay_id' => 'stays',
        'from_stay_id' => 'stays',
        'to_stay_id' => 'stays',
        'day_id' => 'days',
        'paid_by' => 'trip_budget_members',
        'trip_expense_id' => 'trip_expenses',
        'trip_budget_member_id' => 'trip_budget_members',
        'flight_order_id' => 'flight_orders',
        'stay_order_id' => 'stay_orders',
        'support_conversation_id' => 'support_conversations',
        'copied_from_id' => 'trips',
    ];

    private const LABELS = [
        'name' => 'Nom', 'email' => 'E-mail', 'password' => 'Mot de passe', 'avatar' => 'Avatar',
        'email_verified_at' => 'E-mail vérifié le', 'premium_granted' => 'Premium offert',
        'subscription_status' => 'Statut abonnement Stripe', 'subscription_ends_at' => 'Fin d’abonnement',
        'user_id' => 'Utilisateur', 'trip_id' => 'Voyage', 'stay_id' => 'Étape', 'day_id' => 'Jour',
        'from_stay_id' => 'Étape de départ', 'to_stay_id' => 'Étape d’arrivée', 'paid_by' => 'Payé par',
        'title' => 'Titre', 'description' => 'Description', 'notes' => 'Notes', 'caption' => 'Légende',
        'start_date' => 'Début', 'end_date' => 'Fin', 'arrival_date' => 'Arrivée', 'departure_date' => 'Départ',
        'date' => 'Date', 'day_number' => 'N° du jour', 'location_name' => 'Lieu', 'latitude' => 'Latitude',
        'longitude' => 'Longitude', 'order_index' => 'Ordre', 'position' => 'Position', 'period' => 'Moment',
        'category' => 'Catégorie', 'price' => 'Prix', 'amount' => 'Montant', 'currency' => 'Devise',
        'status' => 'Statut', 'role' => 'Rôle', 'type' => 'Type', 'kind' => 'Type', 'content' => 'Contenu',
        'reference' => 'Référence', 'provider' => 'Fournisseur', 'path' => 'Image', 'topic' => 'Sujet',
        'body' => 'Message', 'author' => 'Auteur', 'author_name' => 'Nom de l’auteur', 'travelers' => 'Voyageurs',
        'is_private' => 'Privé', 'guest_token' => 'Jeton invité', 'guest_name' => 'Pseudo invité',
        'share_token' => 'Jeton de partage', 'budget_target' => 'Budget cible', 'origin_name' => 'Ville de départ',
        'total_amount' => 'Total', 'created_at' => 'Créé le', 'updated_at' => 'Modifié le',
        'transport_mode' => 'Transport', 'cost' => 'Coût', 'accommodation_cost' => 'Coût du logement',
        'start_time' => 'Heure', 'spent_on' => 'Date de dépense', 'split_mode' => 'Répartition',
        'per_person' => 'Par personne', 'hidden' => 'Masqué', 'group' => 'Groupe', 'label' => 'Libellé',
        'contact_email' => 'E-mail de contact', 'contact_phone' => 'Téléphone', 'paid_at' => 'Payé le',
        'check_in' => 'Arrivée', 'check_out' => 'Départ', 'guests' => 'Voyageurs', 'rooms' => 'Chambres',
    ];

    private static array $definitions;
    private static array $fieldCache = [];

    public static function all(): array
    {
        return self::$definitions ??= self::define();
    }

    public static function get(string $key): array
    {
        abort_unless(isset(self::all()[$key]), 404);

        return ['key' => $key, ...self::all()[$key]];
    }

    public static function model(string $key): Model
    {
        return new (self::get($key)['model']);
    }

    /** Menu latéral du back-office, groupé. */
    public static function nav(): array
    {
        return collect(self::all())
            ->map(fn ($def, $key) => ['key' => $key, 'label' => $def['label'], 'icon' => $def['icon'], 'group' => $def['group']])
            ->groupBy('group')
            ->map(fn ($items, $group) => ['group' => $group, 'items' => $items->values()->all()])
            ->values()
            ->all();
    }

    /** Champs du formulaire, déduits du schéma puis surchargés. */
    public static function fields(string $key): array
    {
        if (isset(self::$fieldCache[$key])) {
            return self::$fieldCache[$key];
        }

        $def = self::get($key);
        $model = self::model($key);
        $fields = [];

        foreach (Schema::getColumns($model->getTable()) as $column) {
            $name = $column['name'];
            if ($name === 'id' || in_array($name, ['remember_token', ...($def['exclude'] ?? [])], true)) {
                continue;
            }

            $field = [
                'name' => $name,
                'label' => self::LABELS[$name] ?? Str::ucfirst(str_replace('_', ' ', $name)),
                'type' => self::guessType($column, $model),
                'required' => !$column['nullable'] && $column['default'] === null && !$column['auto_increment'],
                'readonly' => in_array($name, ['created_at', 'updated_at'], true),
                'max' => preg_match('/^varchar\((\d+)\)/', $column['type'], $m) ? (int) $m[1] : null,
            ];

            if ($field['type'] === 'select') {
                preg_match_all("/'([^']*)'/", $column['type'], $m);
                $field['options'] = collect($m[1])->mapWithKeys(fn ($value) => [$value => Str::ucfirst(str_replace('_', ' ', $value))])->all();
            }
            if ($field['type'] === 'relation') {
                $field['resource'] = self::RELATIONS[$name];
            }

            $fields[$name] = array_merge($field, $def['fields'][$name] ?? []);
            if (in_array($fields[$name]['type'], ['boolean', 'password'], true) || $fields[$name]['readonly']) {
                $fields[$name]['required'] = false;
            }
        }

        return self::$fieldCache[$key] = $fields;
    }

    /** Colonnes affichées dans la liste. */
    public static function columns(string $key): array
    {
        $fields = self::fields($key);
        $names = self::get($key)['columns'] ?? collect($fields)->reject(fn ($f) => in_array($f['type'], ['textarea', 'json', 'password'], true))->keys()->take(6)->all();

        return array_values(array_filter(array_map(fn ($name) => $fields[$name] ?? null, $names)));
    }

    /** Ressources qui pointent vers celle-ci (contenu d'un voyage, d'un utilisateur…). */
    public static function children(string $key): array
    {
        $children = [];
        foreach (array_keys(self::all()) as $other) {
            foreach (self::fields($other) as $field) {
                if ($field['type'] === 'relation' && $field['resource'] === $key) {
                    $children[] = ['resource' => $other, 'field' => $field['name'], 'label' => self::all()[$other]['label'] . ($field['name'] !== self::foreignKeyFor($key) ? ' (' . Str::lower($field['label']) . ')' : '')];
                }
            }
        }

        return $children;
    }

    public static function title(string $key, ?Model $model): string
    {
        if (!$model) {
            return '—';
        }
        $title = self::get($key)['title'];
        $value = is_callable($title) ? $title($model) : $model->getAttribute($title);

        return filled($value) ? (string) $value : self::get($key)['singular'] . ' #' . $model->getKey();
    }

    /** Valeur brute prête pour un champ de formulaire. */
    public static function formValue(array $field, Model $model): mixed
    {
        $raw = $model->getAttributes()[$field['name']] ?? null;

        return match ($field['type']) {
            'password' => '',
            'boolean' => (bool) $raw,
            'date' => $raw ? substr((string) $raw, 0, 10) : null,
            'datetime' => $raw ? Carbon::parse($raw)->format('Y-m-d\TH:i') : null,
            'time' => $raw ? substr((string) $raw, 0, 5) : null,
            'json' => self::prettyJson($raw),
            default => $raw,
        };
    }

    /** Valeur affichée dans une liste ou une fiche. */
    public static function displayValue(array $field, Model $model, array $relationTitles = []): mixed
    {
        $raw = $model->getAttributes()[$field['name']] ?? null;
        if ($raw === null || $raw === '') {
            return null;
        }

        return match ($field['type']) {
            'relation' => ['id' => $raw, 'label' => $relationTitles[$field['name']][$raw] ?? '#' . $raw],
            'boolean' => (bool) $raw,
            'select' => $field['options'][$raw] ?? $raw,
            'image' => self::imageUrl($raw),
            'datetime' => Carbon::parse($raw)->format('d/m/Y H:i'),
            'date' => Carbon::parse($raw)->format('d/m/Y'),
            'json', 'textarea' => Str::limit(is_string($raw) ? $raw : json_encode($raw), 80),
            default => is_string($raw) ? Str::limit($raw, 80) : $raw,
        };
    }

    /** Titres des éléments liés d'une page de résultats, en une requête par relation. */
    public static function relationTitles(string $key, iterable $models, ?array $fields = null): array
    {
        $titles = [];
        foreach ($fields ?? self::fields($key) as $field) {
            if ($field['type'] !== 'relation') {
                continue;
            }
            $ids = collect($models)->map(fn ($model) => $model->getAttributes()[$field['name']] ?? null)->filter()->unique()->values();
            if ($ids->isEmpty()) {
                continue;
            }
            $titles[$field['name']] = self::model($field['resource'])->newQuery()->whereKey($ids)->get()
                ->mapWithKeys(fn ($related) => [$related->getKey() => self::title($field['resource'], $related)])
                ->all();
        }

        return $titles;
    }

    public static function imageUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        // Même convention que TripPhoto::url : relatif, indépendant d'APP_URL.
        return Str::startsWith($path, ['http://', 'https://', '/']) ? $path : '/storage/' . ltrim($path, '/');
    }

    private static function foreignKeyFor(string $key): string
    {
        return array_search($key, self::RELATIONS, true) ?: '';
    }

    private static function prettyJson(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;

        return json_last_error() === JSON_ERROR_NONE
            ? json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            : (string) $raw;
    }

    private static function guessType(array $column, Model $model): string
    {
        $name = $column['name'];
        $type = strtolower($column['type_name']);

        return match (true) {
            isset(self::RELATIONS[$name]) => 'relation',
            str_starts_with(strtolower($column['type']), 'tinyint(1)') || $model->hasCast($name, ['bool', 'boolean']) => 'boolean',
            $type === 'enum' => 'select',
            $type === 'json' || $model->hasCast($name, ['array', 'json', 'object', 'collection']) => 'json',
            in_array($type, ['int', 'integer', 'bigint', 'smallint', 'tinyint', 'mediumint'], true) => 'integer',
            in_array($type, ['decimal', 'float', 'double', 'numeric'], true) => 'decimal',
            $type === 'date' => 'date',
            in_array($type, ['datetime', 'timestamp'], true) => 'datetime',
            $type === 'time' => 'time',
            in_array($type, ['text', 'mediumtext', 'longtext', 'tinytext'], true) => 'textarea',
            $name === 'password' => 'password',
            str_contains($name, 'email') => 'email',
            str_ends_with($name, 'url') => 'url',
            default => 'text',
        };
    }

    private static function options(array $values): array
    {
        return collect($values)->mapWithKeys(fn ($value) => [$value => Str::ucfirst(str_replace('_', ' ', $value))])->all();
    }

    private static function define(): array
    {
        $statusOptions = ['type' => 'select', 'options' => ['open' => 'Ouverte', 'closed' => 'Clôturée']];

        return [
            // Utilisateurs
            'users' => [
                'model' => Models\User::class, 'label' => 'Utilisateurs', 'singular' => 'Utilisateur', 'icon' => 'users', 'group' => 'Utilisateurs',
                'title' => fn ($u) => "{$u->name} · {$u->email}", 'search' => ['name', 'email'],
                'columns' => ['name', 'email', 'premium_granted', 'subscription_status', 'created_at'],
                'toggles' => ['premium_granted'],
                'badges' => fn ($u) => array_values(array_filter([
                    $u->hasStripePremium() ? ['label' => 'Abonné Stripe', 'tone' => 'emerald'] : null,
                    $u->isSupportAgent() ? ['label' => 'Assistance', 'tone' => 'fuchsia'] : null,
                ])),
                'fields' => [
                    'email' => ['unique' => true],
                    'password' => ['type' => 'password', 'required_on_create' => true, 'help' => 'Laisser vide pour conserver le mot de passe actuel.'],
                    'premium_granted' => ['help' => 'Donne accès à Premium sans abonnement Stripe.'],
                    'avatar' => ['help' => 'URL ou chemin du fichier sur le disque public.'],
                ],
            ],

            // Voyages
            'trips' => [
                'model' => Models\Trip::class, 'label' => 'Voyages', 'singular' => 'Voyage', 'icon' => 'map', 'group' => 'Voyages',
                'title' => 'title', 'search' => ['title', 'description', 'origin_name'],
                'columns' => ['title', 'user_id', 'start_date', 'end_date', 'is_private', 'created_at'],
                'fields' => [
                    'user_id' => ['help' => 'Vide pour un voyage créé par un invité (jeton invité).'],
                    'share_token' => ['help' => 'Généré automatiquement à la création. Le modifier invalide le lien de partage actuel.'],
                ],
            ],
            'trip_participants' => [
                'model' => Models\TripParticipant::class, 'label' => 'Participants', 'singular' => 'Participant', 'icon' => 'user-plus', 'group' => 'Voyages',
                'title' => fn ($p) => $p->guest_name ?: $p->email ?: ($p->user_id ? 'Utilisateur #' . $p->user_id : null), 'search' => ['guest_name', 'email'],
                'columns' => ['trip_id', 'user_id', 'guest_name', 'email', 'role', 'status'],
            ],

            // Contenu des voyages
            'stays' => [
                'model' => Models\Stay::class, 'label' => 'Étapes', 'singular' => 'Étape', 'icon' => 'map-pin', 'group' => 'Contenu des voyages',
                'title' => fn ($s) => $s->location_name . ($s->arrival_date ? ' · ' . Carbon::parse($s->getAttributes()['arrival_date'])->format('d/m/Y') : ''), 'search' => ['location_name', 'notes'],
                'columns' => ['location_name', 'trip_id', 'arrival_date', 'departure_date', 'order_index'],
            ],
            'days' => [
                'model' => Models\Day::class, 'label' => 'Jours', 'singular' => 'Jour', 'icon' => 'calendar', 'group' => 'Contenu des voyages',
                'title' => fn ($d) => 'Jour ' . $d->day_number . ' · ' . substr((string) ($d->getAttributes()['date'] ?? ''), 0, 10), 'search' => ['notes'],
                'columns' => ['stay_id', 'day_number', 'date', 'notes'],
            ],
            'activities' => [
                'model' => Models\Activity::class, 'label' => 'Activités', 'singular' => 'Activité', 'icon' => 'sparkles', 'group' => 'Contenu des voyages',
                'title' => 'title', 'search' => ['title', 'description', 'location_name', 'category'],
                'columns' => ['title', 'day_id', 'period', 'category', 'price', 'start_time'],
            ],
            'day_blocks' => [
                'model' => Models\DayBlock::class, 'label' => 'Blocs de journée', 'singular' => 'Bloc', 'icon' => 'layout', 'group' => 'Contenu des voyages',
                'title' => fn ($b) => $b->title ?: Str::ucfirst($b->type), 'search' => ['title'],
                'columns' => ['title', 'type', 'day_id', 'position'],
                'fields' => ['type' => ['type' => 'select', 'options' => self::options(Models\DayBlock::TYPES)]],
            ],
            'stay_transitions' => [
                'model' => Models\StayTransition::class, 'label' => 'Trajets', 'singular' => 'Trajet', 'icon' => 'route', 'group' => 'Contenu des voyages',
                'title' => fn ($t) => Str::ucfirst($t->transport_mode) . ($t->carrier ? ' · ' . $t->carrier : ''), 'search' => ['carrier', 'reference', 'departure_place', 'arrival_place'],
                'columns' => ['trip_id', 'from_stay_id', 'to_stay_id', 'transport_mode', 'departure_at', 'cost'],
            ],
            'trip_notes' => [
                'model' => Models\TripNote::class, 'label' => 'Notes', 'singular' => 'Note', 'icon' => 'sticky-note', 'group' => 'Contenu des voyages',
                'title' => fn ($n) => $n->title ?: Str::ucfirst($n->type), 'search' => ['title'],
                'columns' => ['title', 'type', 'trip_id', 'position'],
            ],
            'trip_photos' => [
                'model' => Models\TripPhoto::class, 'label' => 'Photos', 'singular' => 'Photo', 'icon' => 'image', 'group' => 'Contenu des voyages',
                'title' => 'caption', 'search' => ['caption'],
                'columns' => ['path', 'caption', 'trip_id', 'user_id', 'created_at'],
                'fields' => ['path' => ['type' => 'image', 'directory' => fn ($photo) => 'trips/' . $photo->trip_id]],
                'deleting' => fn ($photo) => Storage::disk('public')->delete($photo->path),
            ],
            'trip_reservations' => [
                'model' => Models\TripReservation::class, 'label' => 'Réservations perso', 'singular' => 'Réservation', 'icon' => 'ticket', 'group' => 'Contenu des voyages',
                'title' => 'title', 'search' => ['title', 'provider', 'reference', 'origin', 'destination'],
                'columns' => ['title', 'kind', 'trip_id', 'starts_at', 'price', 'currency'],
                'fields' => ['kind' => ['type' => 'select', 'options' => self::options(Models\TripReservation::KINDS)]],
            ],

            // Budget
            'trip_expenses' => [
                'model' => Models\TripExpense::class, 'label' => 'Dépenses', 'singular' => 'Dépense', 'icon' => 'wallet', 'group' => 'Budget',
                'title' => 'title', 'search' => ['title'],
                'columns' => ['title', 'trip_id', 'amount', 'category', 'paid_by', 'spent_on'],
                'fields' => ['category' => ['type' => 'select', 'options' => self::options(Models\TripExpense::CATEGORIES)]],
            ],
            'trip_expense_shares' => [
                'model' => Models\TripExpenseShare::class, 'label' => 'Parts de dépenses', 'singular' => 'Part', 'icon' => 'pie-chart', 'group' => 'Budget',
                'title' => fn ($s) => $s->amount . ' €', 'search' => [],
                'columns' => ['trip_expense_id', 'trip_budget_member_id', 'amount'],
            ],
            'trip_budget_members' => [
                'model' => Models\TripBudgetMember::class, 'label' => 'Membres du budget', 'singular' => 'Membre', 'icon' => 'user-plus', 'group' => 'Budget',
                'title' => 'name', 'search' => ['name'],
                'columns' => ['name', 'trip_id', 'user_id'],
            ],
            'trip_budget_lines' => [
                'model' => Models\TripBudgetLine::class, 'label' => 'Lignes de budget', 'singular' => 'Ligne', 'icon' => 'list', 'group' => 'Budget',
                'title' => fn ($l) => $l->label ?: $l->key ?: Str::ucfirst($l->group), 'search' => ['label', 'key'],
                'columns' => ['label', 'group', 'trip_id', 'amount', 'per_person', 'hidden'],
                'fields' => ['group' => ['type' => 'select', 'options' => self::options(Models\TripBudgetLine::GROUPS)]],
            ],

            // Vols
            'flight_orders' => [
                'model' => Models\FlightOrder::class, 'label' => 'Commandes de vols', 'singular' => 'Commande', 'icon' => 'plane', 'group' => 'Vols',
                'title' => 'reference', 'search' => ['reference', 'contact_email', 'stripe_payment_intent_id'],
                'columns' => ['reference', 'user_id', 'status', 'total_amount', 'currency', 'paid_at'],
            ],
            'flight_bookings' => [
                'model' => Models\FlightBooking::class, 'label' => 'Billets d’avion', 'singular' => 'Billet', 'icon' => 'ticket', 'group' => 'Vols',
                'title' => 'booking_reference', 'search' => ['booking_reference', 'duffel_order_id', 'duffel_offer_id'],
                'columns' => ['booking_reference', 'flight_order_id', 'user_id', 'status', 'total_amount', 'direction'],
            ],
            'flight_cart_items' => [
                'model' => Models\FlightCartItem::class, 'label' => 'Paniers vols', 'singular' => 'Article', 'icon' => 'shopping-cart', 'group' => 'Vols',
                'title' => 'offer_id', 'search' => ['offer_id', 'provider'],
                'columns' => ['user_id', 'trip_id', 'provider', 'direction', 'flight_amount', 'expires_at'],
            ],

            // Hébergements
            'stay_orders' => [
                'model' => Models\StayOrder::class, 'label' => 'Commandes d’hébergement', 'singular' => 'Commande', 'icon' => 'bed', 'group' => 'Hébergements',
                'title' => 'reference', 'search' => ['reference', 'contact_email', 'provider_transaction_id'],
                'columns' => ['reference', 'user_id', 'status', 'payment_method', 'total_amount', 'paid_at'],
            ],
            'stay_bookings' => [
                'model' => Models\StayBooking::class, 'label' => 'Séjours réservés', 'singular' => 'Séjour', 'icon' => 'hotel', 'group' => 'Hébergements',
                'title' => 'reference', 'search' => ['reference', 'provider_booking_id'],
                'columns' => ['reference', 'stay_order_id', 'status', 'check_in', 'check_out', 'total_amount'],
            ],
            'stay_cart_items' => [
                'model' => Models\StayCartItem::class, 'label' => 'Paniers hébergements', 'singular' => 'Article', 'icon' => 'shopping-cart', 'group' => 'Hébergements',
                'title' => 'rate_id', 'search' => ['rate_id', 'provider'],
                'columns' => ['user_id', 'trip_id', 'provider', 'check_in', 'check_out', 'stay_amount'],
            ],

            // Assistance
            'support_conversations' => [
                'model' => Models\SupportConversation::class, 'label' => 'Conversations', 'singular' => 'Conversation', 'icon' => 'headset', 'group' => 'Assistance',
                'title' => fn ($c) => $c->name . ' · ' . $c->topicLabel(), 'search' => ['name', 'email', 'token'],
                'columns' => ['name', 'email', 'topic', 'status', 'last_message_at'],
                'fields' => [
                    'topic' => ['type' => 'select', 'options' => Models\SupportConversation::TOPICS],
                    'status' => $statusOptions,
                    'token' => ['required' => false, 'help' => 'Généré automatiquement si vide.'],
                ],
                'links' => fn ($c) => [['label' => 'Ouvrir dans la boîte d’assistance', 'url' => route('admin.support.index', ['c' => $c->token])]],
            ],
            'support_messages' => [
                'model' => Models\SupportMessage::class, 'label' => 'Messages', 'singular' => 'Message', 'icon' => 'message', 'group' => 'Assistance',
                'title' => fn ($m) => Str::limit($m->body, 50), 'search' => ['body', 'author_name'],
                'columns' => ['support_conversation_id', 'author', 'author_name', 'body', 'created_at'],
                'fields' => ['author' => ['type' => 'select', 'options' => ['customer' => 'Client', 'agent' => 'Équipe', 'system' => 'Système']]],
            ],
        ];
    }
}
