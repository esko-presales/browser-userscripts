// ==UserScript==
// @name         Glass Slide-In Center Panel with Dynamic Links and Optional Sound
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Slide-in glassy panel into center on WebCenter when holding Option; hides after click and optional sound
// @match        https://*.esko-saas.com/WebCenter/*
// @author       David Cebula (DACE)
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/esko-presales/tampermonkey-scripts/refs/heads/main/wcr-modal-menu.js
// @updateURL    https://raw.githubusercontent.com/esko-presales/tampermonkey-scripts/refs/heads/main/wcr-modal-menu.js
// ==/UserScript==

(function () {

    let soundSetting = GM_getValue("heyoooSetting", null);

    if (soundSetting === null) {
        const result = confirm("Enable heyoo sound? Click OK for True, Cancel for False.");
        GM_setValue("heyoooSetting", result);
        soundSetting = result;
    }

    console.log("Boolean setting is:", soundSetting);

    let heyoAudio = null;
    if (soundSetting) {
        heyoAudio = new Audio('https://www.myinstants.com/media/sounds/heyooo_Aim6Y0j.mp3');
        heyoAudio.preload = 'auto';
    }

    const fullUrl = window.location.href;
    const idx = fullUrl.indexOf('/WebCenter/');
    const baseUrl = (idx !== -1) ? fullUrl.slice(0, idx + 11) : window.location.origin + '/WebCenter/';

    const columns = [
        [{ label: 'Preferences', page: 'sitedefaults.jsp' }, { label: 'Menus', page: 'menus.jsp' }, { label: 'Dashboards', page: 'dashboards.jsp' }, { label: 'Task Lists', page: 'mytasktypes.jsp' }],
        [{ label: 'Searches', page: 'mysavedsearches.jsp' }, { label: 'Projects', page: 'projsearch.jsp' }, { label: 'Documents', page: 'alldocsearch.jsp' }, { label: 'Tasks', page: 'wctasksearch.jsp' }],
        [{ label: 'Favourites', page: 'myfavoriteproj.jsp' }, { label: 'Projects', page: 'myallprojects.jsp' }, { label: 'Categories', page: 'attcategorymgr.jsp' }, { label: 'Lists', page: 'lists.jsp' }]
    ];

    const panel = document.createElement('div');
    panel.id = 'tm-slide-panel';
    document.body.appendChild(panel);

    let html = '<div id="tm-link-container">';
    columns.forEach(col => {
        html += '<div class="tm-col">';
        col.forEach(link => {
            html += `<a href="${baseUrl}${link.page}" data-href="${baseUrl}${link.page}">${link.label}</a>`;
        });
        html += '</div>';
    });
    html += '</div>';
    panel.innerHTML = html;

    const style = document.createElement('style');
    style.textContent = `
        #tm-slide-panel {
            position: fixed;
            top: 50%;
            left: -100%;
            transform: translate(-50%, -50%);
            padding: 40px;
            background: rgba(255, 255, 255, 0.2);
            color: #000;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: left 0.3s ease;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border-radius: 0.1in;
            border: 1px solid rgba(255, 255, 255, 0.4);
            width: auto;
            max-width: 90%;
            box-sizing: border-box;
        }
        #tm-link-container {
            display: flex;
            column-gap: 40px;
        }
        .tm-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .tm-col a {
            color: #000;
            text-decoration: none;
            font-weight: bold;
            margin: 4px 0;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('#tm-link-container a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const url = a.getAttribute('data-href');
            const newTab = window.open(url, '_blank');
            if (newTab) newTab.focus();
            panel.style.left = '-100%';
        });
    });

    let optTimer = null;
    document.addEventListener('keydown', event => {
        if (event.key === 'Alt' && !optTimer) {
            optTimer = setTimeout(() => {
                panel.style.left = '33%';
                if (soundSetting && heyoAudio) {
                    heyoAudio.currentTime = 0;
                    heyoAudio.play();
                }
            }, 1000);
        }
    });
    document.addEventListener('keyup', event => {
        if (event.key === 'Alt') {
            clearTimeout(optTimer);
            optTimer = null;
            panel.style.left = '-100%';
        }
    });
})();