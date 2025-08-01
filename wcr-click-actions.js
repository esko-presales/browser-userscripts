// ==UserScript==
// @name         Cmd/Ctrl+Click: WebCenter Quick Actions
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Cmd+Click (Mac) or Ctrl+Click (Win) elements for WebCenter actions. Case 3 opens all overrideWorkflows; Case 4 opens only the first.
// @author       David Cebula (DACE)
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://raw.githubusercontent.com/esko-presales/browser-userscripts/refs/heads/main/wcr-click-actions.js
// @updateURL    https://raw.githubusercontent.com/esko-presales/browser-userscripts/refs/heads/main/wcr-click-actions.js
// ==/UserScript==

(function () {
    'use strict';

    // MFUR - 30-July-2025
    // Prompt user to set Esko initials if not already set
    let userInitials = GM_getValue("eskoInitials", null);
    if (!userInitials) {
        userInitials = prompt("Please enter your initials:");
        if (userInitials) {
            GM_setValue("eskoInitials", userInitials);
        } else {
            userInitials = "N/A"; // fallback
        }
    }

    console.log("User initials:", userInitials);

    // Check if the platform is Mac
    const isMac = /Mac/.test(navigator.platform);

    // overrideWorkflows: configure your workflow names here. Leave empty to disable case3/4.
    const overrideWorkflows = [userInitials + '-TEST', 'OTHER-TEST'];

    document.addEventListener('click', function(e) {
        // only proceed on left-click + Cmd/Ctrl
        if (e.button !== 0) return;
        if (!(isMac ? e.metaKey : e.ctrlKey)) return;

        const el = e.target;
        const className = typeof el.className === 'string' ? el.className.trim() : '';
        const value = (el.value || el.alt || el.title || el.innerText || el.textContent || '').trim();
        const URLCtor = window.URL;

        // common helpers
        let href = window.location.href;
        let projectId = '';
        try {
            projectId = new URLCtor(href).searchParams.get('projectID') || '';
        } catch (_) {}
        const basePath = href.substring(0, href.lastIndexOf('/') + 1);
        const tasksURL = basePath + 'projdetailswctasks.jsp?projectID=' + encodeURIComponent(projectId) + '&folderID=&menu_file=myallprojects';

        // CASE 1: attribute-category-name
        if (el.classList.contains('attribute-category-name')) {
            e.preventDefault(); e.stopPropagation();
            const selCat = value.toUpperCase();
            if (!selCat) { alert('Please select a category'); return; }
            fetch('GetAttributeCategoryList.jsp?verbose=0&ajax=1')
                .then(r => r.text())
                .then(txt => new DOMParser().parseFromString(txt, 'text/xml'))
                .then(xml => {
                    const cats = xml.getElementsByTagName('category');
                    for (let node of cats) {
                        const id = node.getAttribute('id');
                        const nm = node.getElementsByTagName('name')[0]?.textContent.trim().toUpperCase() || '';
                        if (nm === selCat) {
                            const w = window.open(`attcategorymgredit.jsp?categoryID=${id}`, '_blank');
                            if (w) w.focus();
                            return;
                        }
                    }
                    alert(`Could not find attribute category '${selCat}'`);
                });
            return;
        }

        // CASE 2: projdetails.jsp skipDashboard
        if (!className && el.tagName === 'A' && el.href.includes('projdetails.jsp')) {
            try {
                const u2 = new URLCtor(el.href);
                if (u2.searchParams.has('menu_file')) {
                    e.preventDefault(); e.stopPropagation();
                    u2.searchParams.set('skipDashboard', '1');
                    const w2 = window.open(u2.toString(), '_blank');
                    if (w2) w2.focus();
                    return;
                }
            } catch (_) {}
        }

        // If no workflows defined, skip case3 & case4
        const workflows = Array.isArray(overrideWorkflows) ? overrideWorkflows.slice() : [];

        // CASE 3: Manager -> open ALL workflows
        if (workflows.length > 0 && el.classList.contains('td-label') && value.startsWith('Manager:')) {
            e.preventDefault(); e.stopPropagation();
            fetch('GetTaskTypes.jsp?verbose=0&ajax=1')
                .then(r => r.text())
                .then(txt => new DOMParser().parseFromString(txt, 'text/xml'))
                .then(xml => {
                    const types = Array.from(xml.getElementsByTagName('wctask_type'));
                    const notFound = [];
                    workflows.forEach(wf => {
                        const match = wf.toUpperCase();
                        const node = types.find(t => t.getElementsByTagName('task_type_name')[0]?.textContent.trim().toUpperCase() === match);
                        if (node) {
                            const id = node.getAttribute('id');
                            const w3 = window.open(`wctasktypedetailsworkflow.jsp?taskTypeID=${id}&menu_file=mytasktypes`, '_blank');
                            if (w3) w3.focus();
                        } else {
                            notFound.push(wf);
                        }
                    });
                    if (notFound.length) alert(`Could not find workflow(s): ${notFound.join(', ')}`);
                });
            return;
        }

        // CASE 4: Customer -> open first workflow and redirect
        if (workflows.length > 0 && el.classList.contains('td-label') && value.startsWith('Customer:')) {
            if (!projectId) { console.error('projectID not found'); return; }
            e.preventDefault(); e.stopPropagation();
            const wfName = workflows[0];
            const params = {
                projectid: projectId,
                tasktypename: wfName,
                starttaskoption: '2',
                duedate: '275742489000'
            };
            const qs = new URLSearchParams(params).toString();
            fetch(`${basePath}CreateProjectTask.jsp?${qs}`)
                .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); })
                .then(() => {
                    window.location.href = tasksURL;
                })
                .catch(err => alert('Error creating task: ' + err));
            return;
        }

        // CASE 5: read-only-string specification details
        const parts = className.split(/\s+/);
        if (parts.includes('read-only-string') && parts.includes('col-sm-12') && parts.includes('col-lg-9')) {
            e.preventDefault(); e.stopPropagation();
            const sel5 = value.toUpperCase();
            if (!sel5) { alert('Please select a task type'); return; }
            fetch('GetTaskTypes.jsp?verbose=0&ajax=1')
                .then(r => r.text())
                .then(txt => new DOMParser().parseFromString(txt, 'text/xml'))
                .then(xml => {
                    const types = xml.getElementsByTagName('wctask_type');
                    for (let node of types) {
                        const nm = node.getElementsByTagName('task_type_name')[0]?.textContent.trim().toUpperCase() || '';
                        if (nm === sel5) {
                            const id = node.getAttribute('id');
                            const w5 = window.open(`wctasktypedetailsspecifications.jsp?taskTypeID=${id}&menu_file=wctasktypedetailsworkflow`, '_blank');
                            if (w5) w5.focus();
                            return;
                        }
                    }
                    alert(`Could not find tasktype '${sel5}'`);
                });
            return;
        }

    }, true);

})();