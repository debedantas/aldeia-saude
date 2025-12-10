import { useEffect, useState } from "react";
import { caseService, Case, StructuredData, MedicalExplanation } from "../services/caseService";
import { useToast } from "../context/ToastContext";

interface CaseListProps {
  refreshTrigger?: number;
}

export const CaseList = ({ refreshTrigger }: CaseListProps) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingStructuredData, setIsEditingStructuredData] = useState(false);
  const [editedRelato, setEditedRelato] = useState("");
  const [editedStatus, setEditedStatus] = useState<Case["status"]>("pendente");
  const [editedStructuredData, setEditedStructuredData] = useState<Partial<StructuredData>>({});
  const [editedSymptomsText, setEditedSymptomsText] = useState("");
  const [editedSymptomsList, setEditedSymptomsList] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState("");
  const [editingSymptomIndex, setEditingSymptomIndex] = useState<number | null>(null);
  const [editingSymptomValue, setEditingSymptomValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [explanation, setExplanation] = useState<MedicalExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadCases();
  }, [refreshTrigger]);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const response = await caseService.listCases(100);
      setCases(response.casos);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao carregar casos",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
      processando: "bg-blue-100 text-blue-800 border-blue-300",
      completo: "bg-green-100 text-green-800 border-green-300",
      erro: "bg-red-100 text-red-800 border-red-300",
    };

    const labels = {
      pendente: "⏳ Pendente",
      processando: "⚙️ Processando",
      completo: "✅ Completo",
      erro: "❌ Erro",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getTypeIcon = (tipo: string) => {
    return tipo === "audio" ? "🎤" : "📝";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const renderRecommendations = (recs?: string) => {
    if (!recs) return null;
    try {
      const arr = JSON.parse(recs);
      if (Array.isArray(arr) && arr.length > 0) {
        return (
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {arr.map((item: any, idx: number) => (
              <li key={idx}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
            ))}
          </ul>
        );
      }
    } catch (e) {
      return <p className="text-gray-700">{recs}</p>;
    }
    return null;
  };

  const normalizeSymptomsText = (text: string): string[] => {
    return text
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const stringifySymptoms = (text: string): string => {
    const arr = normalizeSymptomsText(text);
    return JSON.stringify(arr);
  };

  const parseSymptomsRaw = (raw?: string): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const syncSymptomsList = (list: string[]) => {
    setEditedSymptomsList(list);
    setEditedStructuredData({
      ...editedStructuredData,
      sintomas_identificados_ptbr: JSON.stringify(list),
    });
    setEditedSymptomsText(list.join("\n"));
  };

  const handleCaseClick = async (caseItem: Case) => {
    try {
      const fullCase = await caseService.getCase(caseItem.id);
      setSelectedCase(fullCase as Case);
      setEditedRelato(fullCase.relato_original);
      setEditedStatus(fullCase.status);
      setIsEditing(false);
      setIsEditingStructuredData(false);
      setExplanation(null);
      setIsLoadingExplanation(false);
      
      // Initialize structured data for editing
      if ((fullCase as any).structured_data) {
        const sd = (fullCase as any).structured_data;
        setEditedStructuredData(sd);
        const symptomsArr = parseSymptomsRaw(sd.sintomas_identificados_ptbr);
        setEditedSymptomsText(symptomsArr.join("\n"));
        setEditedSymptomsList(symptomsArr);
        setNewSymptom("");
        setEditingSymptomIndex(null);
        setEditingSymptomValue("");
      }

      // Try to load latest explanation if status is complete
      if (fullCase.status === "completo") {
        try {
          const latest = await caseService.getExplanation(fullCase.id);
          setExplanation(latest.explanation);
        } catch (e) {
          // silently ignore if none exists
        }
      }
    } catch (err) {
      showToast("Erro ao carregar detalhes do caso", "error");
    }
  };

  const handleEditCase = async () => {
    if (!selectedCase) return;

    try {
      const updates: any = {};
      if (editedRelato !== selectedCase.relato_original) {
        updates.relato_original = editedRelato;
      }
      if (editedStatus !== selectedCase.status) {
        updates.status = editedStatus;
      }

      if (Object.keys(updates).length === 0) {
        showToast("Nenhuma alteração foi feita", "info");
        setIsEditing(false);
        return;
      }

      await caseService.updateCase(selectedCase.id, updates);
      showToast("Caso atualizado com sucesso!", "success");
      setIsEditing(false);
      
      // Reload the case details and case list
      await handleCaseClick(selectedCase);
      await loadCases();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar caso",
        "error"
      );
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;

    if (!confirm(`Tem certeza que deseja deletar o caso #${selectedCase.id}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await caseService.deleteCase(selectedCase.id);
      showToast("Caso deletado com sucesso!", "success");
      setSelectedCase(null);
      await loadCases();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao deletar caso",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSymptom = () => {
    const value = newSymptom.trim();
    if (!value) return;
    const updated = [...editedSymptomsList, value];
    syncSymptomsList(updated);
    setNewSymptom("");
  };

  const handleDeleteSymptom = (index: number) => {
    const updated = editedSymptomsList.filter((_, i) => i !== index);
    syncSymptomsList(updated);
    if (editingSymptomIndex === index) {
      setEditingSymptomIndex(null);
      setEditingSymptomValue("");
    }
  };

  const startEditSymptom = (index: number, value: string) => {
    setEditingSymptomIndex(index);
    setEditingSymptomValue(value);
  };

  const saveEditSymptom = () => {
    if (editingSymptomIndex === null) return;
    const value = editingSymptomValue.trim();
    if (!value) return;
    const updated = editedSymptomsList.map((s, i) =>
      i === editingSymptomIndex ? value : s
    );
    syncSymptomsList(updated);
    setEditingSymptomIndex(null);
    setEditingSymptomValue("");
  };

  const cancelEditSymptom = () => {
    setEditingSymptomIndex(null);
    setEditingSymptomValue("");
  };

  const handleGenerateExplanation = async (force: boolean) => {
    if (!selectedCase) return;

    setIsLoadingExplanation(true);
    try {
      const result = await caseService.generateExplanation(selectedCase.id, force);
      setExplanation(result.explanation);
      showToast(result.message || "Explicação gerada com sucesso!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao gerar explicação",
        "error"
      );
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleEditStructuredData = async () => {
    if (!selectedCase) return;

    try {
      await caseService.updateStructuredData(selectedCase.id, editedStructuredData);
      showToast("Dados estruturados atualizados com sucesso!", "success");
      setIsEditingStructuredData(false);
      
      // Reload the case details
      await handleCaseClick(selectedCase);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar dados estruturados",
        "error"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aldeia-primary"></div>
          <span className="ml-3 text-gray-600">Carregando casos...</span>
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📋</span>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum caso encontrado
          </h3>
          <p className="text-gray-500">
            Crie um novo caso para começar a usar o sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Lista de Casos</h2>
          <button
            onClick={loadCases}
            className="text-aldeia-primary hover:text-aldeia-secondary transition-colors"
          >
            🔄 Atualizar
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {cases.filter((c) => c.status === "completo").length}
            </p>
            <p className="text-sm text-gray-600">Completos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {cases.filter((c) => c.status === "processando").length}
            </p>
            <p className="text-sm text-gray-600">Processando</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {cases.filter((c) => c.status === "pendente").length}
            </p>
            <p className="text-sm text-gray-600">Pendentes</p>
          </div>
        </div>
      </div>

      {/* Cases list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relato (prévia)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{caseItem.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-2xl">
                      {getTypeIcon(caseItem.tipo_entrada)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                    <div className="truncate">
                      {caseItem.relato_original.substring(0, 100)}
                      {caseItem.relato_original.length > 100 && "..."}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(caseItem.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(caseItem.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleCaseClick(caseItem)}
                      className="text-aldeia-primary hover:text-aldeia-secondary font-medium transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCase(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Caso #{selectedCase.id}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Criado em {formatDate(selectedCase.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar caso"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={handleDeleteCase}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Deletar caso"
                      >
                        {isDeleting ? "⏳" : "🗑️"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCase(null);
                      setIsEditing(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Status and Type */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  {isEditing ? (
                    <select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value as Case["status"])}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="processando">Processando</option>
                      <option value="completo">Completo</option>
                      <option value="erro">Erro</option>
                    </select>
                  ) : (
                    <div className="mt-1">
                      {getStatusBadge(selectedCase.status)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tipo de Entrada
                  </label>
                  <div className="mt-1 text-lg">
                    {getTypeIcon(selectedCase.tipo_entrada)}{" "}
                    {selectedCase.tipo_entrada === "audio" ? "Áudio" : "Texto"}
                  </div>
                </div>
              </div>

              {/* Original Report */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Relato Original
                </label>
                {isEditing ? (
                  <textarea
                    value={editedRelato}
                    onChange={(e) => setEditedRelato(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                    placeholder="Digite o relato..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
                    {selectedCase.relato_original}
                  </div>
                )}
              </div>

              {/* Audio Path */}
              {selectedCase.audio_path && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-500 block mb-2">
                    Arquivo de Áudio
                  </label>
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                    📁 {selectedCase.audio_path}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {selectedCase.error_message && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-500 block mb-2">
                    Mensagem de Erro
                  </label>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {selectedCase.error_message}
                  </div>
                </div>
              )}

              {/* Structured Data (if available) */}
              {(selectedCase as any).structured_data &&
                (() => {
                  const data = (selectedCase as any).structured_data;
                  return (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <span className="text-2xl mr-2">📋</span>
                          Dados Estruturados
                        </h4>
                        {!isEditingStructuredData && !isEditing && (
                          <button
                            onClick={() => setIsEditingStructuredData(true)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            ✏️ Editar Dados
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Patient Information */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-blue-900 mb-3 flex items-center">
                            <span className="mr-2">👤</span>
                            Informações do Paciente
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-sm text-blue-700 font-medium">
                                Nome:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="text"
                                  value={editedStructuredData.paciente_nome || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    paciente_nome: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                  placeholder="Nome do paciente"
                                />
                              ) : (
                                <p className="text-blue-900 mb-4">
                                  {data.paciente_nome || "-"}
                                </p>
                              )}
                              <span className="text-sm text-blue-700 font-medium">
                                Sexo:
                              </span>
                              {isEditingStructuredData ? (
                                <select
                                  value={editedStructuredData.paciente_sexo || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    paciente_sexo: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                >
                                  <option value="">Selecione...</option>
                                  <option value="M">Masculino</option>
                                  <option value="F">Feminino</option>
                                  <option value="Indefinido">Indefinido</option>
                                </select>
                              ) : (
                                <p className="text-blue-900 mb-4">
                                  {data.paciente_sexo === "M"
                                    ? "Masculino"
                                    : data.paciente_sexo === "F"
                                    ? "Feminino"
                                    : "Indefinido"}
                                </p>
                              )}
                              <span className="text-sm text-blue-700 font-medium">
                                Idade:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="text"
                                  value={editedStructuredData.idade_paciente || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    idade_paciente: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                  placeholder="ex: 45 anos"
                                />
                              ) : (
                                <p className="text-blue-900">
                                  {data.idade_paciente || "-"}
                                </p>
                              )}
                            </div>

                        {/* Symptoms */}
                        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                          <h5 className="font-semibold text-red-900 mb-3 flex items-center">
                            <span className="mr-2">🩺</span>
                            Sintomas Identificados
                          </h5>
                          {isEditingStructuredData ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {editedSymptomsList.length === 0 && (
                                  <span className="text-red-800 text-sm">Nenhum sintoma adicionado.</span>
                                )}
                                {editedSymptomsList.map((symptom, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-red-200 text-red-900 px-3 py-1 rounded-full text-sm font-medium"
                                  >
                                    {editingSymptomIndex === idx ? (
                                      <input
                                        value={editingSymptomValue}
                                        onChange={(e) => setEditingSymptomValue(e.target.value)}
                                        className="bg-white border border-red-300 rounded px-2 py-1 text-sm text-red-900"
                                        autoFocus
                                      />
                                    ) : (
                                      <span>{symptom}</span>
                                    )}
                                    {editingSymptomIndex === idx ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={saveEditSymptom}
                                          className="text-green-700 hover:text-green-900"
                                          title="Salvar"
                                        >
                                          ✔
                                        </button>
                                        <button
                                          onClick={cancelEditSymptom}
                                          className="text-gray-700 hover:text-gray-900"
                                          title="Cancelar"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => startEditSymptom(idx, symptom)}
                                          className="text-red-700 hover:text-red-900"
                                          title="Editar"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSymptom(idx)}
                                          className="text-red-700 hover:text-red-900"
                                          title="Remover"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={newSymptom}
                                  onChange={(e) => setNewSymptom(e.target.value)}
                                  className="flex-1 min-w-[180px] px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none text-sm"
                                  placeholder="Novo sintoma"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddSymptom();
                                    }
                                  }}
                                />
                                <button
                                  onClick={handleAddSymptom}
                                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition"
                                >
                                  Adicionar
                                </button>
                              </div>
                              <p className="text-xs text-red-700">
                                Dica: clique em ✏️ para editar um sintoma ou 🗑️ para remover.
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const raw = editedStructuredData.sintomas_identificados_ptbr ?? data.sintomas_identificados_ptbr;
                                const sintomas = parseSymptomsRaw(raw);
                                if (!sintomas.length) {
                                  return <span className="text-red-800">Nenhum sintoma informado.</span>;
                                }
                                return sintomas.map((sintoma: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                                  >
                                    {typeof sintoma === "string"
                                      ? sintoma
                                      : sintoma.sintoma || JSON.stringify(sintoma)}
                                  </span>
                                ));
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Indigenous Correspondence */}
                        {data.correspondencia_indigena && (
                          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                            <h5 className="font-semibold text-green-900 mb-3 flex items-center">
                              <span className="mr-2">🌿</span>
                              Correspondência em Yanomami
                            </h5>
                            <div className="space-y-3">
                              {(() => {
                                try {
                                  const termos = JSON.parse(
                                    data.correspondencia_indigena
                                  );
                                  return termos.map(
                                    (termo: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="bg-white rounded-lg p-3 border border-green-300"
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="text-green-700 font-bold text-lg">
                                            {typeof termo === "string"
                                              ? termo
                                              : termo.termo_nativo}
                                          </span>
                                          {typeof termo === "object" &&
                                            termo.significado_aproximado && (
                                              <span className="text-green-600 text-sm">
                                                → {termo.significado_aproximado}
                                              </span>
                                            )}
                                        </div>
                                        {typeof termo === "object" &&
                                          termo.contexto_cultural_saude && (
                                            <p className="text-sm text-green-700 mt-1 italic">
                                              {termo.contexto_cultural_saude}
                                            </p>
                                          )}
                                      </div>
                                    )
                                  );
                                } catch (e) {
                                  return (
                                    <p className="text-green-800">
                                      {data.correspondencia_indigena}
                                    </p>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Clinical Data */}
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                          <h5 className="font-semibold text-purple-900 mb-3 flex items-center">
                            <span className="mr-2">⚕️</span>
                            Dados Clínicos
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-sm text-purple-700 font-medium">
                                Categoria:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="text"
                                  value={editedStructuredData.categoria_sintoma || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    categoria_sintoma: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                  placeholder="ex: Respiratório"
                                />
                              ) : (
                                <p className="text-purple-900">
                                  {data.categoria_sintoma || "-"}
                                </p>
                              )}
                            </div>
                            <div>
                              <span className="text-sm text-purple-700 font-medium">
                                Duração:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="text"
                                  value={editedStructuredData.duracao_sintomas || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    duracao_sintomas: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                  placeholder="ex: 3 dias"
                                />
                              ) : (
                                <p className="text-purple-900">
                                  {data.duracao_sintomas || "-"}
                                </p>
                              )}
                            </div>
                            <div>
                              <span className="text-sm text-purple-700 font-medium">
                                Temperatura:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editedStructuredData.temperatura_graus || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    temperatura_graus: parseFloat(e.target.value) || undefined
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                  placeholder="ex: 38.5"
                                />
                              ) : (
                                <p className="text-purple-900">
                                  {data.temperatura_graus ? `${data.temperatura_graus}°C` : "-"}
                                </p>
                              )}
                            </div>
                            <div>
                              <span className="text-sm text-purple-700 font-medium">
                                Pressão Arterial:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="text"
                                  value={editedStructuredData.pressao_arterial || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    pressao_arterial: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                  placeholder="ex: 120/80"
                                />
                              ) : (
                                <p className="text-purple-900">
                                  {data.pressao_arterial || "-"}
                                </p>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm text-purple-700 font-medium">
                                Fator Desencadeante:
                              </span>
                              {isEditingStructuredData ? (
                                <input
                                  type="text"
                                  value={editedStructuredData.fator_desencadeante || ""}
                                  onChange={(e) => setEditedStructuredData({
                                    ...editedStructuredData,
                                    fator_desencadeante: e.target.value
                                  })}
                                  className="mt-1 block w-full px-3 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                  placeholder="Fatores que desencadearam os sintomas"
                                />
                              ) : (
                                <p className="text-purple-900">
                                  {data.fator_desencadeante || "-"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Medical Explanation */}
              {selectedCase.status === "completo" ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="text-2xl mr-2">🩺</span>
                      Explicação Médica
                    </h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleGenerateExplanation(false)}
                        disabled={isLoadingExplanation || !!explanation}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                      >
                        {isLoadingExplanation ? "Gerando..." : explanation ? "Explicação Atual" : "Gerar Explicação"}
                      </button>
                      {explanation && (
                        <button
                          onClick={() => handleGenerateExplanation(true)}
                          disabled={isLoadingExplanation}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                        >
                          {isLoadingExplanation ? "Gerando..." : "Gerar Nova"}
                        </button>
                      )}
                    </div>
                  </div>

                  {explanation ? (
                    <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-500">
                        Última geração: {formatDate(explanation.created_at)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Gravidade Sugerida</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {explanation.gravidade_sugerida || "Não informada"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Narrativa Clínica (SOAP)</p>
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {explanation.narrativa_clinica || "Não informada"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Justificativa</p>
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {explanation.justificativa_gravidade || "Não informada"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Recomendações</p>
                        {renderRecommendations(explanation.recomendacoes) || (
                          <p className="text-gray-700">Nenhuma recomendação.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Gere a explicação para ver narrativa clínica, gravidade e recomendações.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="text-2xl mr-2">🩺</span>
                    Explicação Médica
                  </h4>
                  <p className="text-gray-600 mt-2">
                    Disponível quando o status do caso for "completo".
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end gap-3">
                {isEditingStructuredData ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingStructuredData(false);
                        if ((selectedCase as any).structured_data) {
                          setEditedStructuredData((selectedCase as any).structured_data);
                        }
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEditStructuredData}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Salvar Dados Estruturados
                    </button>
                  </>
                ) : isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedRelato(selectedCase.relato_original);
                        setEditedStatus(selectedCase.status);
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEditCase}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                    >
                      Salvar Alterações
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedCase(null);
                      setIsEditing(false);
                      setIsEditingStructuredData(false);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
