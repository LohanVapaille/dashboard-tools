<?php

namespace App\Services\AI;

use App\Services\Places\MajorCities;

/**
 * Évite que l'IA repropose une activité déjà prévue dans le voyage, même formulée autrement :
 * « Canyon de Charyn » et « Randonnée au canyon de Charyn » désignent la même sortie.
 * Les repas, trajets et nuits peuvent revenir d'un jour à l'autre, mais jamais deux fois le même jour.
 */
class ActivityDeduplicator
{
    /** Mots qui décrivent la forme de la sortie, pas l'endroit : ignorés dans la comparaison. */
    private const GENERIC = [
        'de', 'du', 'des', 'la', 'le', 'les', 'au', 'aux', 'un', 'une', 'et', 'en', 'sur', 'dans', 'avec', 'pour', 'par', 'a',
        'the', 'of', 'and', 'to', 'at', 'in', 'visite', 'visiter', 'excursion', 'decouverte', 'decouvrir', 'balade', 'promenade',
        'randonnee', 'journee', 'demi', 'tour', 'matinee', 'soiree', 'apres', 'midi', 'guidee', 'guide', 'libre', 'temps',
    ];

    /** Catégories qui se répètent normalement d'un jour à l'autre. */
    private const RECURRING = ['repas', 'transport', 'hebergement', 'camping'];

    /** @var array<int, array{tokens: array, category: ?string, date: ?string}> */
    private array $seen = [];

    public function remember(string $title, ?string $location, ?string $category, ?string $date): void
    {
        $tokens = self::tokens($title . ' ' . $location);
        if ($tokens) {
            $this->seen[] = ['tokens' => $tokens, 'category' => $category, 'date' => $date];
        }
    }

    /** Vrai si l'activité doublonne une activité déjà connue ; sinon elle est retenue pour la suite. */
    public function isDuplicate(string $title, ?string $location, ?string $category, ?string $date): bool
    {
        $tokens = self::tokens($title . ' ' . $location);
        if (!$tokens) {
            return false;
        }

        foreach ($this->seen as $known) {
            $recurring = in_array($category, self::RECURRING, true) || in_array($known['category'], self::RECURRING, true);
            if ($recurring && $known['date'] !== $date) {
                continue;
            }
            if (self::similar($tokens, $known['tokens'])) {
                return true;
            }
        }

        $this->seen[] = ['tokens' => $tokens, 'category' => $category, 'date' => $date];

        return false;
    }

    public static function similar(array $a, array $b): bool
    {
        $common = count(array_intersect($a, $b));
        $smaller = min(count($a), count($b));

        // Même lieu nommé (≥ 2 mots en commun couvrant la plus courte), ou formulations très proches.
        return ($smaller >= 2 && $common >= $smaller) || ($smaller >= 1 && $common / count(array_unique([...$a, ...$b])) >= 0.6);
    }

    private static function tokens(string $text): array
    {
        $words = explode(' ', MajorCities::normalize($text));

        return array_values(array_unique(array_filter($words, fn ($word) => strlen($word) >= 3 && !in_array($word, self::GENERIC, true))));
    }
}
