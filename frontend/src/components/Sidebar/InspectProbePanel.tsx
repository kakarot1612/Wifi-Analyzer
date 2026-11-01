import React, { useState } from 'react';
import { SampleResponse, ProjectData } from '../../types';
import { Crosshair, ShieldCheck, AlertTriangle, Layers, ChevronDown, ChevronRight } from 'lucide-react';

interface InspectProbePanelProps {
  probePoint: [number, number] | null;
  probeSample: SampleResponse | null;
  project: ProjectData;
  onClearProbe: () => void;
}

export const InspectProbePanel: React.FC<InspectProbePanelProps> = ({
  probePoint,
  probeSample,
  project,
  onClearProbe,
}) => {
  const [expandedApId, setExpandedApId] = useState<string | null>(null);

  if (!probeSample || !probePoint) {
    return (
      <div className="rf-panel-content">
        <div className="rf-empty-hint">
          <Crosshair size={32} style={{ color: '#06b6d4', marginBottom: 12 }} />
          <h3>Chế độ đo kiểm điểm 3D (Point Probe)</h3>
          <p>
            Nhấp chuột vào bất kỳ vị trí nào trên bản vẽ để phân tích chi tiết mức sóng,
            đường truyền 3D và các vật cản (tường, kệ kho) bị tia sóng cắt ngang từ từng AP.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'very_good':
        return <span className="rf-status-pill green">RẤT TỐT (≥ -60 dBm)</span>;
      case 'good':
        return <span className="rf-status-pill green">TỐT (Đạt mục tiêu PDA)</span>;
      case 'moderate':
        return <span className="rf-status-pill yellow">TRUNG BÌNH (-67 đến -72 dBm)</span>;
      case 'weak':
        return <span className="rf-status-pill orange">YẾU (-72 đến -75 dBm)</span>;
      default:
        return <span className="rf-status-pill red">RẤT YẾU (Dưới -75 dBm)</span>;
    }
  };

  return (
    <div className="rf-panel-content">
      <div className="rf-panel-section">
        <div className="rf-section-title" style={{ justifyContent: 'space-between' }}>
          <span>Kết quả đo kiểm vị trí</span>
          <button className="rf-btn-text" onClick={onClearProbe}>
            Xóa điểm đo
          </button>
        </div>

        {/* Coordinate & Summary Card */}
        <div className="rf-probe-card">
          <div className="rf-probe-coords">
            <span>Tọa độ kiểm tra:</span>
            <strong>
              X: {probePoint[0].toFixed(2)}m, Y: {probePoint[1].toFixed(2)}m (Z={project.project.receiverProfile.heightM}m)
            </strong>
          </div>

          <div className="rf-probe-stats-grid">
            <div className="rf-probe-stat">
              <span className="label">RSSI Mạnh nhất:</span>
              <strong className="value" style={{ color: probeSample.bestRssiDbm >= -65 ? '#22c55e' : '#f59e0b' }}>
                {probeSample.bestRssiDbm} dBm
              </strong>
            </div>

            <div className="rf-probe-stat">
              <span className="label">SNR ước tính:</span>
              <strong className="value" style={{ color: probeSample.bestSnrDb >= 25 ? '#22c55e' : '#f59e0b' }}>
                {probeSample.bestSnrDb} dB
              </strong>
            </div>

            <div className="rf-probe-stat">
              <span className="label">AP phục vụ:</span>
              <strong className="value" style={{ color: '#38bdf8' }}>
                {probeSample.servingApId || 'Không có'}
              </strong>
            </div>

            <div className="rf-probe-stat">
              <span className="label">Đánh giá mục tiêu:</span>
              <div>{getStatusBadge(probeSample.status)}</div>
            </div>
          </div>

          <div className="rf-target-notice">
            <span>
              Hồ sơ: <b>{project.project.receiverProfile.name}</b> (Mục tiêu: {project.project.receiverProfile.targetRssiDbm} dBm, {project.project.receiverProfile.targetSnrDb} dB SNR)
            </span>
          </div>
        </div>
      </div>

      {/* AP Signals Table */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <span>Tín hiệu từ tất cả Access Points ({probeSample.apSignals.length})</span>
        </div>

        <div className="rf-signals-list">
          {probeSample.apSignals.map((sig) => {
            const isServing = sig.apId === probeSample.servingApId;
            const isExpanded = expandedApId === sig.apId;

            return (
              <div
                key={sig.apId}
                className={`rf-signal-card ${isServing ? 'serving' : ''}`}
              >
                <div
                  className="rf-signal-header"
                  onClick={() => setExpandedApId(isExpanded ? null : sig.apId)}
                >
                  <div className="rf-signal-title-wrap">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <strong>{sig.apLabel}</strong>
                    {isServing && <span className="rf-serving-badge">SERVING</span>}
                  </div>
                  <div className="rf-signal-rssi" style={{ color: sig.rssiDbm >= -65 ? '#22c55e' : '#f59e0b' }}>
                    {sig.rssiDbm} dBm
                  </div>
                </div>

                <div className="rf-signal-quick-metrics">
                  <span>Kênh: <b>{sig.channel}</b></span>
                  <span>Khoảng cách: <b>{sig.distance3DM}m</b></span>
                  <span>Suy hao vật cản: <b>{sig.obstacleLossDb} dB</b></span>
                  <span>SNR: <b>{sig.snrDb} dB</b></span>
                </div>

                {isExpanded && (
                  <div className="rf-signal-expanded-breakdown">
                    <div className="rf-breakdown-row">
                      <span>Công suất phát (Tx Power):</span>
                      <span>{sig.txPowerDbm} dBm</span>
                    </div>
                    <div className="rf-breakdown-row">
                      <span>Độ lợi anten góc tới (Gain):</span>
                      <span>+{sig.antennaGainDbi} dBi</span>
                    </div>
                    <div className="rf-breakdown-row">
                      <span>Công suất bức xạ đẳng hướng (EIRP):</span>
                      <span>{sig.eirpDbm} dBm</span>
                    </div>
                    <div className="rf-breakdown-row">
                      <span>Suy hao truyền sóng không gian tự do:</span>
                      <span>-{sig.freeSpaceLossDb} dB</span>
                    </div>
                    <div className="rf-breakdown-row">
                      <span>Tổng suy hao vật thể cắt ngang:</span>
                      <span style={{ color: '#ef4444' }}>-{sig.obstacleLossDb} dB</span>
                    </div>

                    {/* Crossed Obstacles Details */}
                    {sig.crossedObstacles.length > 0 ? (
                      <div className="rf-crossed-obstacles-box">
                        <span className="rf-sub-title">
                          <Layers size={12} /> Các vật cản bị tia sóng 3D cắt qua:
                        </span>
                        {sig.crossedObstacles.map((obs, oIdx) => (
                          <div key={oIdx} className="rf-crossed-item">
                            <span>• {obs.obstacleName} ({obs.materialName})</span>
                            <strong style={{ color: '#f87171' }}>-{obs.lossDb} dB</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rf-crossed-empty">
                        <span>✓ Đường truyền thẳng trực tiếp (LOS - Không bị vật cản cắt qua)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
