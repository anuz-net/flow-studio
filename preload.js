const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('flowStudioAPI', {
    pollStatus: () => ipcRenderer.invoke('flow:pollStatus'),
    quickAnimate: (type, v1, v2, duration, presetName, bezierParams) => ipcRenderer.invoke('flow:quickAnimate', type, v1, v2, duration, presetName, bezierParams),
    applyPreset: (presetName, bezierParams, segments) => ipcRenderer.invoke('flow:applyPreset', presetName, bezierParams, segments),
    copyAnimation: () => ipcRenderer.invoke('flow:copyAnimation'),
    pasteAnimation: (segments) => ipcRenderer.invoke('flow:pasteAnimation', segments),
    reverseAnimation: (segments) => ipcRenderer.invoke('flow:reverseAnimation', segments),
    mirrorAnimation: (segments) => ipcRenderer.invoke('flow:mirrorAnimation', segments),
    resetAnimation: (segments) => ipcRenderer.invoke('flow:resetAnimation', segments),
    getKeyframeSegments: () => ipcRenderer.invoke('flow:getKeyframeSegments'),
    
    // Custom Presets Management
    getCustomPresets: () => ipcRenderer.invoke('flow:getCustomPresets'),
    saveCustomPreset: (name, bezierParams) => ipcRenderer.invoke('flow:saveCustomPreset', name, bezierParams),
    deleteCustomPreset: (name) => ipcRenderer.invoke('flow:deleteCustomPreset', name),
    
    // Settings Management
    getSettings: () => ipcRenderer.invoke('flow:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('flow:saveSettings', settings)
})
