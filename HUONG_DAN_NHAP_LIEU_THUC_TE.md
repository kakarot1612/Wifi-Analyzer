# Hướng dẫn Nhập liệu Đo kiểm Thực tế & Thông số AP Cisco C9115AX / C9115AXE

Tài liệu này hướng dẫn bạn cách thu thập số liệu đo kiểm hiện trường, điền vào các tệp mẫu và nạp vào ứng dụng **Wi-Fi RF Planner** để mô phỏng chính xác nhất cho môi trường nhà kho thực tế.

---

## 1. Danh sách tệp mẫu được tạo sẵn trong thư mục dự án

| Tên tệp | Định dạng | Mục đích sử dụng |
|---|---|---|
| [mau_khao_sat_thuc_te.csv](file:///d:/wifi%20bpvn/mau_khao_sat_thuc_te.csv) | CSV | **Quan trọng nhất:** Điền kết quả đo mức sóng (RSSI dBm) thực tế từ máy quét PDA / điện thoại / laptop khi đi bộ khảo sát trong kho. |
| [mau_thong_so_ap_thuc_te.json](file:///d:/wifi%20bpvn/mau_thong_so_ap_thuc_te.json) | JSON | Thông số chi tiết phần cứng AP C9115AXI (anten ngầm) và C9115AXE (kèm anten định hướng AIR-ANT2566P4W-R hoặc anten que). |
| [mau_suy_hao_vat_lieu_kho.json](file:///d:/wifi%20bpvn/mau_suy_hao_vat_lieu_kho.json) | JSON | Bảng hệ số suy hao (dB) của các loại kệ pallet, hàng hóa dày/thưa, cửa cuốn và vách tường thực tế. |

---

## 2. Hướng dẫn điền file đo thực tế: `mau_khao_sat_thuc_te.csv`

Bạn có thể mở tệp này bằng **Microsoft Excel**, **WPS Office** hoặc phần mềm soạn thảo văn bản.

### Cấu trúc các cột:

```csv
id,x_m,y_m,z_m,band_ghz,ap_label,channel,measured_rssi_dbm,client_device,note
P01,14.0,10.0,1.2,5,WH-AP-01,36,-48,Zebra TC52,Đầu lối đi kệ hàng A
```

1. **`id`**: Mã định danh điểm đo (ví dụ: `P01`, `P02`, `P03`...).
2. **`x_m`**: Tọa độ X của điểm đo trên mặt bằng (tính bằng **mét**, tính từ góc trên bên trái bản vẽ).
3. **`y_m`**: Tọa độ Y của điểm đo trên mặt bằng (tính bằng **mét**).
   *(Mẹo: Trên giao diện web, rê chuột đến vị trí cần đo, nhìn góc dưới bên trái sẽ thấy ngay tọa độ X, Y mét thực tế).*
4. **`z_m`**: Độ cao thiết bị khi đo (mét). Với máy quét mã vạch cầm tay PDA, tiêu chuẩn là **1.2m**. Với tablet xe nâng là **1.8m**.
5. **`band_ghz`**: Băng tần đang đo: `2.4` hoặc `5` (khuyến nghị đo ở băng tần **5 GHz** vì các thiết bị PDA kho hiện đại chạy trên 5 GHz để tránh nhiễu).
6. **`ap_label`**: Tên hoặc mã của Access Point mà thiết bị đang bắt sóng mạnh nhất (ví dụ: `WH-AP-01`, `WH-AP-02`).
7. **`channel`**: Kênh Wi-Fi bắt được (ví dụ: `36`, `52`, `100`, `132`, `149`).
8. **`measured_rssi_dbm`**: Mức tín hiệu nhận đo được thực tế (dBm). Ví dụ: `-48`, `-56`, `-65`, `-72`.
9. **`client_device`**: Thiết bị dùng để đo (ví dụ: `Zebra TC52`, `Zebra TC57`, `Honeywell CT60`, `Laptop Wi-Fi 6`).
10. **`note`**: Ghi chú vị trí (ví dụ: *Đầu lối đi kệ hàng A*, *Giữa 2 hàng kệ pallet cao 6m*, *Gần cửa cuốn*).

---

## 3. Thông số chuẩn Cisco Catalyst 9115AX & C9115AXE

### A. Cisco Catalyst 9115AXI (Internal Antennas - Anten ngầm)
- **Chuẩn Wi-Fi:** Wi-Fi 6 (802.11ax), không hỗ trợ Wi-Fi 6E (6 GHz).
- **MIMO:** 4x4:4 ở 5 GHz, 2x2:2 ở 2.4 GHz.
- **Anten:** Đẳng hướng (Omnidirectional) tích hợp sẵn trong vỏ AP.
  - Độ lợi 2.4 GHz: **3.0 dBi**
  - Độ lợi 5 GHz: **4.0 dBi**
- **Vị trí lắp đặt tối ưu:** Lắp ốp trần phẳng (Ceiling) tại văn phòng điều hành, phòng giám sát, khu vực đóng gói QA có độ cao trần dưới 4.5m.

### B. Cisco Catalyst 9115AXE (External Antennas - Anten ngoài)
Có 4 cổng kết nối anten ngoài chuẩn RP-TNC. Tùy thuộc vào vị trí trong kho, bạn có 2 phương án anten chính:

#### Phương án 1: Dùng Anten định hướng tấm phẳng `AIR-ANT2566P4W-R` (Khuyên dùng cho kho kệ cao)
- **Đặc tính:** Góc mở ngang 60° (Azimuth 60°), góc mở dọc 60° (Elevation 60°).
- **Độ lợi (Gain):** **6.0 dBi** ở cả 2.4 GHz và 5 GHz.
- **Cách lắp:** Gắn AP và anten trên tường hoặc xà gồ ở đầu lối đi (Aisle), hướng mặt phẳng anten bắn thẳng dọc theo hành lang giữa 2 dãy kệ pallet (tham khảo hình **Pic 3**). Búp sóng tập trung hẹp giúp sóng đi sâu đến 40-50m mà không bị tán xạ đâm vào hàng hóa kim loại hai bên.
- **Trong App:** Chọn Model `Cisco C9115AXE + AIR-ANT2566P4W-R (Patch 60° Kho)`, kiểu anten `Định hướng lối đi kho`, sau đó dùng thanh trượt Azimuth để chỉnh góc anten quay dọc theo hướng đi của kệ.

#### Phương án 2: Dùng Anten que đẳng hướng `AIR-ANT2524Db-R` (Dipole Omni)
- **Đặc tính:** Phát tròn 360 độ.
- **Độ lợi:** 2.0 dBi (2.4 GHz) / 4.0 dBi (5 GHz).
- **Cách lắp:** Phù hợp khu vực bốc dỡ hàng (Staging / Loading Bay) hoặc khoảng không rộng không có kệ che chắn.
- **Trong App:** Chọn Model `Cisco C9115AXE + AIR-ANT2524Db-R (Dipole Omni)`.

---

## 4. Cách nạp dữ liệu vào ứng dụng Web & Hiệu chỉnh

1. Mở ứng dụng tại trình duyệt: `http://localhost:5173/`
2. Chuyển sang thẻ tab **"Khảo sát & Hiệu chỉnh"** trên thanh điều hướng trên cùng.
3. Bấm nút **"Chọn tệp CSV khảo sát..."** và chọn tệp `mau_khao_sat_thuc_te.csv` bạn vừa nhập.
4. Bảng số liệu sẽ hiện toàn bộ các điểm đo:
   - Cột **"Đo thực tế"**: Mức dBm bạn ghi nhận.
   - Cột **"Dự báo"**: Mức dBm mà thuật toán RF Engine tính toán tại tọa độ đó.
   - Cột **"Sai số (Δ)"**: Mức độ chênh lệch giữa dự báo và thực tế.
5. Bấm nút **"Hiệu chỉnh mô hình RF"**:
   - Hệ thống tự động tính sai số căn quân phương **RMSE** và sai số tuyệt đối trung bình **MAE**.
   - Thuật toán hồi quy phi tuyến sẽ quét tìm hệ số suy hao $n$ tối ưu nhất cho nhà kho của bạn (thông thường từ 2.8 lên 3.0 - 3.3 tùy độ dày của hàng hóa).
   - Bản đồ Heatmap sẽ lập tức cập nhật lại theo hệ số đã hiệu chỉnh, mang lại kết quả dự báo cực kỳ sát với thực tế!
