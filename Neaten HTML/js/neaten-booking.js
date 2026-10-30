
/* =========================================================
   NEATEN | CLEANING PLAN & CALENDLY BOOKING
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const builder = document.getElementById("neaten-plan-builder");
    if (!builder) return;

    const propertyInputs = builder.querySelectorAll(
        'input[name="neaten-property"]'
    );

    const frequencyInputs = builder.querySelectorAll(
        'input[name="neaten-frequency"]'
    );

    const sizeSelect = document.getElementById("neaten-property-size");

    const planTitle = document.getElementById("neaten-plan-title");
    const planDescription = document.getElementById("neaten-plan-description");
    const planProperty = document.getElementById("neaten-plan-property");
    const planFrequency = document.getElementById("neaten-plan-frequency");
    const bookingButton = document.getElementById("neaten-booking-button");

    // REPLACE WITH YOUR REAL CALENDLY EVENT URL
    const CALENDLY_URL = "https://calendly.com/YOUR-USERNAME/cleaning-booking";

    const plans = {
        Weekly: {
            title: "The Always-Fresh Clean",
            description:
                "Regular weekly care to help keep your space consistently fresh, comfortable and ready for everyday life.",
            label: "Every week"
        },

        Fortnightly: {
            title: "The Balanced Clean",
            description:
                "A practical fortnightly routine to help maintain a lovely space while balancing your schedule and budget.",
            label: "Every 2 weeks"
        },

        "One-off": {
            title: "The Fresh Start Clean",
            description:
                "A one-time cleaning visit when your space needs some extra attention, without an ongoing commitment.",
            label: "One-time visit"
        }
    };

    function getSelectedValue(name) {
        const selected = builder.querySelector(
            `input[name="${name}"]:checked`
        );

        return selected ? selected.value : "";
    }

    function getPreferences() {
        return {
            property: getSelectedValue("neaten-property"),
            size: sizeSelect.value,
            frequency: getSelectedValue("neaten-frequency")
        };
    }

    function updatePlan() {
        const preferences = getPreferences();
        const plan = plans[preferences.frequency];

        if (!plan) return;

        planTitle.textContent = plan.title;
        planDescription.textContent = plan.description;
        planProperty.textContent = preferences.property;
        planFrequency.textContent = plan.label;
    }

    propertyInputs.forEach(function (input) {
        input.addEventListener("change", updatePlan);
    });

    frequencyInputs.forEach(function (input) {
        input.addEventListener("change", updatePlan);
    });

    sizeSelect.addEventListener("change", updatePlan);

    // Open Calendly with selected cleaning preferences.
    bookingButton.addEventListener("click", function (event) {
        const preferences = getPreferences();

        // Until configured, the link should not open a fake booking page.
        if (CALENDLY_URL.includes("YOUR-USERNAME")) {
            event.preventDefault();
            window.alert(
                "Online booking is being set up. Please contact Neaten to arrange your clean."
            );
            return;
        }

        bookingButton.href = CALENDLY_URL;

        // If Calendly's popup library is unavailable,
        // allow the normal booking link to open.
        if (
            !window.Calendly ||
            typeof window.Calendly.initPopupWidget !== "function"
        ) {
            return;
        }

        event.preventDefault();

        window.Calendly.initPopupWidget({
            url: CALENDLY_URL,
            prefill: {
                customAnswers: {
                    a1: preferences.property,
                    a2: preferences.size,
                    a3: preferences.frequency
                }
            }
        });
    });

    updatePlan();
});
