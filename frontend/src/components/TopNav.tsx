import React from 'react';
import { AppTab, BandType, ProjectData } from '../types';
import {
  Layers,
  Search,
  Activity,
  Server,
  FileText,
  Save,
  RotateCcw,
  Download,
  ShieldCheck,
  Cpu,
  Radio,
  FolderOpen,
  UploadCloud,
  Ruler,
  Sparkles
} from 'lucide-react';

interface TopNavProps {
  project: ProjectData;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onSave: () => void;
  onReset: () => void;
  onExportPdf: () => void;
  onOpenProjectManager: () => void;
  onOpenUploadBlueprint: () => void;
  onOpenScaleModal?: () => void;
  onOpenAiPlanner: () => void;
  onDetectWalls?: () => void;
  isDetectingWalls?: boolean;
  isSaving: boolean;
  activeBand: BandType;
  onBandChange: (band: BandType) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  project,
  activeTab,
  onTabChange,
  onSave,
  onReset,
  onExportPdf,
  onOpenProjectManager,
  onOpenUploadBlueprint,
  onOpenScaleModal,
  onOpenAiPlanner,
  onDetectWalls,
  isDetectingWalls,
  isSaving,
  activeBand,
  onBandChange,
}) => {
  return (
    <header className="rf-topnav">
      <div className="rf-topnav-left">
        <div className="rf-logo-badge">
          <Cpu className="rf-logo-icon" size={20} />
          <span className="rf-logo-text">Wi-Fi RF Planner</span>
          <span className="rf-version-badge">PRO v1.1</span>
        </div>

        {/* Project Selector Button */}
        <button
          onClick={onOpenProjectManager}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid #475569',
            borderRadius: '6px',
            padding: '5px 10px',
            cursor: 'pointer',
            marginLeft: '8px',
            transition: 'all 0.2s',
          }}
          title="Mở danh sách dự án / Tạo dự án mới"
        >
          <FolderOpen size={15} style={{ color: '#38bdf8' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.project.name}
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {project.aps.length} APs • Trần {project.project.floorHeightM}m • {project.project.scale.calibrated ? 'Đã hiệu chuẩn' : 'Chưa hiệu chuẩn'}
            </span>
          </div>
        </button>

        {/* Upload Blueprint button */}
        <button
          onClick={onOpenUploadBlueprint}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '5px 9px',
            cursor: 'pointer',
            fontSize: '11px',
            color: '#cbd5e1',
          }}
          title="Tải tệp bản vẽ mặt bằng 2D (PDF hoặc Ảnh PNG/JPG)"
        >
          <UploadCloud size={14} style={{ color: '#06b6d4' }} />
          <span>Đổi Bản Vẽ</span>
        </button>

        {/* Floor Dimensions & Calibration Button */}
        {onOpenScaleModal && (
          <button
            onClick={onOpenScaleModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: project.project.scale.calibrated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              border: project.project.scale.calibrated ? '1px solid #10b981' : '1px solid #eab308',
              borderRadius: '6px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#f8fafc',
            }}
            title="Bấm để xem và hiệu chỉnh lại kích thước mặt bằng 2D hoặc tỷ lệ thước"
          >
            <Ruler size={14} style={{ color: project.project.scale.calibrated ? '#10b981' : '#eab308' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
              <span style={{ fontWeight: 600 }}>
                {((project.background.widthPx || 1000) / (project.project.scale.pixelsPerMeter || 20)).toFixed(1)}m × {((project.background.heightPx || 600) / (project.project.scale.pixelsPerMeter || 20)).toFixed(1)}m
              </span>
              <span style={{ fontSize: '9px', color: project.project.scale.calibrated ? '#34d399' : '#fde047' }}>
                {(project.project.scale.pixelsPerMeter || 20).toFixed(1)} px/m • {project.project.scale.calibrated ? 'Đã hiệu chuẩn' : 'Chưa hiệu chuẩn'}
              </span>
            </div>
          </button>
        )}

        {/* Prominent Band Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '3px 8px', borderRadius: '6px', border: '1px solid #334155' }}>
          <Radio size={13} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Sóng:</span>
          <div className="rf-pill-group" style={{ margin: 0 }}>
            <button
              className={`rf-pill-btn ${activeBand === '2.4' ? 'active' : ''}`}
              onClick={() => onBandChange('2.4')}
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              2.4 GHz
            </button>
            <button
              className={`rf-pill-btn ${activeBand === '5' ? 'active' : ''}`}
              onClick={() => onBandChange('5')}
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              5 GHz
            </button>
            <button
              className={`rf-pill-btn ${activeBand === '6' ? 'active' : ''}`}
              onClick={() => onBandChange('6')}
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              6 GHz
            </button>
          </div>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <nav className="rf-nav-tabs">
        <button
          className={`rf-tab-btn ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => onTabChange('design')}
        >
          <Layers size={16} />
          <span>Mặt bằng & AP</span>
        </button>

        <button
          className={`rf-tab-btn ${activeTab === 'inspect' ? 'active' : ''}`}
          onClick={() => onTabChange('inspect')}
        >
          <Search size={16} />
          <span>Đo kiểm 3D</span>
        </button>

        <button
          className={`rf-tab-btn ${activeTab === 'survey' ? 'active' : ''}`}
          onClick={() => onTabChange('survey')}
        >
          <Activity size={16} />
          <span>Khảo sát & Hiệu chỉnh</span>
        </button>

        <button
          className={`rf-tab-btn ${activeTab === 'wlc' ? 'active' : ''}`}
          onClick={() => onTabChange('wlc')}
        >
          <Server size={16} />
          <span>Cisco Catalyst 9800</span>
        </button>

        <button
          className={`rf-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => onTabChange('reports')}
        >
          <FileText size={16} />
          <span>Báo cáo</span>
        </button>
      </nav>

      {/* Action buttons */}
      <div className="rf-topnav-right">
        {onDetectWalls && (
          <button
            className="rf-action-btn"
            onClick={onDetectWalls}
            disabled={isDetectingWalls}
            style={{
              background: 'rgba(99, 102, 241, 0.18)',
              border: '1px solid #6366f1',
              color: '#a5b4fc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="AI / Computer Vision tự động quét và nhận diện các bức tường từ bản vẽ 2D để tính toán suy hao sóng chính xác"
          >
            <Sparkles size={14} style={{ color: '#818cf8' }} />
            <span>{isDetectingWalls ? 'Đang quét...' : 'Quét Tường AI'}</span>
            <span style={{ fontSize: '10px', background: '#4338ca', padding: '1px 5px', borderRadius: '4px', color: '#e0e7ff' }}>
              {project.obstacles.length} tường
            </span>
          </button>
        )}


        <button
          className="rf-action-btn rf-btn-secondary"
          onClick={onReset}
          title="Đặt lại bản vẽ mẫu nhà kho chuẩn"
        >
          <RotateCcw size={15} />
          <span>Mặc định</span>
        </button>

        <button
          className="rf-action-btn rf-btn-secondary"
          onClick={onExportPdf}
          title="Xuất báo cáo PDF chuẩn dự báo"
        >
          <Download size={15} />
          <span>Xuất PDF</span>
        </button>

        <button
          className="rf-action-btn rf-btn-primary"
          onClick={onSave}
          disabled={isSaving}
          title="Lưu cấu hình dự án"
        >
          <Save size={15} />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu dự án'}</span>
        </button>
      </div>
    </header>
  );
};
