import math
from typing import List, Tuple
from app.models.project import ProjectData
from app.models.survey import SurveyMeasurement, CalibrationResult
from app.rf_engine.calculator import calculate_sample_point
from app.models.rf import SampleRequest


def evaluate_survey_accuracy(
    measurements: List[SurveyMeasurement],
    project: ProjectData,
    test_exponent: float = None
) -> Tuple[List[SurveyMeasurement], float, float]:
    """
    Computes predicted RSSI for each survey measurement point,
    returning updated measurements with deltaDb, MAE, and RMSE.
    """
    if test_exponent is not None:
        # Temporary copy with modified exponent
        proj_copy = project.model_copy(deep=True)
        proj_copy.simulation.pathLossExponent = test_exponent
    else:
        proj_copy = project

    updated_points: List[SurveyMeasurement] = []
    deltas: List[float] = []

    for pt in measurements:
        req = SampleRequest(
            projectId=proj_copy.project.id,
            band=pt.band,
            xM=pt.xM,
            yM=pt.yM,
            zM=pt.zM
        )
        sample = calculate_sample_point(req, proj_copy)

        # Match with specific AP if provided, else best serving AP
        matched_rssi = None
        if pt.apLabel:
            for s in sample.apSignals:
                if s.apLabel.lower() == pt.apLabel.lower() or s.apId.lower() == pt.apLabel.lower():
                    matched_rssi = s.rssiDbm
                    break

        if matched_rssi is None:
            matched_rssi = sample.bestRssiDbm

        delta = matched_rssi - pt.measuredRssiDbm
        deltas.append(delta)

        updated_pt = pt.model_copy()
        updated_pt.predictedRssiDbm = round(matched_rssi, 1)
        updated_pt.deltaDb = round(delta, 1)
        updated_points.append(updated_pt)

    if not deltas:
        return updated_points, 0.0, 0.0

    mae = sum(abs(d) for d in deltas) / len(deltas)
    rmse = math.sqrt(sum(d ** 2 for d in deltas) / len(deltas))

    return updated_points, round(mae, 2), round(rmse, 2)


def calibrate_path_loss_exponent(
    measurements: List[SurveyMeasurement],
    project: ProjectData
) -> CalibrationResult:
    """
    Optimizes pathLossExponent to minimize prediction RMSE against survey points.
    Searches n in [2.0 .. 4.2] in steps of 0.05.
    """
    orig_n = project.simulation.pathLossExponent or 2.8
    orig_points, orig_mae, orig_rmse = evaluate_survey_accuracy(measurements, project)

    if len(measurements) < 3:
        return CalibrationResult(
            originalMaeDb=orig_mae,
            originalRmseDb=orig_rmse,
            calibratedMaeDb=orig_mae,
            calibratedRmseDb=orig_rmse,
            originalPathLossExponent=orig_n,
            recommendedPathLossExponent=orig_n,
            status="insufficient_data",
            summaryMessage="Cần tối thiểu 3 điểm khảo sát thực tế để hiệu chỉnh mô hình RF an toàn.",
            samplePoints=orig_points
        )

    best_n = orig_n
    best_rmse = orig_rmse
    best_mae = orig_mae

    # Search space for warehouse/indoor RF exponent
    for candidate_n in [round(x * 0.05, 2) for x in range(40, 85)]:  # 2.0 to 4.2
        _, mae, rmse = evaluate_survey_accuracy(measurements, project, test_exponent=candidate_n)
        if rmse < best_rmse:
            best_rmse = rmse
            best_mae = mae
            best_n = candidate_n

    # Compute final sample points using recommended exponent
    final_points, final_mae, final_rmse = evaluate_survey_accuracy(
        measurements, project, test_exponent=best_n
    )

    diff_rmse = round(orig_rmse - final_rmse, 2)
    message = (
        f"Hiệu chỉnh thành công! Hệ số suy hao tối ưu n={best_n:.2f} "
        f"(giảm sai số RMSE từ {orig_rmse:.1f} dB xuống {final_rmse:.1f} dB, cải thiện {diff_rmse} dB)."
    )

    return CalibrationResult(
        originalMaeDb=orig_mae,
        originalRmseDb=orig_rmse,
        calibratedMaeDb=final_mae,
        calibratedRmseDb=final_rmse,
        originalPathLossExponent=orig_n,
        recommendedPathLossExponent=best_n,
        status="calibrated",
        summaryMessage=message,
        samplePoints=final_points
    )
