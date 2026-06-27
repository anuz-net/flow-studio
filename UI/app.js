// Global state
let activeTab = 'presets-tab';
let p1 = { x: 0.42, y: 0.0 };
let p2 = { x: 0.58, y: 1.0 };
let activePreset = 'smooth_in_out';
let customPresets = [];
let settings = { pythonPath: 'python' };

// Canvas state
const canvas = document.getElementById('curve-canvas');
const ctx = canvas.getContext('2d');
const padding = 30;
const canvasSize = 300;
const graphSize = canvasSize - (padding * 2);

// Drag state
let isDraggingP1 = false;
let isDraggingP2 = false;
const handleRadius = 6;

// Animation state
let animationId = null;
let animStartTime = null;
const animDuration = 1500; // ms

// Elements
const x1Input = document.getElementById('x1-input');
const y1Input = document.getElementById('y1-input');
const x2Input = document.getElementById('x2-input');
const y2Input = document.getElementById('y2-input');
const presetNameInput = document.getElementById('preset-name-input');
const pythonPathInput = document.getElementById('python-path-input');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initCanvasEvents();
    initInputEvents();
    initPresetCards();
    initToolbarEvents();
    initShortcutEvents();
    initSegmentsEvents();
    initQuickAnimateEvents();
    
    // Load Settings and Custom Presets from main process
    try {
        settings = await window.flowStudioAPI.getSettings();
        if (settings && settings.pythonPath) {
            pythonPathInput.value = settings.pythonPath;
        }
    } catch (e) {
        console.error("Failed to load settings:", e);
    }

    try {
        await loadCustomPresets();
    } catch (e) {
        console.error("Failed to load custom presets:", e);
    }
    
    updateEditorFromState();
    startAnimationPreview();
    syncSegments();
    startStatusPolling();
});

// Toast Notifications
function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    
    // Auto-remove after animation completes
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Tab navigation
function initTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.tab-panel');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            activeTab = tabId;
            
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'editor-tab') {
                updateEditorFromState();
            }
        });
    });
}

// Preset library interactions
function initPresetCards() {
    const cards = document.querySelectorAll('.preset-card');
    cards.forEach(card => {
        card.addEventListener('click', async (e) => {
            // Avoid triggering apply if clicking the delete button on custom presets
            if (e.target.classList.contains('delete-preset-btn')) return;

            const bezierStr = card.getAttribute('data-bezier');
            const presetName = card.getAttribute('data-preset');
            
            // Highlight selected
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            activePreset = presetName;
            
            // Parse and set coordinates
            const coords = bezierStr.split(',').map(Number);
            p1.x = coords[0];
            p1.y = coords[1];
            p2.x = coords[2];
            p2.y = coords[3];
            
            // Sync values to editor inputs in case user switches tabs
            updateEditorInputs();
            
            // One-click apply preset directly to Resolve
            showToast("Applying preset to DaVinci Resolve...");
            try {
                const response = await window.flowStudioAPI.applyPreset(presetName, null, getSelectedSegments());
                if (response.status === 'success') {
                    showToast(response.message);
                } else {
                    showToast(response.message, true);
                }
            } catch (err) {
                showToast("Connection to Resolve failed.", true);
            }
        });
    });
}

// Load Custom Presets
async function loadCustomPresets() {
    const container = document.getElementById('custom-presets-list');
    
    // Clear old custom presets (keep the message placeholder)
    const oldCards = container.querySelectorAll('.preset-card');
    oldCards.forEach(c => c.remove());
    
    customPresets = await window.flowStudioAPI.getCustomPresets();
    const msg = document.getElementById('no-custom-presets-msg');
    
    if (customPresets && customPresets.length > 0) {
        msg.style.display = 'none';
        
        customPresets.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.setAttribute('data-bezier', preset.bezier);
            card.setAttribute('data-preset', 'custom_' + preset.name.replace(/\s+/g, '_'));
            
            // Create mini preview path
            const coords = preset.bezier.split(',').map(Number);
            // Draw path for SVG
            // Normalized points translated to SVG box (10 to 90)
            const sx = 10, sy = 90;
            const ex = 90, ey = 10;
            const cp1x = sx + coords[0] * 80;
            const cp1y = sy - coords[1] * 80;
            const cp2x = sx + coords[2] * 80;
            const cp2y = sy - coords[3] * 80;
            
            card.innerHTML = `
                <button class="delete-preset-btn" title="Delete Preset">✕</button>
                <svg class="preset-icon" viewBox="0 0 100 100">
                    <path d="M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}" fill="none" stroke="#FFFFFF" stroke-width="3"></path>
                </svg>
                <span class="preset-label">${preset.name}</span>
            `;
            
            // Click card to apply
            card.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-preset-btn')) return;
                
                p1.x = coords[0];
                p1.y = coords[1];
                p2.x = coords[2];
                p2.y = coords[3];
                updateEditorInputs();
                
                showToast(`Applying custom preset "${preset.name}"...`);
                const response = await window.flowStudioAPI.applyPreset(null, preset.bezier, getSelectedSegments());
                if (response.status === 'success') {
                    showToast(response.message);
                } else {
                    showToast(response.message, true);
                }
            });
            
            // Delete button listener
            card.querySelector('.delete-preset-btn').addEventListener('click', async () => {
                const deleted = await window.flowStudioAPI.deleteCustomPreset(preset.name);
                if (deleted.status === 'success') {
                    showToast(`Deleted custom preset "${preset.name}".`);
                    loadCustomPresets();
                } else {
                    showToast(deleted.message, true);
                }
            });
            
            container.appendChild(card);
        });
    } else {
        msg.style.display = 'block';
    }
}

// Editor input panel change listener
function initInputEvents() {
    const inputs = [x1Input, y1Input, x2Input, y2Input];
    inputs.forEach(inp => {
        inp.addEventListener('input', () => {
            p1.x = Math.max(0, Math.min(1, parseFloat(x1Input.value) || 0));
            p1.y = parseFloat(y1Input.value) || 0;
            p2.x = Math.max(0, Math.min(1, parseFloat(x2Input.value) || 0));
            p2.y = parseFloat(y2Input.value) || 0;
            
            // Clamp inputs inside boxes
            x1Input.value = p1.x.toFixed(2);
            x2Input.value = p2.x.toFixed(2);
            
            drawCurve();
        });
    });
    
    // Save Custom Preset Button
    document.getElementById('btn-save-custom').addEventListener('click', async () => {
        const name = presetNameInput.value.trim();
        if (!name) {
            showToast("Please enter a name for the custom preset.", true);
            return;
        }
        
        const bezierStr = `${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
        const result = await window.flowStudioAPI.saveCustomPreset(name, bezierStr);
        
        if (result.status === 'success') {
            showToast(`Preset "${name}" saved successfully.`);
            presetNameInput.value = '';
            loadCustomPresets();
        } else {
            showToast(result.message, true);
        }
    });
    
    // Apply Editor Curve Button
    document.getElementById('btn-apply-curve').addEventListener('click', async () => {
        const bezierStr = `${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
        showToast("Applying custom easing curve...");
        const response = await window.flowStudioAPI.applyPreset(null, bezierStr, getSelectedSegments());
        if (response.status === 'success') {
            showToast(response.message);
        } else {
            showToast(response.message, true);
        }
    });

    // Save Settings Button
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        settings.pythonPath = pythonPathInput.value.trim() || 'python';
        const result = await window.flowStudioAPI.saveSettings(settings);
        if (result.status === 'success') {
            showToast("Settings saved successfully.");
        } else {
            showToast(result.message, true);
        }
    });
}

// Toolbar operations (footer buttons)
function initToolbarEvents() {
    document.getElementById('tool-copy').addEventListener('click', async () => {
        showToast("Copying animation...");
        const res = await window.flowStudioAPI.copyAnimation();
        if (res.status === 'success') {
            showToast(res.message);
        } else {
            showToast(res.message, true);
        }
    });

    document.getElementById('tool-paste').addEventListener('click', async () => {
        showToast("Pasting animation...");
        const res = await window.flowStudioAPI.pasteAnimation(getSelectedSegments());
        if (res.status === 'success') {
            showToast(res.message);
        } else {
            showToast(res.message, true);
        }
    });

    document.getElementById('tool-reverse').addEventListener('click', async () => {
        showToast("Reversing keyframe curve...");
        const res = await window.flowStudioAPI.reverseAnimation(getSelectedSegments());
        if (res.status === 'success') {
            showToast(res.message);
        } else {
            showToast(res.message, true);
        }
    });

    document.getElementById('tool-mirror').addEventListener('click', async () => {
        showToast("Mirroring keyframe curve...");
        const res = await window.flowStudioAPI.mirrorAnimation(getSelectedSegments());
        if (res.status === 'success') {
            showToast(res.message);
        } else {
            showToast(res.message, true);
        }
    });

    document.getElementById('tool-reset').addEventListener('click', async () => {
        showToast("Resetting keyframe handles...");
        const res = await window.flowStudioAPI.resetAnimation(getSelectedSegments());
        if (res.status === 'success') {
            showToast(res.message);
        } else {
            showToast(res.message, true);
        }
    });
}

// Keyboard shortcuts (global)
function initShortcutEvents() {
    document.addEventListener('keydown', async (e) => {
        // Apply: Ctrl + Enter
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const bezierStr = `${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
            showToast("Applying curve (Shortcut)...");
            const response = await window.flowStudioAPI.applyPreset(null, bezierStr, getSelectedSegments());
            if (response.status === 'success') {
                showToast(response.message);
            } else {
                showToast(response.message, true);
            }
        }
        
        // Copy: Ctrl + C (Ensure not focusing an input)
        if (e.ctrlKey && e.key === 'c' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            showToast("Copying animation (Shortcut)...");
            const res = await window.flowStudioAPI.copyAnimation();
            if (res.status === 'success') {
                showToast(res.message);
            } else {
                showToast(res.message, true);
            }
        }
        
        // Paste: Ctrl + V (Ensure not focusing an input)
        if (e.ctrlKey && e.key === 'v' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            showToast("Pasting animation (Shortcut)...");
            const res = await window.flowStudioAPI.pasteAnimation(getSelectedSegments());
            if (res.status === 'success') {
                showToast(res.message);
            } else {
                showToast(res.message, true);
            }
        }
        
        // Reset: R (Ensure not focusing an input)
        if (e.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            showToast("Resetting keyframe handles (Shortcut)...");
            const res = await window.flowStudioAPI.resetAnimation(getSelectedSegments());
            if (res.status === 'success') {
                showToast(res.message);
            } else {
                showToast(res.message, true);
            }
        }
    });
}

// Bezier Curve Canvas Interaction Math
function updateEditorFromState() {
    updateEditorInputs();
    drawCurve();
}

function updateEditorInputs() {
    x1Input.value = p1.x.toFixed(2);
    y1Input.value = p1.y.toFixed(2);
    x2Input.value = p2.x.toFixed(2);
    y2Input.value = p2.y.toFixed(2);
}

// Map normalized coordinates (0..1) to Canvas pixel coordinates
function toCanvasCoords(p) {
    return {
        x: padding + p.x * graphSize,
        y: (canvasSize - padding) - p.y * graphSize
    };
}

// Map Canvas pixel coordinates to normalized coordinates (0..1)
function toNormalizedCoords(x, y) {
    return {
        x: (x - padding) / graphSize,
        y: ((canvasSize - padding) - y) / graphSize
    };
}

function drawCurve() {
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    
    // Draw background boundary (Graph boundary)
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, graphSize, graphSize);
    
    // Draw diagonal linear line (helper)
    ctx.strokeStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.moveTo(padding, canvasSize - padding);
    ctx.lineTo(canvasSize - padding, padding);
    ctx.stroke();

    // Map control points
    const s = { x: 0, y: 0 };
    const e = { x: 1, y: 1 };
    
    const sCanvas = toCanvasCoords(s);
    const eCanvas = toCanvasCoords(e);
    const p1Canvas = toCanvasCoords(p1);
    const p2Canvas = toCanvasCoords(p2);
    
    // Draw handle connector lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Line 1: S -> P1
    ctx.beginPath();
    ctx.moveTo(sCanvas.x, sCanvas.y);
    ctx.lineTo(p1Canvas.x, p1Canvas.y);
    ctx.stroke();
    
    // Line 2: E -> P2
    ctx.beginPath();
    ctx.moveTo(eCanvas.x, eCanvas.y);
    ctx.lineTo(p2Canvas.x, p2Canvas.y);
    ctx.stroke();
    
    // Draw Bezier Curve (Active line)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sCanvas.x, sCanvas.y);
    ctx.bezierCurveTo(p1Canvas.x, p1Canvas.y, p2Canvas.x, p2Canvas.y, eCanvas.x, eCanvas.y);
    ctx.stroke();
    
    // Draw handles (Circles)
    ctx.lineWidth = 1;
    
    // Control Point 1
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(p1Canvas.x, p1Canvas.y, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Control Point 2
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(p2Canvas.x, p2Canvas.y, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function initCanvasEvents() {
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const p1Canvas = toCanvasCoords(p1);
        const p2Canvas = toCanvasCoords(p2);
        
        // Calculate distances to control points
        const dist1 = Math.hypot(mouseX - p1Canvas.x, mouseY - p1Canvas.y);
        const dist2 = Math.hypot(mouseX - p2Canvas.x, mouseY - p2Canvas.y);
        
        // Threshold for drag detection (15px)
        const selectRadius = 15;
        
        if (dist1 < selectRadius && dist1 < dist2) {
            isDraggingP1 = true;
        } else if (dist2 < selectRadius) {
            isDraggingP2 = true;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingP1 && !isDraggingP2) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = Math.max(rect.left, Math.min(rect.right, e.clientX)) - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const norm = toNormalizedCoords(mouseX, mouseY);
        
        // Clamping: x must be in 0..1, y can overshoot (-1..2)
        const clampedX = Math.max(0, Math.min(1, norm.x));
        const clampedY = Math.max(-1, Math.min(2, norm.y));
        
        if (isDraggingP1) {
            p1.x = clampedX;
            p1.y = clampedY;
        } else if (isDraggingP2) {
            p2.x = clampedX;
            p2.y = clampedY;
        }
        
        updateEditorInputs();
        drawCurve();
    });

    window.addEventListener('mouseup', () => {
        isDraggingP1 = false;
        isDraggingP2 = false;
    });
}

// Numerical Bezier easing solver for the timing preview
function solveBezierEasing(x1, y1, x2, y2) {
    return function(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        
        let start = 0;
        let end = 1;
        
        // Binary search parameter u
        for (let i = 0; i < 15; i++) {
            let u = (start + end) / 2;
            let x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
            if (Math.abs(x - t) < 0.001) {
                return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
            }
            if (x < t) {
                start = u;
            } else {
                end = u;
            }
        }
        let u = (start + end) / 2;
        return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    };
}

// Timing Animation loop
function startAnimationPreview() {
    const dot = document.getElementById('animation-dot');
    
    function step(timestamp) {
        if (!animStartTime) animStartTime = timestamp;
        let progress = (timestamp - animStartTime) / animDuration;
        
        if (progress > 1) {
            // Loop animation
            progress = 0;
            animStartTime = timestamp;
        }
        
        // Solve easing position
        const solve = solveBezierEasing(p1.x, p1.y, p2.x, p2.y);
        const eased = solve(progress);
        
        // Map eased value to dot offset percentage (clamped to prevent sliding out of UI view)
        // Although overshoot will naturally slide past borders in track
        const leftPercent = eased * 100;
        dot.style.left = `calc(${leftPercent}% - 5px)`;
        
        animationId = requestAnimationFrame(step);
    }
    
    animationId = requestAnimationFrame(step);
}

// Segment Selection Helpers
function getSelectedSegments() {
    const chkApplyAll = document.getElementById('chk-apply-all');
    if (chkApplyAll && chkApplyAll.checked) {
        return null; // Signals apply to all
    }
    
    const checkboxes = document.querySelectorAll('.segment-checkbox');
    const selected = [];
    checkboxes.forEach(chk => {
        if (chk.checked) {
            selected.push({
                tool_name: chk.dataset.tool,
                param_id: chk.dataset.paramId,
                start: parseFloat(chk.dataset.start),
                end: parseFloat(chk.dataset.end)
            });
        }
    });
    return JSON.stringify(selected);
}

function initSegmentsEvents() {
    const btnSyncNode = document.getElementById('btn-sync-node');
    if (btnSyncNode) {
        btnSyncNode.addEventListener('click', () => {
            syncSegments();
        });
    }

    const chkApplyAll = document.getElementById('chk-apply-all');
    if (chkApplyAll) {
        chkApplyAll.addEventListener('change', () => {
            const isChecked = chkApplyAll.checked;
            const checkboxes = document.querySelectorAll('.segment-checkbox');
            checkboxes.forEach(chk => {
                chk.checked = isChecked;
                const parent = chk.closest('.segment-item');
                if (parent) {
                    if (isChecked) {
                        parent.classList.add('checked');
                    } else {
                        parent.classList.remove('checked');
                    }
                }
            });
        });
    }
}

async function syncSegments() {
    const listContainer = document.getElementById('segments-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="no-segments-msg">Loading segments...</div>';
    
    try {
        const response = await window.flowStudioAPI.getKeyframeSegments();
        if (response && response.status === 'success') {
            if (response.segments && response.segments.length > 0) {
                listContainer.innerHTML = '';
                
                response.segments.forEach(param => {
                    const toolName = param.tool_name;
                    const paramId = param.param_id;
                    const paramName = param.param_name;
                    
                    param.segments.forEach((seg, idx) => {
                        const item = document.createElement('label');
                        item.className = 'segment-item checked';
                        
                        const chk = document.createElement('input');
                        chk.type = 'checkbox';
                        chk.className = 'segment-checkbox';
                        chk.checked = true;
                        chk.dataset.tool = toolName;
                        chk.dataset.paramId = paramId;
                        chk.dataset.start = seg.start;
                        chk.dataset.end = seg.end;
                        
                        chk.addEventListener('change', () => {
                            if (chk.checked) {
                                item.classList.add('checked');
                            } else {
                                item.classList.remove('checked');
                            }
                            
                            // Update Apply to All master checkbox
                            const chkApplyAll = document.getElementById('chk-apply-all');
                            if (chkApplyAll) {
                                const allCheckboxes = document.querySelectorAll('.segment-checkbox');
                                const allChecked = Array.from(allCheckboxes).every(c => c.checked);
                                chkApplyAll.checked = allChecked;
                            }
                        });
                        
                        const labelSpan = document.createElement('span');
                        const startFrame = Math.round(seg.start);
                        const endFrame = Math.round(seg.end);
                        labelSpan.textContent = `${toolName} - ${paramName}: ${startFrame} → ${endFrame}`;
                        
                        item.appendChild(chk);
                        item.appendChild(labelSpan);
                        listContainer.appendChild(item);
                    });
                });
                
                // Set master checkbox to checked
                const chkApplyAll = document.getElementById('chk-apply-all');
                if (chkApplyAll) {
                    chkApplyAll.checked = true;
                }
            } else {
                listContainer.innerHTML = '<div class="no-segments-msg">No active keyframe segments found. Click Sync Node to load.</div>';
            }
        } else {
            const errMsg = response && response.message ? response.message : "Failed to connect to Resolve.";
            listContainer.innerHTML = `<div class="no-segments-msg error-text">${errMsg}</div>`;
        }
    } catch (err) {
        console.error("Error syncing segments:", err);
        listContainer.innerHTML = '<div class="no-segments-msg error-text">Error syncing segments from Resolve.</div>';
    }
}

// Background Status Polling & UI Sync
let statusPollInterval = null;
let lastDetectedClipId = '';

function startStatusPolling() {
    if (statusPollInterval) clearInterval(statusPollInterval);
    
    statusPollInterval = setInterval(async () => {
        try {
            const status = await window.flowStudioAPI.pollStatus();
            
            if (status && status.status === 'success') {
                const page = status.page || '';
                const clipName = status.clip_name;
                const hasFusion = status.has_fusion_comp;
                
                if (page.toLowerCase() === 'edit') {
                    const clipId = clipName ? `${clipName}_${hasFusion}` : 'none';
                    updateClipStatusUI('edit', clipName, hasFusion);
                    
                    // If the selected clip changed on Edit page, auto sync keyframe segments list
                    if (clipId !== lastDetectedClipId) {
                        lastDetectedClipId = clipId;
                        syncSegments();
                    }
                } else if (page.toLowerCase() === 'fusion') {
                    updateClipStatusUI('fusion');
                    lastDetectedClipId = '';
                } else {
                    updateClipStatusUI('other', null, false, page);
                    lastDetectedClipId = '';
                }
            } else {
                updateClipStatusUI('disconnected');
                lastDetectedClipId = '';
            }
        } catch (e) {
            updateClipStatusUI('disconnected');
            lastDetectedClipId = '';
        }
    }, 1500); // Poll status every 1.5 seconds
}

function updateClipStatusUI(state, clipName = null, hasFusion = false, rawPageName = '') {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;
    
    dot.className = 'status-dot';
    
    if (state === 'edit') {
        dot.classList.add('active');
        if (clipName) {
            if (hasFusion) {
                text.innerHTML = `Edit Page: Clip <strong>${clipName}</strong>`;
            } else {
                text.innerHTML = `Edit Page: Clip <strong>${clipName}</strong> (No keyframes. Add keyframes to a Fusion clip/effect first)`;
            }
        } else {
            text.innerHTML = `Edit Page: <em>No clip under playhead</em>`;
        }
    } else if (state === 'fusion') {
        dot.classList.add('active');
        text.innerHTML = `Connected: <strong>Fusion Page</strong>`;
    } else if (state === 'other') {
        dot.classList.add('idle');
        const displayPage = rawPageName ? `${rawPageName.charAt(0).toUpperCase() + rawPageName.slice(1)} Page` : 'Resolve';
        text.innerHTML = `Resolve Active: <strong>${displayPage}</strong> (Switch to Edit/Fusion)`;
    } else {
        dot.classList.add('idle');
        text.innerHTML = `Resolve: <em>Disconnected</em>`;
    }
}

// Quick Animations Event Listeners & Trigger Logic
function initQuickAnimateEvents() {
    const btnZoom = document.getElementById('btn-quick-zoom');
    const btnPos = document.getElementById('btn-quick-pos');
    const btnRot = document.getElementById('btn-quick-rot');
    
    if (btnZoom) {
        btnZoom.addEventListener('click', async () => {
            const v1 = parseFloat(document.getElementById('zoom-v1').value);
            const v2 = parseFloat(document.getElementById('zoom-v2').value);
            const dur = parseFloat(document.getElementById('zoom-dur').value) || 0;
            await triggerQuickAnimate('zoom', v1, v2, dur);
        });
    }
    
    if (btnPos) {
        btnPos.addEventListener('click', async () => {
            const v1 = parseFloat(document.getElementById('pos-v1').value);
            const v2 = parseFloat(document.getElementById('pos-v2').value);
            const dur = parseFloat(document.getElementById('pos-dur').value) || 0;
            await triggerQuickAnimate('position', v1, v2, dur);
        });
    }
    
    if (btnRot) {
        btnRot.addEventListener('click', async () => {
            const v1 = parseFloat(document.getElementById('rot-v1').value);
            const v2 = parseFloat(document.getElementById('rot-v2').value);
            const dur = parseFloat(document.getElementById('rot-dur').value) || 0;
            await triggerQuickAnimate('rotation', v1, v2, dur);
        });
    }
}

async function triggerQuickAnimate(type, v1, v2, dur) {
    if (isNaN(v1) || isNaN(v2)) {
        showToast("Please enter valid start and end numbers.", true);
        return;
    }
    
    showToast(`Creating quick ${type} animation...`);
    
    try {
        let presetName = null;
        let bezierParams = null;
        
        // Find if a preset card is selected
        const cards = document.querySelectorAll('.preset-card');
        let hasSelectedCard = false;
        cards.forEach(card => {
            if (card.classList.contains('selected')) {
                presetName = card.getAttribute('data-preset');
                hasSelectedCard = true;
            }
        });
        
        if (!hasSelectedCard) {
            // Fallback to active editor curve if no card selected
            bezierParams = `${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
        }
        
        const response = await window.flowStudioAPI.quickAnimate(type, v1, v2, dur, presetName, bezierParams);
        
        if (response && response.status === 'success') {
            showToast(response.message);
            // Instantly sync segments to show the newly animated parameter
            await syncSegments();
        } else {
            const msg = response && response.message ? response.message : "Failed to create quick animation.";
            showToast(msg, true);
        }
    } catch (err) {
        console.error("Quick animate error:", err);
        showToast("Failed to connect to Resolve.", true);
    }
}
