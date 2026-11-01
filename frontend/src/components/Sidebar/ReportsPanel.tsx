import React from 'react';
import { ProjectData } from '../../types';
import { api } from '../../services/api';
import { FileText, Download, Code, FileSpreadsheet, ShieldAlert } from 'lucide-react';

interface ReportsPanelProps {
  project: ProjectData;
  onUpdateProject: (updated: ProjectData) => void;
  onExportPdf: () => void;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  project,
  onUpdateProject,
  onExportPdf,
}) => {
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wifi_rf_project_${project.project.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = ['AP Label', 'Vendor', 'Model', 'X (m)', 'Y (m)', 'Z (m)', 'Mounting', 'Orientation (deg)', 'Antenna', '2.4GHz Ch/Pwr', '5GHz Ch/Pwr', '6GHz Ch/Pwr', 'WLC MAC'];
    const rows = project.aps.map((ap) => {
      const r24 = ap.radios['2.4'];
      const r5 = ap.radios['5'];
      const r6 = ap.radios['6'];
      return [
        ap.label,
        ap.vendor,
        ap.model,
        ap.positionM.x,
        ap.positionM.y,
        ap.positionM.z,
        ap.mountingType,
        ap.orientationDeg,
        ap.antennaType,
        r24?.enabled ? `Ch ${r24.channelNumber} (${r24.txPowerDbm}dBm)` : 'OFF',
        r5?.enabled ? `Ch ${r5.channelNumber} (${r5.txPowerDbm}dBm)` : 'OFF',
        r6?.enabled ? `Ch ${r6.channelNumber} (${r6.txPowerDbm}dBm)` : 'N/A',
        ap.wlcBinding.apMac || '',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ap_inventory_${project.project.id}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="rf-panel-content">
      {/* Project Meta Editor */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <FileText size={16} />
          <span>Thông tin dự án & Xuất kết quả</span>
        </div>

        <div className="rf-form-row">
          <label>Tên dự án mặt bằng:</label>
          <input
            type="text"
            value={project.project.name}
            onChange={(e) =>
              onUpdateProject({
                ...project,
                project: { ...project.project, name: e.target.value },
              })
            }
          />
        </div>

        <div className="rf-form-grid-2">
          <div className="rf-form-col">
            <label>Mã dự án (ID):</label>
            <input
              type="text"
              value={project.project.id}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  project: { ...project.project, id: e.target.value },
                })
              }
            />
          </div>
          <div className="rf-form-col">
            <label>Chiều cao trần (m):</label>
            <input
              type="number"
              step="0.5"
              value={project.project.floorHeightM}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  project: {
                    ...project.project,
                    floorHeightM: parseFloat(e.target.value) || 8.0,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <Download size={16} />
          <span>Tùy chọn tải về</span>
        </div>

        <div className="rf-export-buttons">
          <button
            className="rf-export-card-btn"
            onClick={onExportPdf}
          >
            <div className="rf-export-card-icon" style={{ color: '#ef4444' }}>
              <FileText size={24} />
            </div>
            <div className="rf-export-card-info">
              <strong>Xuất báo cáo PDF thiết kế Wi-Fi</strong>
              <span>Tài liệu tiêu chuẩn: danh sách AP, tường, kệ, thông số RF và cảnh báo sai số</span>
            </div>
          </button>

          <button
            className="rf-export-card-btn"
            onClick={handleExportJson}
          >
            <div className="rf-export-card-icon" style={{ color: '#06b6d4' }}>
              <Code size={24} />
            </div>
            <div className="rf-export-card-info">
              <strong>Lưu trữ dự án (JSON Schema v1)</strong>
              <span>Xuất đầy đủ tọa độ AP, vật cản, tỉ lệ mét và cấu hình mô phỏng</span>
            </div>
          </button>

          <button
            className="rf-export-card-btn"
            onClick={handleExportCsv}
          >
            <div className="rf-export-card-icon" style={{ color: '#10b981' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div className="rf-export-card-info">
              <strong>Bảng kê Access Points (CSV)</strong>
              <span>Dành cho kỹ sư thi công kéo cáp, lắp đặt vị trí AP và IT cấu hình controller</span>
            </div>
          </button>
        </div>
      </div>

      {/* Regulatory & Disclaimer Box */}
      <div className="rf-panel-section">
        <div className="rf-disclaimer-box">
          <div className="rf-disclaimer-title">
            <ShieldAlert size={16} style={{ color: '#f59e0b' }} />
            <span>Quy định & Khuyến cáo kỹ thuật</span>
          </div>
          <p>
            Mô phỏng RF này dựa trên tính toán truyền sóng 3D và giả định vật liệu,
            chưa phải là phép đo sóng thực tế được chứng nhận. Đối với môi trường nhà kho
            có kệ kim loại cao 6-7m và hàng hóa thay đổi theo mùa, khuyến nghị khảo sát
            thực tế (Active/Passive Site Survey) để kiểm chứng hiệu năng PDA trước khi nghiệm thu.
          </p>
        </div>
      </div>
    </div>
  );
};
