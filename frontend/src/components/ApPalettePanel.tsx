import React, { useState } from 'react';
import { AccessPoint, Position3D, RadioConfig, WlcBinding, BandType } from '../types';
import {
  Wifi,
  Radio,
  Sliders,
  Move,
  Plus,
  ArrowUp,
  Compass,
  CheckCircle,
  Sparkles,
  Info
} from 'lucide-react';

export interface ApTemplateConfig {
  model: string;
  vendor: string;
  heightM: number;
  txPowerDbm: number;
  orientationDeg: number;
  mountingType: 'ceiling' | 'wall' | 'pole';
  antennaType: 'omni' | 'directional_patch' | 'directional_aisle';
  radios: {
    '2.4': { enabled: boolean; channel: number; txPowerDbm: number };
    '5': { enabled: boolean; channel: number; txPowerDbm: number };
    '6': { enabled: boolean; channel: number; txPowerDbm: number };
  };
}

interface ApPalettePanelProps {
  onAddApWithConfig: (config: ApTemplateConfig, xM?: number, yM?: number) => void;
  onClose?: () => void;
  apCatalog?: any[];
}

export const AP_MODELS_PRESETS: {
  model: string;
  vendor: string;
  name: string;
  has6G: boolean;
  antennaType: 'omni' | 'directional_patch' | 'directional_aisle';
  defaultMount: 'ceiling' | 'wall' | 'pole';
  desc: string;
}[] = [
  {
    model: 'C9115AXI',
    vendor: 'Cisco',
    name: 'Cisco C9115AXI (Wi-Fi 6, Omni)',
    has6G: false,
    antennaType: 'omni',
    defaultMount: 'ceiling',
    desc: 'Anten ngầm đa hướng, phù hợp văn phòng & trần kho thấp < 4.5m',
  },
  {
    model: 'C9115AXE-DIR',
    vendor: 'Cisco',
    name: 'Cisco C9115AXE + AIR-ANT2566P4W-R (Patch 60°)',
    has6G: false,
    antennaType: 'directional_aisle',
    defaultMount: 'wall',
    desc: 'Anten định hướng 60° chuyên dụng chiếu dọc hành lang kệ kho cao 6-8m',
  },
  {
    model: 'C9120AXI',
    vendor: 'Cisco',
    name: 'Cisco C9120AXI (Wi-Fi 6 Enterprise)',
    has6G: false,
    antennaType: 'omni',
    defaultMount: 'ceiling',
    desc: 'Dòng AP doanh nghiệp tiêu chuẩn, 4x4 MIMO, vùng phủ rộng',
  },
  {
    model: 'C9130AXE-DIR',
    vendor: 'Cisco',
    name: 'Cisco C9130AXE + Directional Patch',
    has6G: false,
    antennaType: 'directional_aisle',
    defaultMount: 'wall',
    desc: 'Công suất cao chuyên dụng kho vận & trần nhà xưởng > 8m',
  },
  {
    model: 'C9164I',
    vendor: 'Cisco',
    name: 'Cisco C9164I (Wi-Fi 6E Tri-Band)',
    has6G: true,
    antennaType: 'omni',
    defaultMount: 'ceiling',
    desc: 'Hỗ trợ 3 băng tần 2.4/5/6 GHz, tốc độ cao không nhiễu',
  },
  {
    model: 'AP-574-DIR',
    vendor: 'Aruba',
    name: 'Aruba AP-574 + Directional Aisle (Pic 1)',
    has6G: false,
    antennaType: 'directional_aisle',
    defaultMount: 'wall',
    desc: 'Mô hình chuẩn triển khai nhà kho Ekahau (tham khảo Pic 1)',
  },
];

export const ApPalettePanel: React.FC<ApPalettePanelProps> = ({
  onAddApWithConfig,
  onClose,
}) => {
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(0);
  const curModel = AP_MODELS_PRESETS[selectedModelIdx];

  const [heightM, setHeightM] = useState<number>(4.5);
  const [txPowerDbm, setTxPowerDbm] = useState<number>(14);
  const [orientationDeg, setOrientationDeg] = useState<number>(0);
  const [mountType, setMountType] = useState<'ceiling' | 'wall' | 'pole'>(curModel.defaultMount);

  // Radios
  const [enable24, setEnable24] = useState<boolean>(true);
  const [channel24, setChannel24] = useState<number>(1);

  const [enable5, setEnable5] = useState<boolean>(true);
  const [channel5, setChannel5] = useState<number>(36);

  const [enable6, setEnable6] = useState<boolean>(curModel.has6G);
  const [channel6, setChannel6] = useState<number>(37);

  const handleSelectModel = (idx: number) => {
    setSelectedModelIdx(idx);
    const m = AP_MODELS_PRESETS[idx];
    setMountType(m.defaultMount);
    if (!m.has6G) setEnable6(false);
  };

  const currentTemplateConfig: ApTemplateConfig = {
    model: curModel.model,
    vendor: curModel.vendor,
    heightM: heightM,
    txPowerDbm: txPowerDbm,
    orientationDeg: orientationDeg,
    mountingType: mountType,
    antennaType: curModel.antennaType,
    radios: {
      '2.4': { enabled: enable24, channel: channel24, txPowerDbm: txPowerDbm },
      '5': { enabled: enable5, channel: channel5, txPowerDbm: txPowerDbm },
      '6': { enabled: curModel.has6G && enable6, channel: channel6, txPowerDbm: Math.max(10, txPowerDbm - 2) },
    },
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(currentTemplateConfig));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="rf-panel-content" style={{ padding: '14px' }}>
      <div className="rf-section-title" style={{ marginBottom: '12px' }}>
        <Wifi size={17} style={{ color: '#38bdf8' }} />
        <span>Thư Viện & Kéo-Thả AP</span>
      </div>

      {/* DRAG AND DROP BADGE */}
      <div
        draggable
        onDragStart={handleDragStart}
        style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(15, 23, 42, 0.9))',
          border: '2px dashed #38bdf8',
          borderRadius: '10px',
          padding: '14px',
          textAlign: 'center',
          cursor: 'grab',
          marginBottom: '16px',
          boxShadow: '0 4px 14px rgba(56, 189, 248, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#38bdf8', marginBottom: '6px' }}>
          <Move size={18} />
          <strong style={{ fontSize: '13px' }}>NẮM KÉO THẢ VÀO BẢN ĐỒ</strong>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#cbd5e1' }}>
          Kéo thẻ AP này thả vào tọa độ bất kỳ trên mặt bằng 2D để đặt điểm phát sóng ngay.
        </p>
        <div style={{ display: 'inline-block', background: '#0284c7', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px' }}>
          {curModel.model} ({heightM}m, {txPowerDbm}dBm)
        </div>
      </div>

      {/* Model Selection */}
      <div className="rf-form-row" style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
          1. Chọn Model Access Point:
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {AP_MODELS_PRESETS.map((m, idx) => {
            const isSel = idx === selectedModelIdx;
            return (
              <div
                key={m.model}
                onClick={() => handleSelectModel(idx)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: isSel ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  border: isSel ? '1.5px solid #38bdf8' : '1px solid #334155',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isSel ? '#38bdf8' : '#f8fafc' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{m.desc}</div>
                </div>
                {m.has6G && (
                  <span style={{ fontSize: '9px', background: '#8b5cf6', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                    6 GHz
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mounting & Height Configuration */}
      <div className="rf-form-row" style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
          2. Độ cao treo AP (Z mét):
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <input
            type="range"
            min="2.0"
            max="12.0"
            step="0.5"
            value={heightM}
            onChange={(e) => setHeightM(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '45px', textAlign: 'right', fontWeight: 700, color: '#38bdf8', fontSize: '13px' }}>
            {heightM} m
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[3.0, 4.5, 6.0, 8.0, 10.0].map((h) => (
            <button
              key={h}
              className="rf-pill-btn"
              style={{ flex: 1, padding: '2px 4px', fontSize: '10px' }}
              onClick={() => setHeightM(h)}
            >
              {h}m
            </button>
          ))}
        </div>
      </div>

      {/* Tx Power & Orientation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div className="rf-form-row">
          <label style={{ fontSize: '11px', color: '#cbd5e1' }}>Công suất phát Tx:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <input
              type="number"
              min="10"
              max="24"
              value={txPowerDbm}
              onChange={(e) => setTxPowerDbm(parseInt(e.target.value) || 14)}
              style={{ width: '50px', padding: '4px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>dBm</span>
          </div>
        </div>

        <div className="rf-form-row">
          <label style={{ fontSize: '11px', color: '#cbd5e1' }}>Góc xoay anten:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <input
              type="number"
              min="0"
              max="360"
              step="15"
              value={orientationDeg}
              onChange={(e) => setOrientationDeg(parseInt(e.target.value) || 0)}
              style={{ width: '50px', padding: '4px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>° (Azimuth)</span>
          </div>
        </div>
      </div>

      {/* Radio Bands Toggle */}
      <div className="rf-form-row" style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
          3. Cấu hình các Radio sóng:
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
              <input type="checkbox" checked={enable24} onChange={(e) => setEnable24(e.target.checked)} />
              <span>Radio <b>2.4 GHz</b></span>
            </label>
            <select
              value={channel24}
              onChange={(e) => setChannel24(parseInt(e.target.value))}
              disabled={!enable24}
              style={{ padding: '2px 6px', fontSize: '11px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
            >
              <option value={1}>Kênh 1</option>
              <option value={6}>Kênh 6</option>
              <option value={11}>Kênh 11</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
              <input type="checkbox" checked={enable5} onChange={(e) => setEnable5(e.target.checked)} />
              <span>Radio <b>5 GHz</b></span>
            </label>
            <select
              value={channel5}
              onChange={(e) => setChannel5(parseInt(e.target.value))}
              disabled={!enable5}
              style={{ padding: '2px 6px', fontSize: '11px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
            >
              <option value={36}>Kênh 36 (UNII-1)</option>
              <option value={52}>Kênh 52 (DFS)</option>
              <option value={100}>Kênh 100 (DFS)</option>
              <option value={132}>Kênh 132 (DFS)</option>
              <option value={149}>Kênh 149 (UNII-3)</option>
            </select>
          </div>

          {curModel.has6G && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#a78bfa', cursor: 'pointer' }}>
                <input type="checkbox" checked={enable6} onChange={(e) => setEnable6(e.target.checked)} />
                <span>Radio <b>6 GHz (Wi-Fi 6E)</b></span>
              </label>
              <select
                value={channel6}
                onChange={(e) => setChannel6(parseInt(e.target.value))}
                disabled={!enable6}
                style={{ padding: '2px 6px', fontSize: '11px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
              >
                <option value={37}>Kênh 37</option>
                <option value={53}>Kênh 53</option>
                <option value={69}>Kênh 69</option>
                <option value={85}>Kênh 85</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Button Place Directly */}
      <button
        className="rf-btn-primary"
        onClick={() => onAddApWithConfig(currentTemplateConfig)}
        style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
      >
        <Plus size={16} />
        <span>Thêm AP Này Vào Bản Vẽ</span>
      </button>
    </div>
  );
};
