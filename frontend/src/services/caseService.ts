const API_BASE_URL = "http://localhost:8000";

export interface Case {
  id: number;
  relato_original: string;
  tipo_entrada: "texto" | "audio";
  audio_path?: string;
  status: "pendente" | "processando" | "completo" | "erro";
  error_message?: string;
  created_at: string;
}

export interface CaseResponse {
  case_id: number;
  status: string;
  id: number;
  relato_original: string;
  tipo_entrada: string;
  audio_path?: string;
  created_at: string;
  message: string;
}

export interface StructuredData {
  id: number;
  case_id: number;
  paciente_nome?: string;
  paciente_sexo?: "M" | "F" | "Indefinido";
  sintomas_identificados_ptbr?: string;
  correspondencia_indigena?: string;
  categoria_sintoma?: string;
  idade_paciente?: string;
  duracao_sintomas?: string;
  fator_desencadeante?: string;
  temperatura_graus?: number;
  pressao_arterial?: string;
  created_at: string;
}

export interface MedicalExplanation {
  id: number;
  case_id: number;
  narrativa_clinica?: string;
  gravidade_sugerida?: string;
  justificativa_gravidade?: string;
  recomendacoes?: string; // JSON string array
  created_at: string;
}

export const caseService = {
  // Create case from text
  async createTextCase(relato: string): Promise<CaseResponse> {
    const response = await fetch(`${API_BASE_URL}/api/relatos/texto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ relato }),
    });

    if (!response.ok) {
      throw new Error(`Error creating case: ${response.statusText}`);
    }

    return response.json();
  },

  // Create case from audio
  async createAudioCase(audioFile: File): Promise<CaseResponse> {
    const formData = new FormData();
    formData.append("audio", audioFile);

    const response = await fetch(`${API_BASE_URL}/api/relatos/audio`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Error creating audio case: ${errorMessage}`);
    }

    return response.json();
  },

  // List all cases
  async listCases(
    limit: number = 50
  ): Promise<{ total: number; casos: Case[] }> {
    const response = await fetch(`${API_BASE_URL}/api/relatos?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Error fetching cases: ${response.statusText}`);
    }

    return response.json();
  },

  // Get specific case
  async getCase(
    caseId: number
  ): Promise<Case & { structured_data?: StructuredData }> {
    const response = await fetch(`${API_BASE_URL}/api/relatos/${caseId}`);

    if (!response.ok) {
      throw new Error(`Error fetching case: ${response.statusText}`);
    }

    return response.json();
  },

  // Update case
  async updateCase(
    caseId: number,
    updates: {
      relato_original?: string;
      status?: "pendente" | "processando" | "completo" | "erro";
    }
  ): Promise<{ message: string; caso: Case }> {
    const response = await fetch(`${API_BASE_URL}/api/relatos/${caseId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Error updating case: ${errorMessage}`);
    }

    return response.json();
  },

  // Delete case
  async deleteCase(caseId: number): Promise<{ message: string; case_id: number }> {
    const response = await fetch(`${API_BASE_URL}/api/relatos/${caseId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Error deleting case: ${errorMessage}`);
    }

    return response.json();
  },

  // Update structured data
  async updateStructuredData(
    caseId: number,
    updates: Partial<StructuredData>
  ): Promise<{ message: string; structured_data: StructuredData }> {
    const response = await fetch(
      `${API_BASE_URL}/api/relatos/${caseId}/structured-data`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Error updating structured data: ${errorMessage}`);
    }

    return response.json();
  },

  // Get latest medical explanation
  async getExplanation(caseId: number): Promise<{ message: string; explanation: MedicalExplanation }> {
    const response = await fetch(
      `${API_BASE_URL}/api/relatos/${caseId}/explicacao`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Error fetching explanation: ${errorMessage}`);
    }

    return response.json();
  },

  // Generate or fetch medical explanation (optionally forcing regeneration)
  async generateExplanation(
    caseId: number,
    force: boolean = false
  ): Promise<{ message: string; explanation: MedicalExplanation }> {
    const response = await fetch(
      `${API_BASE_URL}/api/relatos/${caseId}/explicar${force ? "?force=true" : ""}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Error generating explanation: ${errorMessage}`);
    }

    return response.json();
  },
};
