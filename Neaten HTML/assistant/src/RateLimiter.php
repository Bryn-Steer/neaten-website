<?php

declare(strict_types=1);

namespace Neaten\Assistant;

/**
 * Small sliding-window rate limiter backed by one file per key.
 * Keys are hashed before they touch the disk; only timestamps are stored.
 */
final class RateLimiter
{
    public function __construct(
        private readonly string $dir,
        private readonly string $salt
    ) {
    }

    /**
     * Records a request for $key unless a window is full.
     *
     * @param list<array{0:int,1:int}> $windows [limit, seconds] pairs
     * @return int 0 when allowed, otherwise seconds until the next request is allowed
     */
    public function hit(string $key, array $windows): int
    {
        $this->ensureDir();
        $file = $this->dir . '/' . hash_hmac('sha256', $key, $this->salt) . '.json';
        $handle = @fopen($file, 'c+');
        if ($handle === false) {
            throw new AssistantError('unavailable', 503, 'Rate limit storage is not writable: ' . $this->dir);
        }

        try {
            flock($handle, LOCK_EX);
            $now = time();
            $longest = max(array_column($windows, 1));
            $stamps = json_decode((string) stream_get_contents($handle), true);
            $stamps = array_values(array_filter(
                is_array($stamps) ? $stamps : [],
                static fn ($t) => is_int($t) && $t > $now - $longest
            ));

            foreach ($windows as [$limit, $seconds]) {
                $inWindow = array_values(array_filter($stamps, static fn ($t) => $t > $now - $seconds));
                if (count($inWindow) >= $limit) {
                    return max(1, $inWindow[count($inWindow) - $limit] + $seconds - $now);
                }
            }

            $stamps[] = $now;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($stamps));
            return 0;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
            $this->maybeCleanUp();
        }
    }

    private function ensureDir(): void
    {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            throw new AssistantError('unavailable', 503, 'Cannot create rate limit storage: ' . $this->dir);
        }
    }

    // At most once an hour, delete counters untouched for a day (all expired).
    private function maybeCleanUp(): void
    {
        $marker = $this->dir . '/.last-cleanup';
        if (is_file($marker) && (int) @filemtime($marker) > time() - 3600) {
            return;
        }
        @touch($marker);
        foreach (glob($this->dir . '/*.json') ?: [] as $file) {
            if ((int) @filemtime($file) < time() - 86400) {
                @unlink($file);
            }
        }
    }
}
