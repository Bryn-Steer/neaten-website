<?php
// Neaten Assistant endpoint
// Receives a short conversation from the on-site assistant and returns a reply.
// The API key stays on the server; see assistant/README.md for setup.

declare(strict_types=1);

use Neaten\Assistant\Assistant;
use Neaten\Assistant\AssistantError;
use Neaten\Assistant\RateLimiter;

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function send_json(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$autoload = __DIR__ . '/assistant/vendor/autoload.php';
if (!is_file($autoload)) {
    error_log('Neaten Assistant: dependencies are not installed. Run "composer install" in assistant/.');
    send_json(503, ['error' => 'unavailable']);
}
require $autoload;
$config = require __DIR__ . '/assistant/config.php';

// Only POST requests from this website's own pages
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    send_json(405, ['error' => 'method_not_allowed']);
}

$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
$allowedOrigins = $config['allowed_origins'] ?: ['https://' . $host, 'http://' . $host];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
    $parts = parse_url((string) $_SERVER['HTTP_REFERER']);
    $origin = ($parts['scheme'] ?? '') . '://' . ($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '');
}
if (!in_array(strtolower($origin), array_map('strtolower', $allowedOrigins), true)
    || ($_SERVER['HTTP_X_NEATEN_ASSISTANT'] ?? '') !== '1') {
    send_json(403, ['error' => 'forbidden']);
}

if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) {
    send_json(415, ['error' => 'invalid_request']);
}

$body = file_get_contents('php://input', false, null, 0, $config['max_body_bytes'] + 1);
if ($body === false || strlen($body) > $config['max_body_bytes']) {
    send_json(413, ['error' => 'too_long']);
}

$payload = json_decode($body, true);

try {
    // Per-visitor limits first, then a site-wide daily cap to bound cost.
    $limiter = new RateLimiter($config['storage_dir'], $config['hash_salt']);
    $ipHeader = $config['client_ip_header'];
    $ip = ($ipHeader && !empty($_SERVER[$ipHeader])) ? trim(explode(',', (string) $_SERVER[$ipHeader])[0]) : (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

    $wait = $limiter->hit('visitor:' . $ip, $config['visitor_limits']);
    if ($wait === 0 && $config['daily_limit'] > 0) {
        $wait = $limiter->hit('site', [[$config['daily_limit'], 86400]]);
    }
    if ($wait > 0) {
        header('Retry-After: ' . $wait);
        send_json(429, ['error' => 'rate_limited', 'retryAfter' => $wait]);
    }

    set_time_limit(60);
    $reply = (new Assistant($config))->reply($payload);
    send_json(200, ['reply' => $reply]);
} catch (AssistantError $e) {
    if ($e->httpStatus >= 500) {
        error_log('Neaten Assistant: ' . $e->getMessage());
    }
    if ($e->retryAfter > 0) {
        header('Retry-After: ' . $e->retryAfter);
    }
    send_json($e->httpStatus, ['error' => $e->publicCode]);
} catch (\Throwable $e) {
    error_log('Neaten Assistant: unexpected ' . get_class($e) . ': ' . $e->getMessage());
    send_json(503, ['error' => 'unavailable']);
}
