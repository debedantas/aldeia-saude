import { useEffect, useState } from "react";
import { caseService, Case, StructuredData } from "../services/caseService";
import { useToast } from "../context/ToastContext";

interface CaseWithDetails extends Case {
  structured_data?: StructuredData;
}

interface SymptomGroup {
  symptom: string;
  count: number;
  cases: CaseWithDetails[];
}

interface CategoryGroup {
  category: string;
  count: number;
  cases: CaseWithDetails[];
}

interface IndigenousTermGroup {
  termo_nativo: string;
  significado: string;
  count: number;
  cases: CaseWithDetails[];
}

export const Reports = () => {
  const [completedCases, setCompletedCases] = useState<CaseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [symptomGroups, setSymptomGroups] = useState<SymptomGroup[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [indigenousTerms, setIndigenousTerms] = useState<IndigenousTermGroup[]>(
    []
  );
  const [activeTab, setActiveTab] = useState<
    "symptoms" | "categories" | "indigenous" | "timeline"
  >("symptoms");
  const [selectedGroup, setSelectedGroup] = useState<
    SymptomGroup | CategoryGroup | IndigenousTermGroup | null
  >(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      // First, get all cases
      const response = await caseService.listCases(200);
      const allCases = response.casos;

      // Filter completed cases and fetch their details
      const completedCasesList = allCases.filter(
        (c) => c.status === "completo"
      );

      // Fetch detailed data for each completed case
      const casesWithDetails: CaseWithDetails[] = await Promise.all(
        completedCasesList.map(async (c) => {
          try {
            const details = await caseService.getCase(c.id);
            return details as CaseWithDetails;
          } catch {
            return c as CaseWithDetails;
          }
        })
      );

      setCompletedCases(casesWithDetails);

      // Process data for reports
      processSymptoms(casesWithDetails);
      processCategories(casesWithDetails);
      processIndigenousTerms(casesWithDetails);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao carregar relatórios",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const processSymptoms = (cases: CaseWithDetails[]) => {
    const symptomMap = new Map<string, CaseWithDetails[]>();

    cases.forEach((c) => {
      if (c.structured_data?.sintomas_identificados_ptbr) {
        try {
          const symptoms = JSON.parse(
            c.structured_data.sintomas_identificados_ptbr
          );
          symptoms.forEach((symptom: any) => {
            const symptomName =
              typeof symptom === "string"
                ? symptom
                : symptom.sintoma || JSON.stringify(symptom);
            const existing = symptomMap.get(symptomName) || [];
            symptomMap.set(symptomName, [...existing, c]);
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });

    const groups: SymptomGroup[] = Array.from(symptomMap.entries())
      .map(([symptom, cases]) => ({ symptom, count: cases.length, cases }))
      .sort((a, b) => b.count - a.count);

    setSymptomGroups(groups);
  };

  const processCategories = (cases: CaseWithDetails[]) => {
    const categoryMap = new Map<string, CaseWithDetails[]>();

    cases.forEach((c) => {
      if (c.structured_data?.categoria_sintoma) {
        const category = c.structured_data.categoria_sintoma;
        const existing = categoryMap.get(category) || [];
        categoryMap.set(category, [...existing, c]);
      }
    });

    const groups: CategoryGroup[] = Array.from(categoryMap.entries())
      .map(([category, cases]) => ({ category, count: cases.length, cases }))
      .sort((a, b) => b.count - a.count);

    setCategoryGroups(groups);
  };

  const processIndigenousTerms = (cases: CaseWithDetails[]) => {
    const termMap = new Map<
      string,
      { significado: string; cases: CaseWithDetails[] }
    >();

    cases.forEach((c) => {
      if (c.structured_data?.correspondencia_indigena) {
        try {
          const terms = JSON.parse(c.structured_data.correspondencia_indigena);
          terms.forEach((term: any) => {
            const termName =
              typeof term === "string" ? term : term.termo_nativo;
            const significado =
              typeof term === "object" ? term.significado_aproximado || "" : "";
            const existing = termMap.get(termName) || {
              significado,
              cases: [],
            };
            termMap.set(termName, {
              significado,
              cases: [...existing.cases, c],
            });
          });
        } catch {
          // Skip invalid JSON
        }
      }
    });

    const groups: IndigenousTermGroup[] = Array.from(termMap.entries())
      .map(([termo_nativo, data]) => ({
        termo_nativo,
        significado: data.significado,
        count: data.cases.length,
        cases: data.cases,
      }))
      .sort((a, b) => b.count - a.count);

    setIndigenousTerms(groups);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const getTimelineData = () => {
    const dateMap = new Map<string, number>();

    completedCases.forEach((c) => {
      const date = formatDate(c.created_at);
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const dateA = new Date(a.date.split("/").reverse().join("-"));
        const dateB = new Date(b.date.split("/").reverse().join("-"));
        return dateA.getTime() - dateB.getTime();
      });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aldeia-primary"></div>
          <span className="ml-3 text-gray-600">Carregando relatórios...</span>
        </div>
      </div>
    );
  }

  if (completedCases.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📊</span>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum dado para relatório
          </h3>
          <p className="text-gray-500">
            Os relatórios serão gerados quando houver casos processados com
            sucesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📊 Relatórios</h2>
          <button
            onClick={loadReportData}
            className="text-aldeia-primary hover:text-aldeia-secondary transition-colors"
          >
            🔄 Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">
              {completedCases.length}
            </p>
            <p className="text-sm text-blue-600">Casos Analisados</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-700">
              {symptomGroups.length}
            </p>
            <p className="text-sm text-red-600">Sintomas Únicos</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-700">
              {categoryGroups.length}
            </p>
            <p className="text-sm text-purple-600">Categorias</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-700">
              {indigenousTerms.length}
            </p>
            <p className="text-sm text-green-600">Termos Yanomami</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab("symptoms")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "symptoms"
                  ? "bg-red-100 text-red-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              🩺 Por Sintomas
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "categories"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              📁 Por Categoria
            </button>
            <button
              onClick={() => setActiveTab("indigenous")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "indigenous"
                  ? "bg-green-100 text-green-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              🌿 Termos Yanomami
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === "timeline"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              📅 Linha do Tempo
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Symptoms Tab */}
          {activeTab === "symptoms" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Casos agrupados por Sintomas
              </h3>
              {symptomGroups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum sintoma identificado
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {symptomGroups.map((group, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedGroup(group)}
                      className="bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-4 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-800">
                          {group.symptom}
                        </span>
                        <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-sm font-bold">
                          {group.count}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 mt-2">
                        {group.count === 1 ? "1 caso" : `${group.count} casos`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Casos agrupados por Categoria
              </h3>
              {categoryGroups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma categoria identificada
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryGroups.map((group, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedGroup(group)}
                      className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-purple-800">
                          {group.category}
                        </span>
                        <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-sm font-bold">
                          {group.count}
                        </span>
                      </div>
                      <p className="text-sm text-purple-600 mt-2">
                        {group.count === 1 ? "1 caso" : `${group.count} casos`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Indigenous Terms Tab */}
          {activeTab === "indigenous" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Termos em Yanomami mais frequentes
              </h3>
              {indigenousTerms.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum termo indígena identificado
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {indigenousTerms.map((group, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedGroup(group)}
                      className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-green-800 text-lg">
                          {group.termo_nativo}
                        </span>
                        <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-sm font-bold">
                          {group.count}
                        </span>
                      </div>
                      {group.significado && (
                        <p className="text-sm text-green-700 italic mb-2">
                          → {group.significado}
                        </p>
                      )}
                      <p className="text-sm text-green-600">
                        {group.count === 1 ? "1 caso" : `${group.count} casos`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Casos por Data
              </h3>
              <div className="space-y-2">
                {getTimelineData().map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 bg-blue-50 rounded-lg p-4"
                  >
                    <div className="text-blue-700 font-medium w-28">
                      {item.date}
                    </div>
                    <div className="flex-1">
                      <div
                        className="bg-blue-500 h-8 rounded-lg flex items-center justify-end px-3"
                        style={{
                          width: `${Math.max(
                            10,
                            (item.count /
                              Math.max(
                                ...getTimelineData().map((d) => d.count)
                              )) *
                              100
                          )}%`,
                        }}
                      >
                        <span className="text-white font-bold text-sm">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedGroup(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {"symptom" in selectedGroup &&
                      `🩺 ${selectedGroup.symptom}`}
                    {"category" in selectedGroup &&
                      `📁 ${selectedGroup.category}`}
                    {"termo_nativo" in selectedGroup &&
                      `🌿 ${selectedGroup.termo_nativo}`}
                  </h3>
                  {"significado" in selectedGroup &&
                    selectedGroup.significado && (
                      <p className="text-gray-600 mt-1">
                        → {selectedGroup.significado}
                      </p>
                    )}
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedGroup.count}{" "}
                    {selectedGroup.count === 1
                      ? "caso encontrado"
                      : "casos encontrados"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedGroup.cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        Caso #{caseItem.id}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(caseItem.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">
                      {caseItem.relato_original}
                    </p>
                    {caseItem.structured_data && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {caseItem.structured_data.paciente_nome && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            👤 {caseItem.structured_data.paciente_nome}
                          </span>
                        )}
                        {caseItem.structured_data.idade_paciente && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            🎂 {caseItem.structured_data.idade_paciente}
                          </span>
                        )}
                        {caseItem.structured_data.duracao_sintomas && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                            ⏱️ {caseItem.structured_data.duracao_sintomas}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
