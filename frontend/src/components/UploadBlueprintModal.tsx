import React, { useState } from 'react';
import { Upload, FileImage, FileText, Check, X, ArrowRight, Ruler, Eye } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;

interface UploadBlueprintModalProps {
  onBlueprintLoaded: (
    imageDataUrl: string,
    fileName: string,
    widthPx: number,
    heightPx: number,
    estimatedWidthM: number,
    estimatedHeightM: number,
    autoDetectWalls?: boolean
  ) => void;
  onCancel: () => void;
}

export const UploadBlueprintModal: React.FC<UploadBlueprintModalProps> = ({
  onBlueprintLoaded,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loaded file metadata
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [widthPx, setWidthPx] = useState<number>(1440);
  const [heightPx, setHeightPx] = useState<number>(900);

  // User input estimated dimensions in meters
  const [estimatedWidthM, setEstimatedWidthM] = useState<number>(60.0);
  const [estimatedHeightM, setEstimatedHeightM] = useState<number>(36.0);
  const [autoDetectWalls, setAutoDetectWalls] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

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

        if (!ctx) throw new Error('Không thể tạo canvas render PDF');

        await (page.render as any)({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        setPreviewDataUrl(dataUrl);
        setFileName(file.name);
        setWidthPx(canvas.width);
        setHeightPx(canvas.height);

        // Auto estimate dimensions based on aspect ratio
        const aspect = canvas.width / canvas.height;
        const defaultW = 60.0;
        setEstimatedWidthM(defaultW);
        setEstimatedHeightM(parseFloat((defaultW / aspect).toFixed(1)));
      } else {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const img = new Image();
          img.onload = () => {
            setPreviewDataUrl(loadEvent.target?.result as string);
            setFileName(file.name);
            setWidthPx(img.width);
            setHeightPx(img.height);

            const aspect = img.width / img.height;
            const defaultW = 60.0;
            setEstimatedWidthM(defaultW);
            setEstimatedHeightM(parseFloat((defaultW / aspect).toFixed(1)));
          };
          img.src = loadEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setErrorMsg('Lỗi đọc bản vẽ: ' + (err.message || 'Không thể render PDF/ảnh'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!previewDataUrl) return;
    if (estimatedWidthM <= 0 || estimatedHeightM <= 0) {
      alert('Vui lòng nhập kích thước ước lượng lớn hơn 0 mét');
      return;
    }
    onBlueprintLoaded(previewDataUrl, fileName, widthPx, heightPx, estimatedWidthM, estimatedHeightM, autoDetectWalls);
  };

  const calculatedPpm = estimatedWidthM > 0 ? (widthPx / estimatedWidthM).toFixed(2) : '24.0';

  return (
    <div className="rf-modal-backdrop">
      <div className="rf-modal-card" style={{ maxWidth: '640px', width: '92vw' }}>
        <div className="rf-modal-header">
          <div className="rf-modal-title">
            <Upload size={18} style={{ color: '#06b6d4' }} />
            <span>Tải Bản Vẽ Mặt Bằng 2D (PDF hoặc Ảnh)</span>
          </div>
          <button className="rf-modal-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="rf-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {!previewDataUrl ? (
            <div>
              <p className="rf-modal-desc">
                Chọn tệp bản vẽ kiến trúc <b>PDF</b> hoặc tệp ảnh <b>PNG, JPG, WebP</b>.
                Hệ thống sẽ render sắc nét lên nền 2D để bạn vẽ tường, đặt AP và hiển thị Heatmap.
              </p>

              <label className="rf-dropzone-box" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div className="rf-dropzone-content">
                  <FileImage size={44} style={{ color: '#38bdf8', marginBottom: 12 }} />
                  <strong style={{ fontSize: '14px', color: '#f8fafc' }}>Nhấp để chọn tệp bản vẽ kiến trúc</strong>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Hỗ trợ định dạng: PDF, PNG, JPG, WebP (Tối đa 50 MB)
                  </span>
                </div>
              </label>
            </div>
          ) : (
            <div>
              {/* Preview Thumbnail */}
              <div
                style={{
                  background: '#070a13',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                  marginBottom: '16px',
                  position: 'relative',
                }}
              >
                <img
                  src={previewDataUrl}
                  alt="Bản vẽ xem trước"
                  style={{
                    maxHeight: '180px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                />
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#38bdf8',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>{fileName}</span>
                  <span style={{ color: '#94a3b8' }}>•</span>
                  <span>Độ phân giải: {widthPx} × {heightPx} px</span>
                </div>
              </div>

              {/* Estimated Dimension Inputs */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid #38bdf8',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                  <Ruler size={16} />
                  <span>Kích thước thực tế ước lượng (Căn chỉnh tỷ lệ & thước đo mét)</span>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                  Nhập chiều dài/rộng ước lượng của khu vực bản vẽ để hệ thống tự động căn chỉnh tỷ lệ mét chuẩn xác,
                  thước đo ngang dọc sẽ hiển thị đúng số mét ngay khi tải lên. Sau đó bạn có thể dùng thước 2 điểm để hiệu chuẩn lại bất cứ lúc nào.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="rf-form-row">
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                      Chiều ngang thực tế (m):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="1000"
                      value={estimatedWidthM}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 10;
                        setEstimatedWidthM(val);
                        if (widthPx && heightPx) {
                          setEstimatedHeightM(parseFloat((val * (heightPx / widthPx)).toFixed(1)));
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#070a13',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  <div className="rf-form-row">
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                      Chiều dọc thực tế (m):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="1000"
                      value={estimatedHeightM}
                      onChange={(e) => setEstimatedHeightM(parseFloat(e.target.value) || 10)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#070a13',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} />
                  <span>
                    Tỷ lệ tính toán tự động: <b>{calculatedPpm} pixels / mét</b> ({estimatedWidthM}m × {estimatedHeightM}m)
                  </span>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #4f46e5', padding: '8px 12px', borderRadius: '6px' }}>
                  <input
                    type="checkbox"
                    checked={autoDetectWalls}
                    onChange={(e) => setAutoDetectWalls(e.target.checked)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e7ff' }}>
                      🤖 Tự động nhận diện tường & vách ngăn AI (Khuyên dùng)
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      AI sẽ quét đường nét bản vẽ để tạo tường cản sóng tự động, hiển thị suy hao từng phòng chuẩn Ekahau
                    </span>
                  </div>
                </label>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="rf-btn-secondary" style={{ cursor: 'pointer', padding: '7px 12px', fontSize: '12px', borderRadius: '6px' }}>
                  <span>Chọn tệp khác</span>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="rf-btn-secondary" onClick={onCancel} style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '6px' }}>
                    Hủy
                  </button>
                  <button type="button" className="rf-btn-primary" onClick={handleApply} style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '6px', fontWeight: 700 }}>
                    Áp Dụng Bản Vẽ Này
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#38bdf8' }}>
              <div className="rf-spinner" style={{ margin: '0 auto 12px auto' }} />
              <span>Đang đọc và render vector PDF sang nền raster 2D...</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', marginTop: '14px', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
