const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// 1. Auto-copy WorkflowIntegration.node if missing
const nodeFilename = 'WorkflowIntegration.node';
const localNodePath = path.join(__dirname, nodeFilename);

if (!fs.existsSync(localNodePath)) {
    const searchPaths = [
        path.join(process.env.PROGRAMDATA, 'Blackmagic Design', 'DaVinci Resolve', 'Support', 'Developer', 'Workflow Integrations', 'Examples', 'SamplePlugin', nodeFilename),
        path.join(process.env.PROGRAMDATA, 'Blackmagic Design', 'DaVinci Resolve', 'Support', 'Developer', 'Workflow Integrations', 'Examples', 'SamplePromisePlugin', nodeFilename),
        path.join(process.env.PROGRAMDATA, 'Blackmagic Design', 'DaVinci Resolve', 'Support', 'Developer', 'Workflow Integrations', 'Examples', 'ScriptTestPlugin', nodeFilename)
    ];
    let copied = false;
    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            try {
                fs.copyFileSync(p, localNodePath);
                console.log(`Successfully copied WorkflowIntegration.node from ${p}`);
                copied = true;
                break;
            } catch (err) {
                console.error(`Error copying node file from ${p}:`, err);
            }
        }
    }
    if (!copied) {
        console.error("Warning: WorkflowIntegration.node not found. The plugin may fail to communicate with Resolve.");
    }
}

// Now load WorkflowIntegration
let WorkflowIntegration = null;
try {
    if (fs.existsSync(localNodePath)) {
        WorkflowIntegration = require('./WorkflowIntegration.node');
    } else {
        WorkflowIntegration = require('WorkflowIntegration.node');
    }
} catch (err) {
    console.error("Failed to load WorkflowIntegration.node:", err);
}

const PLUGIN_ID = 'com.flowstudio.resolve';
let resolveObj = null;

// Initialize Resolve
async function initResolve() {
    if (!WorkflowIntegration) {
        console.error("WorkflowIntegration module is not loaded.");
        return null;
    }
    try {
        const isSuccess = await WorkflowIntegration.Initialize(PLUGIN_ID);
        if (!isSuccess) {
            console.error('Failed to initialize Resolve interface!');
            return null;
        }
        resolveObj = await WorkflowIntegration.GetResolve();
        return resolveObj;
    } catch (err) {
        console.error('Error during Resolve initialization:', err);
        return null;
    }
}

// Clean up
async function cleanupResolve() {
    if (WorkflowIntegration) {
        try {
            WorkflowIntegration.CleanUp();
        } catch (err) {
            console.error('Failed to cleanup Resolve:', err);
        }
    }
    resolveObj = null;
}

// Configuration paths
const configDir = path.join(__dirname, 'Config');
const settingsPath = path.join(configDir, 'settings.json');
const presetsPath = path.join(configDir, 'custom_presets.json');
const segmentsPath = path.join(configDir, 'selected_segments.json');

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

function getSettingsInternal() {
    if (fs.existsSync(settingsPath)) {
        try {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
            console.error("Error reading settings.json:", e);
        }
    }
    return { pythonPath: 'python' }; // default
}

function saveSettingsInternal(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        return { status: 'success', message: 'Settings saved successfully' };
    } catch (e) {
        console.error("Error saving settings.json:", e);
        return { status: 'error', message: `Failed to save settings: ${e.message}` };
    }
}

function getCustomPresetsInternal() {
    if (fs.existsSync(presetsPath)) {
        try {
            return JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
        } catch (e) {
            console.error("Error reading custom_presets.json:", e);
        }
    }
    return []; // default empty list
}

function saveCustomPresetsInternal(presets) {
    try {
        fs.writeFileSync(presetsPath, JSON.stringify(presets, null, 2), 'utf8');
        return { status: 'success', message: 'Presets saved successfully' };
    } catch (e) {
        console.error("Error saving custom_presets.json:", e);
        return { status: 'error', message: `Failed to save presets: ${e.message}` };
    }
}

// Execute python script
function runPythonScript(action, extraArgs = []) {
    return new Promise((resolve) => {
        const settings = getSettingsInternal();
        const pythonPath = settings.pythonPath || 'python';
        const scriptPath = path.join(__dirname, 'Scripts', 'flow_studio.py');
        
        // Escape paths for powershell/shell safety
        let command = `"${pythonPath}" "${scriptPath}" --action ${action}`;
        for (const arg of extraArgs) {
            command += ` ${arg}`;
        }
        
        console.log("Executing command:", command);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec error: ${error}`);
                console.error(`Stderr: ${stderr}`);
                resolve({ status: 'error', message: `Execution failed: ${stderr || error.message}` });
                return;
            }
            
            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (parseError) {
                console.error("Failed to parse stdout as JSON. Raw output:", stdout);
                resolve({ 
                    status: 'error', 
                    message: stdout.trim() || `Execution succeeded but returned invalid JSON. Stderr: ${stderr}` 
                });
            }
        });
    });
}

// Register IPC handlers
function registerIPCHandlers() {
    // Keyframe tools
    ipcMain.handle('flow:pollStatus', async () => {
        return await runPythonScript('poll_status');
    });

    ipcMain.handle('flow:quickAnimate', async (event, type, v1, v2, duration, presetName, bezierParams) => {
        const args = [];
        if (type) {
            args.push(`--anim_type "${type}"`);
        }
        if (v1 !== undefined && v1 !== null) {
            args.push(`--v1 ${v1}`);
        }
        if (v2 !== undefined && v2 !== null) {
            args.push(`--v2 ${v2}`);
        }
        if (duration !== undefined && duration !== null && duration > 0) {
            args.push(`--duration ${duration}`);
        }
        if (presetName) {
            args.push(`--preset "${presetName}"`);
        }
        if (bezierParams) {
            args.push(`--bezier "${bezierParams}"`);
        }
        return await runPythonScript('quick_animate', args);
    });

    ipcMain.handle('flow:getKeyframeSegments', async () => {
        return await runPythonScript('get_segments');
    });

    ipcMain.handle('flow:applyPreset', async (event, presetName, bezierParams, segments) => {
        const args = [];
        if (presetName) {
            args.push(`--preset "${presetName}"`);
        }
        if (bezierParams) {
            args.push(`--bezier "${bezierParams}"`);
        }
        if (segments) {
            try {
                fs.writeFileSync(segmentsPath, segments, 'utf8');
                args.push(`--segments "${segmentsPath}"`);
            } catch (err) {
                console.error("Error writing selected segments file:", err);
            }
        }
        return await runPythonScript('apply_preset', args);
    });

    ipcMain.handle('flow:copyAnimation', async () => {
        return await runPythonScript('copy');
    });

    ipcMain.handle('flow:pasteAnimation', async (event, segments) => {
        const args = [];
        if (segments) {
            try {
                fs.writeFileSync(segmentsPath, segments, 'utf8');
                args.push(`--segments "${segmentsPath}"`);
            } catch (err) {
                console.error("Error writing selected segments file:", err);
            }
        }
        return await runPythonScript('paste', args);
    });

    ipcMain.handle('flow:reverseAnimation', async (event, segments) => {
        const args = [];
        if (segments) {
            try {
                fs.writeFileSync(segmentsPath, segments, 'utf8');
                args.push(`--segments "${segmentsPath}"`);
            } catch (err) {
                console.error("Error writing selected segments file:", err);
            }
        }
        return await runPythonScript('reverse', args);
    });

    ipcMain.handle('flow:mirrorAnimation', async (event, segments) => {
        const args = [];
        if (segments) {
            try {
                fs.writeFileSync(segmentsPath, segments, 'utf8');
                args.push(`--segments "${segmentsPath}"`);
            } catch (err) {
                console.error("Error writing selected segments file:", err);
            }
        }
        return await runPythonScript('mirror', args);
    });

    ipcMain.handle('flow:resetAnimation', async (event, segments) => {
        const args = [];
        if (segments) {
            try {
                fs.writeFileSync(segmentsPath, segments, 'utf8');
                args.push(`--segments "${segmentsPath}"`);
            } catch (err) {
                console.error("Error writing selected segments file:", err);
            }
        }
        return await runPythonScript('reset', args);
    });

    // Custom Presets
    ipcMain.handle('flow:getCustomPresets', async () => {
        return getCustomPresetsInternal();
    });

    ipcMain.handle('flow:saveCustomPreset', async (event, name, bezierParams) => {
        const presets = getCustomPresetsInternal();
        const index = presets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        const newPreset = { name, bezier: bezierParams };
        if (index > -1) {
            presets[index] = newPreset;
        } else {
            presets.push(newPreset);
        }
        return saveCustomPresetsInternal(presets);
    });

    ipcMain.handle('flow:deleteCustomPreset', async (event, name) => {
        const presets = getCustomPresetsInternal();
        const filtered = presets.filter(p => p.name.toLowerCase() !== name.toLowerCase());
        return saveCustomPresetsInternal(filtered);
    });

    // Settings
    ipcMain.handle('flow:getSettings', async () => {
        return getSettingsInternal();
    });

    ipcMain.handle('flow:saveSettings', async (event, settings) => {
        return saveSettingsInternal(settings);
    });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 380,
        height: 680,
        minWidth: 320,
        minHeight: 500,
        useContentSize: true,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Remove window menu for clean professional panel look
    mainWindow.setMenu(null);

    mainWindow.loadFile(path.join(__dirname, 'UI', 'index.html'));

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    await initResolve();
    registerIPCHandlers();
    createWindow();
});

app.on('window-all-closed', async () => {
    await cleanupResolve();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
