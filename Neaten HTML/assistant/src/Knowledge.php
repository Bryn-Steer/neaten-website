<?php

declare(strict_types=1);

namespace Neaten\Assistant;

/**
 * The verified website content the assistant answers from, plus the set of
 * internal links it is allowed to share (every link written in knowledge.md).
 */
final class Knowledge
{
    /** @param list<string> $links */
    private function __construct(
        public readonly string $text,
        public readonly array $links
    ) {
    }

    public static function load(string $file): self
    {
        $raw = is_readable($file) ? (string) file_get_contents($file) : '';
        $text = trim((string) preg_replace('/<!--.*?-->/s', '', $raw));

        if ($text === '') {
            throw new AssistantError('unavailable', 503, 'Knowledge file is missing or empty: ' . $file);
        }

        preg_match_all('/\]\(([^)\s]+)\)/', $text, $matches);
        $links = [];
        foreach ($matches[1] as $url) {
            if (self::isInternal($url)) {
                $links[$url] = true;
                $links[self::basePage($url)] = true;
            }
        }

        return new self($text, array_keys($links));
    }

    /**
     * Keep links that point at known pages; reduce a link with an unknown
     * anchor or query to its page; turn anything else into plain text.
     *
     * @param list<string> $siteHosts
     */
    public function sanitiseLinks(string $reply, array $siteHosts): string
    {
        $hosts = implode('|', array_map(static fn ($h) => preg_quote($h, '#'), $siteHosts));

        return (string) preg_replace_callback(
            '/\[([^\]\n]{1,160})\]\(\s*<?([^)\s>]*)>?\s*\)/u',
            function (array $m) use ($hosts): string {
                $label = $m[1];
                $url = $m[2];
                if ($hosts !== '') {
                    $url = (string) preg_replace('#^(?:https?:)?//(?:' . $hosts . ')/?#i', '', $url);
                }
                $url = ltrim($url, '/');
                if ($url === '') {
                    $url = 'index.html';
                }

                if (in_array($url, $this->links, true)) {
                    return '[' . $label . '](' . $url . ')';
                }
                if (self::isInternal($url) && in_array(self::basePage($url), $this->links, true)) {
                    return '[' . $label . '](' . self::basePage($url) . ')';
                }
                return $label;
            },
            $reply
        );
    }

    private static function isInternal(string $url): bool
    {
        return (bool) preg_match('/^[a-z0-9-]+\.html(?:[?#][^\s]*)?$/i', $url);
    }

    private static function basePage(string $url): string
    {
        return (string) preg_replace('/[?#].*$/', '', $url);
    }
}
