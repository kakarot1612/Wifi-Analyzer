import React from 'react';
import { VisMetric, BandType, ProjectData } from '../types';
import { Wifi, Signal, Award, Copy, Info } from 'lucide-react';
import { RSSI_COLOR_STOPS, SNR_COLOR_STOPS } from '../utils/heatmapColors';

interface BottomBarProps {
  visMetric: VisMetric;
  onMetricChange: (metric: VisMetric) => void;
  activeBand: BandType;
  onBandChange: (band: BandType) => void;
  gridResolution: number;
  onGridResolutionChange: (res: number) => void;
  project: ProjectData;
  calcTimeMs?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  visMetric,
  onMetricChange,
  activeBand,
  onBandChange,
  gridResolution,
  onGridResolutionChange,
  project,
  calcTimeMs,
}) => {
  // Check if any AP in project actually supports 6 GHz
  const has6GHzAp = project.aps.some((ap) => ap.radios['6'] && ap.radios['6'].enabled);
  const clientSupports6GHz = project.project.receiverProfile.bandsGHz.includes(6.0);

  return (
    <footer className="rf-bottom-bar">
      {/* Metric Selector */}
      <div className="rf-bottom-section">
        <span className="rf-section-label">Chỉ số hiển thị:</span>
        <div className="rf-pill-group">
          <button
            className={`rf-pill-btn ${visMetric === 'rssi' ? 'active' : ''}`}
            onClick={() => onMetricChange('rssi')}
            title="Mức tín hiệu nhận (RSSI dBm)"
          >
            <Signal size={14} />
            <span>Mức sóng (RSSI)</span>
          </button>

          <button
            className={`rf-pill-btn ${visMetric === 'snr' ? 'active' : ''}`}
            onClick={() => onMetricChange('snr')}
            title="Tỉ số tín hiệu trên nhiễu (SNR dB)"
          >
            <Wifi size={14} />
            <span>SNR (dB)</span>
          </button>

          <button
            className={`rf-pill-btn ${visMetric === 'serving' ? 'active' : ''}`}
            onClick={() => onMetricChange('serving')}
            title="AP phục vụ mạnh nhất tại từng vị trí"
          >
            <Award size={14} />
            <span>AP phục vụ</span>
          </button>

          <button
            className={`rf-pill-btn ${visMetric === 'overlap' ? 'active' : ''}`}
            onClick={() => onMetricChange('overlap')}
            title="Số lượng AP phủ sóng đạt ngưỡng (Redundancy & Roaming)"
          >
            <Copy size={14} />
            <span>Chồng lấn (Overlap)</span>
          </button>
        </div>
      </div>

      {/* Band Selector */}
      <div className="rf-bottom-section">
        <span className="rf-section-label">Băng tần:</span>
        <div className="rf-pill-group">
          <button
            className={`rf-pill-btn ${activeBand === '2.4' ? 'active' : ''}`}
            onClick={() => onBandChange('2.4')}
          >
            2.4 GHz
          </button>

          <button
            className={`rf-pill-btn ${activeBand === '5' ? 'active' : ''}`}
            onClick={() => onBandChange('5')}
          >
            5 GHz (Khuyên dùng)
          </button>

          <button
            className={`rf-pill-btn ${activeBand === '6' ? 'active' : ''}`}
            onClick={() => {
              if (!has6GHzAp) {
                alert('Chưa có AP nào hỗ trợ 6 GHz hoặc đã kích hoạt radio 6 GHz.');
                return;
              }
              onBandChange('6');
            }}
            title={
              has6GHzAp
                ? 'Băng tần 6 GHz (Wi-Fi 6E)'
                : 'Cần model AP (như C9164I/C9166I) và Client hỗ trợ 6 GHz'
            }
            style={{ opacity: has6GHzAp ? 1 : 0.6 }}
          >
            6 GHz {has6GHzAp ? '✓' : '(K.khả dụng)'}
          </button>
        </div>
      </div>

      {/* Resolution Selector */}
      <div className="rf-bottom-section">
        <span className="rf-section-label">Độ mịn lưới:</span>
        <div className="rf-pill-group">
          <button
            className={`rf-pill-btn ${gridResolution === 0.8 ? 'active' : ''}`}
            onClick={() => onGridResolutionChange(0.8)}
          >
            Nhanh (0.8m)
          </button>
          <button
            className={`rf-pill-btn ${gridResolution === 0.5 ? 'active' : ''}`}
            onClick={() => onGridResolutionChange(0.5)}
          >
            Chuẩn (0.5m)
          </button>
          <button
            className={`rf-pill-btn ${gridResolution === 0.25 ? 'active' : ''}`}
            onClick={() => onGridResolutionChange(0.25)}
          >
            Chi tiết (0.25m)
          </button>
        </div>
      </div>

      {/* Heatmap Color Legend Bar */}
      <div className="rf-legend-container">
        {visMetric === 'rssi' && (
          <div className="rf-legend-wrap">
            <div className="rf-legend-gradient rssi-gradient" />
            <div className="rf-legend-labels">
              <span>-85</span>
              <span>-80</span>
              <span>-75 (Yếu)</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>-67 (Mục tiêu PDA)</span>
              <span>-60</span>
              <span>-50</span>
              <span>-35 dBm</span>
            </div>
          </div>
        )}

        {visMetric === 'snr' && (
          <div className="rf-legend-wrap">
            <div className="rf-legend-gradient snr-gradient" />
            <div className="rf-legend-labels">
              <span>0 dB</span>
              <span>12 dB</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>25 dB (Mục tiêu PDA)</span>
              <span>35 dB</span>
              <span>45+ dB</span>
            </div>
          </div>
        )}

        {visMetric === 'overlap' && (
          <div className="rf-legend-wrap">
            <div className="rf-overlap-legend">
              <span className="rf-overlap-badge" style={{ background: '#06b6d4' }}>1 AP</span>
              <span className="rf-overlap-badge" style={{ background: '#22c55e' }}>2 APs (Tốt)</span>
              <span className="rf-overlap-badge" style={{ background: '#f59e0b' }}>3+ APs (Chồng lấn cao)</span>
            </div>
          </div>
        )}

        {calcTimeMs !== undefined && (
          <div className="rf-calc-badge" title="Thời gian tính toán RF">
            {calcTimeMs.toFixed(0)} ms
          </div>
        )}
      </div>
    </footer>
  );
};
