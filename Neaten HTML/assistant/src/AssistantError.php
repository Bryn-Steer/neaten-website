<?php

declare(strict_types=1);

namespace Neaten\Assistant;

/**
 * A failure that maps to a safe, public error response.
 * The message is for the server log only and never reaches the visitor.
 */
final class AssistantError extends \RuntimeException
{
    public function __construct(
        public readonly string $publicCode,
        public readonly int $httpStatus,
        string $logMessage = '',
        public readonly int $retryAfter = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($logMessage, 0, $previous);
    }
}
