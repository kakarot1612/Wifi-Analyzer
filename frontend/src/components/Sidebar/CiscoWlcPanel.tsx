import React, { useState, useEffect } from 'react';
import { ProjectData, CiscoApInventoryItem, ControllerConfig } from '../../types';
import { api } from '../../services/api';
import {
  Server,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link,
  Wifi,
  Users
} from 'lucide-react';

interface CiscoWlcPanelProps {
  project: ProjectData;
  onRefreshProject: () => void;
}

export const CiscoWlcPanel: React.FC<CiscoWlcPanelProps> = ({
  project,
  onRefreshProject,
}) => {
  const [controllers, setControllers] = useState<ControllerConfig[]>([]);
  const [selectedController, setSelectedController] = useState<string>('c9800-warehouse');
  const [host, setHost] = useState<string>('10.10.20.50');
  const [port, setPort] = useState<number>(443);
  const [username, setUsername] = useState<string>('admin_ro');
  const [password, setPassword] = useState<string>('Cisco123!');
  const [verifyTls, setVerifyTls] = useState<boolean>(false);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    supportedYangModules?: string[];
  } | null>(null);

  const [inventory, setInventory] = useState<CiscoApInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mappingApMac, setMappingApMac] = useState<string | null>(null);

  useEffect(() => {
    loadControllers();
  }, []);

  const loadControllers = async () => {
    try {
      const list = await api.listControllers();
      setControllers(list);
      if (list.length > 0) {
        setSelectedController(list[0].id);
        setHost(list[0].host);
        setPort(list[0].port);
        setUsername(list[0].username);
        fetchInventory(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInventory = async (ctrlId: string) => {
    setLoading(true);
    try {
      const aps = await api.getControllerAps(ctrlId);
      setInventory(aps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await api.testController({
        host,
        port,
        username,
        password,
        verifyTls,
      });
      setTestResult(res);
      if (res.success) {
        fetchInventory(selectedController);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối RESTCONF',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMapAp = async (apMac: string, targetProjectApId: string) => {
    try {
      await api.mapApToWlc(project.project.id, targetProjectApId, selectedController, apMac);
      onRefreshProject();
      fetchInventory(selectedController);
      setMappingApMac(null);
    } catch (err) {
      alert('Không thể ánh xạ AP: ' + err);
    }
  };

  return (
    <div className="rf-panel-content">
      {/* WLC Status Banner */}
      <div className="rf-panel-section">
        <div className="rf-wlc-status-card">
          <div className="rf-wlc-status-top">
            <Server size={20} className="rf-wlc-icon" />
            <div>
              <strong>Cisco Catalyst 9800-CL Wireless Controller</strong>
              <div className="rf-wlc-version">
                IOS XE: <b>17.9.4a</b> | Trạng thái: <span style={{ color: '#10b981' }}>Đã kết nối RESTCONF</span>
              </div>
            </div>
          </div>
          <div className="rf-security-callout">
            <ShieldCheck size={14} />
            <span>
              Chế độ bảo mật Read-Only (YANG: Cisco-IOS-XE-wireless-access-point-oper). Không gửi lệnh ghi vào WLC.
            </span>
          </div>
        </div>
      </div>

      {/* Connection Config Form */}
      <div className="rf-panel-section">
        <div className="rf-section-title">
          <span>Thông số kết nối RESTCONF</span>
        </div>

        <div className="rf-form-grid-2">
          <div className="rf-form-col">
            <label>Địa chỉ IP Controller:</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="10.10.20.50"
            />
          </div>
          <div className="rf-form-col">
            <label>Cổng HTTPS:</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || 443)}
            />
          </div>
        </div>

        <div className="rf-form-grid-2">
          <div className="rf-form-col">
            <label>Tài khoản API:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="rf-form-col">
            <label>Mật khẩu:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <label className="rf-checkbox-row">
          <input
            type="checkbox"
            checked={verifyTls}
            onChange={(e) => setVerifyTls(e.target.checked)}
          />
          <span>Xác thực chứng thư TLS/HTTPS (Bật trong môi trường Production)</span>
        </label>

        <div className="rf-btn-group-right">
          <button
            className="rf-action-btn rf-btn-primary"
            onClick={handleTestConnection}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Đang kiểm tra...' : 'Kiểm tra kết nối RESTCONF'}</span>
          </button>
        </div>

        {testResult && (
          <div className={`rf-test-result-box ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <div>
              <strong>{testResult.message}</strong>
              {testResult.supportedYangModules && (
                <div className="rf-yang-list">
                  YANG modules: {testResult.supportedYangModules.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AP Inventory from Controller */}
      <div className="rf-panel-section">
        <div className="rf-section-title" style={{ justifyContent: 'space-between' }}>
          <span>AP Inventory từ Controller ({inventory.length} APs)</span>
          <button
            className="rf-btn-text"
            onClick={() => fetchInventory(selectedController)}
          >
            Đồng bộ lại
          </button>
        </div>

        <div className="rf-inventory-list">
          {inventory.map((ap) => {
            const mappedProjectAp = project.aps.find(
              (pAp) => pAp.wlcBinding.apMac === ap.apMac
            );

            return (
              <div key={ap.apMac} className="rf-inventory-card">
                <div className="rf-inv-header">
                  <div className="rf-inv-title-wrap">
                    <Wifi size={16} className="rf-inv-icon" />
                    <strong>{ap.apName}</strong>
                    <span className="rf-inv-model">{ap.model}</span>
                  </div>
                  <span className="rf-inv-status joined">Joined</span>
                </div>

                <div className="rf-inv-details-grid">
                  <div>MAC: <code>{ap.apMac}</code></div>
                  <div>IP: <code>{ap.ipAddress}</code></div>
                  <div>Vị trí: <span>{ap.locationString}</span></div>
                  <div>
                    <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {ap.radios.reduce((acc, r) => acc + r.clientCount, 0)} clients
                  </div>
                </div>

                {/* Radios breakdown */}
                <div className="rf-inv-radios">
                  {ap.radios.map((r, rIdx) => (
                    <span key={rIdx} className="rf-inv-radio-tag">
                      {r.band} GHz: Ch {r.channel} ({r.txPowerDbm} dBm)
                    </span>
                  ))}
                </div>

                {/* Map to Project AP Action */}
                <div className="rf-inv-mapping-row">
                  {mappedProjectAp ? (
                    <div className="rf-mapped-pill">
                      <CheckCircle2 size={13} />
                      <span>Đã gắn với {mappedProjectAp.label} trên sơ đồ</span>
                    </div>
                  ) : (
                    <div className="rf-map-action-box">
                      {mappingApMac === ap.apMac ? (
                        <div className="rf-map-dropdown-row">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleMapAp(ap.apMac, e.target.value);
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              -- Chọn AP trên sơ đồ để gán --
                            </option>
                            {project.aps.map((pAp) => (
                              <option key={pAp.id} value={pAp.id}>
                                {pAp.label} ({pAp.model})
                              </option>
                            ))}
                          </select>
                          <button
                            className="rf-btn-text"
                            onClick={() => setMappingApMac(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          className="rf-action-btn rf-btn-secondary"
                          onClick={() => setMappingApMac(ap.apMac)}
                        >
                          <Link size={13} />
                          <span>Ánh xạ lên AP sơ đồ</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
