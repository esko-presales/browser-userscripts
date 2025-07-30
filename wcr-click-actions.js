// ==UserScript==
// @name         Cmd/Ctrl+Click: WebCenter Quick Actions
// @namespace    http://tampermonkey.net/
// @version      1.20
// @description  Cmd+Click (Mac) or Ctrl+Click (Win) elements for WebCenter actions. Case 3 opens all overrideWorkflows; Case 4 opens only the first.
// @author       David Cebula (DACE)
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://raw.githubusercontent.com/esko-presales/tampermonkey-scripts/refs/heads/main/wcr-click-actions.js
// @updateURL    https://raw.githubusercontent.com/esko-presales/tampermonkey-scripts/refs/heads/main/wcr-click-actions.js
// ==/UserScript==

(function() {
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
    var isMac = /Mac/.test(navigator.platform);

    // workflows declared here; Case 3 will open each, Case 4 uses only the first
    var overrideWorkflows = [userInitials + '-TEST', 'OTHER-TEST'];

    document.addEventListener('click', function(e) {
        // left-click + ⌘ on Mac or Ctrl on Windows
        if (e.button !== 0) return;
        if (isMac ? !e.metaKey : !e.ctrlKey) return;
        e.preventDefault();
        e.stopPropagation();

        var el = e.target;
        var className = typeof el.className === 'string' ? el.className.trim() : '';
        var value = (el.value || el.alt || el.title || el.innerText || el.textContent || '').trim();
        var URLCtor = window.URL;

        // projectID and basePath
        var href = window.location.href;
        var projectId = '';
        try {
            projectId = new URLCtor(href).searchParams.get('projectID') || '';
        } catch (_) {}
        var basePath = href.substring(0, href.lastIndexOf('/') + 1);
        var tasksURL = basePath +
            'projdetailswctasks.jsp?projectID=' + encodeURIComponent(projectId) +
            '&folderID=&menu_file=myallprojects';

        // build workflows array
        var workflows = Array.isArray(overrideWorkflows) && overrideWorkflows.length
            ? overrideWorkflows.slice()
            : ['TEST'];

        // Case 1: attribute-category-name (unchanged)
        if (el.classList.contains('attribute-category-name')) {
            var selCat = value.toUpperCase();
            if (!selCat) { alert('Please select a category'); return; }
            fetch('GetAttributeCategoryList.jsp?verbose=0&ajax=1')
                .then(r => r.text())
                .then(txt => new DOMParser().parseFromString(txt, 'text/xml'))
                .then(xml => {
                    var cats = xml.getElementsByTagName('category'), found = false;
                    for (var i = 0; i < cats.length; i++) {
                        var node = cats[i],
                            id = node.getAttribute('id'),
                            nmNode = node.getElementsByTagName('name')[0],
                            nm = nmNode ? nmNode.textContent.trim().toUpperCase() : '';
                        if (nm === selCat) {
                            found = true;
                            var w = window.open('attcategorymgredit.jsp?categoryID=' + id, '_blank');
                            if (w) w.focus();
                            break;
                        }
                    }
                    if (!found) alert("Could not find attribute category '" + selCat + "'");
                });
            return;
        }

        // Case 2: projdetails.jsp skipDashboard (unchanged)
        if (!className && el.tagName === 'A' && el.href.indexOf('projdetails.jsp') !== -1) {
            try {
                var u2 = new URLCtor(el.href);
                if (u2.searchParams.has('menu_file')) {
                    u2.searchParams.set('skipDashboard', '1');
                    var w2 = window.open(u2.toString(), '_blank');
                    if (w2) w2.focus();
                    return;
                }
            } catch (_) {}
        }

        // Case 3: td-label + "Manager:" → open ALL workflows
        if (el.classList.contains('td-label') && value.startsWith('Manager:')) {
            fetch('GetTaskTypes.jsp?verbose=0&ajax=1')
                .then(r => r.text())
                .then(txt => new DOMParser().parseFromString(txt, 'text/xml'))
                .then(xml => {
                    var types = Array.from(xml.getElementsByTagName('wctask_type'));
                    var notFound = [];
                    workflows.forEach(function(wf) {
                        var match = wf.toUpperCase();
                        var foundThis = false;
                        for (var i = 0; i < types.length; i++) {
                            var node = types[i],
                                id = node.getAttribute('id'),
                                tn = node.getElementsByTagName('task_type_name')[0],
                                nm = tn ? tn.textContent.trim().toUpperCase() : '';
                            if (nm === match) {
                                foundThis = true;
                                var w3 = window.open(
                                    'wctasktypedetailsworkflow.jsp?taskTypeID=' + id + '&menu_file=mytasktypes',
                                    '_blank'
                                );
                                if (w3) w3.focus();
                                break;
                            }
                        }
                        if (!foundThis) notFound.push(wf);
                    });
                    if (notFound.length) {
                        alert("Could not find workflow(s): " + notFound.join(', '));
                    }
                });
            return;
        }

        // Case 4: td-label + "Customer:" → create only first workflow, then redirect
        if (el.classList.contains('td-label') && value.startsWith('Customer:')) {
            if (!projectId) { console.error('projectID not found'); return; }
            var wfName = workflows[0];
            var params = {
                projectid: projectId,
                tasktypename: wfName,
                starttaskoption: '2',
                duedate: '275742489000'
            };
            var qs = new URLSearchParams(Object.entries(params)).toString();
            var actionUrl = basePath + 'CreateProjectTask.jsp?' + qs;

            fetch(actionUrl)
                .then(function(response) {
                    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
                })
                .then(function() {
                    window.location.href = tasksURL;
                })
                .catch(function(err) {
                    alert('Error creating task: ' + err);
                });
            return;
        }

        // Case 5: read-only-string col-sm-12 col-lg-9 (unchanged)
        var parts = className.split(/\s+/);
        if (parts.includes('read-only-string') && parts.includes('col-sm-12') && parts.includes('col-lg-9')) {
            var sel5 = value.toUpperCase();
            if (!sel5) { alert('Please select a task type'); return; }
            fetch('GetTaskTypes.jsp?verbose=0&ajax=1')
                .then(r => r.text())
                .then(txt => new DOMParser().parseFromString(txt, 'text/xml'))
                .then(xml => {
                    var types = xml.getElementsByTagName('wctask_type'), found = false;
                    for (var i = 0; i < types.length; i++) {
                        var node = types[i],
                            id = node.getAttribute('id'),
                            tn = node.getElementsByTagName('task_type_name')[0],
                            nm = tn ? tn.textContent.trim().toUpperCase() : '';
                        if (nm === sel5) {
                            found = true;
                            var w5 = window.open(
                                'wctasktypedetailsspecifications.jsp?taskTypeID=' + id +
                                '&menu_file=wctasktypedetailsworkflow',
                                '_blank'
                            );
                            if (w5) w5.focus();
                            break;
                        }
                    }
                    if (!found) alert("Could not find tasktype '" + sel5 + "'");
                });
            return;
        }

    }, true);

})();