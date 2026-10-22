<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/** Recadre la photo de profil en carré, la réduit et la réencode (supprime aussi les métadonnées EXIF/GPS). */
class AvatarProcessor
{
    private const SIZE = 400;

    public function store(UploadedFile $file): string
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (!$source) {
            throw new RuntimeException('Image illisible.');
        }

        $source = $this->applyExifOrientation($source, $file);
        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);

        $avatar = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagecopyresampled(
            $avatar,
            $source,
            0,
            0,
            (int) (($width - $side) / 2),
            (int) (($height - $side) / 2),
            self::SIZE,
            self::SIZE,
            $side,
            $side,
        );

        ob_start();
        imagewebp($avatar, null, 85);
        $binary = ob_get_clean();
        imagedestroy($source);
        imagedestroy($avatar);

        $path = 'avatars/' . Str::uuid() . '.webp';
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
