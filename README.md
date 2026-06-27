

# Flow Studio for DaVinci Resolve

**Flow Studio** is a minimal DaVinci Resolve Workflow Integration plugin designed for video editors. Flow Studio brings smooth easing curve adjustments, visual spline editing, and instant keyframe management directly inside the DaVinci Resolve Fusion and Edit pages.

---

## Installation & Setup

Download : [FlowStudiov0.1.1.zip ](https://github.com/user-attachments/files/29409419/FlowStudiov0.1.1.zip)


0. **Make Sure Python is Installed**

1. **Copy to Plugins Directory**:
   Copy the `FlowStudio` folder into DaVinci Resolve's Workflow Integration folder:
   - **Windows**: `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`
     *(Equivalent to `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`)* <br><br>
     *If the `Workflow Integration Plugins` folder doesn't exist, create it manually.* <br>
   - **macOS**: `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/` <br><br>
       *If the `Workflow Integration Plugins` folder doesn't exist, create it manually.* <br>
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
<img width="497" height="720" alt="presets" src="https://github.com/user-attachments/assets/e3df9381-5ee2-475e-a20f-439d347df36c" />
<img width="499" height="717" alt="curve" src="https://github.com/user-attachments/assets/aff0c5b4-932a-42da-8311-a51261852f9f" />

--
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
