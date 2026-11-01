import React from 'react';
import { AccessPoint, BandType, ProjectData } from '../../types';
import {
  Wifi,
  Trash2,
  Compass,
  ArrowUp,
  Radio,
  Sliders,
  Server,
  Layers
} from 'lucide-react';

interface ApEditorPanelProps {
  project: ProjectData;
  selectedApId: string | null;
  onSelectAp: (id: string | null) => void;
  onUpdateAp: (updatedAp: AccessPoint) => void;
  onDeleteAp: (id: string) => void;
  activeBand: BandType;
  onBandChange?: (band: BandType) => void;
}

export const ApEditorPanel: React.FC<ApEditorPanelProps> = ({
  project,
  selectedApId,
  onSelectAp,
  onUpdateAp,
  onDeleteAp,
  activeBand,
  onBandChange,
}) => {
  const selectedAp = project.aps.find((a) => a.id === selectedApId);

  const apModels = [
    { id: 'C9115AXI', name: 'Cisco C9115AXI (Wi-Fi 6, Internal Omni)', vendor: 'Cisco', has6G: false, defaultAnt: 'omni' },
    { id: 'C9115AXE-DIR', name: 'Cisco C9115AXE + AIR-ANT2566P4W-R (Patch 60° Kho)', vendor: 'Cisco', has6G: false, defaultAnt: 'directional_aisle' },
    { id: 'C9115AXE-OMNI', name: 'Cisco C9115AXE + AIR-ANT2524Db-R (Dipole Omni)', vendor: 'Cisco', has6G: false, defaultAnt: 'omni' },
    { id: 'C9120AXI', name: 'Cisco C9120AXI (Omni Nội Bộ)', vendor: 'Cisco', has6G: false, defaultAnt: 'omni' },
    { id: 'C9130AXE-DIR', name: 'Cisco C9130AXE + Patch Lối Đi Kho', vendor: 'Cisco', has6G: false, defaultAnt: 'directional_aisle' },
    { id: 'C9164I', name: 'Cisco C9164I (Wi-Fi 6E Tri-Band)', vendor: 'Cisco', has6G: true, defaultAnt: 'omni' },
    { id: 'C9166I', name: 'Cisco C9166I Enterprise Flagship (6E)', vendor: 'Cisco', has6G: true, defaultAnt: 'omni' },
    { id: 'AP-574-DIR', name: 'Aruba AP-574 + Directional Aisle (Pic 1)', vendor: 'Aruba', has6G: false, defaultAnt: 'directional_aisle' },
  ];

  return (
    <div className="rf-panel-content">
      {/* AP List Header */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <Wifi size={16} />
          <span>Danh sách Access Points ({project.aps.length})</span>
        </div>

        <div className="rf-ap-pills-list">
          {project.aps.map((ap, idx) => {
            const isSel = ap.id === selectedApId;
            const curRadio = ap.radios ? ap.radios[activeBand] : undefined;
            const isRadioOn = curRadio ? (curRadio.enabled !== false) : true;
            const chNum = curRadio?.channelNumber ?? (activeBand === '2.4' ? 1 : 36);
            const pwr = curRadio?.txPowerDbm ?? 14;
            return (
              <div
                key={ap.id}
                className={`rf-ap-pill-card ${isSel ? 'selected' : ''}`}
                onClick={() => onSelectAp(ap.id)}
              >
                <div className="rf-ap-pill-top">
                  <div className="rf-ap-badge-idx">{idx + 1}</div>
                  <strong className="rf-ap-pill-label">{ap.label}</strong>
                  <span className="rf-ap-vendor-tag">{ap.vendor}</span>
                </div>
                <div className="rf-ap-pill-sub">
                  <span>{ap.model}</span>
                  <span style={{ color: isRadioOn ? '#38bdf8' : '#64748b' }}>
                    {isRadioOn ? `Ch ${chNum} | ${pwr}dBm (${activeBand}G)` : 'Radio OFF'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected AP Details Form */}
      {selectedAp ? (
        <div className="rf-panel-section rf-card-details">
          <div className="rf-section-title" style={{ justifyContent: 'space-between' }}>
            <span>Chi tiết AP: {selectedAp.label}</span>
            <button
              className="rf-icon-btn-danger"
              onClick={() => onDeleteAp(selectedAp.id)}
              title="Xóa Access Point này"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Label & Model */}
          <div className="rf-form-row">
            <label>Tên định danh:</label>
            <input
              type="text"
              value={selectedAp.label}
              onChange={(e) =>
                onUpdateAp({ ...selectedAp, label: e.target.value })
              }
            />
          </div>

          <div className="rf-form-row">
            <label>Model phần cứng:</label>
            <select
              value={selectedAp.model}
              onChange={(e) => {
                const modelDef = apModels.find((m) => m.id === e.target.value);
                const updatedRadios = { ...selectedAp.radios };
                if (modelDef && !modelDef.has6G && updatedRadios['6']) {
                  updatedRadios['6'].enabled = false;
                  updatedRadios['6'].reason = 'Model không hỗ trợ 6 GHz';
                }
                onUpdateAp({
                  ...selectedAp,
                  model: e.target.value,
                  vendor: modelDef?.vendor || selectedAp.vendor,
                  antennaType: e.target.value.includes('DIR') ? 'directional_aisle' : 'omni',
                  radios: updatedRadios,
                });
              }}
            >
              {apModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position & Height */}
          <div className="rf-form-grid-3">
            <div className="rf-form-col">
              <label>Tọa độ X (m):</label>
              <input
                type="number"
                step="0.5"
                value={selectedAp.positionM.x.toFixed(1)}
                onChange={(e) =>
                  onUpdateAp({
                    ...selectedAp,
                    positionM: {
                      ...selectedAp.positionM,
                      x: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="rf-form-col">
              <label>Tọa độ Y (m):</label>
              <input
                type="number"
                step="0.5"
                value={selectedAp.positionM.y.toFixed(1)}
                onChange={(e) =>
                  onUpdateAp({
                    ...selectedAp,
                    positionM: {
                      ...selectedAp.positionM,
                      y: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="rf-form-col">
              <label>Độ cao Z (m):</label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="15.0"
                value={selectedAp.positionM.z}
                onChange={(e) =>
                  onUpdateAp({
                    ...selectedAp,
                    positionM: {
                      ...selectedAp.positionM,
                      z: parseFloat(e.target.value) || 3.0,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Antenna Orientation & Azimuth */}
          <div className="rf-form-row">
            <div className="rf-slider-header">
              <label>
                <Compass size={14} /> Hướng anten (Azimuth):
              </label>
              <strong style={{ color: '#06b6d4' }}>{selectedAp.orientationDeg}°</strong>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={selectedAp.orientationDeg}
              onChange={(e) =>
                onUpdateAp({
                  ...selectedAp,
                  orientationDeg: parseInt(e.target.value),
                })
              }
            />
            <div className="rf-compass-marks">
              <span>0° (Đông)</span>
              <span>90° (Nam)</span>
              <span>180° (Tây)</span>
              <span>270° (Bắc)</span>
            </div>
          </div>

          {/* Antenna Type */}
          <div className="rf-form-row">
            <label>Kiểu anten:</label>
            <select
              value={selectedAp.antennaType}
              onChange={(e) =>
                onUpdateAp({
                  ...selectedAp,
                  antennaType: e.target.value as any,
                })
              }
            >
              <option value="omni">Đẳng hướng (Omni 360° tiêu chuẩn)</option>
              <option value="directional_aisle">
                Định hướng lối đi kho (Narrow Aisle Directional - Pic 3)
              </option>
            </select>
          </div>

          {/* Radio Configuration per band */}
          <div className="rf-radio-tabs">
            {(['2.4', '5', '6'] as BandType[]).map((band) => {
              const radio = selectedAp.radios ? selectedAp.radios[band] : undefined;
              const isSupported = radio !== undefined || band !== '6';
              const isEnabled = radio ? (radio.enabled !== false) : true;
              const isActiveViewing = activeBand === band;

              return (
                <div
                  key={band}
                  className={`rf-radio-card ${isActiveViewing ? 'rf-radio-card-active' : ''}`}
                  style={{
                    borderColor: isActiveViewing ? '#38bdf8' : undefined,
                    boxShadow: isActiveViewing ? '0 0 10px rgba(56, 189, 248, 0.15)' : undefined,
                  }}
                >
                  <div className="rf-radio-card-header">
                    <label className="rf-radio-toggle">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={!isSupported}
                        onChange={(e) => {
                          const updatedRadios = { ...selectedAp.radios };
                          if (!updatedRadios[band]) {
                            updatedRadios[band] = {
                              enabled: e.target.checked,
                              channelNumber: band === '2.4' ? 1 : 36,
                              channelMHz: band === '2.4' ? 2412 : 5180,
                              txPowerDbm: 14,
                              antennaGainDbi: band === '2.4' ? 4 : 6,
                              cableLossDb: 0,
                              channelWidthMHz: 20,
                            };
                          } else {
                            updatedRadios[band].enabled = e.target.checked;
                          }
                          onUpdateAp({ ...selectedAp, radios: updatedRadios });
                        }}
                      />
                      <strong>Radio {band} GHz</strong>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {onBandChange && (
                        <button
                          type="button"
                          className={`rf-pill-btn ${isActiveViewing ? 'active' : ''}`}
                          style={{ padding: '2px 8px', fontSize: '10px' }}
                          onClick={() => onBandChange(band)}
                          title={`Xem phổ sóng băng tần ${band} GHz`}
                        >
                          {isActiveViewing ? '✓ Đang xem' : 'Xem sóng'}
                        </button>
                      )}
                      <span className={`rf-tag-status ${isEnabled ? 'on' : 'off'}`}>
                        {isEnabled ? 'BẬT' : 'TẮT'}
                      </span>
                    </div>
                  </div>

                  {radio && (
                    <div className="rf-radio-fields">
                      <div className="rf-form-row">
                        <label>Kênh (Channel):</label>
                        <select
                          value={radio.channelNumber}
                          disabled={!isEnabled}
                          onChange={(e) => {
                            const chNum = parseInt(e.target.value);
                            const updatedRadios = { ...selectedAp.radios };
                            updatedRadios[band].channelNumber = chNum;
                            onUpdateAp({ ...selectedAp, radios: updatedRadios });
                          }}
                        >
                          {band === '2.4' && (
                            <>
                              <option value="1">Kênh 1 (2412 MHz)</option>
                              <option value="6">Kênh 6 (2437 MHz)</option>
                              <option value="11">Kênh 11 (2462 MHz)</option>
                            </>
                          )}
                          {band === '5' && (
                            <>
                              <option value="36">Kênh 36 (5180 MHz)</option>
                              <option value="40">Kênh 40 (5200 MHz)</option>
                              <option value="44">Kênh 44 (5220 MHz)</option>
                              <option value="48">Kênh 48 (5240 MHz)</option>
                              <option value="100">Kênh 100 (5500 MHz)</option>
                              <option value="132">Kênh 132 (5660 MHz)</option>
                              <option value="149">Kênh 149 (5745 MHz)</option>
                              <option value="161">Kênh 161 (5805 MHz)</option>
                            </>
                          )}
                          {band === '6' && (
                            <>
                              <option value="37">Kênh 37 (6135 MHz)</option>
                              <option value="69">Kênh 69 (6295 MHz)</option>
                              <option value="101">Kênh 101 (6455 MHz)</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="rf-form-row">
                        <div className="rf-slider-header">
                          <label>Công suất phát (Tx Power):</label>
                          <strong style={{ color: '#22c55e' }}>{radio.txPowerDbm} dBm</strong>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="23"
                          disabled={!isEnabled}
                          value={radio.txPowerDbm}
                          onChange={(e) => {
                            const updatedRadios = { ...selectedAp.radios };
                            updatedRadios[band].txPowerDbm = parseInt(e.target.value);
                            onUpdateAp({ ...selectedAp, radios: updatedRadios });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cisco WLC Binding Info */}
          <div className="rf-wlc-binding-box">
            <Server size={14} />
            <div>
              <strong>Liên kết WLC:</strong>{' '}
              {selectedAp.wlcBinding.apMac ? (
                <span style={{ color: '#10b981' }}>
                  Đã ánh xạ tới MAC {selectedAp.wlcBinding.apMac}
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Chưa ánh xạ WLC (Tạo thủ công)
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rf-empty-hint">
          <span>Chọn một Access Point trên sơ đồ hoặc bấm nút để chỉnh sửa thông số.</span>
        </div>
      )}
    </div>
  );
};
