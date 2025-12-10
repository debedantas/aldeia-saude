import { useAuth } from "../context/AuthContext";
import { CreateCase } from "../components/CreateCase";
import { CaseList } from "../components/CaseList";
import { Reports } from "../components/Reports";
import { CaseResponse, caseService, Case } from "../services/caseService";
import { useState, useEffect } from "react";

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<
    "overview" | "create-case" | "cases" | "reports"
  >("overview");
  const [caseListRefreshTrigger, setCaseListRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completo: 0,
    pendente: 0,
    processando: 0,
    erro: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [recentCases, setRecentCases] = useState<Case[]>([]);

  useEffect(() => {
    if (activeSection === "overview") {
      loadStats();
    }
  }, [activeSection, caseListRefreshTrigger]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await caseService.listCases(100);
      const cases = response.casos;
      
      // Calculate statistics
      const total = cases.length;
      const completo = cases.filter(c => c.status === "completo").length;
      const pendente = cases.filter(c => c.status === "pendente").length;
      const processando = cases.filter(c => c.status === "processando").length;
      const erro = cases.filter(c => c.status === "erro").length;

      setStats({ total, completo, pendente, processando, erro });
      
      // Get recent cases (last 2)
      setRecentCases(cases.slice(0, 2));
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleCaseCreated = (caseResponse: CaseResponse) => {
    console.log("Case created:", caseResponse);
    // Navigate to cases and trigger refresh
    setActiveSection("cases");
    setCaseListRefreshTrigger((prev) => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pendente: "bg-yellow-100 text-yellow-800",
      processando: "bg-blue-100 text-blue-800",
      completo: "bg-green-100 text-green-800",
      erro: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || styles.pendente;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const successRate = stats.total > 0 
    ? Math.round((stats.completo / stats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="Aldeia Saúde Logo"
                className="w-16 h-12 object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AldeIA Saúde
                </h1>
                <p className="text-gray-600 text-sm">
                  Sistema de Gestão de Saúde
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.name}</p>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveSection("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === "overview"
                  ? "border-aldeia-primary text-aldeia-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } transition-colors`}
            >
              📊 Visão Geral
            </button>
            <button
              onClick={() => setActiveSection("create-case")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === "create-case"
                  ? "border-aldeia-primary text-aldeia-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } transition-colors`}
            >
              ➕ Criar Caso
            </button>
            <button
              onClick={() => setActiveSection("cases")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === "cases"
                  ? "border-aldeia-primary text-aldeia-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } transition-colors`}
            >
              📋 Casos
            </button>
            <button
              onClick={() => setActiveSection("reports")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === "reports"
                  ? "border-aldeia-primary text-aldeia-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } transition-colors`}
            >
              📊 Relatórios
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Section */}
        {activeSection === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Stats Cards */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
                  Casos Totais
                </div>
                <p className="mt-2 text-3xl font-extrabold text-gray-900">
                  {isLoadingStats ? "--" : stats.total}
                </p>
                <p className="mt-2 text-gray-600 text-sm">
                  {isLoadingStats ? "Carregando..." : "Todos os relatos registrados"}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
                  Casos Completos
                </div>
                <p className="mt-2 text-3xl font-extrabold text-green-600">
                  {isLoadingStats ? "--" : stats.completo}
                </p>
                <p className="mt-2 text-gray-600 text-sm">
                  {isLoadingStats ? "Carregando..." : "Processados com sucesso"}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
                  Casos Pendentes
                </div>
                <p className="mt-2 text-3xl font-extrabold text-yellow-600">
                  {isLoadingStats ? "--" : stats.pendente + stats.processando}
                </p>
                <p className="mt-2 text-gray-600 text-sm">
                  {isLoadingStats ? "Carregando..." : `${stats.pendente} pendentes, ${stats.processando} processando`}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
                  Taxa de Sucesso
                </div>
                <p className="mt-2 text-3xl font-extrabold text-gray-900">
                  {isLoadingStats ? "--" : `${successRate}%`}
                </p>
                <p className="mt-2 text-gray-600 text-sm">
                  {isLoadingStats ? "Carregando..." : stats.erro > 0 ? `${stats.erro} com erro` : "Sem erros"}
                </p>
              </div>
            </div>

            {/* Recent Cases */}
            {!isLoadingStats && recentCases.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Casos Recentes
                </h2>
                <div className="space-y-3">
                  {recentCases.map((caso) => (
                    <div
                      key={caso.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setActiveSection("cases")}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-700">
                            Caso #{caso.id}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(
                              caso.status
                            )}`}
                          >
                            {caso.status.charAt(0).toUpperCase() + caso.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {caso.tipo_entrada === "audio" ? "🎤 Áudio" : "📝 Texto"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {caso.relato_original.substring(0, 100)}...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(caso.created_at)}
                        </p>
                      </div>
                      <button
                        className="ml-4 text-aldeia-primary hover:text-aldeia-primary-dark font-medium text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSection("cases");
                        }}
                      >
                        Ver detalhes →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Ações Rápidas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveSection("create-case")}
                  className="p-6 border-2 border-dashed border-aldeia-primary rounded-lg hover:bg-aldeia-primary hover:bg-opacity-5 transition-colors group"
                >
                  <div className="text-center">
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">
                      ➕
                    </span>
                    <h3 className="text-lg font-semibold text-aldeia-primary mb-2">
                      Criar Novo Caso
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Registrar relato de saúde por texto ou áudio
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveSection("cases")}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="text-center">
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">
                      📋
                    </span>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Ver Todos os Casos
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Visualizar e gerenciar {stats.total} casos
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveSection("reports")}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="text-center">
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">
                      📊
                    </span>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Relatórios
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Visualizar estatísticas e análises
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Create Case Section */}
        {activeSection === "create-case" && (
          <CreateCase onCaseCreated={handleCaseCreated} />
        )}

        {/* Cases List Section */}
        {activeSection === "cases" && (
          <CaseList refreshTrigger={caseListRefreshTrigger} />
        )}

        {/* Reports Section */}
        {activeSection === "reports" && <Reports />}
      </main>
    </div>
  );
};
