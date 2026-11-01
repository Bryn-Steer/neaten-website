<?php
// Neaten Assistant settings.
// Secrets are never written here: they come from environment variables, or
// from assistant/secrets.php (not committed, and blocked from the web).

declare(strict_types=1);

$secrets = is_file(__DIR__ . '/secrets.php') ? (array) require __DIR__ . '/secrets.php' : [];

$env = static function (string $key, ?string $default = null) use ($secrets): ?string {
    $value = getenv($key);
    if ($value === false || $value === '') {
        $value = $_SERVER[$key] ?? $_ENV[$key] ?? $secrets[$key] ?? null;
    }
    return ($value === null || $value === '') ? $default : (string) $value;
};

$list = static function (?string $value): array {
    return array_values(array_filter(array_map('trim', explode(',', (string) $value))));
};

return [
    // Anthropic credentials and model
    'api_key' => $env('ANTHROPIC_API_KEY'),
    'model' => $env('NEATEN_ASSISTANT_MODEL', 'claude-opus-5-5'),
    'effort' => $env('NEATEN_ASSISTANT_EFFORT', 'low'),
    'max_tokens' => 2048,
    'timeout' => 20.0,

    // What the assistant knows. Edit knowledge.md, not this file.
    'knowledge_file' => __DIR__ . '/knowledge.md',
    'site_hosts' => ['neatenclean.com', 'www.neatenclean.com'],

    // Requests are accepted only from these origins. Empty = this site's own host.
    'allowed_origins' => $list($env('NEATEN_ALLOWED_ORIGINS')),

    // Set when the site sits behind a proxy/CDN, e.g. HTTP_CF_CONNECTING_IP for Cloudflare.
    'client_ip_header' => $env('NEATEN_CLIENT_IP_HEADER'),

    // Conversation limits (characters / messages)
    'max_message_chars' => 600,
    'max_history_messages' => 12,
    'max_history_chars' => 8000,
    'max_body_bytes' => 24000,

    // Abuse and cost protection: [requests, seconds]
    'visitor_limits' => [[8, 60], [30, 3600], [80, 86400]],
    'daily_limit' => (int) $env('NEATEN_ASSISTANT_DAILY_LIMIT', '1500'),

    // Rate-limit counters only: hashed visitor keys and timestamps, never messages.
    'storage_dir' => $env('NEATEN_ASSISTANT_STORAGE', sys_get_temp_dir() . '/neaten-assistant'),
    'hash_salt' => $env('NEATEN_ASSISTANT_SALT', hash('sha256', __DIR__ . (string) $env('ANTHROPIC_API_KEY'))),
];
