import sys
import os
import json
import argparse

# Add Resolve module path
resolve_module_paths = [
    r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules",
    r"C:\Program Files\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/"
]

module_imported = False
for path in resolve_module_paths:
    if os.path.exists(path):
        sys.path.append(path)
        try:
            import DaVinciResolveScript as dvr_script
            module_imported = True
            break
        except ImportError:
            pass

if not module_imported:
    try:
        import DaVinciResolveScript as dvr_script
        module_imported = True
    except ImportError:
        pass

# Built-in presets mapping
PRESETS = {
    # Smooth
    "smooth_in": (0.42, 0.0, 1.0, 1.0),
    "smooth_out": (0.0, 0.0, 0.58, 1.0),
    "smooth_in_out": (0.42, 0.0, 0.58, 1.0),
    # Motion
    "ease_back": (0.6, -0.28, 0.735, 0.045),
    "overshoot": (0.34, 1.56, 0.64, 1.0),
    "bounce": (0.175, 0.885, 0.32, 1.275),
    "elastic": (0.5, -0.5, 0.5, 1.5),
    # Cinematic
    "slow_reveal": (0.15, 0.85, 0.35, 1.0),
    "soft_zoom": (0.25, 0.1, 0.25, 1.0),
    "dramatic_movement": (0.7, 0.0, 0.1, 1.0)
}

def get_clip_under_playhead(timeline, project):
    current_tc = timeline.GetCurrentTimecode()
    if not current_tc:
        return None
        
    # Get frame rate
    fps_str = timeline.GetSetting("timelineFrameRate")
    if not fps_str and project:
        fps_str = project.GetSetting("timelineFrameRate")
    if not fps_str:
        fps_str = "24"
        
    try:
        fps = float(fps_str)
    except:
        fps = 24.0
        
    # Convert playhead timecode to absolute frames
    parts = current_tc.replace(";", ":").split(":")
    if len(parts) != 4:
        return None
    h, m, s, f = map(int, parts)
    calc_fps = round(fps)
    playhead_frame = (h * 3600 * calc_fps) + (m * 60 * calc_fps) + (s * calc_fps) + f
    
    # Search all video tracks from highest track index down to 1
    track_count = timeline.GetTrackCount("video")
    for track_idx in range(track_count, 0, -1):
        items = timeline.GetItemListInTrack("video", track_idx)
        if not items:
            continue
            
        items_list = list(items.values()) if isinstance(items, dict) else list(items)
        for item in items_list:
            start = item.GetStart()
            end = item.GetEnd()
            if start <= playhead_frame < end:
                return item
                
    return None

def write_diagnostics(diag_info):
    try:
        config_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Config")
        os.makedirs(config_dir, exist_ok=True)
        diag_path = os.path.join(config_dir, "diagnostic_log.json")
        with open(diag_path, "w", encoding="utf-8") as f:
            json.dump(diag_info, f, indent=2)
    except:
        pass

def get_current_comp():
    if not module_imported:
        raise Exception("Could not import DaVinciResolveScript module. Make sure python scripting modules are installed.")
    
    resolve = dvr_script.scriptapp("Resolve")
    if not resolve:
        raise Exception("Could not connect to DaVinci Resolve. Please make sure DaVinci Resolve is running and External Scripting is enabled in Preferences.")
    
    diag_info = {}
    
    # Helper to dump tools
    def dump_tools_to_diag(comp_obj):
        try:
            tools_info = []
            tools = comp_obj.GetToolList(False)
            if tools:
                tools_list = list(tools.values()) if isinstance(tools, dict) else list(tools)
                for t in tools_list:
                    inputs_info = []
                    inputs = t.GetInputList()
                    input_list = list(inputs.values()) if isinstance(inputs, dict) else list(inputs)
                    for inp in input_list:
                        conn = inp.GetConnectedOutput()
                        if conn:
                            mod = conn.GetTool()
                            reg_id = mod.GetAttrs().get("TOOLS_RegID") if mod else "N/A"
                            inputs_info.append({
                                "name": inp.Name,
                                "id": inp.ID or getattr(inp, "ID", "N/A"),
                                "connected_to": mod.Name if mod else "N/A",
                                "modifier_reg_id": reg_id
                            })
                    tools_info.append({
                        "name": t.Name,
                        "id": t.ID,
                        "reg_id": t.GetAttrs().get("TOOLS_RegID") if hasattr(t, "GetAttrs") else "N/A",
                        "inputs": inputs_info
                    })
            diag_info["tools"] = tools_info
        except Exception as ex_t:
            diag_info["tools_error"] = str(ex_t)

    current_page = ""
    try:
        current_page = resolve.GetCurrentPage()
        diag_info["current_page"] = current_page
    except Exception as e:
        diag_info["current_page_error"] = str(e)
        
    # 1. Try Fusion page first ONLY if we are actually on the Fusion page
    if current_page.lower() == "fusion":
        try:
            fusion = resolve.Fusion()
            if fusion:
                comp = fusion.CurrentComp
                if comp:
                    diag_info["page"] = "Fusion"
                    comp_name = "N/A"
                    if hasattr(comp, "GetName") and callable(getattr(comp, "GetName", None)):
                        try:
                            comp_name = comp.GetName()
                        except:
                            pass
                    diag_info["comp_name"] = comp_name
                    dump_tools_to_diag(comp)
                    write_diagnostics(diag_info)
                    return comp
        except Exception as e:
            diag_info["fusion_page_error"] = str(e)
            
    # 2. Try Edit page timeline item playhead fallback
    try:
        pm = resolve.GetProjectManager()
        project = pm.GetCurrentProject()
        if project:
            timeline = project.GetCurrentTimeline()
            if timeline:
                diag_info["timeline_name"] = timeline.GetName()
                current_tc = timeline.GetCurrentTimecode()
                diag_info["current_tc"] = current_tc
                
                # Get frame rate
                fps_str = timeline.GetSetting("timelineFrameRate")
                if not fps_str and project:
                    fps_str = project.GetSetting("timelineFrameRate")
                diag_info["fps_str"] = fps_str
                
                fps = 24.0
                if fps_str:
                    try:
                        fps = float(fps_str)
                    except:
                        pass
                diag_info["fps"] = fps
                
                playhead_frame = None
                if current_tc:
                    parts = current_tc.replace(";", ":").split(":")
                    if len(parts) == 4:
                        h, m, s, f = map(int, parts)
                        calc_fps = round(fps)
                        playhead_frame = (h * 3600 * calc_fps) + (m * 60 * calc_fps) + (s * calc_fps) + f
                        diag_info["playhead_frame"] = playhead_frame
                
                clip = timeline.GetCurrentVideoItem()
                if clip:
                    diag_info["current_video_item"] = clip.GetName()
                else:
                    diag_info["current_video_item"] = "None"
                    
                # Track items log
                tracks_log = []
                track_count = timeline.GetTrackCount("video")
                diag_info["track_count"] = track_count
                
                found_clip = None
                for track_idx in range(track_count, 0, -1):
                    items = timeline.GetItemListInTrack("video", track_idx)
                    items_info = []
                    if items:
                        items_list = list(items.values()) if isinstance(items, dict) else list(items)
                        for item in items_list:
                            start = item.GetStart()
                            end = item.GetEnd()
                            items_info.append({
                                "name": item.GetName(),
                                "start": start,
                                "end": end
                            })
                            if playhead_frame is not None and start <= playhead_frame < end:
                                if not found_clip:
                                    found_clip = item
                    tracks_log.append({
                        "track_index": track_idx,
                        "items": items_info
                    })
                diag_info["tracks"] = tracks_log
                
                clip = clip or found_clip
                if clip:
                    diag_info["clip_name"] = clip.GetName()
                    diag_info["clip_type"] = clip.GetAttrs().get("Type") if hasattr(clip, "GetAttrs") else "N/A"
                    
                    try:
                        comp_count = clip.GetFusionCompCount()
                        diag_info["comp_count_before"] = comp_count
                        
                        if comp_count == 0:
                            # Try to programmatically add a Fusion composition to the timeline item
                            new_comp = clip.AddFusionComp()
                            if new_comp:
                                diag_info["added_comp"] = "Success"
                            else:
                                diag_info["added_comp"] = "Returned None"
                            comp_count = clip.GetFusionCompCount()
                            diag_info["comp_count_after"] = comp_count
                        else:
                            diag_info["comp_count_after"] = comp_count
                    except Exception as ex:
                        diag_info["comp_error"] = str(ex)
                        comp_count = 0
                    
                    if comp_count > 0:
                        comp = clip.GetFusionCompByIndex(1)
                        if comp:
                            diag_info["page"] = "Edit"
                            comp_name = "N/A"
                            if hasattr(comp, "GetName") and callable(getattr(comp, "GetName", None)):
                                try:
                                    comp_name = comp.GetName()
                                except:
                                    pass
                            diag_info["comp_name"] = comp_name
                            dump_tools_to_diag(comp)
                            write_diagnostics(diag_info)
                            return comp
                else:
                    diag_info["clip_under_playhead"] = "None found"
            else:
                diag_info["timeline"] = "None found"
        else:
            diag_info["project"] = "None found"
    except Exception as e:
        import traceback
        diag_info["error"] = str(e)
        diag_info["traceback"] = traceback.format_exc()
        
    write_diagnostics(diag_info)
    raise Exception("No active Fusion composition found. Please make sure you are on the Fusion page with an active clip, or on the Edit page with the playhead over a clip containing a Fusion composition.")


def find_animated_inputs_recursive(tool, parent_tool=None, input_path="", current_depth=0, max_depth=2):
    if current_depth > max_depth:
        return []
        
    found = []
    inputs = tool.GetInputList()
    input_list = list(inputs.values()) if isinstance(inputs, dict) else list(inputs)
    
    for inp in input_list:
        connected = inp.GetConnectedOutput()
        if connected:
            mod = connected.GetTool()
            if mod:
                reg_id = mod.GetAttrs().get("TOOLS_RegID")
                # Format unique path identifier and display name
                path_prefix = f"{tool.Name}.{inp.Name}" if not input_path else f"{input_path}->{inp.Name}"
                
                if reg_id == "BezierSpline":
                    display_name = f"{parent_tool.Name} ({inp.Name})" if parent_tool else f"{tool.Name} - {inp.Name}"
                    found.append((parent_tool or tool, inp, mod, path_prefix, display_name))
                else:
                    sub_found = find_animated_inputs_recursive(
                        mod, 
                        parent_tool=parent_tool or tool, 
                        input_path=path_prefix, 
                        current_depth=current_depth + 1, 
                        max_depth=max_depth
                    )
                    found.extend(sub_found)
                    
    return found

def get_animated_inputs(comp):
    selected_tools = comp.GetToolList(True)
    
    # Fallback to all tools if no tool is selected (e.g. on the Edit page)
    if not selected_tools or len(selected_tools) == 0:
        selected_tools = comp.GetToolList(False)
        
    if not selected_tools or len(selected_tools) == 0:
        raise Exception("No animated parameters found. Please make sure the clip has keyframed animations.")
        
    animated_inputs = []
    tools_list = list(selected_tools.values()) if isinstance(selected_tools, dict) else list(selected_tools)
    
    for tool in tools_list:
        animated_inputs.extend(find_animated_inputs_recursive(tool))
                    
    return animated_inputs

def get_input_id(inp):
    attrs = inp.GetAttrs()
    return attrs.get("INPI_ID") or inp.ID

def get_kf_value(kf_dict):
    for k in [1, 1.0]:
        if k in kf_dict:
            return kf_dict[k]
    for k, v in kf_dict.items():
        if isinstance(k, (int, float)) and abs(k - 1.0) < 0.01:
            return v
    return None

def set_handle_val(handle_dict, idx, val):
    handle_dict[int(idx)] = val
    handle_dict[float(idx)] = val

def make_bezier(kf):
    if "Flags" not in kf or not isinstance(kf["Flags"], dict):
        kf["Flags"] = {}
    flags_to_clear = ["Linear", "linear", "Step", "step", "StepIn", "stepin", "StepOut", "stepout"]
    for flag in flags_to_clear:
        if flag in kf["Flags"]:
            kf["Flags"][flag] = False
        for k in list(kf["Flags"].keys()):
            if isinstance(k, str) and k.lower() == flag.lower():
                kf["Flags"][k] = False
    kf["Flags"]["Linear"] = False
    kf["Flags"]["Bezier"] = True
    kf["Flags"]["Smooth"] = True

def is_segment_selected(tool_name, param_id, t1, t2, selected_segs):
    if selected_segs is None:
        return True
    for s in selected_segs:
        if (s.get("tool_name") == tool_name and 
            s.get("param_id") == param_id and 
            abs(s.get("start") - t1) < 0.01 and 
            abs(s.get("end") - t2) < 0.01):
            return True
    return False

def apply_easing_curve(modifier, x1, y1, x2, y2, tool_name=None, param_id=None, selected_segs=None):
    kfs = modifier.GetKeyFrames()
    if not kfs or len(kfs) < 2:
        return False
        
    sorted_times = sorted(list(kfs.keys()))
    applied = False
    
    for i in range(len(sorted_times) - 1):
        t1 = sorted_times[i]
        t2 = sorted_times[i+1]
        
        # Check segment selection
        if not is_segment_selected(tool_name, param_id, t1, t2, selected_segs):
            continue
            
        kf1 = kfs[t1]
        kf2 = kfs[t2]
        
        v1 = get_kf_value(kf1)
        v2 = get_kf_value(kf2)
        
        if v1 is None or v2 is None:
            continue
            
        dt = t2 - t1
        dv = v2 - v1
        
        if dt == 0:
            continue
            
        # Calculate relative offsets
        rh_time = x1 * dt
        rh_val = y1 * dv
        
        lh_time = (x2 - 1.0) * dt
        lh_val = (y2 - 1.0) * dv
        
        if "RH" not in kf1 or not isinstance(kf1["RH"], dict):
            kf1["RH"] = {}
        set_handle_val(kf1["RH"], 1, rh_time)
        set_handle_val(kf1["RH"], 2, rh_val)
        
        if "LH" not in kf2 or not isinstance(kf2["LH"], dict):
            kf2["LH"] = {}
        set_handle_val(kf2["LH"], 1, lh_time)
        set_handle_val(kf2["LH"], 2, lh_val)
        
        # Set interpolation mode flags to Bezier/Smooth
        make_bezier(kf1)
        make_bezier(kf2)
        
        kfs[t1] = kf1
        kfs[t2] = kf2
        applied = True
        
    if applied:
        modifier.SetKeyFrames(kfs)
    return applied

def action_get_segments(comp):
    animated_inputs = get_animated_inputs(comp)
    if not animated_inputs:
        return []
        
    result_segments = []
    for tool, inp, modifier, param_id, display_name in animated_inputs:
        kfs = modifier.GetKeyFrames()
        if not kfs or len(kfs) < 2:
            continue
            
        sorted_times = sorted(list(kfs.keys()))
        segments = []
        for i in range(len(sorted_times) - 1):
            t1 = sorted_times[i]
            t2 = sorted_times[i+1]
            segments.append({
                "start": t1,
                "end": t2
            })
            
        result_segments.append({
            "tool_name": tool.Name,
            "param_id": param_id,
            "param_name": display_name,
            "segments": segments
        })
        
    return result_segments

def action_copy(comp):
    animated_inputs = get_animated_inputs(comp)
    if not animated_inputs:
        raise Exception("No animated parameters found. Select a node with animated parameters to copy.")
        
    tool, inp, modifier, param_id, display_name = animated_inputs[0]
    kfs = modifier.GetKeyFrames()
    
    sorted_times = sorted(list(kfs.keys()))
    if len(sorted_times) < 2:
        raise Exception("At least two keyframes are required to copy easing curves.")
        
    # Save the normalized control points for each segment
    segments_data = []
    for i in range(len(sorted_times) - 1):
        t1 = sorted_times[i]
        t2 = sorted_times[i+1]
        dt = t2 - t1
        
        kf1 = kfs[t1]
        kf2 = kfs[t2]
        v1 = get_kf_value(kf1)
        v2 = get_kf_value(kf2)
        dv = v2 - v1
        
        if dt == 0:
            continue
            
        # Get RH of kf1
        rh = kf1.get("RH")
        x1, y1 = 0.0, 0.0
        if rh and isinstance(rh, dict):
            rh_x = rh.get(1) or rh.get(1.0)
            rh_y = rh.get(2) or rh.get(2.0)
            if rh_x is not None and rh_y is not None:
                x1 = rh_x / dt
                if dv != 0:
                    y1 = rh_y / dv
                
        # Get LH of kf2
        lh = kf2.get("LH")
        x2, y2 = 1.0, 1.0
        if lh and isinstance(lh, dict):
            lh_x = lh.get(1) or lh.get(1.0)
            lh_y = lh.get(2) or lh.get(2.0)
            if lh_x is not None and lh_y is not None:
                # Since lh_x is negative relative offset, we add lh_x / dt to 1.0
                x2 = 1.0 + lh_x / dt
                if dv != 0:
                    y2 = 1.0 + lh_y / dv
                
        segments_data.append({
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2
        })
        
    clipboard_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Config", "clipboard.json")
    os.makedirs(os.path.dirname(clipboard_path), exist_ok=True)
    with open(clipboard_path, "w", encoding="utf-8") as f:
        json.dump(segments_data, f, indent=2)
        
    return f"Copied easing curves from '{display_name}'."

def action_paste(comp, selected_segs=None):
    clipboard_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Config", "clipboard.json")
    if not os.path.exists(clipboard_path):
        raise Exception("No keyframes found in clipboard. Copy an animation first.")
        
    with open(clipboard_path, "r", encoding="utf-8") as f:
        segments_data = json.load(f)
        
    animated_inputs = get_animated_inputs(comp)
    if not animated_inputs:
        raise Exception("No animated parameters found on target node. Enable keyframing on a parameter first.")
        
    pasted_count = 0
    for tool, inp, modifier, param_id, display_name in animated_inputs:
        kfs = modifier.GetKeyFrames()
        if not kfs or len(kfs) < 2:
            continue
            
        sorted_times = sorted(list(kfs.keys()))
        new_kfs = {}
        for t in sorted_times:
            new_kfs[t] = {}
            set_handle_val(new_kfs[t], 1, get_kf_value(kfs[t]))
            if "Flags" in kfs[t]:
                new_kfs[t]["Flags"] = dict(kfs[t]["Flags"])
                
        applied = False
        for i in range(len(sorted_times) - 1):
            t1 = sorted_times[i]
            t2 = sorted_times[i+1]
            dt = t2 - t1
            
            v1 = new_kfs[t1][1]
            v2 = new_kfs[t2][1]
            dv = v2 - v1
            
            if dt == 0:
                continue
                
            # Filter selection
            if not is_segment_selected(tool.Name, param_id, t1, t2, selected_segs):
                # Copy original handles if we skip pasting
                orig_kf1 = kfs[t1]
                orig_kf2 = kfs[t2]
                if "RH" in orig_kf1:
                    new_kfs[t1]["RH"] = dict(orig_kf1["RH"])
                if "LH" in orig_kf2:
                    new_kfs[t2]["LH"] = dict(orig_kf2["LH"])
                continue
                
            seg = segments_data[i] if i < len(segments_data) else segments_data[0]
            
            x1, y1 = seg["x1"], seg["y1"]
            x2, y2 = seg["x2"], seg["y2"]
            
            rh_time = x1 * dt
            rh_val = y1 * dv
            lh_time = (x2 - 1.0) * dt
            lh_val = (y2 - 1.0) * dv
            
            if "RH" not in new_kfs[t1]:
                new_kfs[t1]["RH"] = {}
            set_handle_val(new_kfs[t1]["RH"], 1, rh_time)
            set_handle_val(new_kfs[t1]["RH"], 2, rh_val)
            
            if "LH" not in new_kfs[t2]:
                new_kfs[t2]["LH"] = {}
            set_handle_val(new_kfs[t2]["LH"], 1, lh_time)
            set_handle_val(new_kfs[t2]["LH"], 2, lh_val)
            
            make_bezier(new_kfs[t1])
            make_bezier(new_kfs[t2])
            applied = True
            
        if applied:
            modifier.SetKeyFrames(new_kfs)
            pasted_count += 1
        
    return f"Pasted keyframes to {pasted_count} parameter(s) on selected node(s)."

def action_reverse(comp, selected_segs=None):
    animated_inputs = get_animated_inputs(comp)
    if not animated_inputs:
        raise Exception("No animated parameters found. Select a node with animated parameters to reverse.")
        
    reversed_count = 0
    for tool, inp, modifier, param_id, display_name in animated_inputs:
        kfs = modifier.GetKeyFrames()
        if not kfs or len(kfs) < 2:
            continue
            
        sorted_times = sorted(list(kfs.keys()))
        n = len(sorted_times)
        
        orig_data = []
        for t in sorted_times:
            kf = kfs[t]
            val = get_kf_value(kf)
            lh = kf.get("LH")
            rh = kf.get("RH")
            lh_x = lh.get(1) or lh.get(1.0) if lh else None
            lh_y = lh.get(2) or lh.get(2.0) if lh else None
            rh_x = rh.get(1) or rh.get(1.0) if rh else None
            rh_y = rh.get(2) or rh.get(2.0) if rh else None
            orig_data.append({
                "time": t,
                "value": val,
                "lh": (lh_x, lh_y) if lh_x is not None else None,
                "rh": (rh_x, rh_y) if rh_x is not None else None,
                "orig_kf": kf
            })
            
        new_kfs = {}
        for i in range(n):
            t = sorted_times[i]
            val = orig_data[n - 1 - i]["value"]
            new_kfs[t] = {}
            set_handle_val(new_kfs[t], 1, val)
            make_bezier(new_kfs[t])
            if "Flags" in orig_data[n - 1 - i]["orig_kf"]:
                new_kfs[t]["Flags"] = dict(orig_data[n - 1 - i]["orig_kf"]["Flags"])
            
        applied = False
        for i in range(n - 1):
            t1 = sorted_times[i]
            t2 = sorted_times[i+1]
            dt = t2 - t1
            
            # Original segment was between orig_end (index n-2-i) and orig_start (index n-1-i)
            orig_start = orig_data[n - 1 - i]
            orig_end = orig_data[n - 2 - i]
            
            t1_orig = orig_start["time"]
            t2_orig = orig_end["time"]
            
            # Check selection
            if not is_segment_selected(tool.Name, param_id, t1, t2, selected_segs):
                # If not selected, keep original values and handles
                # (reverting values back and copying original handles)
                new_kfs[t1][1] = orig_data[i]["value"]
                new_kfs[t2][1] = orig_data[i+1]["value"]
                orig_kf1 = orig_data[i]["orig_kf"]
                orig_kf2 = orig_data[i+1]["orig_kf"]
                if "RH" in orig_kf1:
                    new_kfs[t1]["RH"] = dict(orig_kf1["RH"])
                if "LH" in orig_kf2:
                    new_kfs[t2]["LH"] = dict(orig_kf2["LH"])
                continue
                
            v1 = new_kfs[t1][1]
            v2 = new_kfs[t2][1]
            dv = v2 - v1
            
            v1_orig = orig_start["value"]
            v2_orig = orig_end["value"]
            dt_orig = t1_orig - t2_orig
            dv_orig = v1_orig - v2_orig
            
            x1, y1 = 0.0, 0.0
            orig_end_rh = orig_end["rh"]
            if orig_end_rh and dt_orig != 0:
                x1 = orig_end_rh[0] / dt_orig
                if dv_orig != 0:
                    y1 = orig_end_rh[1] / dv_orig
                
            x2, y2 = 1.0, 1.0
            orig_start_lh = orig_start["lh"]
            if orig_start_lh and dt_orig != 0:
                x2 = 1.0 + orig_start_lh[0] / dt_orig
                if dv_orig != 0:
                    y2 = 1.0 + orig_start_lh[1] / dv_orig
                    
            x1_new = 1.0 - x2
            y1_new = 1.0 - y2
            x2_new = 1.0 - x1
            y2_new = 1.0 - y1
            
            if dt != 0:
                rh_time = x1_new * dt
                rh_val = y1_new * dv
                if "RH" not in new_kfs[t1]:
                    new_kfs[t1]["RH"] = {}
                set_handle_val(new_kfs[t1]["RH"], 1, rh_time)
                set_handle_val(new_kfs[t1]["RH"], 2, rh_val)
                
                lh_time = (x2_new - 1.0) * dt
                lh_val = (y2_new - 1.0) * dv
                if "LH" not in new_kfs[t2]:
                    new_kfs[t2]["LH"] = {}
                set_handle_val(new_kfs[t2]["LH"], 1, lh_time)
                set_handle_val(new_kfs[t2]["LH"], 2, lh_val)
                
                make_bezier(new_kfs[t1])
                make_bezier(new_kfs[t2])
                applied = True
                
        if applied:
            modifier.SetKeyFrames(new_kfs)
            reversed_count += 1
        
    return f"Reversed curve direction on {reversed_count} animated parameter(s)."

def action_mirror(comp, selected_segs=None):
    animated_inputs = get_animated_inputs(comp)
    if not animated_inputs:
        raise Exception("No animated parameters found. Select a node with animated parameters to mirror.")
        
    mirrored_count = 0
    for tool, inp, modifier, param_id, display_name in animated_inputs:
        kfs = modifier.GetKeyFrames()
        if not kfs or len(kfs) < 2:
            continue
            
        vals = []
        for t, kf in kfs.items():
            val = get_kf_value(kf)
            if val is not None:
                vals.append(val)
            lh = kf.get("LH")
            if lh:
                lh_y = lh.get(2) or lh.get(2.0)
                if lh_y is not None:
                    vals.append(val + lh_y)
            rh = kf.get("RH")
            if rh:
                rh_y = rh.get(2) or rh.get(2.0)
                if rh_y is not None:
                    vals.append(val + rh_y)
                    
        if not vals:
            continue
            
        min_v = min(vals)
        max_v = max(vals)
        mid = (min_v + max_v) / 2.0
        
        new_kfs = {}
        sorted_times = sorted(list(kfs.keys()))
        for t in sorted_times:
            new_kfs[t] = {}
            set_handle_val(new_kfs[t], 1, get_kf_value(kfs[t]))
            # Copy flags & handles
            if "Flags" in kfs[t]:
                new_kfs[t]["Flags"] = dict(kfs[t]["Flags"])
            if "LH" in kfs[t]:
                new_kfs[t]["LH"] = dict(kfs[t]["LH"])
            if "RH" in kfs[t]:
                new_kfs[t]["RH"] = dict(kfs[t]["RH"])
                
        applied = False
        for i in range(len(sorted_times) - 1):
            t1 = sorted_times[i]
            t2 = sorted_times[i+1]
            
            # Check selection
            if not is_segment_selected(tool.Name, param_id, t1, t2, selected_segs):
                continue
                
            # Mirror values
            val1 = get_kf_value(kfs[t1])
            new_kfs[t1][1] = 2.0 * mid - val1
            
            val2 = get_kf_value(kfs[t2])
            new_kfs[t2][1] = 2.0 * mid - val2
            
            lh = kfs[t2].get("LH")
            if lh:
                lh_y = lh.get(2) or lh.get(2.0)
                set_handle_val(new_kfs[t2]["LH"], 2, -lh_y)
                
            rh = kfs[t1].get("RH")
            if rh:
                rh_y = rh.get(2) or rh.get(2.0)
                set_handle_val(new_kfs[t1]["RH"], 2, -rh_y)
                
            make_bezier(new_kfs[t1])
            make_bezier(new_kfs[t2])
            applied = True
            
        if applied:
            modifier.SetKeyFrames(new_kfs)
            mirrored_count += 1
        
    return f"Mirrored curve vertically on {mirrored_count} animated parameter(s)."

def action_reset(comp, selected_segs=None):
    animated_inputs = get_animated_inputs(comp)
    if not animated_inputs:
        raise Exception("No animated parameters found. Select a node with animated parameters to reset.")
        
    reset_count = 0
    for tool, inp, modifier, param_id, display_name in animated_inputs:
        kfs = modifier.GetKeyFrames()
        if not kfs:
            continue
            
        sorted_times = sorted(list(kfs.keys()))
        new_kfs = {}
        for t in sorted_times:
            new_kfs[t] = {}
            set_handle_val(new_kfs[t], 1, get_kf_value(kfs[t]))
            # Copy flags & handles
            if "Flags" in kfs[t]:
                new_kfs[t]["Flags"] = dict(kfs[t]["Flags"])
            if "LH" in kfs[t]:
                new_kfs[t]["LH"] = dict(kfs[t]["LH"])
            if "RH" in kfs[t]:
                new_kfs[t]["RH"] = dict(kfs[t]["RH"])
                
        applied = False
        for i in range(len(sorted_times) - 1):
            t1 = sorted_times[i]
            t2 = sorted_times[i+1]
            
            # Check selection
            if not is_segment_selected(tool.Name, param_id, t1, t2, selected_segs):
                continue
                
            new_kfs[t1]["RH"] = {}
            set_handle_val(new_kfs[t1]["RH"], 1, 0.0)
            set_handle_val(new_kfs[t1]["RH"], 2, 0.0)
            
            new_kfs[t2]["LH"] = {}
            set_handle_val(new_kfs[t2]["LH"], 1, 0.0)
            set_handle_val(new_kfs[t2]["LH"], 2, 0.0)
            
            if "Flags" not in new_kfs[t1] or not isinstance(new_kfs[t1]["Flags"], dict):
                new_kfs[t1]["Flags"] = {}
            new_kfs[t1]["Flags"]["Linear"] = True
            
            if "Flags" not in new_kfs[t2] or not isinstance(new_kfs[t2]["Flags"], dict):
                new_kfs[t2]["Flags"] = {}
            new_kfs[t2]["Flags"]["Linear"] = True
            
            applied = True
            
        if applied:
            modifier.SetKeyFrames(new_kfs)
            reset_count += 1
        
    return f"Reset keyframe interpolation to linear on {reset_count} animated parameter(s)."

def action_quick_animate(comp, anim_type, v1, v2, duration, preset_name, bezier_str):
    # 1. Look for or create Transform1 node
    transform = comp.FindTool("Transform1")
    if not transform:
        media_out = comp.FindTool("MediaOut1")
        if media_out:
            connected_out = media_out.Input.GetConnectedOutput()
            transform = comp.AddTool("Transform")
            if transform:
                transform.SetAttrs({"TOOLS_Name": "Transform1"})
                if connected_out:
                    connected_tool = connected_out.GetTool()
                    if connected_tool and connected_tool.Name != "Transform1":
                        transform.ConnectInput("Input", connected_tool)
                        media_out.ConnectInput("Input", transform)
                else:
                    media_out.ConnectInput("Input", transform)
        else:
            transform = comp.AddTool("Transform")
            if transform:
                transform.SetAttrs({"TOOLS_Name": "Transform1"})
                
    if not transform:
        raise Exception("Failed to find or create Transform1 node in composition.")
        
    comp_attrs = comp.GetAttrs()
    start_frame = comp_attrs.get("COMPN_RenderStart", 0.0)
    end_frame = comp_attrs.get("COMPN_RenderEnd", 100.0)
    fps = comp_attrs.get("COMPN_FPS", 24.0)
    
    anim_end = end_frame
    if duration is not None and duration > 0:
        anim_end = start_frame + int(duration * fps)
        if anim_end > end_frame:
            anim_end = end_frame
            
    modifier = None
    param_id = ""
    display_name = ""
    
    if anim_type == "zoom":
        transform.Size = comp.BezierSpline()
        transform.Size[start_frame] = v1 if v1 is not None else 1.0
        transform.Size[anim_end] = v2 if v2 is not None else 1.15
        
        connected = transform.Size.GetConnectedOutput()
        if connected:
            modifier = connected.GetTool()
        param_id = "Transform1.Size"
        display_name = "Transform1 (Size)"
            
    elif anim_type == "position":
        transform.Center = comp.XYPath()
        xypath_mod = transform.Center.GetConnectedOutput().GetTool()
        if xypath_mod:
            xypath_mod.X = comp.BezierSpline()
            
            x1_val = v1 if v1 is not None else 0.5
            x2_val = v2 if v2 is not None else 0.7
            
            xypath_mod.X[start_frame] = x1_val
            xypath_mod.X[anim_end] = x2_val
            
            connected_x = xypath_mod.X.GetConnectedOutput()
            if connected_x:
                modifier = connected_x.GetTool()
            param_id = "Transform1.Center->X"
            display_name = "Transform1 (Center) - X"
            
    elif anim_type == "rotation":
        transform.Angle = comp.BezierSpline()
        transform.Angle[start_frame] = v1 if v1 is not None else 0.0
        transform.Angle[anim_end] = v2 if v2 is not None else 15.0
        
        connected = transform.Angle.GetConnectedOutput()
        if connected:
            modifier = connected.GetTool()
        param_id = "Transform1.Angle"
        display_name = "Transform1 (Angle)"
        
    if not modifier:
        raise Exception(f"Failed to setup keyframes or modifiers for {anim_type} animation.")
        
    x1_curve, y1_curve, x2_curve, y2_curve = 0.0, 0.0, 1.0, 1.0
    if bezier_str:
        x1_curve, y1_curve, x2_curve, y2_curve = map(float, bezier_str.split(","))
    elif preset_name and preset_name in PRESETS:
        x1_curve, y1_curve, x2_curve, y2_curve = PRESETS[preset_name]
        
    apply_easing_curve(modifier, x1_curve, y1_curve, x2_curve, y2_curve, "Transform1", param_id, None)
    
    return f"Created {anim_type} animation on 'Transform1' with values {v1} to {v2} and applied preset."

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Flow Studio Backend Script")
    parser.add_argument("--action", required=True, help="Action to perform: get_segments, apply_preset, copy, paste, reverse, mirror, reset, quick_animate")
    parser.add_argument("--preset", help="Built-in preset name")
    parser.add_argument("--bezier", help="Bezier coordinates 'x1,y1,x2,y2'")
    parser.add_argument("--segments", help="JSON string representing selected segments")
    parser.add_argument("--anim_type", help="Quick animation type: zoom, position, rotation")
    parser.add_argument("--v1", type=float, help="Start value of quick animation")
    parser.add_argument("--v2", type=float, help="End value of quick animation")
    parser.add_argument("--duration", type=float, help="Duration of quick animation in seconds")
    
    args = parser.parse_args()
    result = {"status": "error", "message": "Unknown error occurred"}
    
    try:
        if args.action == "poll_status":
            resolve = dvr_script.scriptapp("Resolve")
            if not resolve:
                raise Exception("Could not connect to DaVinci Resolve. Please make sure DaVinci Resolve is running and External Scripting is enabled in Preferences.")
            
            current_page = resolve.GetCurrentPage()
            clip_name = None
            has_fusion_comp = False
            comp_count = 0
            
            if current_page.lower() == "edit":
                pm = resolve.GetProjectManager()
                project = pm.GetCurrentProject()
                if project:
                    timeline = project.GetCurrentTimeline()
                    if timeline:
                        clip = get_clip_under_playhead(timeline, project)
                        if clip:
                            clip_name = clip.GetName()
                            comp_count = clip.GetFusionCompCount()
                            has_fusion_comp = comp_count > 0
            
            result = {
                "status": "success",
                "page": current_page,
                "clip_name": clip_name,
                "has_fusion_comp": has_fusion_comp,
                "comp_count": comp_count
            }
            print(json.dumps(result))
            sys.exit(0)

        comp = get_current_comp()
        
        # Parse selected segments JSON if present
        selected_segs = None
        if args.segments:
            try:
                if os.path.exists(args.segments):
                    with open(args.segments, "r", encoding="utf-8") as f:
                        selected_segs = json.load(f)
                else:
                    selected_segs = json.loads(args.segments)
            except Exception as e:
                raise Exception(f"Failed to parse segments parameter: {str(e)}")
        
        if args.action == "get_segments":
            segs = action_get_segments(comp)
            result = {
                "status": "success",
                "segments": segs
            }
            
        elif args.action == "apply_preset":
            x1, y1, x2, y2 = 0.0, 0.0, 1.0, 1.0
            if args.bezier:
                x1, y1, x2, y2 = map(float, args.bezier.split(","))
            elif args.preset and args.preset in PRESETS:
                x1, y1, x2, y2 = PRESETS[args.preset]
            else:
                raise Exception("Missing preset name or bezier coordinates.")
                
            animated_inputs = get_animated_inputs(comp)
            if not animated_inputs:
                raise Exception("No animated parameters found on the selected node. Please add at least two keyframes first.")
                
            applied_count = 0
            for tool, inp, modifier, param_id, display_name in animated_inputs:
                if apply_easing_curve(modifier, x1, y1, x2, y2, tool.Name, param_id, selected_segs):
                    applied_count += 1
                    
            if applied_count == 0:
                raise Exception("No changes made. Check if the correct keyframe segments are selected in the list.")
                
            result = {
                "status": "success",
                "message": f"Applied easing curve to {applied_count} parameter(s) successfully."
            }
            
        elif args.action == "quick_animate":
            if not args.anim_type:
                raise Exception("Missing --anim_type for quick_animate action.")
            msg = action_quick_animate(comp, args.anim_type, args.v1, args.v2, args.duration, args.preset, args.bezier)
            result = { "status": "success", "message": msg }
            
        elif args.action == "copy":
            msg = action_copy(comp)
            result = { "status": "success", "message": msg }
            
        elif args.action == "paste":
            msg = action_paste(comp, selected_segs)
            result = { "status": "success", "message": msg }
            
        elif args.action == "reverse":
            msg = action_reverse(comp, selected_segs)
            result = { "status": "success", "message": msg }
            
        elif args.action == "mirror":
            msg = action_mirror(comp, selected_segs)
            result = { "status": "success", "message": msg }
            
        elif args.action == "reset":
            msg = action_reset(comp, selected_segs)
            result = { "status": "success", "message": msg }
            
        else:
            raise Exception(f"Unknown action: {args.action}")
            
    except Exception as e:
        result = {
            "status": "error",
            "message": str(e)
        }
        
    print(json.dumps(result))
