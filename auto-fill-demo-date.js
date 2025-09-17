// ==UserScript==
// @name         Auto-Fill Date Field from Local API
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Detect date format and auto-fill using local API
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

/*
# NOTE: This script is a WIP and not ready for use.
# It aims to detect date input fields, infer their date format,
# and fetch a date from a local API to auto-fill the field.
# The script currently supports basic format inference and
# needs further enhancements for robustness and additional formats.
*/

(function() {
    'use strict';

    function inferDateFormat(input) {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder) return placeholder;

        const pattern = input.getAttribute('pattern');
        if (pattern) {
            // Basic pattern inference (customize as needed)
            if (pattern.includes('\\d{2}-\\w{3}-\\d{2}')) return 'DD-MMM-YY';
            if (pattern.includes('\\d{4}-\\d{2}-\\d{2}')) return 'YYYY-MM-DD';
            return pattern;
        }

        const type = input.getAttribute('type');
        switch (type) {
            case 'date': return 'YYYY-MM-DD';
            case 'text': return 'DD/MM/YYYY'; // common fallback
            default: return 'YYYY-MM-DD';
        }
    }

    function fetchDateAndFill(input, format) {
        const url = `http://localhost:3210/add-due-date?format=${encodeURIComponent(format)}`;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data.date) {
                        input.value = data.date;
                        console.log(`Date field filled with: ${data.date}`);
                    } else {
                        console.warn("No 'date' field in API response.");
                    }
                } catch (e) {
                    console.error("Failed to parse API response:", e);
                }
            },
            onerror: function(err) {
                console.error("API request failed:", err);
            }
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        const dateInputs = document.querySelectorAll('input[type="date"], input[data-date], input[placeholder*="date"]');
        dateInputs.forEach(input => {
            const format = inferDateFormat(input);
            console.log(`Inferred format: ${format}`);
            fetchDateAndFill(input, format);
        });
    });
})();
