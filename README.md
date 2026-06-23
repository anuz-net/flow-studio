# Flow Studio for DaVinci Resolve

**Flow Studio** is a minimal DaVinci Resolve Workflow Integration plugin designed for video editors. Flow Studio brings smooth easing curve adjustments, visual spline editing, and instant keyframe management directly inside the DaVinci Resolve Fusion and Edit pages.

---

## Features

- **Visual Easing Curve Editor**: Click-and-drag interactive Bezier curves with overshoot/elastic capabilities, a speed graph preview, and real-time timing animations.
- **Built-In Preset Library**: Instant easing options categorized under **Smooth** (In, Out, In-Out), **Motion** (Ease Back, Overshoot, Bounce, Elastic), and **Cinematic** (Slow Reveal, Soft Zoom, Dramatic).
- **Targeted Segment Selection**: An active keyframe checklist allows you to apply curves, reverse, mirror, paste, or reset animations **only on selected keyframe segments**. Use the master **Apply to All** toggle to ease all parameters at once.
- **Edit & Fusion Page Support**: Work seamlessly inside the Fusion Page (on selected node keyframes) or directly from the Edit Page timeline (targeted at the clip under the playhead).
- **Custom Presets**: Save custom Bezier curves directly to your library with custom names for easy reuse.
- **Keyframe Utility Tools**:
  - **Copy / Paste**: Copy keyframes from one segment/node and apply them to other segments.
  - **Reverse**: Flip curves horizontally to reverse animation direction.
  - **Mirror**: Mirror curves vertically (upside down) to invert animation values.
  - **Reset**: Remove custom handle tangents, returning keyframes to linear interpolation.

---

## Installation & Setup
0. **Make Sure Python is Installed**

1. **Copy to Plugins Directory**:
   Copy the `FlowStudio` folder into DaVinci Resolve's Workflow Integration folder:
   - **Windows**: ```%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\```
     *(Equivalent to ```C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\```)*
     Make a Folder name 'WorkFlow Integration Pluigns' if no such Folder
   - **macOS**: ```/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/```
   

2. **Enable External Scripting in Resolve**:
   - Open DaVinci Resolve.
   - Open **Preferences > System > General**.
   - Set **External scripting Using** to **Local** or **Network**.
   - Click **Save**.

3. **Verify Python 3**:
   - Flow Studio requires a local Python 3 installation.
   - If Python is not on your system's default environment path, open the **Settings** tab inside Flow Studio and provide the absolute path to your Python executable (e.g., `C:\Users\<username>\AppData\Local\Programs\Python\Python310\python.exe`).

4. **Launch the Panel**:
   - Restart DaVinci Resolve.
   - Open any project and go to the **Fusion** page.
   - In the top menu, select **Workspace > Workflow Integrations > Flow Studio**.

---

## Edit Page Workflow Requirements

Since DaVinci Resolve's Python API does not expose keyframes for standard Edit Page Inspector controls (like standard clip Zoom or Position keyframes), Flow Studio utilizes Resolve's Fusion engine to modify keyframes. 

To use Flow Studio on the Edit Page:
1. Ensure your timeline clip has a **Fusion Composition** associated with it. You can do this in two simple ways:
   - **Method A (Recommended)**: Right-click the clip on the timeline and choose **New Fusion Clip**.
   - **Method B**: Drag any Fusion Effect (like a *Transform* effect) from the Effects Library directly onto your timeline clip.
2. Place the playhead directly over the clip.
3. Open Flow Studio and click **Sync Node** to load all animated parameters.
4. Check the desired keyframe segments in the list and click any preset or apply a custom curve!

---
## Screenshots 
[/Screenshots/cruve.png](https://github.com/user-attachments/assets/a777f07b-835d-4353-8f1f-f4177db0b924)
"https://github.com/user-attachments/assets/92ec77f7-98de-40fc-8b07-550eb8f4f03d"
--
## Keyboard Shortcuts

The following shortcuts are active when the Flow Studio panel is focused:

- **Apply Curve**: `Ctrl + Enter`
- **Copy Animation**: `Ctrl + C`
- **Paste Animation**: `Ctrl + V`
- **Reset Curve**: `R`

---

## File Structure

```
FlowStudio/
 ├── manifest.xml           # Resolve plugin registration manifest
 ├── package.json           # Node.js module definition
 ├── main.js                # Electron main process (auto-copies WorkflowIntegration.node)
 ├── preload.js             # Electron bridge API
 ├── UI/
 │    ├── index.html        # HTML Layout
 │    ├── styles.css        # Strict Black & White styling
 │    └── app.js            # Frontend logic & Bezier math
 ├── Scripts/
 │    └── flow_studio.py    # Python CLI calling Resolve API
 ├── Config/
 │    ├── settings.json     # Saved user settings
 │    └── custom_presets.json # Saved custom easing curves
 └── README.md              # Documentation
```

---

*Made by **anuz** — Free Forever. For the community.*
