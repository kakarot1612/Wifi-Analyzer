import React from 'react';
import { ProjectData, Material, ReceiverProfile } from '../../types';
import { Layers, Smartphone, Shield, Sliders } from 'lucide-react';

interface MaterialsPanelProps {
  project: ProjectData;
  onUpdateProject: (updated: ProjectData) => void;
}

export const MaterialsPanel: React.FC<MaterialsPanelProps> = ({
  project,
  onUpdateProject,
}) => {
  const clientPresets: ReceiverProfile[] = [
    {
      id: 'barcode-pda',
      name: 'Máy quét mã vạch Barcode PDA (Zebra TC52/TC57)',
      heightM: 1.2,
      bandsGHz: [2.4, 5.0],
      targetRssiDbm: -65.0,
      targetSnrDb: 25.0,
      rxGainDbi: 0.0,
    },
    {
      id: 'warehouse-tablet',
      name: 'Tablet xe nâng / Máy tính kho (Rugged Tablet)',
      heightM: 1.8,
      bandsGHz: [2.4, 5.0],
      targetRssiDbm: -67.0,
      targetSnrDb: 20.0,
      rxGainDbi: 1.0,
    },
    {
      id: 'vowifi-handset',
      name: 'Điện thoại bộ đàm VoWiFi (Ascom / Spectralink)',
      heightM: 1.5,
      bandsGHz: [5.0],
      targetRssiDbm: -65.0,
      targetSnrDb: 25.0,
      rxGainDbi: 0.0,
    },
    {
      id: 'laptop-6e',
      name: 'Laptop kỹ thuật (Wi-Fi 6E Tri-Band Client)',
      heightM: 0.8,
      bandsGHz: [2.4, 5.0, 6.0],
      targetRssiDbm: -70.0,
      targetSnrDb: 20.0,
      rxGainDbi: 2.0,
    },
  ];

  return (
    <div className="rf-panel-content">
      {/* Receiver Profile Settings */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <Smartphone size={16} />
          <span>Hồ sơ thiết bị thu (Receiver Profile)</span>
        </div>

        <div className="rf-form-row">
          <label>Mẫu thiết bị sử dụng:</label>
          <select
            value={project.project.receiverProfile.id}
            onChange={(e) => {
              const selectedPreset = clientPresets.find((p) => p.id === e.target.value);
              if (selectedPreset) {
                onUpdateProject({
                  ...project,
                  project: {
                    ...project.project,
                    receiverProfile: selectedPreset,
                  },
                });
              }
            }}
          >
            {clientPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rf-form-grid-2">
          <div className="rf-form-col">
            <label>Cao độ cầm máy (m):</label>
            <input
              type="number"
              step="0.1"
              value={project.project.receiverProfile.heightM}
              onChange={(e) => {
                onUpdateProject({
                  ...project,
                  project: {
                    ...project.project,
                    receiverProfile: {
                      ...project.project.receiverProfile,
                      heightM: parseFloat(e.target.value) || 1.2,
                    },
                  },
                });
              }}
            />
          </div>

          <div className="rf-form-col">
            <label>Mục tiêu RSSI (dBm):</label>
            <input
              type="number"
              step="1"
              value={project.project.receiverProfile.targetRssiDbm}
              onChange={(e) => {
                onUpdateProject({
                  ...project,
                  project: {
                    ...project.project,
                    receiverProfile: {
                      ...project.project.receiverProfile,
                      targetRssiDbm: parseFloat(e.target.value) || -65,
                    },
                  },
                });
              }}
            />
          </div>
        </div>

        <div className="rf-form-grid-2">
          <div className="rf-form-col">
            <label>Mục tiêu SNR (dB):</label>
            <input
              type="number"
              step="1"
              value={project.project.receiverProfile.targetSnrDb}
              onChange={(e) => {
                onUpdateProject({
                  ...project,
                  project: {
                    ...project.project,
                    receiverProfile: {
                      ...project.project.receiverProfile,
                      targetSnrDb: parseFloat(e.target.value) || 25,
                    },
                  },
                });
              }}
            />
          </div>

          <div className="rf-form-col">
            <label>Độ lợi anten máy (dBi):</label>
            <input
              type="number"
              step="0.5"
              value={project.project.receiverProfile.rxGainDbi}
              onChange={(e) => {
                onUpdateProject({
                  ...project,
                  project: {
                    ...project.project,
                    receiverProfile: {
                      ...project.project.receiverProfile,
                      rxGainDbi: parseFloat(e.target.value) || 0,
                    },
                  },
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Materials Library */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <Layers size={16} />
          <span>Thư viện vật liệu & Suy hao suy giảm sóng</span>
        </div>

        <div className="rf-materials-list">
          {project.materials.map((mat) => (
            <div key={mat.id} className="rf-material-card">
              <div className="rf-mat-header">
                <span
                  className="rf-mat-color-dot"
                  style={{ backgroundColor: mat.color }}
                />
                <strong>{mat.name}</strong>
              </div>

              <div className="rf-mat-loss-row">
                <div className="rf-mat-loss-badge">
                  <span>2.4 GHz:</span>
                  <strong>{mat.attenuationDb['2.4']} dB</strong>
                </div>
                <div className="rf-mat-loss-badge">
                  <span>5 GHz:</span>
                  <strong>{mat.attenuationDb['5']} dB</strong>
                </div>
                <div className="rf-mat-loss-badge">
                  <span>6 GHz:</span>
                  <strong>{mat.attenuationDb['6']} dB</strong>
                </div>
              </div>

              {mat.description && (
                <div className="rf-mat-desc">{mat.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
