<?php

namespace App\Services\Budget;

use App\Models\FlightBooking;
use App\Models\TripBudgetLine;
use App\Models\TripReservation;
use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightSearchQuery;
use App\Services\Flights\Providers\TravelpayoutsProvider;
use App\Models\StayBooking;
use App\Models\Trip;
use App\Models\TripBudgetMember;
use App\Models\TripExpense;
use Illuminate\Support\Carbon;

/**
 * Budget d'un voyage : le prévisionnel calculé depuis l'itinéraire (activités, logements, trajets,
 * réservations) et les dépenses partagées entre voyageurs, avec les remboursements à faire.
 */
class TripBudget
{
    public function __construct(private Trip $trip)
    {
    }

    public function summary(): array
    {
        $this->syncMembers();
        $this->trip->load([
            'stays.days.activities',
            'transitions.fromStay:id,location_name',
            'transitions.toStay:id,location_name',
            'budgetMembers',
            'expenses.shares',
        ]);

        $planned = $this->planned();
        $members = $this->trip->budgetMembers;
        $balances = $this->balances();

        return [
            'currency' => 'EUR',
            'premium' => $this->trip->hasPremium(auth()->user()),
            'expense_limit' => $this->trip->hasPremium(auth()->user()) ? null : Trip::FREE_EXPENSE_LIMIT,
            'travelers' => $this->travelers(),
            'target' => $this->trip->budget_target === null ? null : (float) $this->trip->budget_target,
            'planned' => $planned,
            'planned_total' => round(array_sum(array_column($planned, 'amount')), 2),
            'paid_total' => round(array_sum(array_map(fn ($line) => $line['paid'] ? $line['amount'] : 0, $planned)), 2),
            'hidden_lines' => $this->hiddenCount(),
            'spent_total' => round($this->trip->expenses->sum(fn ($expense) => (float) $expense->amount), 2),
            'members' => $members->map(fn (TripBudgetMember $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'custom' => $member->isCustom(),
                'removable' => $member->isCustom() && !$this->isUsed($member),
                'balance' => $balances[$member->id] ?? 0.0,
                'paid' => round($this->trip->expenses->where('paid_by', $member->id)->sum(fn ($expense) => (float) $expense->amount), 2),
            ])->values()->all(),
            'expenses' => $this->trip->expenses->map(fn (TripExpense $expense) => [
                'id' => $expense->id,
                'title' => $expense->title,
                'category' => $expense->category,
                'amount' => (float) $expense->amount,
                'split_mode' => $expense->split_mode,
                'planned_key' => $expense->planned_key,
                'spent_on' => $expense->spent_on?->toDateString(),
                'paid_by' => $expense->paid_by,
                'shares' => $expense->shares->map(fn ($share) => [
                    'member_id' => $share->trip_budget_member_id,
                    'amount' => (float) $share->amount,
                ])->values()->all(),
            ])->values()->all(),
            'settlements' => $this->settlements($balances),
        ];
    }

    /**
     * Lignes du prévisionnel. Activités saisies par personne, le reste pour tout le groupe.
     * Les réservations réelles remplacent l'estimation correspondante (logement, vols) ; chaque
     * ligne peut être masquée, et des lignes libres peuvent être ajoutées.
     */
    private function planned(): array
    {
        $travelers = $this->travelers();
        $settings = TripBudgetLine::where('trip_id', $this->trip->id)->get();
        $byKey = $settings->whereNotNull('key')->keyBy('key');
        $reservations = $this->trip->reservations()->get()
            // Les hôtels payés dans le module Nuitée sont déjà comptés via leur commande.
            ->reject(fn (TripReservation $reservation) => !empty($reservation->details['stay_order']));
        $stayBookings = StayBooking::where('trip_id', $this->trip->id)->where('status', 'confirmed')->get();
        $lines = [];

        foreach ($this->trip->stays as $stay) {
            $city = trim(explode(',', $stay->location_name)[0]);
            $from = Carbon::parse($stay->arrival_date)->toDateString();
            $to = Carbon::parse($stay->departure_date)->toDateString();
            $booked = $reservations->contains(fn ($reservation) => $reservation->kind === 'stay' && $reservation->starts_at && $reservation->starts_at->toDateString() >= $from && $reservation->starts_at->toDateString() < $to)
                || $stayBookings->contains(fn ($booking) => $booking->check_in->toDateString() >= $from && $booking->check_in->toDateString() < $to);

            // Logement déjà réservé : son prix réel figure plus bas, l'estimation disparaît.
            if (!$booked) {
                $lines[] = [
                    'key' => 'stay-' . $stay->id,
                    'type' => 'stay',
                    'id' => $stay->id,
                    'group' => 'logement',
                    'label' => 'Logement à ' . $city,
                    'detail' => Carbon::parse($stay->arrival_date)->diffInDays(Carbon::parse($stay->departure_date)) . ' nuit(s) · estimation',
                    'date' => $from,
                    'unit_price' => $stay->accommodation_cost === null ? null : (float) $stay->accommodation_cost,
                    'per_person' => false,
                    'amount' => (float) ($stay->accommodation_cost ?? 0),
                    'editable' => true,
                ];
            }

            foreach ($stay->days as $day) {
                foreach ($day->activities as $activity) {
                    $price = $activity->price === null ? null : (float) $activity->price;
                    $lines[] = [
                        'key' => 'activity-' . $activity->id,
                        'type' => 'activity',
                        'id' => $activity->id,
                        'group' => $activity->category === 'repas' ? 'repas' : 'activites',
                        'label' => $activity->title,
                        'detail' => $city,
                        'date' => Carbon::parse($day->date)->toDateString(),
                        'unit_price' => $price,
                        'per_person' => true,
                        'amount' => round(($price ?? 0) * $travelers, 2),
                        'editable' => true,
                    ];
                }
            }
        }

        foreach ($this->trip->transitions as $transition) {
            $from = trim(explode(',', $transition->fromStay?->location_name ?? '')[0]);
            $to = trim(explode(',', $transition->toStay?->location_name ?? '')[0]);
            $lines[] = [
                'key' => 'transition-' . $transition->id,
                'type' => 'transition',
                'id' => $transition->id,
                'group' => 'transport',
                'label' => 'Trajet ' . $from . ' → ' . $to,
                'detail' => trim(implode(' · ', array_filter([$transition->transport_mode, $transition->carrier, $transition->service_number, $transition->reference]))),
                'date' => $transition->departure_at ? Carbon::parse($transition->departure_at)->toDateString() : null,
                'unit_price' => $transition->cost === null ? null : (float) $transition->cost,
                'per_person' => false,
                'amount' => (float) ($transition->cost ?? 0),
                'editable' => true,
            ];
        }

        array_push($lines, ...$this->flightEstimates($reservations, $byKey, $travelers));

        // Réservations faites chez les partenaires : montant réel, modifiable depuis la réservation.
        foreach ($reservations->whereNotNull('price') as $reservation) {
            $lines[] = [
                'key' => 'reservation-' . $reservation->id,
                'type' => 'reservation',
                'id' => $reservation->id,
                'group' => match ($reservation->kind) {
                    'stay' => 'logement',
                    'activity' => 'activites',
                    'other' => 'autre',
                    default => 'transport',
                },
                'label' => $reservation->title,
                'detail' => 'Réservé' . ($reservation->provider ? ' sur ' . $reservation->provider : '') . ($reservation->reference ? ' · ' . $reservation->reference : ''),
                'date' => $reservation->starts_at?->toDateString(),
                'unit_price' => (float) $reservation->price,
                'per_person' => false,
                'amount' => (float) $reservation->price,
                'editable' => false,
            ];
        }

        // Réservations payées dans l'application : montants réels, non modifiables ici.
        FlightBooking::where('trip_id', $this->trip->id)->whereIn('status', ['ticketed', 'simulated'])->get()
            ->each(function (FlightBooking $booking) use (&$lines) {
                $lines[] = [
                    'key' => 'flight-' . $booking->id,
                    'type' => 'booking',
                    'id' => $booking->id,
                    'group' => 'transport',
                    'label' => 'Vol ' . ($booking->direction === 'return' ? 'retour' : 'aller') . ($booking->booking_reference ? ' · ' . $booking->booking_reference : ''),
                    'detail' => 'Réservé',
                    'date' => null,
                    'unit_price' => (float) $booking->total_amount,
                    'per_person' => false,
                    'amount' => (float) $booking->total_amount,
                    'editable' => false,
                ];
            });

        foreach ($stayBookings as $booking) {
            $lines[] = [
                'key' => 'stay-booking-' . $booking->id,
                'type' => 'booking',
                'id' => $booking->id,
                'group' => 'logement',
                'label' => $booking->property['name'] ?? 'Hébergement réservé',
                'detail' => 'Réservé',
                'date' => $booking->check_in?->toDateString(),
                'unit_price' => (float) $booking->total_amount,
                'per_person' => false,
                'amount' => (float) $booking->total_amount,
                'editable' => false,
            ];
        }

        // Lignes ajoutées à la main.
        foreach ($settings->whereNull('key') as $custom) {
            $lines[] = [
                'key' => 'custom-' . $custom->id,
                'type' => 'custom',
                'id' => $custom->id,
                'group' => $custom->group,
                'label' => $custom->label,
                'detail' => 'Ajouté à la main',
                'date' => null,
                'unit_price' => $custom->amount,
                'per_person' => $custom->per_person,
                'amount' => round(($custom->amount ?? 0) * ($custom->per_person ? $travelers : 1), 2),
                'editable' => true,
            ];
        }

        // Lignes masquées par l'utilisateur, puis statut « payé » (dépense rattachée à la ligne).
        $paid = $this->trip->expenses->whereNotNull('planned_key')->keyBy('planned_key');
        $members = $this->trip->budgetMembers->keyBy('id');

        return collect($lines)
            ->reject(fn (array $line) => $byKey->get($line['key'])?->hidden)
            ->map(function (array $line) use ($paid, $members) {
                $expense = $paid->get($line['key']);

                return $line + [
                    'removable' => true,
                    'paid' => $expense ? [
                        'expense_id' => $expense->id,
                        'amount' => (float) $expense->amount,
                        'by' => $members->get($expense->paid_by)?->name,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    /** Lignes masquées, pour pouvoir les rétablir. */
    private function hiddenCount(): int
    {
        return TripBudgetLine::where('trip_id', $this->trip->id)->whereNotNull('key')->where('hidden', true)->count();
    }

    /**
     * Vols aller et retour attendus (départ du voyage ↔ première / dernière étape), estimés au meilleur
     * prix Aviasales, tant qu'aucun billet correspondant n'est enregistré dans le voyage.
     */
    private function flightEstimates($reservations, $settings, int $travelers): array
    {
        $trip = $this->trip;
        $first = $trip->stays->first();
        $last = $trip->stays->last();
        if (!$first || !$trip->origin_latitude || !$trip->origin_longitude) {
            return [];
        }

        $airports = app(AirportDirectory::class);
        $home = $airports->nearest((float) $trip->origin_latitude, (float) $trip->origin_longitude, 1)[0] ?? null;
        $outboundAirport = $airports->nearest((float) $first->latitude, (float) $first->longitude, 1)[0] ?? null;
        $returnAirport = $airports->nearest((float) $last->latitude, (float) $last->longitude, 1)[0] ?? null;
        if (!$home || !$outboundAirport || $home['code'] === $outboundAirport['code']
            || AirportDirectory::distanceKm($home['lat'], $home['lng'], $outboundAirport['lat'], $outboundAirport['lng']) < 300) {
            return [];
        }

        $legs = [
            ['key' => 'estimate-flight-out', 'label' => 'Vol aller', 'from' => $home, 'to' => $outboundAirport, 'date' => Carbon::parse($first->arrival_date)->toDateString()],
            ['key' => 'estimate-flight-back', 'label' => 'Vol retour', 'from' => $returnAirport ?? $outboundAirport, 'to' => $home, 'date' => Carbon::parse($last->departure_date)->toDateString()],
        ];

        $flights = $reservations->where('kind', 'flight');
        $provider = app(TravelpayoutsProvider::class);
        $lines = [];

        foreach ($legs as $index => $leg) {
            // Billet déjà enregistré pour ce trajet (à 2 jours près) : il figure dans les réservations.
            $covered = $flights->contains(function ($reservation) use ($leg, $index) {
                $date = $reservation->starts_at?->toDateString();
                return $date && abs(Carbon::parse($date)->diffInDays(Carbon::parse($leg['date']), false)) <= 2
                    || (!$date && $index === 0);
            });
            if ($covered) {
                continue;
            }

            $override = $settings->get($leg['key']);
            $estimate = $override?->amount === null && $provider->enabled()
                ? rescue(fn () => $provider->estimate(new FlightSearchQuery($leg['from']['code'], $leg['to']['code'], $leg['date'], $travelers)), null, false)
                : null;
            $unit = $override?->amount ?? $estimate['price'] ?? null;

            $lines[] = [
                'key' => $leg['key'],
                'type' => 'estimate',
                'id' => null,
                'group' => 'transport',
                'label' => $leg['label'] . ' ' . $leg['from']['code'] . ' → ' . $leg['to']['code'],
                'detail' => $override?->amount !== null
                    ? 'Montant saisi'
                    : ($estimate ? ($estimate['exact_date'] ? 'Meilleur prix Aviasales ce jour-là' : 'Meilleur prix Aviasales du mois') : 'À estimer'),
                'date' => $leg['date'],
                'unit_price' => $unit,
                'per_person' => true,
                'amount' => round(($unit ?? 0) * $travelers, 2),
                'editable' => true,
            ];
        }

        return $lines;
    }

    /** Solde de chacun : ce qu'il a payé moins sa part (positif = on lui doit de l'argent). */
    private function balances(): array
    {
        $cents = $this->trip->budgetMembers->mapWithKeys(fn ($member) => [$member->id => 0])->all();

        foreach ($this->trip->expenses as $expense) {
            $cents[$expense->paid_by] = ($cents[$expense->paid_by] ?? 0) + $this->cents($expense->amount);
            foreach ($expense->shares as $share) {
                $cents[$share->trip_budget_member_id] = ($cents[$share->trip_budget_member_id] ?? 0) - $this->cents($share->amount);
            }
        }

        return array_map(fn ($value) => $value / 100, $cents);
    }

    /** Remboursements minimaux : le plus gros débiteur rembourse le plus gros créancier, et ainsi de suite. */
    private function settlements(array $balances): array
    {
        $debtors = [];
        $creditors = [];
        foreach ($balances as $memberId => $balance) {
            $value = (int) round($balance * 100);
            if ($value < 0) {
                $debtors[$memberId] = -$value;
            } elseif ($value > 0) {
                $creditors[$memberId] = $value;
            }
        }

        $transfers = [];
        while ($debtors && $creditors) {
            arsort($debtors);
            arsort($creditors);
            $from = array_key_first($debtors);
            $to = array_key_first($creditors);
            $amount = min($debtors[$from], $creditors[$to]);

            $transfers[] = ['from' => $from, 'to' => $to, 'amount' => $amount / 100];

            $debtors[$from] -= $amount;
            $creditors[$to] -= $amount;
            if ($debtors[$from] === 0) {
                unset($debtors[$from]);
            }
            if ($creditors[$to] === 0) {
                unset($creditors[$to]);
            }
        }

        return $transfers;
    }

    /** Le propriétaire et les participants acceptés font automatiquement partie des comptes. */
    public function syncMembers(): void
    {
        $this->trip->loadMissing(['user:id,name', 'participants.user:id,name']);

        $people = collect();
        if ($this->trip->user_id) {
            $people->push(['user_id' => $this->trip->user_id, 'guest_token' => null, 'name' => $this->trip->user?->name ?? 'Organisateur']);
        } elseif ($this->trip->guest_token) {
            $people->push(['user_id' => null, 'guest_token' => $this->trip->guest_token, 'name' => 'Organisateur']);
        }

        foreach ($this->trip->participants->where('status', 'accepted') as $participant) {
            if (!$participant->user_id && !$participant->guest_token) {
                continue;
            }
            $people->push([
                'user_id' => $participant->user_id,
                'guest_token' => $participant->user_id ? null : $participant->guest_token,
                'name' => $participant->user?->name ?? $participant->guest_name ?? $participant->email ?? 'Invité',
            ]);
        }

        foreach ($people as $person) {
            $key = $person['user_id'] ? ['user_id' => $person['user_id']] : ['guest_token' => $person['guest_token']];
            $member = TripBudgetMember::firstOrNew(['trip_id' => $this->trip->id, ...$key]);
            $member->name = mb_substr($person['name'], 0, 60);
            if ($member->isDirty()) {
                $member->save();
            }
        }
    }

    private function isUsed(TripBudgetMember $member): bool
    {
        return $this->trip->expenses->contains(fn ($expense) => (int) $expense->paid_by === (int) $member->id
            || $expense->shares->contains('trip_budget_member_id', $member->id));
    }

    private function travelers(): int
    {
        return max(1, (int) ($this->trip->travelers ?: 1));
    }

    private function cents($amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}
