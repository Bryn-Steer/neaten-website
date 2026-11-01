/* =========================================================
   NEATEN — ASSISTANT
   A discreet, AI-powered helper available on every page.
   Replies come from assistant.php (the API key stays on the
   server). If the service is unavailable, verified answers
   and helpful links are shown instead.
   No dependencies.
   ========================================================= */

(function () {
    "use strict";

    var ENDPOINT = "assistant.php";
    var STORAGE_KEY = "neaten-assistant";
    var MAX_CHARS = 600;
    var TIMEOUT_MS = 50000;

    // Verified answers, used only if the AI service can't be reached.
    var SUGGESTIONS = [
        {
            q: "What cleaning services do you offer?",
            a: "We offer six services in two collections.\n\n- **Neaten Home:** Regular Domestic Cleaning, Deep Cleaning and Move-In & Move-Out Cleaning\n- **Neaten Work:** Office Cleaning, Communal Area Cleaning and Scheduled Commercial Cleaning\n\nYou can [explore all our services](services.html) to find the right fit."
        },
        {
            q: "Do you cover my area?",
            a: "We’re based in Manchester, and Greater Manchester forms part of our intended service area. To confirm coverage for your location, [send an enquiry](appointment.html) with your postcode or [ask the team](contact.html)."
        },
        {
            q: "How can I book a clean?",
            a: "Booking starts with a short [enquiry form](appointment.html). We’ll be in touch to understand your requirements, confirm availability and agree the price before any cleaning begins. There’s no commitment to book until you’re happy."
        },
        {
            q: "How can I contact the team?",
            a: "The best way to reach us is the message form on our [contact page](contact.html). If you’d like to arrange a clean, the [booking enquiry form](appointment.html) is the quickest route."
        }
    ];

    var FALLBACK = "I’m having trouble answering just now. In the meantime, you can [explore our services](services.html), read the [FAQ](faq.html), [book a clean](appointment.html) or [send the team a message](contact.html).";
    var RATE_LIMITED = "You’ve sent quite a few messages in a short time. Please try again in a minute, or [send the team a message](contact.html) directly.";
    var TOO_LONG = "That message is a little long for me. Could you shorten it to a sentence or two?";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var sheet = window.matchMedia("(max-width: 600px)");

    /* Icons -------------------------------------------------- */
    var SPARK = '<path d="M12 0C12.8 7.4 16.4 11.2 23 14 16.4 16.8 12.8 20.6 12 28 11.2 20.6 7.6 16.8 1 14 7.6 11.2 11.2 7.4 12 0Z" fill="currentColor"/>';

    function icon(className, viewBox, body) {
        return '<svg class="' + className + '" viewBox="' + viewBox + '" aria-hidden="true" focusable="false">' + body + "</svg>";
    }

    var ICONS = {
        spark: function (c) { return icon(c, "0 0 24 28", SPARK); },
        close: function (c) { return icon(c, "0 0 16 16", '<path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'); },
        restart: function (c) { return icon(c, "0 0 16 16", '<path d="M2.5 8a5.5 5.5 0 1 0 1.8-4.1M2.5 2v3.5H6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'); },
        arrow: function (c) { return icon(c, "0 0 16 16", '<path d="M1.5 8h13M9.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'); },
        send: function (c) { return icon(c, "0 0 16 16", '<path d="M8 14V2M3 7l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'); }
    };

    /* Markup ------------------------------------------------- */
    var root = document.createElement("div");
    root.className = "nt-assist";
    root.innerHTML =
        '<button class="nt-launcher" type="button" aria-expanded="false" aria-controls="nt-panel" aria-label="Open Neaten Assistant">' +
            ICONS.spark("nt-launcher__spark") + ICONS.spark("nt-launcher__twinkle") + ICONS.close("nt-launcher__close") +
        "</button>" +
        '<section class="nt-panel" id="nt-panel" role="dialog" aria-labelledby="nt-title" aria-describedby="nt-desc">' +
            '<header class="nt-panel__head">' +
                '<span class="nt-mark" aria-hidden="true">' + ICONS.spark("") + "</span>" +
                '<div class="nt-panel__title" tabindex="-1"><h2 id="nt-title">Neaten Assistant</h2><p>Here to help</p></div>' +
                '<button class="nt-icon-btn" type="button" data-restart hidden aria-label="Start a new conversation" title="Start again">' + ICONS.restart("") + "</button>" +
                '<button class="nt-icon-btn" type="button" data-close aria-label="Close Neaten Assistant">' + ICONS.close("") + "</button>" +
            "</header>" +
            '<div class="nt-panel__body">' +
                '<div class="nt-welcome">' +
                    '<h3 class="nt-welcome__title">A little help, <em>when you need it.</em></h3>' +
                    '<p id="nt-desc">I’m Neaten’s virtual assistant. I can help you explore our services, find useful information or point you towards booking a clean.</p>' +
                "</div>" +
                '<div class="nt-log" role="log" aria-live="polite" aria-label="Conversation"></div>' +
                '<div class="nt-suggest" role="group" aria-labelledby="nt-suggest-label">' +
                    '<p class="nt-suggest__label" id="nt-suggest-label">Popular questions</p><ul></ul>' +
                "</div>" +
            "</div>" +
            '<form class="nt-composer" novalidate>' +
                '<div class="nt-field">' +
                    '<label class="sr-only" for="nt-input">Ask Neaten Assistant a question</label>' +
                    '<textarea id="nt-input" rows="1" maxlength="' + MAX_CHARS + '" placeholder="Ask us anything..." autocomplete="off" enterkeyhint="send"></textarea>' +
                    '<button class="nt-send" type="submit" aria-label="Send message" aria-disabled="true">' + ICONS.send("") + "</button>" +
                "</div>" +
                '<p class="nt-note">AI assistant · please don’t share personal or payment details. <a href="privacy-policy.html#assistant">Privacy</a></p>' +
            "</form>" +
        "</section>";

    var launcher = root.querySelector(".nt-launcher");
    var panel = root.querySelector(".nt-panel");
    var title = root.querySelector(".nt-panel__title");
    var body = root.querySelector(".nt-panel__body");
    var log = root.querySelector(".nt-log");
    var suggest = root.querySelector(".nt-suggest");
    var form = root.querySelector(".nt-composer");
    var input = root.querySelector("#nt-input");
    var send = root.querySelector(".nt-send");
    var restart = root.querySelector("[data-restart]");

    SUGGESTIONS.forEach(function (item, i) {
        var li = document.createElement("li");
        var button = document.createElement("button");
        button.type = "button";
        button.style.setProperty("--i", i);
        button.textContent = item.q;
        button.insertAdjacentHTML("beforeend", ICONS.arrow(""));
        button.addEventListener("click", function () { ask(item.q, item.a); });
        li.appendChild(button);
        suggest.querySelector("ul").appendChild(li);
    });

    panel.inert = true;
    document.body.appendChild(root);

    /* State -------------------------------------------------- */
    // Kept only in this browser tab (sessionStorage) so the conversation
    // survives moving between pages; cleared when the tab closes.
    var history = [];
    var pending = false;

    function save() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30)));
        } catch (e) { /* storage unavailable */ }
    }

    function restore() {
        try {
            var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
            if (Array.isArray(saved)) {
                history = saved.filter(function (m) {
                    return m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string";
                });
            }
        } catch (e) {
            history = [];
        }
        history.forEach(function (m) { render(m, true); });
        if (history.length) {
            suggest.hidden = true;
            restart.hidden = false;
        }
    }

    /* Rendering ---------------------------------------------- */
    var SAFE_LINK = /^[a-z0-9-]+\.html(?:[?#][^\s"'<>]*)?$/i;

    // Renders **bold** and [label](page.html) without using innerHTML.
    function inline(parent, text) {
        var pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
        var last = 0;
        var match;
        while ((match = pattern.exec(text))) {
            if (match.index > last) parent.appendChild(document.createTextNode(text.slice(last, match.index)));
            if (match[1] !== undefined) {
                var strong = document.createElement("strong");
                strong.textContent = match[1];
                parent.appendChild(strong);
            } else if (SAFE_LINK.test(match[3])) {
                var a = document.createElement("a");
                a.href = match[3];
                a.textContent = match[2];
                parent.appendChild(a);
            } else {
                parent.appendChild(document.createTextNode(match[2]));
            }
            last = pattern.lastIndex;
        }
        if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    }

    function formatted(el, text) {
        text.split(/\n{2,}/).forEach(function (block) {
            var lines = block.split("\n").filter(function (l) { return l.trim() !== ""; });
            if (!lines.length) return;
            var isList = lines.every(function (l) { return /^\s*(?:[-*•]|\d+[.)])\s+/.test(l); });
            if (isList) {
                var ul = document.createElement("ul");
                lines.forEach(function (l) {
                    var li = document.createElement("li");
                    inline(li, l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""));
                    ul.appendChild(li);
                });
                el.appendChild(ul);
            } else {
                lines.forEach(function (l) {
                    var p = document.createElement("p");
                    inline(p, l);
                    el.appendChild(p);
                });
            }
        });
    }

    function render(message, restored) {
        var el = document.createElement("div");
        el.className = "nt-msg nt-msg--" + (message.role === "user" ? "visitor" : "assistant");
        if (message.notice) el.classList.add("nt-msg--notice");
        if (restored) el.classList.add("is-restored");

        if (message.role === "user") {
            var sr = document.createElement("span");
            sr.className = "sr-only";
            sr.textContent = "You said: ";
            el.appendChild(sr);
            el.appendChild(document.createTextNode(message.text));
        } else {
            formatted(el, message.text);
        }

        log.appendChild(el);
        return el;
    }

    function scrollToEnd() {
        body.scrollTop = body.scrollHeight;
    }

    var typing = null;

    function showTyping(on) {
        if (on && !typing) {
            typing = document.createElement("div");
            typing.className = "nt-typing";
            typing.innerHTML = '<span class="sr-only">Neaten Assistant is typing</span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
            log.appendChild(typing);
            scrollToEnd();
        } else if (!on && typing) {
            typing.remove();
            typing = null;
        }
    }

    function hideSuggestions() {
        if (suggest.hidden) return;
        if (reduceMotion.matches) {
            suggest.hidden = true;
            return;
        }
        suggest.classList.add("is-leaving");
        setTimeout(function () {
            suggest.hidden = true;
            suggest.classList.remove("is-leaving");
        }, 300);
    }

    /* Conversation ------------------------------------------- */
    function add(message) {
        history.push(message);
        save();
        var el = render(message, false);
        restart.hidden = false;
        if (message.role === "assistant") {
            // Bring the start of a long reply into view rather than its end.
            body.scrollTop = Math.max(0, el.offsetTop - 16);
        } else {
            scrollToEnd();
        }
    }

    // Messages sent to the server: real exchanges only, never notices,
    // with turns alternating (an unanswered question gives way to the next).
    function conversation() {
        var turns = [];
        history.forEach(function (m) {
            if (m.local) return;
            var turn = { role: m.role, content: m.text };
            if (turns.length && turns[turns.length - 1].role === m.role) turns[turns.length - 1] = turn;
            else turns.push(turn);
        });
        return turns.slice(-12);
    }

    function request() {
        var controller = "AbortController" in window ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

        return fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Neaten-Assistant": "1" },
            body: JSON.stringify({ messages: conversation(), page: window.location.pathname }),
            credentials: "same-origin",
            signal: controller ? controller.signal : undefined
        })
            .then(function (response) {
                return response.json().catch(function () { return {}; }).then(function (data) {
                    if (response.ok && data && typeof data.reply === "string" && data.reply.trim()) return data.reply;
                    var error = new Error("Assistant error");
                    error.code = (data && data.error) || "unavailable";
                    throw error;
                });
            })
            .finally(function () {
                if (timer) clearTimeout(timer);
            });
    }

    function ask(text, verifiedAnswer) {
        text = text.trim().slice(0, MAX_CHARS);
        if (!text || pending) return;

        pending = true;
        hideSuggestions();
        var visitor = { role: "user", text: text };
        add(visitor);
        input.value = "";
        resize();
        updateSend();
        showTyping(true);

        request()
            .then(function (reply) {
                add({ role: "assistant", text: reply });
            })
            .catch(function (error) {
                if (verifiedAnswer) {
                    add({ role: "assistant", text: verifiedAnswer });
                    return;
                }
                // Keep the failed question out of the next request so the exchange stays valid.
                visitor.local = true;
                save();
                var text = error.code === "rate_limited" ? RATE_LIMITED : error.code === "too_long" ? TOO_LONG : FALLBACK;
                add({ role: "assistant", text: text, local: true, notice: true });
            })
            .finally(function () {
                pending = false;
                showTyping(false);
                updateSend();
            });
    }

    function reset() {
        history = [];
        save();
        log.textContent = "";
        restart.hidden = true;
        suggest.hidden = false;
        body.scrollTop = 0;
        input.focus();
    }

    /* Composer ----------------------------------------------- */
    function resize() {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
    }

    function updateSend() {
        send.setAttribute("aria-disabled", String(pending || !input.value.trim()));
    }

    input.addEventListener("input", function () {
        resize();
        updateSend();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            ask(input.value);
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        ask(input.value);
    });

    restart.addEventListener("click", reset);

    /* Open & close ------------------------------------------- */
    var isOpen = false;

    function setOpen(open, returnFocus) {
        if (open === isOpen) return;
        isOpen = open;
        launcher.setAttribute("aria-expanded", String(open));
        launcher.setAttribute("aria-label", open ? "Close Neaten Assistant" : "Open Neaten Assistant");
        panel.classList.toggle("is-open", open);
        panel.inert = !open;
        document.documentElement.classList.toggle("nt-assist-open", open);
        panel.setAttribute("aria-modal", String(open && sheet.matches));

        if (open) {
            fitViewport();
            scrollToEnd();
            // On phones, don't raise the keyboard until the visitor taps the field.
            if (sheet.matches) title.focus({ preventScroll: true });
            else input.focus({ preventScroll: true });
        } else if (returnFocus !== false) {
            launcher.focus({ preventScroll: true });
        }
    }

    launcher.addEventListener("click", function () { setOpen(!isOpen); });
    root.querySelector("[data-close]").addEventListener("click", function () { setOpen(false); });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            setOpen(false);
        }
    });

    // On phones the panel covers the page, so keep Tab within it.
    panel.addEventListener("keydown", function (event) {
        if (event.key !== "Tab" || !sheet.matches) return;
        var focusable = Array.prototype.filter.call(
            panel.querySelectorAll("button, a[href], textarea"),
            function (el) { return !el.disabled && el.offsetParent !== null; }
        );
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    // A link to a section of the current page: close the panel so it can be seen.
    log.addEventListener("click", function (event) {
        var link = event.target.closest("a");
        if (!link) return;
        var target = new URL(link.href, window.location.href);
        if (target.pathname === window.location.pathname && target.hash) setOpen(false, false);
    });

    // Opening the mobile menu closes the assistant.
    var menuToggle = document.querySelector("[data-menu-toggle]");
    if (menuToggle) menuToggle.addEventListener("click", function () { setOpen(false, false); });

    /* Keep the sheet above the on-screen keyboard ------------ */
    function fitViewport() {
        var vv = window.visualViewport;
        if (!vv || !sheet.matches) {
            panel.style.removeProperty("--nt-vh");
            panel.style.removeProperty("--nt-kb");
            return;
        }
        var keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        panel.style.setProperty("--nt-vh", vv.height + "px");
        panel.style.setProperty("--nt-kb", keyboard + "px");
    }

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", function () {
            if (!isOpen) return;
            fitViewport();
            if (document.activeElement === input) scrollToEnd();
        });
        window.visualViewport.addEventListener("scroll", function () { if (isOpen) fitViewport(); });
    }

    sheet.addEventListener("change", function () {
        fitViewport();
        if (isOpen) panel.setAttribute("aria-modal", String(sheet.matches));
    });

    restore();
})();
