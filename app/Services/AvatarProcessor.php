<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Recadre une image (photo de profil carrée, couverture de voyage 16:10), la réduit et la réencode
 * en WebP : supprime aussi les métadonnées EXIF/GPS.
 */
class AvatarProcessor
{
    private const SIZE = 400;
    private const COVER_WIDTH = 1200;
    private const COVER_HEIGHT = 750;

    public function store(UploadedFile $file): string
    {
        return $this->crop($file, self::SIZE, self::SIZE, 'avatars/' . Str::uuid() . '.webp');
    }

    /** Image d'aperçu d'un voyage publié (cartes de la page « Parcourir »). */
    public function storeTripCover(UploadedFile $file, int $tripId): string
    {
        return $this->crop($file, self::COVER_WIDTH, self::COVER_HEIGHT, "trips/{$tripId}/cover-" . Str::uuid() . '.webp');
    }

    /** Recadrage centré au format demandé, puis enregistrement sur le disque public. */
    private function crop(UploadedFile $file, int $targetWidth, int $targetHeight, string $path): string
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (!$source) {
            throw new RuntimeException('Image illisible.');
        }

        $source = $this->applyExifOrientation($source, $file);
        $width = imagesx($source);
        $height = imagesy($source);
        $ratio = $targetWidth / $targetHeight;
        $cropWidth = (int) min($width, round($height * $ratio));
        $cropHeight = (int) min($height, round($width / $ratio));

        $image = imagecreatetruecolor($targetWidth, $targetHeight);
        imagecopyresampled(
            $image,
            $source,
            0,
            0,
            (int) (($width - $cropWidth) / 2),
            (int) (($height - $cropHeight) / 2),
            $targetWidth,
            $targetHeight,
            $cropWidth,
            $cropHeight,
        );

        ob_start();
        imagewebp($image, null, 85);
        $binary = ob_get_clean();
        imagedestroy($source);
        imagedestroy($image);

        Storage::disk('public')->put($path, $binary);

        return $path;
    }

    /** Supprime l'ancien fichier s'il a été envoyé sur ce site (pas une photo Google). */
    public function deleteIfLocal(?string $avatar): void
    {
        if ($avatar && str_contains($avatar, '/storage/avatars/')) {
            Storage::disk('public')->delete('avatars/' . basename(parse_url($avatar, PHP_URL_PATH) ?: $avatar));
        }
    }

    private function applyExifOrientation(\GdImage $image, UploadedFile $file): \GdImage
    {
        if (!function_exists('exif_read_data') || !in_array($file->getMimeType(), ['image/jpeg', 'image/jpg'], true)) {
            return $image;
        }

        $orientation = @exif_read_data($file->getRealPath())['Orientation'] ?? 1;

        return match ((int) $orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };
    }
}
