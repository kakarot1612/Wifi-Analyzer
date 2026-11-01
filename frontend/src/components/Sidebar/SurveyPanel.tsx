import React, { useState } from 'react';
import { ProjectData, SurveyMeasurement, CalibrationResult } from '../../types';
import { api } from '../../services/api';
import {
  Activity,
  Upload,
  Sliders,
  CheckCircle2,
  TrendingDown,
  Info
} from 'lucide-react';

interface SurveyPanelProps {
  project: ProjectData;
  onUpdateProject: (updated: ProjectData) => void;
}

// Realistic walkthrough survey points inside warehouse matching Pic 1
const DEFAULT_SURVEY_POINTS: SurveyMeasurement[] = [
  { id: 'meas-01', xM: 14.0, yM: 10.0, zM: 1.2, band: '5', apLabel: 'WH-AP-01', measuredRssiDbm: -48.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-02', xM: 25.0, yM: 10.0, zM: 1.2, band: '5', apLabel: 'WH-AP-01', measuredRssiDbm: -56.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-03', xM: 35.0, yM: 10.0, zM: 1.2, band: '5', apLabel: 'WH-AP-01', measuredRssiDbm: -63.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-04', xM: 25.0, yM: 15.5, zM: 1.2, band: '5', apLabel: 'WH-AP-01', measuredRssiDbm: -69.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-05', xM: 14.0, yM: 21.0, zM: 1.2, band: '5', apLabel: 'WH-AP-02', measuredRssiDbm: -47.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-06', xM: 28.0, yM: 21.0, zM: 1.2, band: '5', apLabel: 'WH-AP-02', measuredRssiDbm: -58.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-07', xM: 38.0, yM: 21.0, zM: 1.2, band: '5', apLabel: 'WH-AP-02', measuredRssiDbm: -64.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-08', xM: 10.0, yM: 25.0, zM: 1.2, band: '5', apLabel: 'WH-AP-03', measuredRssiDbm: -52.0, clientDevice: 'Zebra TC52' },
  { id: 'meas-09', xM: 48.0, yM: 28.0, zM: 1.2, band: '5', apLabel: 'WH-AP-04', measuredRssiDbm: -54.0, clientDevice: 'Zebra TC52' },
];

export const SurveyPanel: React.FC<SurveyPanelProps> = ({
  project,
  onUpdateProject,
}) => {
  const [measurements, setMeasurements] = useState<SurveyMeasurement[]>(DEFAULT_SURVEY_POINTS);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  const handleRunCalibration = async () => {
    setIsCalibrating(true);
    try {
      const res = await api.calibrateSurvey({
        id: 'survey-warehouse-01',
        name: 'Warehouse Walkthrough Survey',
        projectId: project.project.id,
        surveyDate: '2026-10-24',
        totalPoints: measurements.length,
        measurements,
      });

      setCalibrationResult(res);
      setMeasurements(res.samplePoints);

      // Automatically update project path loss exponent to the calibrated recommendation
      if (res.status === 'calibrated') {
        const updated = {
          ...project,
          simulation: {
            ...project.simulation,
            pathLossExponent: res.recommendedPathLossExponent,
            calibrationStatus: 'calibrated' as const,
          },
        };
        onUpdateProject(updated);
      }
    } catch (err: any) {
      alert('Lỗi hiệu chỉnh mô hình: ' + err.message);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleLoadSampleSurvey = () => {
    setMeasurements(DEFAULT_SURVEY_POINTS);
    setCalibrationResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        alert('File CSV không hợp lệ hoặc không có dữ liệu đo.');
        return;
      }

      const parsed: SurveyMeasurement[] = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 8) {
          const id = parts[0] || `meas-${i}`;
          const xM = parseFloat(parts[1]) || 0;
          const yM = parseFloat(parts[2]) || 0;
          const zM = parseFloat(parts[3]) || 1.2;
          const band = parts[4] || '5';
          const apLabel = parts[5] || undefined;
          const channel = parseInt(parts[6]) || undefined;
          const measuredRssiDbm = parseFloat(parts[7]) || -70;
          const clientDevice = parts[8] || 'PDA';

          parsed.push({
            id,
            xM,
            yM,
            zM,
            band,
            apLabel,
            channel,
            measuredRssiDbm,
            clientDevice,
          });
        }
      }

      if (parsed.length > 0) {
        setMeasurements(parsed);
        setCalibrationResult(null);
        alert(`Đã nạp thành công ${parsed.length} điểm đo thực tế từ file CSV!`);
      } else {
        alert('Không trích xuất được dòng dữ liệu hợp lệ nào từ CSV. Vui lòng kiểm tra định dạng cột.');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const templateContent = `id,x_m,y_m,z_m,band_ghz,ap_label,channel,measured_rssi_dbm,client_device,note
P01,14.0,10.0,1.2,5,WH-AP-01,36,-48,Zebra TC52,Đầu lối đi kệ hàng A
P02,25.0,10.0,1.2,5,WH-AP-01,36,-56,Zebra TC52,Giữa lối đi kệ hàng A
P03,35.0,10.0,1.2,5,WH-AP-01,36,-63,Zebra TC52,Cuối lối đi kệ hàng A
P04,25.0,15.5,1.2,5,WH-AP-01,36,-69,Zebra TC52,Lối đi ngang kệ hàng B
P05,14.0,21.0,1.2,5,WH-AP-02,132,-47,Zebra TC52,Đầu lối đi kệ hàng C
P06,28.0,21.0,1.2,5,WH-AP-02,132,-58,Zebra TC52,Giữa lối đi kệ hàng C
P07,38.0,21.0,1.2,5,WH-AP-02,132,-64,Zebra TC52,Cuối lối đi kệ hàng C
P08,10.0,25.0,1.2,5,WH-AP-03,149,-52,Zebra TC52,Khu vực xếp dỡ Loading Dock
P09,48.0,28.0,1.2,5,WH-AP-04,100,-54,Zebra TC52,Khu vực văn phòng kho & IT`;

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_khao_sat_thuc_te.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="rf-panel-content">
      {/* Overview & Assumptions notice */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <Activity size={16} />
          <span>Khảo sát thực tế & Hiệu chỉnh mô hình RF</span>
        </div>
        <p className="rf-panel-desc">
          So sánh kết quả dự báo lý thuyết với dữ liệu đo thực tế từ thiết bị cầm tay (PDA/máy quét).
          Hệ thống sẽ tối ưu hóa hệ số suy hao <b>Path Loss Exponent (n)</b> để giảm thiểu sai số RMSE.
        </p>

        <div className="rf-survey-actions-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <label className="rf-action-btn rf-btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            <span>Nạp file CSV đo</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            className="rf-action-btn rf-btn-secondary"
            onClick={handleDownloadTemplate}
            title="Tải tệp mẫu CSV để nhập số liệu thực tế"
          >
            <span>Tải mẫu CSV</span>
          </button>

          <button
            className="rf-action-btn rf-btn-primary"
            onClick={handleRunCalibration}
            disabled={isCalibrating}
          >
            <Sliders size={14} />
            <span>{isCalibrating ? 'Đang tối ưu hóa...' : 'Hiệu chỉnh RF'}</span>
          </button>
        </div>
      </div>

      {/* Calibration Results Banner */}
      {calibrationResult && (
        <div className="rf-panel-section">
          <div className="rf-calibration-banner">
            <div className="rf-calib-header">
              <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
              <strong>{calibrationResult.summaryMessage}</strong>
            </div>

            <div className="rf-calib-metrics-grid">
              <div className="rf-calib-box">
                <span className="lbl">Sai số ban đầu (RMSE):</span>
                <strong className="val orig">{calibrationResult.originalRmseDb} dB</strong>
                <span className="sub">Hệ số n = {calibrationResult.originalPathLossExponent}</span>
              </div>

              <div className="rf-calib-box">
                <span className="lbl">Sau hiệu chỉnh (RMSE):</span>
                <strong className="val opt">{calibrationResult.calibratedRmseDb} dB</strong>
                <span className="sub" style={{ color: '#22c55e' }}>
                  Hệ số n = {calibrationResult.recommendedPathLossExponent} (Tối ưu)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Survey Measurements Table */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <span>Dữ liệu đo hiện trường ({measurements.length} điểm)</span>
        </div>

        <div className="rf-table-wrapper">
          <table className="rf-data-table">
            <thead>
              <tr>
                <th>Điểm</th>
                <th>Tọa độ (m)</th>
                <th>AP phát</th>
                <th>Đo thực tế</th>
                <th>Dự báo</th>
                <th>Sai số (Δ)</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.id}</strong></td>
                  <td>({m.xM}, {m.yM})</td>
                  <td><span className="rf-tag-ap">{m.apLabel}</span></td>
                  <td><b>{m.measuredRssiDbm} dBm</b></td>
                  <td>
                    {m.predictedRssiDbm !== undefined && m.predictedRssiDbm !== null
                      ? `${m.predictedRssiDbm} dBm`
                      : '—'}
                  </td>
                  <td>
                    {m.deltaDb !== undefined && m.deltaDb !== null ? (
                      <span
                        style={{
                          color: Math.abs(m.deltaDb) <= 3.0 ? '#22c55e' : '#f59e0b',
                          fontWeight: 600,
                        }}
                      >
                        {m.deltaDb > 0 ? `+${m.deltaDb}` : m.deltaDb} dB
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
