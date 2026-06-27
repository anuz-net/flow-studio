# Flow Studio for DaVinci Resolve

**Flow Studio** is a minimal DaVinci Resolve Workflow Integration plugin designed for video editors. Flow Studio brings smooth easing curve adjustments, visual spline editing, and instant keyframe management directly inside the DaVinci Resolve Fusion and Edit pages.

---

## Installation & Setup

Download : [FlowStudiov0.1.1.zip ](https://github.com/user-attachments/files/29409419/FlowStudiov0.1.1.zip)


0. **Make Sure Python is Installed** <br> https://www.python.org/downloads/

1. **Copy to Plugins Directory**:
   Copy the `FlowStudio` folder into DaVinci Resolve's Workflow Integration folder:
   - **Windows**: `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`
     *(Equivalent to `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`)* <br>
     *If the `Workflow Integration Plugins` folder doesn't exist, create it manually.* <br><br>
   - **macOS**: `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/` <br>
       *If the `Workflow Integration Plugins` folder doesn't exist, create it manually.* <br><br>
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
   - Go to the top menu and select **Workspace > Workflow Integrations > Flow Studio**.
---


## Edit Page Workflow Requirements

Since DaVinci Resolve's Python API does not expose keyframes for standard Edit Page Inspector controls (like standard clip Zoom or Position keyframes), Flow Studio utilizes Resolve's Fusion engine under the hood.
To animate a clip on the Edit Page, you have two options:
### Option A: Using Quick Animations (Recommended)
1. Place the playhead over any clip on your timeline.
2. In Flow Studio, navigate to the **Quick Animations** section.
3. Configure your custom values:
   - **Zoom**: Set Start scale (e.g., `1.0`) and End scale (e.g., `1.30`).
   - **Position**: Set Start position X (e.g., `0.5`) and End position X (e.g., `0.70`).
   - **Rotation**: Set Start angle (e.g., `0`) and End angle (e.g., `15`).
   - Configure **Duration** in seconds (e.g., `1.0s`).
4. Click **+ Animate**. Flow Studio will initialize the composition, insert the node, add the keyframes, and ease the movement instantly!
### Option B: Animating Custom Fusion Effects
1. Add a Fusion Effect (such as *Transform*) from the Effects Library onto your timeline clip, or right-click the clip and select **New Fusion Clip**.
2. Add keyframes to any parameter inside the inspector (e.g., the Transform effect's size or position).
3. Flow Studio will automatically detect the clip and list the animated parameters in the checklist.
4. Select the segments in the checklist and click any preset card to apply easing.
---
## Screenshots 
<img width="418" height="804" alt="v0 1 1" src="https://github.com/user-attachments/assets/d4385a32-59d6-4f33-8811-a07232e8f8ad" />
<img width="497" height="720" alt="presets" src="https://github.com/user-attachments/assets/e3df9381-5ee2-475e-a20f-439d347df36c" />
<img width="499" height="717" alt="curve" src="https://github.com/user-attachments/assets/aff0c5b4-932a-42da-8311-a51261852f9f" />

--
## Features

- **Visual Easing Curve Editor**: Click-and-drag interactive Bezier curves with overshoot/elastic capabilities, a speed graph preview, and real-time timing animations.
- **Built-In Preset Library**: Instant easing options categorized under **Smooth** (In, Out, In-Out), **Motion** (Ease Back, Overshoot, Bounce, Elastic), and **Cinematic** (Slow Reveal, Soft Zoom, Dramatic).
- **Edit Page Quick Animations**: One-click creation of **Zoom**, **Position**, and **Rotation** animations directly from the Edit page. Flow Studio automatically handles the creation of a Fusion composition, inserts a standard `Transform1` node, keyframes it, and applies your easing preset in one step.
- **Absolute Easing Flexibility**: Specify custom **Start** and **End** values for your Quick Animations (e.g., Zoom Scale `1.0` to `1.25`, or Rotation `0` to `45` degrees) directly from the textboxes.
- **Custom Animation Duration (Seconds)**: Set animations to run for a specific duration in seconds (e.g., `1.0s`, `0.5s`). Flow Studio automatically calculates frame ranges based on your active timeline frame rate (FPS).
- **Deep Modifier Crawling**: Features a recursive modifier scanning engine that crawls sub-modifiers (such as `XYPath` coordinates on Point data, like `Center`). Keyframes on point variables now map and ease perfectly.
- **Targeted Segment Selection**: An active keyframe checklist allows you to apply curves, reverse, mirror, paste, or reset animations **only on selected keyframe segments**.
- **Custom Presets**: Save custom Bezier curves directly to your library with custom names for easy reuse.
- **Keyframe Utility Tools**:
  - **Copy / Paste**: Copy keyframes from one segment/node and apply them to other segments.
  - **Reverse**: Flip curves horizontally to reverse animation direction.
  - **Mirror**: Mirror curves vertically (upside down) to invert animation values.
  - **Reset**: Remove custom handle tangents, returning keyframes to linear interpolation.

---

## Installation & Setup

1. **Copy to Plugins Directory**:
   Copy the `FlowStudio` folder into DaVinci Resolve's Workflow Integration folder:
   - **Windows**: `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`
     *(Equivalent to `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`)* <br>
     *If the `Workflow Integration Plugins` folder doesn't exist, create it manually.*
   - **macOS**: `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/`

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
   - Go to the top menu and select **Workspace > Workflow Integrations > Flow Studio**.

---

## Edit Page Workflow

Since DaVinci Resolve's Python API does not expose keyframes for standard Edit Page Inspector controls (like standard clip Zoom or Position keyframes), Flow Studio utilizes Resolve's Fusion engine under the hood.

To animate a clip on the Edit Page, you have two options:

### Option A: Using Quick Animations (Recommended)
1. Place the playhead over any clip on your timeline.
2. In Flow Studio, navigate to the **Quick Animations** section.
3. Configure your custom values:
   - **Zoom**: Set Start scale (e.g., `1.0`) and End scale (e.g., `1.30`).
   - **Position**: Set Start position X (e.g., `0.5`) and End position X (e.g., `0.70`).
   - **Rotation**: Set Start angle (e.g., `0`) and End angle (e.g., `15`).
   - Configure **Duration** in seconds (e.g., `1.0s`).
4. Click **+ Animate**. Flow Studio will initialize the composition, insert the node, add the keyframes, and ease the movement instantly!

### Option B: Animating Custom Fusion Effects
1. Add a Fusion Effect (such as *Transform*) from the Effects Library onto your timeline clip, or right-click the clip and select **New Fusion Clip**.
2. Add keyframes to any parameter inside the inspector (e.g., the Transform effect's size or position).
3. Flow Studio will automatically detect the clip and list the animated parameters in the checklist.
4. Select the segments in the checklist and click any preset card to apply easing.

---

## Screenshots

<img width="497" height="720" alt="presets" src="https://github.com/user-attachments/assets/e3df9381-5ee2-475e-a20f-439d347df36c" />
<img width="499" height="717" alt="curve" src="https://github.com/user-attachments/assets/aff0c5b4-932a-42da-8311-a51261852f9f" />

---

## Keyboard Shortcuts

The following shortcuts are active when the Flow Studio panel is focused:

- **Apply Curve**: `Ctrl + Enter`
- **Copy Easing**: `Ctrl + C`
- **Paste Easing**: `Ctrl + V`
- **Reset Curve**: `R`

---

## File Structure

```
FlowStudio/
 ├── manifest.xml           # Resolve plugin registration manifest
 ├── package.json           # Node.js module definition
 ├── main.js                # Electron main process
 ├── preload.js             # Electron bridge API
 ├── UI/
 │    ├── index.html        # HTML Layout
 │    ├── styles.css        # Premium styling
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
