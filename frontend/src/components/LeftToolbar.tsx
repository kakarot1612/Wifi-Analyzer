import React, { useState } from 'react';
import { ToolMode } from '../types';
import {
  MousePointer,
  Ruler,
  Square,
  Grid,
  Wifi,
  Crosshair,
  Eye,
  Sliders,
  Check,
  Sparkles,
  Layers
} from 'lucide-react';

interface LeftToolbarProps {
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  showWalls: boolean;
  setShowWalls: (v: boolean) => void;
  showRacks: boolean;
  setShowRacks: (v: boolean) => void;
  showApLabels: boolean;
  setShowApLabels: (v: boolean) => void;
  showRays: boolean;
  setShowRays: (v: boolean) => void;
  heatmapOpacity: number;
  setHeatmapOpacity: (v: number) => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onSelectTool,
  showHeatmap,
  setShowHeatmap,
  showWalls,
  setShowWalls,
  showRacks,
  setShowRacks,
  showApLabels,
  setShowApLabels,
  showRays,
  setShowRays,
  heatmapOpacity,
  setHeatmapOpacity,
}) => {
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const tools: { id: ToolMode; label: string; icon: React.ReactNode; shortcut: string; badge?: string }[] = [
    { id: 'select', label: 'Chọn / Di chuyển AP & Vật cản', icon: <MousePointer size={18} />, shortcut: 'V' },
    { id: 'ai_plan', label: 'AI Tự Động Phủ Sóng (Quét Vùng)', icon: <Sparkles size={18} style={{ color: '#ec4899' }} />, shortcut: 'S', badge: 'AI' },
    { id: 'ap', label: 'Thư viện & Kéo-thả AP', icon: <Wifi size={18} />, shortcut: 'A' },
    { id: 'wall', label: 'Tô Tường & Vách ngăn', icon: <Square size={18} />, shortcut: 'W' },
    { id: 'rack', label: 'Vẽ Kệ Kho (Rack 6m)', icon: <Grid size={18} />, shortcut: 'K' },
    { id: 'calibrate', label: 'Hiệu chuẩn tỷ lệ (Thước 2 điểm)', icon: <Ruler size={18} />, shortcut: 'R' },
    { id: 'inspect', label: 'Đo kiểm điểm (Probe 3D)', icon: <Crosshair size={18} />, shortcut: 'I' },
  ];

  return (
    <aside className="rf-left-toolbar">
      <div className="rf-tools-group">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`rf-tool-btn ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            style={{ position: 'relative' }}
          >
            {t.icon}
            {t.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#ec4899',
                  color: '#fff',
                  fontSize: '8px',
                  fontWeight: 800,
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                {t.badge}
              </span>
            )}
            <span className="rf-shortcut-key">{t.shortcut}</span>
          </button>
        ))}
      </div>

      <div className="rf-toolbar-divider" />

      {/* Layer Visibility Toggle Button */}
      <div style={{ position: 'relative' }}>
        <button
          className={`rf-tool-btn ${showLayerMenu ? 'active' : ''}`}
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          title="Tùy chỉnh hiển thị các lớp (Layers)"
        >
          <Eye size={18} />
        </button>

        {showLayerMenu && (
          <div className="rf-layer-dropdown">
            <div className="rf-layer-header">
              <Sliders size={14} />
              <span>Hiển thị các lớp</span>
            </div>

            <label className="rf-layer-item">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
              />
              <span>Lớp Heatmap RF</span>
            </label>

            <label className="rf-layer-item">
              <input
                type="checkbox"
                checked={showWalls}
                onChange={(e) => setShowWalls(e.target.checked)}
              />
              <span>Tường & Vách ngăn</span>
            </label>

            <label className="rf-layer-item">
              <input
                type="checkbox"
                checked={showRacks}
                onChange={(e) => setShowRacks(e.target.checked)}
              />
              <span>Kệ hàng nhà kho</span>
            </label>

            <label className="rf-layer-item">
              <input
                type="checkbox"
                checked={showApLabels}
                onChange={(e) => setShowApLabels(e.target.checked)}
              />
              <span>Nhãn & Kênh AP</span>
            </label>

            <label className="rf-layer-item">
              <input
                type="checkbox"
                checked={showRays}
                onChange={(e) => setShowRays(e.target.checked)}
              />
              <span>Tia truyền sóng 3D</span>
            </label>

            <div className="rf-opacity-slider">
              <div className="rf-slider-label">
                <span>Độ mờ Heatmap</span>
                <span>{Math.round(heatmapOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
