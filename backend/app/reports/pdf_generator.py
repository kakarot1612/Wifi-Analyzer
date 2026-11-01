import io
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.project import ProjectData


def generate_project_pdf_report(project: ProjectData) -> bytes:
    """Generates an executive Wi-Fi RF Planning PDF report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15
    )
    heading2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )
    disclaimer_style = ParagraphStyle(
        'DocDisclaimer',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#b45309'),
        backColor=colors.HexColor('#fef3c7'),
        borderPadding=6,
        spaceBefore=10,
        spaceAfter=10
    )

    story = []

    # Title & Metadata
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    story.append(Paragraph(f"Báo Cáo Thiết Kế Wi-Fi RF Planner — {project.project.name}", title_style))
    story.append(Paragraph(
        f"Mã dự án: <b>{project.project.id}</b> | Ngày tạo: {now_str} | Trạng thái: <b>{project.simulation.calibrationStatus.upper()}</b>",
        subtitle_style
    ))

    # Mandatory Disclaimer Notice
    disclaimer_text = (
        "<b>LƯU Ý QUAN TRỌNG VỀ ĐỘ CHÍNH XÁC:</b><br/>"
        "Heatmap và các chỉ số trong báo cáo này là kết quả mô phỏng dự báo (Predictive Simulation) "
        "dựa trên mô hình suy hao truyền sóng (Log-Distance Path Loss) và giả định vật liệu vách ngăn/kệ kho. "
        "Đây KHÔNG phải là phép đo sóng thực tế hoặc cam kết vùng phủ sóng bảo đảm. Đối với môi trường nhà kho "
        "với kệ kim loại cao và hàng hóa thay đổi, bắt buộc phải khảo sát hiện trường (Site Survey) để hiệu chuẩn."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))
    story.append(Spacer(1, 10))

    # Section 1: Project Parameters
    story.append(Paragraph("1. Thông Số Cơ Bản & Hồ Sơ Thiết Bị Thu (Client Profile)", heading2_style))
    proj_table_data = [
        ["Thông số", "Giá trị", "Thông số", "Giá trị"],
        ["Đơn vị đo", project.project.units, "Chiều cao trần", f"{project.project.floorHeightM} m"],
        ["Tỉ lệ hiệu chuẩn", f"{project.project.scale.pixelsPerMeter:.1f} px/m", "Độ dài tham chiếu", f"{project.project.scale.referenceLengthM} m"],
        ["Thiết bị client", project.project.receiverProfile.name, "Cao độ thiết bị nhận", f"{project.project.receiverProfile.heightM} m"],
        ["Mục tiêu RSSI", f"{project.project.receiverProfile.targetRssiDbm} dBm", "Mục tiêu SNR", f"{project.project.receiverProfile.targetSnrDb} dB"],
        ["Mô hình RF", project.simulation.model, "Hệ số suy hao n", f"{project.simulation.pathLossExponent:.2f}"]
    ]
    t1 = Table(proj_table_data, colWidths=[120, 220, 120, 220])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t1)
    story.append(Spacer(1, 12))

    # Section 2: Access Points Table
    story.append(Paragraph(f"2. Danh Sách Điểm Truy Cập Wi-Fi ({len(project.aps)} Access Points)", heading2_style))
    ap_table_data = [
        ["Tên AP", "Model", "Vị trí X, Y, Z (m)", "Kiểu lắp", "Radio 2.4 GHz", "Radio 5 GHz", "Radio 6 GHz", "WLC Binding"]
    ]
    for ap in project.aps:
        pos_str = f"({ap.positionM.x:.1f}, {ap.positionM.y:.1f}, {ap.positionM.z:.1f})"
        r24 = ap.radios.get("2.4")
        r5 = ap.radios.get("5")
        r6 = ap.radios.get("6")

        r24_str = f"Ch {r24.channelNumber} | {r24.txPowerDbm} dBm" if r24 and r24.enabled else "Tắt"
        r5_str = f"Ch {r5.channelNumber} | {r5.txPowerDbm} dBm" if r5 and r5.enabled else "Tắt"
        r6_str = f"Ch {r6.channelNumber} | {r6.txPowerDbm} dBm" if r6 and r6.enabled else "K.hỗ trợ"
        wlc_str = ap.wlcBinding.apMac or "Chưa map"

        ap_table_data.append([
            ap.label,
            ap.model,
            pos_str,
            ap.mountingType,
            r24_str,
            r5_str,
            r6_str,
            wlc_str
        ])

    t2 = Table(ap_table_data, colWidths=[70, 95, 95, 60, 100, 100, 75, 85])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t2)
    story.append(Spacer(1, 12))

    # Section 3: Materials & Obstacles
    story.append(Paragraph(f"3. Thư Viện Vật Liệu & Vật Cản ({len(project.obstacles)} Vật Cản)", heading2_style))
    mat_table_data = [
        ["Tên vật liệu", "Suy hao 2.4 GHz", "Suy hao 5 GHz", "Suy hao 6 GHz", "Độ dày chuẩn", "Giả định"]
    ]
    for mat in project.materials:
        mat_table_data.append([
            mat.name,
            f"{mat.attenuationDb.get('2.4', 0)} dB",
            f"{mat.attenuationDb.get('5', 0)} dB",
            f"{mat.attenuationDb.get('6', 0)} dB",
            f"{mat.defaultThicknessM} m",
            "Có" if mat.assumption else "Thực tế"
        ])

    t3 = Table(mat_table_data, colWidths=[200, 95, 95, 95, 95, 100])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t3)

    doc.build(story)
    return buffer.getvalue()
