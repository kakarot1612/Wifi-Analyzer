import React, { useState, useEffect } from 'react';
import { Ruler, Maximize2, Check, X, ArrowRight, ShieldCheck, Info } from 'lucide-react';

interface ScaleCalibrationModalProps {
  point1?: [number, number] | null;
  point2?: [number, number] | null;
  currentPpm: number;
  widthPx: number;
  heightPx: number;
  initialMode?: 'ruler' | 'direct';
  onConfirmScale: (newPpm: number, referenceLengthM: number, keepVisualPositions?: boolean) => void;
  onStartRulerMeasurement?: () => void;
  onCancel: () => void;
}

export const ScaleCalibrationModal: React.FC<ScaleCalibrationModalProps> = ({
  point1,
  point2,
  currentPpm,
  widthPx,
  heightPx,
  initialMode = 'ruler',
  onConfirmScale,
  onStartRulerMeasurement,
  onCancel,
}) => {
  const hasRulerPoints = Boolean(point1 && point2);
  const [activeTab, setActiveTab] = useState<'ruler' | 'direct'>(
    hasRulerPoints ? (initialMode || 'ruler') : 'direct'
  );

  // Compute pixel distance between point 1 and point 2
  const pixelDist = hasRulerPoints
    ? Math.hypot(
        (point2![0] - point1![0]) * currentPpm,
        (point2![1] - point1![1]) * currentPpm
      )
    : 100.0;

  // Initial values in meters
  const initialRulerDistM = hasRulerPoints
    ? Math.max(0.5, parseFloat((pixelDist / currentPpm).toFixed(2))).toString()
    : '10.0';

  const initialWidthM = Math.max(2.0, parseFloat((widthPx / currentPpm).toFixed(2))).toString();
  const initialHeightM = Math.max(2.0, parseFloat((heightPx / currentPpm).toFixed(2))).toString();

  const [rulerDistM, setRulerDistM] = useState<string>(initialRulerDistM);
  const [inputWidthM, setInputWidthM] = useState<string>(initialWidthM);
  const [inputHeightM, setInputHeightM] = useState<string>(initialHeightM);
  const [keepVisualPositions, setKeepVisualPositions] = useState<boolean>(true);

  useEffect(() => {
    if (hasRulerPoints) {
      const dist = Math.max(0.5, parseFloat((pixelDist / currentPpm).toFixed(2))).toString();
      setRulerDistM(dist);
      setActiveTab('ruler');
    }
  }, [point1, point2]);

  // Derived calculations
  let calculatedPpm = currentPpm;
  let finalWidthM = widthPx / currentPpm;
  let finalHeightM = heightPx / currentPpm;
  let refM = 10.0;

  if (activeTab === 'ruler') {
    const valM = parseFloat(rulerDistM) || 10.0;
    if (valM > 0) {
      calculatedPpm = pixelDist / valM;
      finalWidthM = widthPx / calculatedPpm;
      finalHeightM = heightPx / calculatedPpm;
      refM = valM;
    }
  } else {
    const wM = parseFloat(inputWidthM) || 50.0;
    if (wM > 0) {
      calculatedPpm = widthPx / wM;
      finalWidthM = wM;
      finalHeightM = heightPx / calculatedPpm;
      refM = wM;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedPpm <= 0.1 || isNaN(calculatedPpm)) {
      alert('Tỉ lệ không hợp lệ. Vui lòng nhập khoảng cách lớn hơn 0.');
      return;
    }
    onConfirmScale(
      parseFloat(calculatedPpm.toFixed(2)),
      parseFloat(refM.toFixed(2)),
      keepVisualPositions
    );
  };

  return (
    <div className="rf-modal-backdrop">
      <div className="rf-modal-card" style={{ maxWidth: '580px', width: '100%' }}>
        <div className="rf-modal-header">
          <div className="rf-modal-title">
            <Ruler size={18} style={{ color: '#06b6d4' }} />
            <span>Hiệu Chuẩn Kích Thước Mặt Bằng & Tỉ Lệ Thước (Scale Calibration)</span>
          </div>
          <button className="rf-modal-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', background: '#0f172a' }}>
          <button
            type="button"
            className={`rf-tab-btn ${activeTab === 'ruler' ? 'active' : ''}`}
            onClick={() => setActiveTab('ruler')}
            style={{ flex: 1, padding: '10px 14px', fontSize: '12px', justifyContent: 'center' }}
          >
            <Ruler size={14} />
            <span>1. Thước Đo 2 Điểm ({hasRulerPoints ? `${pixelDist.toFixed(0)} px` : 'Đo trên bản vẽ'})</span>
          </button>
          <button
            type="button"
            className={`rf-tab-btn ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
            style={{ flex: 1, padding: '10px 14px', fontSize: '12px', justifyContent: 'center' }}
          >
            <Maximize2 size={14} />
            <span>2. Nhập Trực Tiếp Kích Thước Sàn (Dài × Rộng)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rf-modal-body" style={{ padding: '20px' }}>
          {activeTab === 'ruler' ? (
            <div>
              {hasRulerPoints ? (
                <>
                  <div
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid #0891b2',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      lineHeight: 1.5,
                    }}
                  >
                    Bạn vừa đo một đoạn thẳng dài <b style={{ color: '#38bdf8' }}>{pixelDist.toFixed(1)} pixels</b> trên bản vẽ 2D.
                    Hãy nhập chiều dài thực tế tương ứng để tính toán chính xác tỷ lệ quy đổi mét:
                  </div>

                  <div className="rf-form-row">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Chiều dài đoạn thẳng thực tế (mét):</label>
                    <div className="rf-input-suffix-wrap">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="500"
                        autoFocus
                        value={rulerDistM}
                        onChange={(e) => setRulerDistM(e.target.value)}
                        style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}
                      />
                      <span className="rf-input-suffix">mét</span>
                    </div>
                  </div>

                  <div className="rf-preset-chips" style={{ marginBottom: '16px' }}>
                    <span className="lbl">Gợi ý kích thước chuẩn:</span>
                    <button type="button" className="rf-chip-btn" onClick={() => setRulerDistM('1.0')}>
                      Cửa đơn: 1m
                    </button>
                    <button type="button" className="rf-chip-btn" onClick={() => setRulerDistM('2.4')}>
                      Cửa đôi: 2.4m
                    </button>
                    <button type="button" className="rf-chip-btn" onClick={() => setRulerDistM('6.0')}>
                      Bước cột xưởng: 6m
                    </button>
                    <button type="button" className="rf-chip-btn" onClick={() => setRulerDistM('10.0')}>
                      Dãy kệ kho: 10m
                    </button>
                    <button type="button" className="rf-chip-btn" onClick={() => setRulerDistM('20.0')}>
                      Khẩu độ nhà xưởng: 20m
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <Ruler size={36} style={{ color: '#ec4899', margin: '0 auto 12px auto' }} />
                  <p style={{ fontSize: '13px', color: '#f8fafc', marginBottom: '8px', fontWeight: 600 }}>
                    Chưa có đoạn đo nào trên bản vẽ
                  </p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
                    Hãy bấm nút bên dưới để dùng thước click 2 điểm trên bản vẽ (ví dụ: mép tường, ô cửa hoặc khoảng cách đã biết), hoặc chuyển sang tab "Nhập trực tiếp".
                  </p>
                  <button
                    type="button"
                    className="rf-btn-primary"
                    onClick={() => {
                      onCancel();
                      if (onStartRulerMeasurement) onStartRulerMeasurement();
                    }}
                    style={{ padding: '8px 18px', fontSize: '13px', background: '#ec4899', margin: '0 auto' }}
                  >
                    Bắt đầu đo 2 điểm trên bản vẽ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid #0284c7',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  lineHeight: 1.5,
                }}
              >
                Nhập kích thước thực tế tổng thể của mặt bằng. Hệ thống sẽ tự động tính toán chính xác tỉ lệ mét cho toàn bộ bản vẽ và vùng phủ sóng AP:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="rf-form-row" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Chiều Dài sàn (Width mét):</label>
                  <div className="rf-input-suffix-wrap">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="1000"
                      value={inputWidthM}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputWidthM(val);
                        const numW = parseFloat(val);
                        if (numW > 0) {
                          const aspect = widthPx / heightPx;
                          setInputHeightM((numW / aspect).toFixed(1));
                        }
                      }}
                      style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}
                    />
                    <span className="rf-input-suffix">mét</span>
                  </div>
                </div>

                <div className="rf-form-row" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Chiều Rộng sàn (Height mét):</label>
                  <div className="rf-input-suffix-wrap">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="1000"
                      value={inputHeightM}
                      onChange={(e) => setInputHeightM(e.target.value)}
                      style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}
                    />
                    <span className="rf-input-suffix">mét</span>
                  </div>
                </div>
              </div>

              <div className="rf-preset-chips" style={{ marginBottom: '16px' }}>
                <span className="lbl">Kích thước mẫu thông dụng:</span>
                <button
                  type="button"
                  className="rf-chip-btn"
                  onClick={() => {
                    setInputWidthM('15.0');
                    setInputHeightM('10.0');
                  }}
                >
                  Nhà ở / Căn hộ (15 × 10m)
                </button>
                <button
                  type="button"
                  className="rf-chip-btn"
                  onClick={() => {
                    setInputWidthM('30.0');
                    setInputHeightM('20.0');
                  }}
                >
                  Văn phòng vừa (30 × 20m)
                </button>
                <button
                  type="button"
                  className="rf-chip-btn"
                  onClick={() => {
                    setInputWidthM('60.0');
                    setInputHeightM('36.0');
                  }}
                >
                  Kho Logistics lớn (60 × 36m)
                </button>
              </div>
            </div>
          )}

          {/* Live Calculation Result Preview Card */}
          <div
            style={{
              background: '#0a0f1d',
              border: '1.5px solid #1e293b',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <strong style={{ fontSize: '12px', color: '#f8fafc' }}>Kết quả tính toán sau khi hiệu chuẩn:</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11px' }}>
              <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8' }}>Tỉ lệ mới (px/m):</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                  {calculatedPpm.toFixed(2)} px/m
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8' }}>Kích thước mặt bằng:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                  {finalWidthM.toFixed(1)}m × {finalHeightM.toFixed(1)}m
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8' }}>Diện tích phủ sóng:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginTop: '2px' }}>
                  {(finalWidthM * finalHeightM).toFixed(0)} m²
                </div>
              </div>
            </div>

            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} />
              <span>Ảnh gốc: {widthPx} × {heightPx} px • 1 mét thực tế = {calculatedPpm.toFixed(1)} pixels</span>
            </div>
          </div>

          {/* Option: Retain visual positions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="keepVisual"
              checked={keepVisualPositions}
              onChange={(e) => setKeepVisualPositions(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#06b6d4' }}
            />
            <label htmlFor="keepVisual" style={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
              Tự động cập nhật tọa độ AP và vật cản đã vẽ để giữ nguyên vị trí trực quan trên bản vẽ
            </label>
          </div>

          <div className="rf-modal-footer" style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', marginTop: 0 }}>
            <button
              type="button"
              className="rf-action-btn rf-btn-secondary"
              onClick={onCancel}
              style={{ padding: '8px 16px' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rf-action-btn rf-btn-primary"
              style={{ padding: '8px 20px', background: '#0284c7' }}
            >
              <Check size={16} />
              <span>Áp Dụng & Ghi Đè Kích Thước Vào Dự Án</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
