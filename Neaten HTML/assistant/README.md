# Neaten Assistant

The AI assistant shown in the bottom-right corner of every Neaten page.

```
Browser                         Your server                         Anthropic
js/neaten-assistant.js  ──POST──▶ assistant.php ──▶ assistant/src/ ──▶ Claude API
css/neaten-assistant.css         (rate limits,      (prompt +
                                  origin check)      knowledge.md)
```

- `../assistant.php`: the only public endpoint. Checks origin, size and rate limits.
- `knowledge.md`: everything the assistant knows. **Edit this when the website changes.**
- `config.php`: model, limits and settings (no secrets).
- `src/`: the prompt, the API call, link checking and the rate limiter.
- `.htaccess`: blocks web access to this whole folder.

## Setting it up

1. **Install dependencies** (PHP 8.1+ with the curl extension):

   ```
   cd assistant
   composer install --no-dev
   ```

   This creates `assistant/vendor/`, which must be uploaded with the site.

2. **Add your Anthropic API key** (from console.anthropic.com). Use either:
   - an environment variable `ANTHROPIC_API_KEY` set in your hosting control panel (preferred), or
   - Apache: `SetEnv ANTHROPIC_API_KEY sk-ant-...` in a server config or `.htaccess` outside the public folder, or
   - copy `secrets.example.php` to `secrets.php` and fill it in. That file is git-ignored and blocked from the web.

   The key is only ever read on the server. It never appears in any page or script.

3. **Protect this folder.** Apache uses the included `.htaccess`. On Nginx, add:

   ```
   location ^~ /assistant/ { deny all; }
   ```

4. **Check it works:** open the site, click the sparkle button and ask a question.
   If the assistant can't answer, the server's PHP error log will contain a line starting `Neaten Assistant:` that explains why
   (no key, invalid key, dependencies missing, storage not writable, etc.).

## Optional settings (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `NEATEN_ASSISTANT_MODEL` | `claude-opus-5-5` | Claude model. `claude-haiku-5-5` costs far less per message, if replies remain good enough. |
| `NEATEN_ASSISTANT_EFFORT` | `low` | How much the model thinks before replying (`low` keeps replies quick and inexpensive). |
| `NEATEN_ASSISTANT_DAILY_LIMIT` | `1500` | Maximum questions per day across the whole site, which caps cost. `0` disables the cap. |
| `NEATEN_ALLOWED_ORIGINS` | this site's own host | Comma-separated origins allowed to call the endpoint, e.g. `https://neatenclean.com,https://www.neatenclean.com`. |
| `NEATEN_CLIENT_IP_HEADER` | none | Set to `HTTP_CF_CONNECTING_IP` behind Cloudflare (or your proxy's header) so limits apply per visitor. |
| `NEATEN_ASSISTANT_STORAGE` | system temp folder | Where rate-limit counters are kept. Must be writable by PHP. |
| `NEATEN_ASSISTANT_SALT` | derived from the key | Secret used to hash visitor IP addresses. |

Per-visitor limits are 8 questions a minute, 30 an hour and 80 a day (see `config.php`).

## Privacy and safety

- No chat transcripts are stored on the server. Errors are logged without message content.
- Rate-limit counters store only a hashed IP and timestamps, and are deleted after about a day.
- The visitor's conversation is kept in their browser's `sessionStorage` until the tab is closed.
- Replies may only link to pages listed in `knowledge.md`; other links are removed on the server and again in the browser.
- The privacy notice is in `privacy-policy.html#assistant`. Keep it accurate if any of the above changes.

## When the AI is unavailable

The four suggested questions fall back to verified answers built into `js/neaten-assistant.js`.
Any other question gets a polite message with links to Services, FAQ, booking and Contact.
Keep those built-in answers in step with `knowledge.md`.
