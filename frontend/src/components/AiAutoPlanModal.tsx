import React, { useState } from 'react';
import { AutoPlanRequest, AutoPlanResponse, AccessPoint, BandType, ProjectData, ExclusionZone } from '../types';
import { api } from '../services/api';
import { AP_MODELS_PRESETS } from './ApPalettePanel';
import {
  Sparkles,
  Wifi,
  X,
  RefreshCw,
  Check,
  CheckCircle2,
  Trash2,
  Plus,
  Maximize2,
  Layers,
  Info,
  ShieldCheck,
  Ban
} from 'lucide-react';

interface AiAutoPlanModalProps {
  project: ProjectData;
  zone: { x: number; y: number; width: number; height: number };
  onApplyPlan: (newAps: AccessPoint[], replaceExisting: boolean, exclusionZones?: ExclusionZone[]) => void;
  onClose: () => void;
}

export const AiAutoPlanModal: React.FC<AiAutoPlanModalProps> = ({
  project,
  zone: initialZone,
  onApplyPlan,
  onClose,
}) => {
  const ppm = project.project.scale.pixelsPerMeter || 24;
  const floorW = Math.round(((project.background.widthPx || 1440) / ppm) * 10) / 10;
  const floorH = Math.round(((project.background.heightPx || 864) / ppm) * 10) / 10;
  const floorAreaSqm = Math.round(floorW * floorH);

  // Selected zone state (defaults to passed zone or full floor)
  const [currentZone, setCurrentZone] = useState<{ x: number; y: number; width: number; height: number }>({
    x: initialZone.x >= 0 ? initialZone.x : 0,
    y: initialZone.y >= 0 ? initialZone.y : 0,
    width: initialZone.width > 0 ? initialZone.width : floorW,
    height: initialZone.height > 0 ? initialZone.height : floorH,
  });

  const [apModel, setApModel] = useState<string>('C9115AXI');
  const [heightM, setHeightM] = useState<number>(project.project.floorHeightM > 6 ? 6.0 : (project.project.floorHeightM || 3.0));
  const [txPowerDbm, setTxPowerDbm] = useState<number>(14.0);
  const [band, setBand] = useState<BandType>('5');
  const [targetRssiDbm, setTargetRssiDbm] = useState<number>(-65.0);
  const [redundancy, setRedundancy] = useState<'standard' | 'high'>('standard');
  const [optimizeForRooms, setOptimizeForRooms] = useState<boolean>(true);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);

  // Exclusion Zones state
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>(
    project.exclusionZones ? [...project.exclusionZones] : []
  );

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AutoPlanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const areaSqm = Math.round(currentZone.width * currentZone.height);

  // Switch to Full Floor
  const handleSelectFullFloor = () => {
    setCurrentZone({
      x: 0,
      y: 0,
      width: floorW,
      height: floorH,
    });
  };

  // Add Exclusion Zone preset
  const handleAddPresetExclusion = (presetType: 'balcony' | 'garage' | 'atrium' | 'custom') => {
    const id = `ex-${Date.now()}`;
    let newZone: ExclusionZone;

    if (presetType === 'balcony') {
      newZone = {
        id,
        name: 'Ban Công / Sân Phơi',
        x: Math.round((currentZone.x + 0.5) * 10) / 10,
        y: Math.round((currentZone.y + currentZone.height * 0.65) * 10) / 10,
        width: Math.min(4.0, Math.round(currentZone.width * 0.3 * 10) / 10),
        height: Math.min(4.0, Math.round(currentZone.height * 0.3 * 10) / 10),
      };
    } else if (presetType === 'garage') {
      newZone = {
        id,
        name: 'Garage / Bãi Xe',
        x: Math.round((currentZone.x + currentZone.width * 0.65) * 10) / 10,
        y: Math.round((currentZone.y + 0.5) * 10) / 10,
        width: Math.min(5.0, Math.round(currentZone.width * 0.3 * 10) / 10),
        height: Math.min(4.5, Math.round(currentZone.height * 0.3 * 10) / 10),
      };
    } else if (presetType === 'atrium') {
      newZone = {
        id,
        name: 'Giếng Trời / Cầu Thang',
        x: Math.round((currentZone.x + currentZone.width * 0.4) * 10) / 10,
        y: Math.round((currentZone.y + currentZone.height * 0.4) * 10) / 10,
        width: 2.5,
        height: 2.5,
      };
    } else {
      newZone = {
        id,
        name: `Vùng Loại Trừ ${exclusionZones.length + 1}`,
        x: Math.round((currentZone.x + 1.0) * 10) / 10,
        y: Math.round((currentZone.y + 1.0) * 10) / 10,
        width: 3.0,
        height: 3.0,
      };
    }

    setExclusionZones([...exclusionZones, newZone]);
  };

  const handleUpdateExclusion = (index: number, field: keyof ExclusionZone, value: any) => {
    const updated = [...exclusionZones];
    updated[index] = { ...updated[index], [field]: value };
    setExclusionZones(updated);
  };

  const handleRemoveExclusion = (index: number) => {
    setExclusionZones(exclusionZones.filter((_, i) => i !== index));
  };

  const handleRunAi = async () => {
    setIsCalculating(true);
    setErrorMsg(null);
    try {
      const planReq: AutoPlanRequest = {
        projectId: project.project.id,
        zoneX: currentZone.x,
        zoneY: currentZone.y,
        zoneWidth: currentZone.width,
        zoneHeight: currentZone.height,
        apModel: apModel,
        heightM: heightM,
        txPowerDbm: txPowerDbm,
        band: band,
        targetRssiDbm: targetRssiDbm,
        redundancy: redundancy,
        exclusionZones: exclusionZones,
        optimizeForRooms: optimizeForRooms,
      };
      const res = await api.autoPlan(planReq);
      setAiResult(res);
    } catch (err: any) {
      setErrorMsg('Lỗi tính toán AI: ' + (err.message || 'Không thể kết nối máy chủ'));
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApply = () => {
    if (!aiResult || aiResult.aps.length === 0) return;
    onApplyPlan(aiResult.aps, replaceExisting, exclusionZones);
    onClose();
  };

  return (
    <div className="rf-modal-backdrop">
      <div className="rf-modal-card" style={{ maxWidth: '780px', width: '94vw' }}>
        <div className="rf-modal-header">
          <div className="rf-modal-title">
            <Sparkles size={22} style={{ color: '#ec4899' }} />
            <div>
              <span style={{ fontWeight: 800 }}>AI Bố Trí AP Tự Động</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px', fontWeight: 400 }}>
                (Room-Aware & Wall-Aware Ekahau Standard)
              </span>
            </div>
          </div>
          <button className="rf-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rf-modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
          {/* Dimension Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(15, 23, 42, 0.95))',
              border: '1.5px solid #ec4899',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#f472b6', fontWeight: 700, letterSpacing: '0.5px' }}>
                KHU VỰC KHẢO SÁT & TÍNH TOÁN AI:
              </div>
              <strong style={{ fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{currentZone.width.toFixed(1)}m × {currentZone.height.toFixed(1)}m ({areaSqm} m²)</span>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 500 }}>
                  [Góc: X={currentZone.x.toFixed(1)}m, Y={currentZone.y.toFixed(1)}m]
                </span>
              </strong>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                Toàn bộ mặt bằng thực tế: {floorW.toFixed(1)}m × {floorH.toFixed(1)}m ({floorAreaSqm} m²)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="rf-btn-secondary"
                onClick={handleSelectFullFloor}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: '#ec4899',
                  color: '#f472b6',
                }}
              >
                <Maximize2 size={13} />
                <span>Toàn Bộ Mặt Bằng</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '14px',
                fontSize: '13px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Section: Exclusion Zones */}
          <div
            style={{
              background: '#0b1120',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Ban size={16} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  Vùng Loại Trừ Không Cần Sóng (Exclusion Zones)
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ({exclusionZones.length} vùng)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="rf-btn-secondary"
                  onClick={() => handleAddPresetExclusion('balcony')}
                  style={{ padding: '3px 8px', fontSize: '10px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  + Ban công
                </button>
                <button
                  type="button"
                  className="rf-btn-secondary"
                  onClick={() => handleAddPresetExclusion('garage')}
                  style={{ padding: '3px 8px', fontSize: '10px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  + Garage / Bãi xe
                </button>
                <button
                  type="button"
                  className="rf-btn-secondary"
                  onClick={() => handleAddPresetExclusion('atrium')}
                  style={{ padding: '3px 8px', fontSize: '10px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  + Giếng trời
                </button>
                <button
                  type="button"
                  className="rf-btn-secondary"
                  onClick={() => handleAddPresetExclusion('custom')}
                  style={{ padding: '3px 8px', fontSize: '10px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                >
                  + Tùy chỉnh
                </button>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
              AI sẽ loại trừ các khu vực này khỏi diện tích cần phủ và tuyệt đối không bao giờ đặt AP vào bên trong.
            </div>

            {exclusionZones.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                Chưa có vùng loại trừ nào. Bấm các nút phía trên để thêm ban công, sân ngoài hoặc giếng trời.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {exclusionZones.map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                    }}
                  >
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => handleUpdateExclusion(idx, 'name', e.target.value)}
                      placeholder="Tên vùng"
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        color: '#f8fafc',
                        padding: '4px 8px',
                        fontSize: '11px',
                        width: '140px',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                      <span>X:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ex.x}
                        onChange={(e) => handleUpdateExclusion(idx, 'x', parseFloat(e.target.value) || 0)}
                        style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', padding: '3px 6px', fontSize: '11px' }}
                      />
                      <span>Y:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ex.y}
                        onChange={(e) => handleUpdateExclusion(idx, 'y', parseFloat(e.target.value) || 0)}
                        style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', padding: '3px 6px', fontSize: '11px' }}
                      />
                      <span>Rộng:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ex.width}
                        onChange={(e) => handleUpdateExclusion(idx, 'width', parseFloat(e.target.value) || 1)}
                        style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', padding: '3px 6px', fontSize: '11px' }}
                      />
                      <span>Dài:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ex.height}
                        onChange={(e) => handleUpdateExclusion(idx, 'height', parseFloat(e.target.value) || 1)}
                        style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', padding: '3px 6px', fontSize: '11px' }}
                      />
                      <span>m</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExclusion(idx)}
                      title="Xóa vùng này"
                      style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="rf-form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Model Access Point:
              </label>
              <select
                value={apModel}
                onChange={(e) => setApModel(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              >
                {AP_MODELS_PRESETS.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rf-form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Băng tần tính toán:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`rf-pill-btn ${band === '5' ? 'active' : ''}`}
                  onClick={() => setBand('5')}
                  style={{ flex: 1, padding: '7px' }}
                >
                  5 GHz (Khuyên dùng)
                </button>
                <button
                  type="button"
                  className={`rf-pill-btn ${band === '2.4' ? 'active' : ''}`}
                  onClick={() => setBand('2.4')}
                  style={{ flex: 1, padding: '7px' }}
                >
                  2.4 GHz
                </button>
              </div>
            </div>

            <div className="rf-form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Độ cao treo AP (m):
              </label>
              <input
                type="number"
                step="0.5"
                min="2.0"
                max="12.0"
                value={heightM}
                onChange={(e) => setHeightM(parseFloat(e.target.value) || 3.0)}
                style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="rf-form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Công suất phát Tx (dBm):
              </label>
              <input
                type="number"
                min="10"
                max="23"
                value={txPowerDbm}
                onChange={(e) => setTxPowerDbm(parseFloat(e.target.value) || 14)}
                style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="rf-form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Mục tiêu RSSI tối thiểu:
              </label>
              <select
                value={targetRssiDbm}
                onChange={(e) => setTargetRssiDbm(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              >
                <option value={-65}>-65 dBm (Chuẩn Căn hộ / PDA / Văn phòng cao cấp)</option>
                <option value={-67}>-67 dBm (Tablet xe nâng / Tiêu chuẩn doanh nghiệp)</option>
                <option value={-70}>-70 dBm (Văn phòng phổ thông / Lướt web cơ bản)</option>
                <option value={-62}>-62 dBm (Mật độ cực cao High-Density / VoWiFi)</option>
              </select>
            </div>

            <div className="rf-form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Mức độ phủ sóng (Roaming):
              </label>
              <select
                value={redundancy}
                onChange={(e) => setRedundancy(e.target.value as any)}
                style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              >
                <option value="standard">Chuẩn (Tối ưu số lượng AP, phủ kín các phòng)</option>
                <option value="high">Dự phòng cao (Gối sóng chuyển vùng liền mạch)</option>
              </select>
            </div>
          </div>

          {/* Room-Aware & Replace Existing Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={optimizeForRooms}
                onChange={(e) => setOptimizeForRooms(e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>
                ✓ Tối ưu hóa theo từng phòng & vách tường (Room-Aware & Wall-Aware Ray Tracing)
              </span>
            </label>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '22px' }}>
              AI tự động tính toán tia sóng xuyên qua từng bức tường đã vẽ, phân bổ AP đều cho phòng khách, phòng ngủ và hành lang, tuyệt đối không đặt đè lên tường.
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              <span>Thay thế các AP cũ nằm trong khu vực này (thay vì thêm mới)</span>
            </label>
          </div>

          {/* AI Execution button */}
          <button
            type="button"
            className="rf-btn-primary"
            onClick={handleRunAi}
            disabled={isCalculating}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            {isCalculating ? (
              <>
                <RefreshCw size={18} className="rf-spin" />
                <span>AI Đang Tính Toán Mô Phỏng RF Theo Từng Phòng...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Chạy Thuật Toán AI Phân Bổ AP</span>
              </>
            )}
          </button>

          {/* AI Result Card */}
          {aiResult && (
            <div
              style={{
                background: '#0f172a',
                border: '1.5px solid #10b981',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                  <CheckCircle2 size={20} />
                  <strong style={{ fontSize: '15px' }}>AI Đã Tính Toán Thành Công!</strong>
                </div>
                {aiResult.stats.roomAware && (
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    ✓ Phân Bổ Theo Phòng (Room-Aware)
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Số AP Đề Xuất:</div>
                  <strong style={{ fontSize: '20px', color: '#38bdf8' }}>{aiResult.stats.apCount} APs</strong>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Độ Phủ Đạt Được:</div>
                  <strong style={{ fontSize: '20px', color: '#10b981' }}>{aiResult.stats.coveragePct || 98}%</strong>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Bán Kính Sóng 2D:</div>
                  <strong style={{ fontSize: '20px', color: '#f59e0b' }}>{aiResult.rfProfile.effectiveRadiusM} m</strong>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Mật Độ Phủ:</div>
                  <strong style={{ fontSize: '20px', color: '#cbd5e1' }}>{aiResult.stats.areaPerApSqm} m²/AP</strong>
                </div>
              </div>

              {/* AP List Preview */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                  Danh Sách AP Được Bố Trí Tự Động (Tự Động Tránh Tường & Xoay Kênh):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {aiResult.aps.map((ap) => (
                    <div
                      key={ap.id}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wifi size={14} style={{ color: '#38bdf8' }} />
                        <strong style={{ color: '#fff' }}>{ap.label}</strong>
                        <span style={{ color: '#94a3b8' }}>({ap.model})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', color: '#cbd5e1', fontSize: '11px' }}>
                        <span>
                          Tọa độ: <b>({ap.positionM.x.toFixed(1)}m, {ap.positionM.y.toFixed(1)}m)</b>
                        </span>
                        <span style={{ color: '#f472b6' }}>
                          5GHz: <b>Kênh {ap.radios?.['5']?.channelNumber || 36}</b>
                        </span>
                        <span style={{ color: '#38bdf8' }}>
                          2.4GHz: <b>Kênh {ap.radios?.['2.4']?.channelNumber || 1}</b>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                ✓ Đã tự động cấu hình xoay vòng <b>kênh phát không trùng lặp</b> (Non-overlapping channels) để chống nhiễu đồng kênh (CCI).
              </div>

              <button
                type="button"
                className="rf-btn-primary"
                onClick={handleApply}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  background: '#10b981',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                }}
              >
                <Check size={18} />
                <span>Áp Dụng {aiResult.stats.apCount} APs Này Vào Sơ Đồ & Cập Nhật Heatmap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
