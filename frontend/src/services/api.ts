import {
  ProjectData,
  ProjectSummary,
  CreateProjectRequest,
  AutoPlanRequest,
  AutoPlanResponse,
  HeatmapResponse,
  SampleResponse,
  ControllerConfig,
  CiscoApInventoryItem,
  SurveyDataSet,
  CalibrationResult,
  Material
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{ status: string; activeProject?: string; activeProjectId?: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async listProjects(): Promise<ProjectSummary[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Không thể tải danh sách dự án');
    return res.json();
  },

  async createProject(req: CreateProjectRequest): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Không thể tạo dự án mới');
    return res.json();
  },

  async getProject(projectId: string): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`);
    if (!res.ok) throw new Error(`Không thể tải dự án '${projectId}'`);
    return res.json();
  },

  async updateProject(projectId: string, project: ProjectData): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error(`Không thể lưu dự án '${projectId}'`);
    return res.json();
  },

  async deleteProject(projectId: string): Promise<{ success: boolean; deletedProjectId: string }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Không thể xóa dự án '${projectId}'`);
    return res.json();
  },

  async getCurrentProject(): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects/current`);
    if (!res.ok) throw new Error('Không thể tải dự án hiện tại');
    return res.json();
  },

  async saveProject(project: ProjectData): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Không thể lưu dự án');
    return res.json();
  },

  async resetDefaultProject(): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects/reset-default`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Không thể đặt lại dự án mặc định');
    return res.json();
  },

  async computeHeatmap(
    projectId: string,
    revision: number,
    band: string,
    gridSizeM: number,
    project?: ProjectData
  ): Promise<HeatmapResponse> {
    const res = await fetch(`${API_BASE}/simulation/heatmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        revision,
        band,
        gridSizeM,
        project,
      }),
    });
    if (!res.ok) throw new Error('Lỗi tính toán mô phỏng heatmap');
    return res.json();
  },

  async computeSample(
    projectId: string,
    band: string,
    xM: number,
    yM: number,
    zM?: number,
    project?: ProjectData
  ): Promise<SampleResponse> {
    const res = await fetch(`${API_BASE}/simulation/sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        band,
        xM,
        yM,
        zM,
        project,
      }),
    });
    if (!res.ok) throw new Error('Lỗi đo kiểm điểm mẫu');
    return res.json();
  },

  async autoPlan(req: AutoPlanRequest): Promise<AutoPlanResponse> {
    const res = await fetch(`${API_BASE}/simulation/auto-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Lỗi tính toán AI Auto-Plan');
    return res.json();
  },

  async getMaterials(): Promise<Material[]> {
    const res = await fetch(`${API_BASE}/catalog/materials`);
    return res.json();
  },

  async getApCatalog(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/catalog/aps`);
    return res.json();
  },

  async listControllers(): Promise<ControllerConfig[]> {
    const res = await fetch(`${API_BASE}/controllers`);
    return res.json();
  },

  async testController(req: {
    host: string;
    port: number;
    username: string;
    password?: string;
    verifyTls: boolean;
  }): Promise<{ success: boolean; message: string; supportedYangModules?: string[] }> {
    const res = await fetch(`${API_BASE}/controllers/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return res.json();
  },

  async getControllerAps(controllerId: string): Promise<CiscoApInventoryItem[]> {
    const res = await fetch(`${API_BASE}/controllers/${controllerId}/aps`);
    return res.json();
  },

  async mapApToWlc(
    projectId: string,
    projectApId: string,
    controllerId: string,
    apMac: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/projects/map-ap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        projectApId,
        controllerId,
        apMac,
      }),
    });
    return res.json();
  },

  async calibrateSurvey(surveyDataSet: SurveyDataSet): Promise<CalibrationResult> {
    const res = await fetch(`${API_BASE}/survey/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(surveyDataSet),
    });
    if (!res.ok) throw new Error('Lỗi hiệu chỉnh mô hình');
    return res.json();
  },

  async downloadPdfReport(project?: ProjectData): Promise<Blob> {
    const res = await fetch(`${API_BASE}/reports/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project || null),
    });
    if (!res.ok) throw new Error('Lỗi xuất báo cáo PDF');
    return res.blob();
  },

  async detectWalls(req: {
    projectId?: string;
    imageDataUrl?: string;
    pixelsPerMeter?: number;
    floorHeightM?: number;
    sensitivity?: 'low' | 'medium' | 'high';
    defaultMaterial?: string;
    replaceExisting?: boolean;
  }): Promise<{
    success: boolean;
    walls: any[];
    wallCount: number;
    calcTimeMs: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/simulation/detect-walls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Lỗi nhận diện tường từ bản vẽ');
    }
    return res.json();
  },
};
