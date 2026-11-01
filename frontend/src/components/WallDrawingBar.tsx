import React from 'react';
import { Material } from '../types';
import { Square, Minus, Layers, Check, X, ShieldAlert, Trash2 } from 'lucide-react';

export interface WallDrawingConfig {
  materialId: string;
  drawMode: 'line' | 'rect';
  heightM: number;
  thicknessM: number;
}

interface WallDrawingBarProps {
  materials: Material[];
  config: WallDrawingConfig;
  onChangeConfig: (updated: WallDrawingConfig) => void;
  onFinish?: () => void;
  onCancel?: () => void;
  onClearAllWalls?: () => void;
}

export const WallDrawingBar: React.FC<WallDrawingBarProps> = ({
  materials,
  config,
  onChangeConfig,
  onFinish,
  onCancel,
  onClearAllWalls,
}) => {
  const selectedMat = materials.find((m) => m.id === config.materialId) || materials[0];

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        background: '#0f172a',
        border: '1.5px solid #38bdf8',
        borderRadius: '10px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid #334155', paddingRight: '12px' }}>
        <Layers size={16} style={{ color: '#38bdf8' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
          Tô Tường & Vật Cản:
        </span>
      </div>

      {/* Material Selector with colored dots */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {materials.map((m) => {
          const isSel = m.id === config.materialId;
          const loss5G = m.attenuationDb ? (m.attenuationDb['5'] || m.attenuationDb['2.4'] || 10) : 10;
          return (
            <button
              key={m.id}
              onClick={() => onChangeConfig({ ...config, materialId: m.id, thicknessM: m.defaultThicknessM })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: isSel ? 700 : 500,
                background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                color: isSel ? '#f8fafc' : '#94a3b8',
                border: isSel ? `1.5px solid ${m.color}` : '1px solid #334155',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title={`${m.name} (Suy hao ${loss5G} dB ở 5GHz)`}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: m.color,
                  display: 'inline-block',
                }}
              />
              <span>{m.name.split('/')[0].split('(')[0].trim()}</span>
              <span style={{ fontSize: '9px', opacity: 0.75 }}>({loss5G}dB)</span>
            </button>
          );
        })}
      </div>

      <div style={{ width: '1px', height: '24px', background: '#334155' }} />

      {/* Draw Mode: Line vs Rectangle */}
      <div style={{ display: 'flex', gap: '4px', background: '#1e293b', padding: '2px', borderRadius: '6px' }}>
        <button
          onClick={() => onChangeConfig({ ...config, drawMode: 'line' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            background: config.drawMode === 'line' ? '#0284c7' : 'transparent',
            color: config.drawMode === 'line' ? '#fff' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Vẽ đoạn thẳng liên tiếp (Line)"
        >
          <Minus size={13} />
          <span>Đoạn thẳng</span>
        </button>
        <button
          onClick={() => onChangeConfig({ ...config, drawMode: 'rect' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            background: config.drawMode === 'rect' ? '#0284c7' : 'transparent',
            color: config.drawMode === 'rect' ? '#fff' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Kéo hình chữ nhật bao quanh phòng (Room)"
        >
          <Square size={13} />
          <span>Khối phòng</span>
        </button>
      </div>

      <div style={{ width: '1px', height: '24px', background: '#334155' }} />

      {/* Height input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#cbd5e1' }}>
        <span>Cao:</span>
        <input
          type="number"
          step="0.5"
          min="1"
          max="15"
          value={config.heightM}
          onChange={(e) => onChangeConfig({ ...config, heightM: parseFloat(e.target.value) || 3.5 })}
          style={{
            width: '46px',
            padding: '2px 4px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '11px',
            textAlign: 'center',
          }}
        />
        <span>m</span>
      </div>

      {onClearAllWalls && (
        <button
          onClick={onClearAllWalls}
          style={{
            padding: '4px 9px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Xóa toàn bộ các bức tường hiện có để vẽ lại"
        >
          <Trash2 size={13} />
          <span>Xóa Hết Tường</span>
        </button>
      )}

      {/* Done / Cancel buttons */}
      {onFinish && (
        <button
          onClick={onFinish}
          style={{
            padding: '4px 10px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Hoàn thành vẽ tường"
        >
          <Check size={13} />
          <span>Xong</span>
        </button>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #475569',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          title="Hủy công cụ vẽ tường"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
