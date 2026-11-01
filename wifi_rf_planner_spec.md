# Wi-Fi RF Planner — Đặc tả sản phẩm & hướng dẫn triển khai

**Mục tiêu:** Xây dựng ứng dụng web lập kế hoạch Wi-Fi cho mặt bằng kho/văn phòng. Người dùng nhập bản vẽ 2D (PDF hoặc ảnh), hiệu chuẩn tỉ lệ, khai báo tường/vách/kệ/chiều cao, đặt và kéo-thả AP, xem heatmap dự báo RSSI/SNR/chất lượng theo từng băng tần và xuất báo cáo.

> **Giới hạn quan trọng:** Heatmap ở phiên bản đầu là mô phỏng dự báo dựa trên mô hình truyền sóng và giả định vật liệu, KHÔNG phải phép đo thực tế hay kết quả bảo đảm. Cisco Catalyst 9800 cung cấp cấu hình, inventory và telemetry qua API; RF engine vẫn phải được xây riêng. Chỉ bật mô phỏng 6 GHz khi model AP và client thực sự hỗ trợ 6 GHz, đồng thời phù hợp quy định miền tần số tại nơi triển khai.

---

## 1. Phạm vi chức năng

### 1.1 Nhập bản vẽ
- PDF nhiều trang: chọn trang, render thành nền 2D bằng PDF.js.
- PDF vector: ở giai đoạn sau có thể trích đường vector; MVP render trang thành raster để làm nền.
- PNG/JPG/WebP: nhập trực tiếp.
- DXF/SVG: để giai đoạn 2; không tuyên bố hỗ trợ DWG trực tiếp nếu chưa tích hợp SDK/convert đáng tin cậy.
- Xoay, zoom, pan, crop, thay độ mờ nền, khóa layer nền.
- Hiệu chuẩn tỉ lệ bằng cách chọn hai điểm trên bản vẽ và nhập khoảng cách thực tế (mét). Cho phép nhập kích thước có sẵn, ví dụ chiều dài nhà kho.
- Tọa độ nội bộ dùng mét, không dùng pixel làm đơn vị nghiệp vụ.

### 1.2 Công cụ vẽ mặt bằng
- Tường ngoài, vách ngăn, cửa, cửa cuốn, kính, cột, kệ kim loại, khu vực hàng hóa, vùng cấm lắp AP.
- Vật cản có thuộc tính: loại vật liệu, độ dày, chiều cao, chiều dài, hệ số suy hao theo băng tần (dB), mức độ tin cậy nguồn dữ liệu.
- Có preset tham khảo nhưng người dùng có thể sửa. Preset phải ghi rõ là giả định, không phải đặc tính phổ quát của vật liệu.
- Kệ/hàng hóa có thể khai báo chiều cao và vật liệu; hỗ trợ khu vực có hàng thay đổi theo mùa.
- Có thể bật/tắt từng lớp: nền, tường/vách, kệ, AP, heatmap, nhãn RSSI, vùng phủ chồng lấn.

### 1.3 Thiết bị AP và RF profile
- Thư viện AP theo vendor/model/hardware revision/antenna/domain.
- AP instance có vị trí X/Y (m), độ cao Z (m), model, góc xoay, hướng anten nếu model hỗ trợ, radio bật/tắt, Tx power, channel, channel width, antenna gain, cable loss (nếu có), mounting type.
- Tạo AP thủ công khi chưa kết nối WLC.
- Import AP inventory/radio config từ Cisco Catalyst 9800 qua adapter riêng; cho phép đối chiếu AP import với vị trí trên bản vẽ.
- Không giả định WLC có thể trả về tọa độ mặt bằng hoặc heatmap dự báo đầy đủ.

### 1.4 Heatmap tương tác
- Di chuyển/kéo AP thì heatmap cập nhật gần thời gian thực.
- Hiển thị từng băng tần riêng: 2.4 GHz, 5 GHz, 6 GHz (chỉ khi hợp lệ theo phần cứng/client).
- Chỉ số hiển thị: RSSI dự báo (dBm), path loss (dB), SNR ước tính (dB), phân lớp chất lượng, vùng chồng lấn, AP phục vụ mạnh nhất, vùng không đạt mục tiêu.
- Click một điểm trên bản vẽ để xem ước lượng từ tất cả AP: RSSI, suy hao vật cản, khoảng cách, AP mạnh nhất, SNR ước tính.
- Chọn receiver profile theo PDA/máy quét mã vạch, laptop, voice client; receiver height và sensitivity/required SNR có thể cấu hình.
- Điều chỉnh vật liệu, độ dày, trần, độ cao AP, Tx power, tần số, góc anten phải làm heatmap cập nhật.
- Có chế độ A/B để so sánh hai phương án AP.
- Có chế độ “Coverage target”: ví dụ mục tiêu RSSI -65 dBm tại cao độ PDA; các giá trị mục tiêu là cấu hình dự án, không hard-code.

### 1.5 Khảo sát thực tế và hiệu chỉnh
- Nhập CSV khảo sát từ công cụ đo (tọa độ hoặc điểm đánh dấu + RSSI/BSSID/band/channel).
- So sánh dự báo với đo thực tế và tính sai số MAE/RMSE.
- Có chức năng hiệu chỉnh hệ số suy hao theo môi trường dựa trên các điểm survey. Không tự động tuyên bố “đã hiệu chuẩn” nếu số điểm ít hoặc phân bố không đủ.

### 1.6 Xuất kết quả
- Xuất PNG bản vẽ + heatmap và chú giải màu.
- Xuất PDF report: sơ đồ AP, danh sách AP, assumptions, tường/vách, model AP/anten, cấu hình radio, heatmap từng band, vùng yếu, giới hạn mô hình.
- Xuất JSON dự án, CSV danh sách AP và các điểm cần khảo sát.
- Lưu/load dự án và phiên bản phương án.

---

## 2. Kiến trúc đề xuất

### MVP — ưu tiên làm web app

```text
Browser UI (React + TypeScript)
  ├─ PDF.js: mở và render PDF
  ├─ Konva.js hoặc Fabric.js: canvas 2D, pan/zoom, kéo-thả AP, vẽ vật cản
  ├─ Web Worker: tính toán heatmap không khóa giao diện
  ├─ Heatmap overlay: WebGL/Canvas; lưới raster theo tọa độ mét
  └─ Project JSON import/export

Backend (FastAPI/Python hoặc Node.js)
  ├─ Project API / validation / storage
  ├─ RF calculation service (có thể chạy ở backend hoặc Web Worker)
  ├─ AP catalog / antenna patterns / material attenuation presets
  ├─ Cisco Catalyst 9800 connector (RESTCONF/NETCONF, read-only trước)
  ├─ Survey import / calibration
  └─ Report generation (PNG/PDF)

Database: PostgreSQL (dự án, AP catalog, vật cản, survey, versions)
File storage: local/S3-compatible (PDF gốc và file xuất)
```

**Khuyến nghị MVP:** PDF.js + Konva.js + TypeScript cho canvas; Python/FastAPI cho RF engine và import/report. Nếu cần chạy hoàn toàn offline, có thể chạy RF engine trong Web Worker và lưu dự án cục bộ, nhưng tích hợp WLC vẫn cần server/proxy an toàn.

### Nguyên tắc bảo mật Cisco WLC
- Dùng HTTPS và chứng thư TLS hợp lệ; không tắt kiểm tra TLS trong môi trường production.
- Tài khoản API tối thiểu quyền, ưu tiên read-only ở phiên bản đầu.
- Không lưu mật khẩu WLC trong file JSON dự án hoặc trình duyệt; lưu secrets ở backend secret store / environment protected.
- Không để browser gọi trực tiếp WLC nếu dẫn đến lộ credential hoặc CORS/security issues.
- Ghi log thao tác, không ghi secret; rate-limit và timeout.
- Chỉ thêm chức năng ghi cấu hình WLC ở phiên bản sau, có xác nhận người dùng và audit.

---

## 3. Mô hình RF — phiên bản đầu và đường nâng cấp

### 3.1 Điều bắt buộc phải mô hình hóa
1. Tần số thực tế của radio/channel (MHz), không chỉ tên band.
2. Tx power ở đơn vị dBm, antenna gain và cable loss nếu có.
3. Antenna pattern theo model/hướng đặt. Nếu chưa có pattern chính thức, dùng mô hình isotropic/omni gần đúng và hiển thị cảnh báo.
4. Khoảng cách 3D giữa AP và thiết bị nhận: AP cao Z_AP, thiết bị cao Z_client.
5. Suy hao xuyên vật cản dựa trên giao tuyến từ AP đến điểm receiver và danh sách vật thể bị cắt ngang.
6. Floor/ceiling loss nếu đường truyền đi xuyên sàn/trần; bản đồ 2D đơn tầng mặc định không tính xuyên tầng nếu người dùng không khai báo.
7. Nhiễu nền/noise floor, độ rộng kênh và SNR ước tính.
8. Môi trường kệ kho: kệ kim loại/hàng hóa tạo phản xạ, che khuất và multipath; mô hình đơn giản không thể mô phỏng chính xác đầy đủ hiện tượng này.

### 3.2 Mô hình MVP: log-distance + wall losses

Tính suy hao truyền sóng cơ bản:

`FSPL(dB) = 32.44 + 20*log10(f_MHz) + 20*log10(d_km)`

Hoặc dạng log-distance đã hiệu chỉnh:

`PathLoss(d) = PL(d0) + 10*n*log10(max(d,d0)/d0) + Σ L_obstacle`

Trong đó:
- `d` = khoảng cách 3D AP → điểm nhận (m).
- `d0` = khoảng cách tham chiếu, ví dụ 1 m.
- `n` = path-loss exponent; cấu hình theo môi trường và hiệu chỉnh bằng survey, không dùng một giá trị “đúng cho mọi kho”.
- `L_obstacle` = suy hao dB của từng vật thể bị đường truyền cắt qua, tùy vật liệu, độ dày, band và góc giao cắt.

Ước tính mức tín hiệu nhận:

`RSSI_dBm = EIRP_dBm - PathLoss_dB + G_rx_dBi - L_misc_dB`

`EIRP_dBm = TxPower_dBm + G_tx_dBi - L_cable_dB`

Lưu ý: cần định nghĩa nhất quán xem `PathLoss` đã bao gồm anten gain hay chưa để tránh cộng trừ hai lần. RF engine nên dùng một quy ước duy nhất và unit-test.

SNR:

`SNR_dB = RSSI_dBm - NoiseFloor_dBm`

Noise floor không phải hằng số tuyệt đối; ước tính phụ thuộc băng thông kênh, receiver và nhiễu thực tế. MVP có thể dùng noise-floor mặc định theo bandwidth, nhưng phải ghi “ước tính”. Không tính SNR dựa duy nhất vào RSSI mà không nêu giả định noise floor.

### 3.3 Suy hao vật cản
- Ray tracing 2D: xác định đoạn từ AP đến receiver giao với tường/vách/kệ nào.
- Mỗi lần giao cắt thêm attenuation của object. Hỗ trợ suy hao riêng theo band 2.4/5/6 GHz.
- Cần tránh tính lặp cùng một bức tường nếu hình học được biểu diễn bằng nhiều đoạn chồng nhau.
- Đường truyền 3D dựa trên cao độ tương đối: vật cản chỉ được tính khi tia truyền cắt vùng hình học vật cản theo cao độ; MVP có thể coi vật cản trong mặt bằng như chiều cao đầy đủ, nhưng phải ghi rõ giới hạn nếu chưa dùng geometry 3D.
- Kệ cao 6–7 m và AP lắp tường phải được mô hình bằng height; không chỉ dùng đường bao 2D.

### 3.4 Tổng hợp nhiều AP
- Không cộng trực tiếp RSSI dBm theo phép cộng số học.
- Với vùng coverage, hiển thị RSSI của AP mạnh nhất hoặc AP được thuật toán association chọn.
- Nếu muốn mô hình tổng năng lượng nhận từ nhiều nguồn đồng kênh, chuyển dBm sang mW, cộng công suất tuyến tính rồi đổi lại dBm; nhưng kết quả này không thay thế mô phỏng giao thoa/co-channel contention.
- Tính “overlap” bằng số AP có RSSI vượt ngưỡng tại điểm đó; không tự suy ra roaming tốt chỉ dựa vào overlap.

### 3.5 Chất lượng sóng
Không nên dùng một thang màu chung làm giả định tuyệt đối. Cho phép sửa ngưỡng trong profile dự án. Giá trị mặc định gợi ý để bắt đầu:

| RSSI dự báo | Nhãn tham khảo |
|---|---|
| >= -60 dBm | Rất tốt |
| -60 đến -67 dBm | Tốt/đạt mục tiêu phổ thông |
| -67 đến -72 dBm | Trung bình; cần thử ứng dụng |
| -72 đến -75 dBm | Yếu |
| < -75 dBm | Rất yếu/không đạt mục tiêu |

Đối với PDA/máy quét mã vạch, mục tiêu phải xác nhận từ hãng thiết bị và yêu cầu roaming/app. Thường nên đặt mục tiêu thiết kế ban đầu quanh -65 dBm và SNR 25 dB ở các tuyến di chuyển quan trọng, sau đó đo thực tế.

### 3.6 Băng tần 6 GHz
- 6 GHz chỉ có trong mô phỏng khi model AP có radio 6 GHz và client hỗ trợ 6 GHz.
- Không suy luận 6 GHz từ việc “AP Cisco” nói chung; mỗi model có khả năng khác nhau.
- Băng tần hợp pháp, channel, EIRP và quy tắc trong nước cần lấy từ regulatory domain/model datasheet và cấu hình thiết bị.
- Nếu client PDA chỉ hỗ trợ 2.4/5 GHz, hiển thị 6 GHz như “không áp dụng với client profile đang chọn”, không đánh giá vùng phủ 6 GHz là vùng phục vụ PDA.

---

## 4. Hiệu chuẩn kích thước và coordinate system

- Gốc tọa độ dự án đặt ở góc trên trái canvas; nhưng lưu RF coordinates theo mét (x,y) trong mặt phẳng.
- `pixelsPerMeter` chỉ dùng để ánh xạ canvas ↔ mét sau khi hiệu chuẩn.
- Chiều y trên màn hình đi xuống; RF geometry cần có hàm chuyển đổi để không sai hướng khi xuất SVG/PDF.
- Tất cả thông số chiều dài/độ cao lưu theo mét; RF powers dBm; path loss dB; tần số MHz; góc độ.
- Khi người dùng zoom/pan, không thay đổi vị trí tọa độ thực.
- Nếu PDF không có scale hoặc kích thước đáng tin cậy, bắt buộc cảnh báo “chưa hiệu chuẩn — dBm và khoảng cách không đáng tin cậy”; không cho xuất report final mà không có cảnh báo.

---

## 5. Thiết kế tương tác kéo-thả

1. Người dùng mở PDF → chọn trang → render nền.
2. Click “Calibrate scale” → chọn 2 điểm → nhập khoảng cách thực tế.
3. Vẽ tường/vách/kệ hoặc import cấu trúc đơn giản; khai báo vật liệu/chiều cao.
4. Chọn profile AP model và radio capabilities.
5. Kéo AP từ panel vào mặt bằng; đặt cao độ, góc/hướng, power/channel.
6. Heatmap tính trên grid (ví dụ ô 0,25–0,5 m tùy độ lớn mặt bằng). Grid size cấu hình được.
7. Khi drag AP: hiển thị preview nhanh bằng cache hoặc grid thưa; khi thả chuột chạy tính toán đầy đủ ở Web Worker/backend.
8. Trong khi tương tác, hủy job cũ nếu vị trí AP lại thay đổi; chỉ hiển thị kết quả của revision mới nhất.
9. Hover/click điểm lưới để đọc giá trị chi tiết.
10. Chọn band để hiển thị riêng; không trộn kết quả 2.4/5/6 GHz trong cùng một màu mà không có chú giải.

### Hiệu năng
- Không tính tất cả điểm trên UI thread.
- Dùng grid thưa khi kéo AP và grid đầy đủ khi thả.
- Cache kết quả path loss theo cặp AP/receiver grid nếu geometry chưa thay đổi.
- Debounce sự kiện input; cancel worker request cũ.
- Với mặt bằng lớn, tính theo tile và chỉ render tile đang nhìn thấy.
- Cho phép chọn độ phân giải: Draft / Standard / High.

---

## 6. Cisco Catalyst 9800 integration

### Mục tiêu giai đoạn 1: read-only inventory + telemetry
- Base URL và phương thức xác thực cấu hình ở backend.
- Kiểm tra chứng thư HTTPS.
- Lấy model/serial/MAC/name, join status, IP, radio/band/channel/channel width, configured power/current power nếu exposed, admin/operational state, clients, firmware/controller version.
- Các trường có sẵn tùy IOS XE release, AP model và YANG module; không hard-code một endpoint duy nhất trước khi kiểm tra module trên controller.
- Triển khai adapter riêng theo IOS XE version, ưu tiên RESTCONF/NETCONF/YANG đã được hỗ trợ. Ghi version và field mapping trong log.
- Cho phép người dùng map AP thực tế vào vị trí bằng MAC/name; không tự đặt tọa độ từ inventory vì WLC không phải bản vẽ CAD.
- Chỉ đọc telemetry; không push cấu hình ở MVP.

### API adapter design
- `GET /api/controllers` — danh sách controller đã cấu hình (trả dữ liệu không chứa secret).
- `POST /api/controllers/{id}/test` — kiểm tra kết nối/auth/TLS.
- `POST /api/controllers/{id}/sync` — đồng bộ inventory và radio state.
- `GET /api/controllers/{id}/aps` — AP inventory chuẩn hóa.
- `POST /api/projects/{projectId}/map-ap` — liên kết AP WLC với đối tượng AP trên sơ đồ.
- Dữ liệu WLC có thể dùng để cập nhật thông số radio thực tế; heatmap vẫn được tính từ mô hình geometry/materials.

---

## 7. Data model (JSON giản lược)

```json
{
  "schemaVersion": 1,
  "project": {
    "id": "warehouse-demo",
    "name": "Warehouse",
    "units": "m",
    "floorHeightM": 8,
    "scale": {
      "calibrated": true,
      "pixelsPerMeter": 20.4,
      "referenceLengthM": 10
    },
    "receiverProfile": {
      "name": "Barcode PDA",
      "heightM": 1.2,
      "bandsGHz": [2.4, 5.0],
      "targetRssiDbm": -65,
      "targetSnrDb": 25
    }
  },
  "background": {
    "type": "pdf-page-render",
    "fileId": "local-file-id",
    "page": 1,
    "opacity": 0.75
  },
  "materials": [
    {
      "id": "thin-partition",
      "name": "Vách mỏng — preset cần xác minh",
      "attenuationDb": {"2.4": 3, "5": 4, "6": 5},
      "defaultThicknessM": 0.1,
      "assumption": true
    }
  ],
  "obstacles": [
    {
      "id": "wall-1",
      "type": "wall",
      "pointsM": [[0, 0], [20, 0]],
      "heightM": 3,
      "thicknessM": 0.15,
      "materialId": "thin-partition"
    }
  ],
  "aps": [
    {
      "id": "ap-01",
      "label": "AP-01",
      "vendor": "Cisco",
      "model": "MODEL_MUST_BE_SELECTED",
      "positionM": {"x": 10, "y": 8, "z": 4.5},
      "orientationDeg": 90,
      "radios": {
        "2.4": {"enabled": true, "channelMHz": 2412, "txPowerDbm": 14, "channelWidthMHz": 20},
        "5": {"enabled": true, "channelMHz": 5180, "txPowerDbm": 14, "channelWidthMHz": 20},
        "6": {"enabled": false, "reason": "Model/client capability not confirmed"}
      },
      "wlcBinding": {"controllerId": null, "apMac": null}
    }
  ],
  "simulation": {
    "model": "log-distance-wall-loss-v1",
    "gridSizeM": 0.5,
    "pathLossExponent": 2.8,
    "referenceDistanceM": 1,
    "noiseFloorDbm": {"2.4": -92, "5": -92, "6": -92},
    "showLayer": "5",
    "revision": 1,
    "calibrationStatus": "uncalibrated"
  }
}
```

**Ghi chú JSON:** Các số attenuation, noise floor, path loss exponent ở trên chỉ là ví dụ để phát triển schema, không phải cấu hình RF mặc định có thể áp dụng cho mọi kho. Trong production cần profile theo radio bandwidth, model AP, receiver, material và đo thực tế. `MODEL_MUST_BE_SELECTED` phải được thay bằng model đã xác minh trước khi mô phỏng theo datasheet.

---

## 8. API cho RF engine

### `POST /api/simulation/heatmap`
Request:
```json
{
  "projectId": "warehouse-demo",
  "revision": 12,
  "band": "5",
  "gridSizeM": 0.5,
  "receiverProfileId": "barcode-pda",
  "boundsM": {"minX": 0, "minY": 0, "maxX": 80, "maxY": 40}
}
```
Response:
```json
{
  "revision": 12,
  "band": "5",
  "units": {"rssi": "dBm", "pathLoss": "dB", "snr": "dB"},
  "grid": {
    "originM": [0, 0],
    "cellSizeM": 0.5,
    "width": 160,
    "height": 80,
    "rssiDbm": "typed-array-or-encoded-buffer",
    "snrDb": "typed-array-or-encoded-buffer",
    "servingApIndex": "typed-array-or-encoded-buffer"
  },
  "assumptions": ["Predictive estimate", "No measured survey calibration"]
}
```

### `POST /api/simulation/sample`
Nhận X/Y/Z và band, trả giá trị dự báo chi tiết từ từng AP, từng vật cản bị cắt ngang và AP mạnh nhất. Dùng khi người dùng click vào canvas.

### `POST /api/survey/import`
Import CSV đo thực tế, validate cột RSSI/BSSID/channel/frequency/coordinate/time; cho phép người dùng map cột.

---

## 9. Thuật toán tính mỗi điểm grid (pseudocode)

```text
for each receiver point p(x, y, z_client):
    candidates = []
    for each AP ap:
        for each enabled radio r matching selected band and client capabilities:
            d3 = distance3D(ap.position, p)
            base_loss = log_distance_path_loss(r.frequencyMHz, d3, environmentProfile)
            crossed = obstacle_engine.intersections(ap.position, p, obstacles)
            obstacle_loss = sum(loss_for_band(o.material, band, crossing_geometry))
            antenna_gain = antenna_pattern_gain(ap.model, band, direction_to(p), ap.orientation)
            eirp = r.txPowerDbm + antenna_gain - r.cableLossDb
            rssi = eirp - base_loss - obstacle_loss + receiverGainDb - miscellaneousLossDb
            snr = rssi - estimatedNoiseFloor(band, channelWidth, receiverProfile)
            candidates.append({ap, rssi, snr, lossBreakdown})
    serving = max(candidates by rssi)  // association model can improve later
    output serving.rssi, serving.snr, serving.apId, overlapCount(candidates, overlapThreshold)
```

Nếu nhiều radio/AP đồng kênh có thể gây nhiễu, MVP chỉ đánh dấu overlap/airtime risk; không tuyên bố tính được co-channel interference chính xác nếu chưa có mô hình airtime, channel reuse, contention và traffic.

---

## 10. Công nghệ thư viện gợi ý

- Frontend: React + TypeScript + Vite.
- PDF: PDF.js (`pdfjs-dist`).
- Canvas tương tác: Konva (`react-konva`) hoặc Fabric.js. Chọn một, không cần dùng cả hai.
- Heatmap: Canvas 2D cho MVP; WebGL khi số cell lớn.
- Worker: Web Worker; nếu backend calculation dùng Python thì FastAPI + NumPy.
- Hình học: Turf.js chỉ hỗ trợ một phần 2D; cân nhắc Shapely ở backend để xử lý giao tuyến, polygon và vật cản. Viết unit test cho corner cases.
- Backend: FastAPI + Pydantic.
- DB: PostgreSQL; ORM SQLAlchemy.
- PDF report: ReportLab hoặc HTML-to-PDF; bản vẽ xuất ảnh cần giữ đúng tỷ lệ và chú giải.
- Test: Vitest/Playwright frontend; pytest backend; fixture RF cho công thức.

Kiểm tra giấy phép thư viện trước khi phân phối thương mại; quản lý package versions và dependency lockfile.

---

## 11. Các màn hình

1. **Projects** — tạo/mở dự án, phiên bản, trạng thái hiệu chuẩn.
2. **Floor plan editor** — import PDF/ảnh, hiệu chuẩn, vẽ vật cản, đặt/kéo AP.
3. **RF settings** — model AP, radios, channel, Tx power, anten, receiver profile, noise floor, material presets.
4. **Heatmap** — chọn band, opacity, range/color legend, click-to-inspect.
5. **AP list** — vị trí x/y/z, model, radio setting, trạng thái map từ WLC.
6. **WLC integration** — controller, kết nối, đồng bộ, mapping AP; credential không hiện lại sau khi lưu.
7. **Survey & calibration** — import số đo, residual/error plot, trạng thái hiệu chỉnh.
8. **Report export** — xuất PNG/PDF/CSV/JSON cùng assumptions.

---

## 12. Tiêu chí nghiệm thu (Definition of Done)

### PDF và tọa độ
- Mở PDF nhiều trang, chọn trang, zoom/pan không làm lệch AP.
- Hiệu chuẩn bằng hai điểm; khoảng cách 10 m trên bản vẽ được quy đổi chính xác trong đơn vị nội bộ.
- Sau reload JSON, AP và vật cản trở về đúng vị trí.

### RF và heatmap
- Có lớp 2.4/5/6 GHz riêng; 6 GHz tự ẩn/disabled nếu AP/client không hỗ trợ.
- Hiển thị dBm, dB và chú giải chất lượng với đơn vị.
- Thử nghiệm unit test cho FSPL/log-distance, suy hao vật cản và RSSI.
- Khi kéo AP, preview cập nhật và full calculation chạy sau khi thả; không để kết quả revision cũ ghi đè revision mới.
- Thêm tường suy hao lớn giữa AP và điểm đo phải làm RSSI dự báo giảm.
- Tăng khoảng cách phải làm path loss tăng trong mô hình đơn điệu.
- Nâng AP/lowering AP làm khoảng cách 3D và geometry interception cập nhật hợp lý.
- UI luôn ghi rõ predictive/estimated khi chưa có survey.

### Cisco WLC
- Có thể test kết nối an toàn và sync AP inventory/radio fields được controller hỗ trợ.
- Nếu IOS XE release hoặc model thiếu field, UI báo “không được cung cấp” thay vì tự điền số giả.
- Không có thay đổi cấu hình WLC từ MVP.

### Báo cáo
- Xuất heatmap theo từng band, AP table, giả định vật liệu, thông số RF, ngày tạo và cảnh báo sai số.
- Không thể hiện dự báo thành số đo thực tế.

---

## 13. Lộ trình triển khai

### Phase 1 — bản vẽ và kéo-thả
- PDF/ảnh, calibration, pan/zoom.
- Thư viện vật cản cơ bản.
- Đặt AP thủ công.
- Heatmap MVP cho 2.4/5 GHz, RF model minh bạch và có assumptions.

### Phase 2 — RF profiles và kiểm thử
- Datasheet/antenna patterns cho các model AP cụ thể.
- Mô hình cao độ và vật cản theo height.
- Chọn profile PDA, threshold, vùng yếu và vùng overlap.
- Export PNG/PDF/JSON.

### Phase 3 — Cisco 9800
- Read-only RESTCONF/NETCONF adapter theo release.
- Sync inventory/radio state và map AP vào bản vẽ.
- Không để WLC telemetry thay thế mô phỏng vật lý.

### Phase 4 — survey calibration
- Import survey CSV.
- So sánh dự báo và measurement; tune path-loss/material parameters.
- Báo cáo sai số và độ tin cậy theo vùng.

### Phase 5 — nâng cao
- 6 GHz theo đúng AP/client/regulatory domain.
- Mô hình kệ/kho 3D tốt hơn, diffraction/multipath nâng cao nếu có dữ liệu và ngân sách.
- Hỗ trợ DXF/SVG hoặc tích hợp CAD converter.
- A/B optimization và gợi ý vị trí AP; gợi ý chỉ là phương án để kỹ sư kiểm tra.

---

## 14. Những điều không được làm

- Không hard-code tất cả AP Cisco có 6 GHz.
- Không dùng vị trí AP từ WLC nếu WLC không cung cấp tọa độ mặt bằng thực.
- Không cộng dBm trực tiếp như số thường.
- Không gọi heatmap mô phỏng là “đo RSSI thực tế”.
- Không hứa độ chính xác dự báo nếu chưa có kích thước, AP model, anten, vật liệu và khảo sát.
- Không coi một vách mỏng, một bức tường gạch và một hàng kệ kim loại có cùng mức suy hao.
- Không tự gửi cấu hình thay đổi vào WLC trong MVP.

---

## 15. Tài liệu tham khảo chính thức

- Cisco Catalyst 9800 Programmability and Telemetry Deployment Guide: https://www.cisco.com/c/en/us/td/docs/wireless/controller/9800/technical-reference/catalyst-9800-programmability-telemetry-deployment-guide.html
- Cisco Wireless RF Reference Guide: https://www.cisco.com/c/en/us/td/docs/wireless/controller/9800/technical-reference/wireless-rf-reference-guide.html
- Cisco Catalyst 9166 Series AP datasheet (ví dụ model hỗ trợ 6 GHz; thông số thực tế theo model cụ thể): https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9166-series-access-points/catalyst-9166-series-access-points-ds.html
- Cisco Catalyst 9164 Series AP datasheet: https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9164-series-access-points/catalyst-9164-series-access-points-ds.html

Các datasheet chỉ áp dụng cho đúng model/variant/region/software được nêu trong tài liệu. Trước khi triển khai phải xác minh model AP cụ thể, antenna variant, regulatory domain và khả năng client PDA.
