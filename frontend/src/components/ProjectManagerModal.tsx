import React, { useState, useEffect } from 'react';
import { ProjectSummary, CreateProjectRequest, ProjectData } from '../types';
import { api } from '../services/api';
import {
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  Calendar,
  Layers,
  Wifi,
  Ruler,
  X,
  Check,
  Building,
  Warehouse,
  Factory,
  FileText,
  FileImage
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;

interface ProjectManagerModalProps {
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onProjectCreated: (newProj: ProjectData) => void;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  currentProjectId,
  onSelectProject,
  onProjectCreated,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create form states
  const [newName, setNewName] = useState<string>('');
  const [newFloorHeight, setNewFloorHeight] = useState<number>(8.0);
  const [buildingType, setBuildingType] = useState<string>('warehouse');
  const [bgFileName, setBgFileName] = useState<string>('');
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [bgWidth, setBgWidth] = useState<number>(1440);
  const [bgHeight, setBgHeight] = useState<number>(900);
  const [estimatedWidthM, setEstimatedWidthM] = useState<number>(60.0);
  const [estimatedHeightM, setEstimatedHeightM] = useState<number>(36.0);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await api.listProjects();
      setProjects(list);
    } catch (err: any) {
      setErrorMsg('Lỗi khi tải danh sách dự án: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pId: string, pName: string) => {
    if (confirm(`Bạn có chắc muốn xóa dự án "${pName}"?`)) {
      try {
        await api.deleteProject(pId);
        await loadProjects();
        if (pId === currentProjectId) {
          onSelectProject('warehouse-tan-tao');
        }
      } catch (err: any) {
        alert('Không thể xóa dự án: ' + err.message);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Không thể tạo canvas');

        await (page.render as any)({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        setBgDataUrl(dataUrl);
        setBgFileName(file.name);
        setBgWidth(canvas.width);
        setBgHeight(canvas.height);

        const aspect = canvas.width / canvas.height;
        const defaultW = 60.0;
        setEstimatedWidthM(defaultW);
        setEstimatedHeightM(parseFloat((defaultW / aspect).toFixed(1)));
      } else {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const img = new Image();
          img.onload = () => {
            setBgDataUrl(loadEvt.target?.result as string);
            setBgFileName(file.name);
            setBgWidth(img.width);
            setBgHeight(img.height);

            const aspect = img.width / img.height;
            const defaultW = 60.0;
            setEstimatedWidthM(defaultW);
            setEstimatedHeightM(parseFloat((defaultW / aspect).toFixed(1)));
          };
          img.src = loadEvt.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      alert('Lỗi đọc bản vẽ: ' + err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Vui lòng nhập tên dự án');
      return;
    }

    setIsCreating(true);
    try {
      const newProj = await api.createProject({
        name: newName.trim(),
        floorHeightM: newFloorHeight,
        buildingType: buildingType,
        bgDataUrl: bgDataUrl,
        bgFileName: bgFileName || 'Mat-Bang-Kien-Truc-2D.png',
        widthPx: bgWidth,
        heightPx: bgHeight,
        estimatedWidthM: estimatedWidthM,
        estimatedHeightM: estimatedHeightM,
      });
      onProjectCreated(newProj);
      onClose();
    } catch (err: any) {
      alert('Lỗi tạo dự án: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.project || !parsed.aps) {
          throw new Error('Định dạng tệp dự án JSON không hợp lệ');
        }
        const saved = await api.saveProject(parsed);
        onProjectCreated(saved);
        onClose();
      } catch (err: any) {
        alert('Lỗi nhập tệp JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rf-modal-backdrop">
      <div className="rf-modal-card" style={{ maxWidth: '850px', width: '92vw' }}>
        <div className="rf-modal-header">
          <div className="rf-modal-title">
            <FolderOpen size={20} style={{ color: '#38bdf8' }} />
            <span>Quản Lý Dự Án Wi-Fi RF</span>
          </div>
          <button className="rf-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', padding: '0 20px', background: '#0f172a' }}>
          <button
            className={`rf-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            style={{ padding: '10px 16px', borderRadius: 0, borderBottom: activeTab === 'list' ? '2px solid #38bdf8' : 'none' }}
          >
            <FolderOpen size={15} />
            <span>Danh Sách Dự Án ({projects.length})</span>
          </button>
          <button
            className={`rf-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            style={{ padding: '10px 16px', borderRadius: 0, borderBottom: activeTab === 'create' ? '2px solid #38bdf8' : 'none' }}
          >
            <Plus size={15} />
            <span>Tạo Dự Án Mới</span>
          </button>
        </div>

        <div className="rf-modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}

          {activeTab === 'list' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                  Chọn một dự án đã lưu để mở xem mô phỏng RF, chỉnh sửa Access Point hoặc mặt bằng.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label className="rf-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>
                    <Upload size={14} />
                    <span>Nhập file JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
                  </label>
                  <button className="rf-btn-primary" onClick={() => setActiveTab('create')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>
                    <Plus size={14} />
                    <span>Tạo mới</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Đang tải danh sách dự án...
                </div>
              ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Chưa có dự án nào được lưu.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                  {projects.map((p) => {
                    const isCurrent = p.id === currentProjectId;
                    return (
                      <div
                        key={p.id}
                        style={{
                          background: isCurrent ? 'rgba(56, 189, 248, 0.08)' : '#1e293b',
                          border: isCurrent ? '1.5px solid #38bdf8' : '1px solid #334155',
                          borderRadius: '8px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isCurrent ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '14px', color: '#f8fafc', lineHeight: 1.3 }}>{p.name}</strong>
                            {isCurrent && (
                              <span style={{ background: '#0284c7', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                Đang mở
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Wifi size={13} style={{ color: '#38bdf8' }} />
                              <span><b>{p.apCount}</b> Access Points</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Layers size={13} style={{ color: '#f59e0b' }} />
                              <span><b>{p.obstacleCount}</b> Vách tường / Kệ kho</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Ruler size={13} style={{ color: '#10b981' }} />
                              <span>Trần cao: <b>{p.floorHeightM} m</b> (Tỷ lệ: {p.pixelsPerMeter} px/m)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={13} style={{ color: '#64748b' }} />
                              <span>Cập nhật: {p.updatedAt}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                          <button
                            className="rf-btn-primary"
                            onClick={() => {
                              onSelectProject(p.id);
                              onClose();
                            }}
                            style={{ flex: 1, padding: '6px 10px', fontSize: '12px', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                          >
                            <FolderOpen size={13} />
                            <span>Mở dự án</span>
                          </button>
                          <button
                            className="rf-icon-btn-danger"
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Xóa dự án này"
                            style={{ padding: '6px', borderRadius: '4px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="rf-form-row">
                <label style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>Tên dự án quy hoạch:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kho Logistics Bình Tân - Khu Racking 8m"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="rf-form-row">
                  <label style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>Loại công trình:</label>
                  <select
                    value={buildingType}
                    onChange={(e) => {
                      setBuildingType(e.target.value);
                      if (e.target.value === 'warehouse') setNewFloorHeight(8.0);
                      else if (e.target.value === 'office') setNewFloorHeight(3.5);
                      else if (e.target.value === 'factory') setNewFloorHeight(10.0);
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  >
                    <option value="warehouse">Kho hàng Logistics (Kệ Pallet 6-7m, Trần 8m)</option>
                    <option value="office">Tòa nhà Văn phòng (Thạch cao, Kính, Trần 3.5m)</option>
                    <option value="factory">Nhà xưởng Sản xuất Công nghiệp (Bê tông, Trần 10m)</option>
                  </select>
                </div>

                <div className="rf-form-row">
                  <label style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>Chiều cao trần nhà (m):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="25"
                    value={newFloorHeight}
                    onChange={(e) => setNewFloorHeight(parseFloat(e.target.value) || 6.0)}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Upload Floorplan */}
              <div className="rf-form-row">
                <label style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>Bản vẽ mặt bằng 2D (Tùy chọn tải ngay):</label>
                <div style={{ border: '2px dashed #334155', borderRadius: '8px', padding: '16px', textAlign: 'center', background: '#0f172a' }}>
                  {bgDataUrl ? (
                    <div>
                      <img
                        src={bgDataUrl}
                        alt="Bản vẽ"
                        style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#38bdf8', fontSize: '13px' }}>
                        <FileImage size={18} />
                        <span style={{ fontWeight: 600 }}>{bgFileName}</span>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>({bgWidth} × {bgHeight} px)</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={30} style={{ color: '#64748b', marginBottom: '6px' }} />
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#cbd5e1' }}>
                        Tải tệp bản vẽ <b>PDF</b> hoặc ảnh <b>PNG / JPG</b>
                      </p>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        (Bản vẽ sẽ được vẽ trực tiếp lên nền 2D mặt bằng của dự án)
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    id="new-proj-file"
                    style={{ display: 'none' }}
                  />
                  <div style={{ marginTop: '10px' }}>
                    <label
                      htmlFor="new-proj-file"
                      className="rf-btn-secondary"
                      style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px', borderRadius: '6px', display: 'inline-block' }}
                    >
                      {bgDataUrl ? 'Đổi tệp bản vẽ khác' : 'Chọn tệp bản vẽ'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Estimated Real Dimensions for New Project */}
              {bgDataUrl && (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '12px', marginBottom: '8px' }}>
                    <Ruler size={15} />
                    <span>Kích thước ước lượng thực tế để căn chỉnh tỷ lệ:</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#cbd5e1' }}>Chiều ngang ước lượng (m):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={estimatedWidthM}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 10;
                          setEstimatedWidthM(val);
                          if (bgWidth && bgHeight) {
                            setEstimatedHeightM(parseFloat((val * (bgHeight / bgWidth)).toFixed(1)));
                          }
                        }}
                        style={{ width: '100%', padding: '6px 8px', background: '#070a13', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '12px', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#cbd5e1' }}>Chiều dọc ước lượng (m):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={estimatedHeightM}
                        onChange={(e) => setEstimatedHeightM(parseFloat(e.target.value) || 10)}
                        style={{ width: '100%', padding: '6px 8px', background: '#070a13', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '12px', marginTop: '4px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="rf-btn-secondary" onClick={() => setActiveTab('list')}>
                  Hủy bỏ
                </button>
                <button type="submit" className="rf-btn-primary" disabled={isCreating}>
                  {isCreating ? 'Đang khởi tạo...' : 'Tạo và Mở Dự Án'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
