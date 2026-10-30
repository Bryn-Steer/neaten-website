/* =========================================================
   NEATEN — SITE INTERACTIONS
   Navigation, reveals, services index, FAQ, forms.
   No dependencies.
   ========================================================= */

(function () {
    "use strict";

    var root = document.documentElement;
    root.classList.remove("no-js");
    root.classList.add("js");

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Header state ---------------------------------------- */
    var header = document.querySelector("[data-header]");

    function onScroll() {
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* Mobile menu ----------------------------------------- */
    var toggle = document.querySelector("[data-menu-toggle]");
    var menu = document.getElementById("mobile-menu");

    function setMenu(open) {
        if (!toggle || !menu) return;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Open menu";
        menu.classList.toggle("is-open", open);
        menu.inert = !open;
        document.body.classList.toggle("menu-open", open);
        if (open) {
            var first = menu.querySelector("a");
            if (first) first.focus({ preventScroll: true });
        }
    }

    if (toggle && menu) {
        menu.inert = true;
        toggle.addEventListener("click", function () {
            setMenu(toggle.getAttribute("aria-expanded") !== "true");
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && menu.classList.contains("is-open")) {
                setMenu(false);
                toggle.focus();
            }
        });

        menu.addEventListener("click", function (event) {
            if (event.target.closest("a")) setMenu(false);
        });

        window.matchMedia("(min-width: 992px)").addEventListener("change", function (mq) {
            if (mq.matches) setMenu(false);
        });
    }

    /* Hero entrance --------------------------------------- */
    var hero = document.querySelector(".hero");
    if (hero) {
        requestAnimationFrame(function () {
            hero.classList.add("is-ready");
        });
    }

    /* Split headlines into masked lines ------------------- */
    document.querySelectorAll(".split-lines").forEach(function (el) {
        var lines = el.querySelectorAll(".line");
        lines.forEach(function (line, i) {
            line.style.setProperty("--i", i);
        });
    });

    /* Scroll reveals -------------------------------------- */
    var revealTargets = document.querySelectorAll("[data-reveal], .split-lines, .process, .moment");

    if ("IntersectionObserver" in window && !reduceMotion) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        revealTargets.forEach(function (el) {
            el.classList.add("is-visible");
        });
    }

    /* Brand moment — gentle scroll-linked scale ----------- */
    var momentImg = document.querySelector(".moment__media img");
    if (momentImg && !reduceMotion) {
        var ticking = false;
        var updateMoment = function () {
            var rect = momentImg.parentElement.getBoundingClientRect();
            var vh = window.innerHeight;
            if (rect.bottom > 0 && rect.top < vh) {
                var progress = 1 - (rect.top + rect.height) / (vh + rect.height);
                momentImg.style.transform = "scale(" + (1.12 - progress * 0.12).toFixed(4) + ")";
            }
            ticking = false;
        };
        window.addEventListener("scroll", function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateMoment);
            }
        }, { passive: true });
        updateMoment();
    }

    /* Services index — image follows the focused service -- */
    document.querySelectorAll("[data-collection]").forEach(function (collection) {
        var images = collection.querySelectorAll(".collection__media img");
        var rows = collection.querySelectorAll("[data-image]");

        function show(key) {
            images.forEach(function (img) {
                img.classList.toggle("is-active", img.dataset.key === key);
            });
            rows.forEach(function (row) {
                row.classList.toggle("is-active", row.dataset.image === key);
            });
        }

        rows.forEach(function (row) {
            row.addEventListener("mouseenter", function () { show(row.dataset.image); });
            row.addEventListener("focus", function () { show(row.dataset.image); });
        });

        collection.addEventListener("mouseleave", function () {
            show("default");
            rows.forEach(function (row) { row.classList.remove("is-active"); });
        });
    });

    /* Services page — highlight current section ----------- */
    var serviceNavLinks = document.querySelectorAll(".service-nav a");
    if (serviceNavLinks.length && "IntersectionObserver" in window) {
        var navObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                serviceNavLinks.forEach(function (link) {
                    var active = link.getAttribute("href") === "#" + entry.target.id;
                    link.classList.toggle("is-active", active);
                    if (active) link.setAttribute("aria-current", "true");
                    else link.removeAttribute("aria-current");
                });
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        document.querySelectorAll(".service-detail[id]").forEach(function (section) {
            navObserver.observe(section);
        });
    }

    /* FAQ accordion --------------------------------------- */
    document.querySelectorAll(".faq__trigger").forEach(function (trigger) {
        var item = trigger.closest(".faq__item");
        var panel = document.getElementById(trigger.getAttribute("aria-controls"));

        trigger.addEventListener("click", function () {
            var open = trigger.getAttribute("aria-expanded") !== "true";
            trigger.setAttribute("aria-expanded", String(open));
            item.classList.toggle("is-open", open);
            if (panel) panel.inert = !open;
        });

        if (panel) panel.inert = trigger.getAttribute("aria-expanded") !== "true";
    });

    /* Mobile booking bar ---------------------------------- */
    var mobileCta = document.querySelector(".mobile-cta");
    if (mobileCta && "IntersectionObserver" in window) {
        var hiders = document.querySelectorAll("[data-hide-cta]");
        var hidden = new Set();
        var ctaObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) hidden.add(entry.target);
                else hidden.delete(entry.target);
            });
            var visible = hidden.size === 0 && window.scrollY > 200;
            mobileCta.classList.toggle("is-visible", visible);
            mobileCta.inert = !visible;
        });
        hiders.forEach(function (el) { ctaObserver.observe(el); });
        mobileCta.inert = true;
    }

    /* Forms ----------------------------------------------- */
    var messages = {
        valueMissing: {
            "default": "Please complete this field.",
            select: "Please choose an option."
        },
        typeMismatch: "Please enter a valid email address, e.g. name@example.com.",
        patternMismatch: {
            postcode: "Please enter a full UK postcode, e.g. M3 4EN.",
            phone: "Please enter a valid phone number."
        }
    };

    function errorFor(field) {
        var v = field.validity;
        if (v.valid) return "";
        if (v.valueMissing) {
            return field.tagName === "SELECT" ? messages.valueMissing.select : messages.valueMissing["default"];
        }
        if (v.typeMismatch) return messages.typeMismatch;
        if (v.patternMismatch) return messages.patternMismatch[field.name] || "Please check this field.";
        if (v.rangeUnderflow) return "Please choose today or a later date.";
        return "Please check this field.";
    }

    function showError(field, text) {
        var error = document.getElementById(field.id + "-error");
        field.setAttribute("aria-invalid", text ? "true" : "false");
        if (!error) return;
        error.textContent = text;
        error.classList.toggle("is-visible", Boolean(text));
    }

    document.querySelectorAll("form[data-neaten-form]").forEach(function (form) {
        var fields = form.querySelectorAll("input:not([type=hidden]):not([name=website]), select, textarea");
        var submit = form.querySelector("[type=submit]");
        var alertBox = form.querySelector(".form-alert");
        var success = document.getElementById(form.dataset.success);
        var submitLabel = submit ? submit.querySelector("span").textContent : "";

        form.noValidate = true;

        fields.forEach(function (field) {
            field.addEventListener("blur", function () {
                if (field.value !== "" || field.getAttribute("aria-invalid") === "true") {
                    showError(field, errorFor(field));
                }
            });
            field.addEventListener("input", function () {
                if (field.getAttribute("aria-invalid") === "true") showError(field, errorFor(field));
            });
        });

        // Dates cannot be in the past
        form.querySelectorAll("input[type=date]").forEach(function (input) {
            var today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            input.min = today.toISOString().slice(0, 10);
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (alertBox) alertBox.hidden = true;

            var firstInvalid = null;
            fields.forEach(function (field) {
                var text = errorFor(field);
                showError(field, text);
                if (text && !firstInvalid) firstInvalid = field;
            });

            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            submit.disabled = true;
            submit.setAttribute("aria-busy", "true");
            submit.querySelector("span").textContent = "Sending…";

            fetch(form.getAttribute("action"), {
                method: "POST",
                body: new FormData(form),
                headers: { "X-Requested-With": "XMLHttpRequest" }
            })
                .then(function (response) {
                    if (!response.ok) throw new Error("HTTP " + response.status);
                    return response.text();
                })
                .then(function (result) {
                    if (result.trim() !== "sent") throw new Error("Not sent");
                    form.hidden = true;
                    if (success) {
                        success.hidden = false;
                        success.focus();
                    }
                })
                .catch(function () {
                    if (alertBox) {
                        alertBox.hidden = false;
                        alertBox.focus();
                    }
                })
                .finally(function () {
                    submit.disabled = false;
                    submit.removeAttribute("aria-busy");
                    submit.querySelector("span").textContent = submitLabel;
                });
        });
    });

    /* Prefill the booking form from a link or the plan builder */
    var bookingForm = document.getElementById("booking_form");
    if (bookingForm && window.URLSearchParams) {
        var params = new URLSearchParams(window.location.search);

        ["service", "property_type"].forEach(function (name) {
            var value = params.get(name);
            var select = bookingForm.elements[name];
            if (!value || !select) return;
            Array.prototype.some.call(select.options, function (option) {
                if (option.value === value) {
                    select.value = value;
                    return true;
                }
                return false;
            });
        });

        var plan = params.get("plan");
        var message = bookingForm.elements.message;
        if (plan && message && !message.value) {
            message.value = "Cleaning plan: " + plan.slice(0, 200) + "\n\n";
        }
    }
})();
