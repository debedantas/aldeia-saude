import { useState, useRef } from "react";
import { caseService, CaseResponse } from "../services/caseService";
import { useToast } from "../context/ToastContext";

interface CreateCaseProps {
  onCaseCreated?: (caseResponse: CaseResponse) => void;
}

export const CreateCase = ({ onCaseCreated }: CreateCaseProps) => {
  const [activeTab, setActiveTab] = useState<"texto" | "audio">("texto");
  const [textReport, setTextReport] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textReport.trim()) {
      showToast("Por favor, descreva os sintomas", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await caseService.createTextCase(textReport);
      showToast(
        `🎉 Caso #${response.case_id} criado com sucesso! Estruturação em andamento...`,
        "success"
      );
      setTextReport("");
      onCaseCreated?.(response);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao criar caso",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, {
          type: "audio/wav",
        });
        setAudioFile(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      showToast("Erro ao acessar microfone. Verifique as permissões.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleAudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      showToast("Por favor, grave um áudio ou selecione um arquivo", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await caseService.createAudioCase(audioFile);
      showToast(
        `🎉 Caso #${response.case_id} criado com sucesso! Processando áudio...`,
        "success"
      );
      setAudioFile(null);
      setRecordingTime(0);
      onCaseCreated?.(response);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao criar caso",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/m4a",
        "audio/x-m4a",
        "audio/mp4",
      ];
      const validExtensions = [".mp3", ".wav", ".m4a", ".mp4", ".mpeg"];

      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));
      const isValidType =
        validTypes.includes(file.type) ||
        validExtensions.includes(fileExtension);

      if (!isValidType) {
        showToast(
          `Formato de arquivo não suportado. Use: MP3, WAV, M4A. Arquivo selecionado: ${
            file.type || fileExtension
          }`,
          "warning"
        );
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        showToast("Arquivo muito grande. Tamanho máximo: 50MB", "error");
        return;
      }

      setAudioFile(file);
      showToast(
        `Arquivo "${file.name}" selecionado (${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB)`,
        "info"
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Criar Novo Caso
        </h2>
        <p className="text-gray-600">
          Registre um novo relato de saúde através de texto ou áudio
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab("texto")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "texto"
              ? "bg-white text-aldeia-primary shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📝 Relato em Texto
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === "audio"
              ? "bg-white text-aldeia-primary shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🎤 Relato em Áudio
        </button>
      </div>

      {/* Text Tab */}
      {activeTab === "texto" && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="relato"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descreva os sintomas e condições do paciente
            </label>
            <textarea
              id="relato"
              value={textReport}
              onChange={(e) => setTextReport(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aldeia-primary focus:border-transparent outline-none transition resize-none"
              placeholder="Exemplo: Paciente com febre há 3 dias, dor de cabeça intensa e mal-estar..."
              rows={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Descreva os sintomas da forma mais detalhada possível
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-aldeia-primary hover:bg-aldeia-secondary disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {isLoading ? "Processando..." : "Criar Caso"}
          </button>
        </form>
      )}

      {/* Audio Tab */}
      {activeTab === "audio" && (
        <div className="space-y-6">
          {/* Recording Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-aldeia-primary bg-opacity-10 rounded-full mb-4">
                <span className="text-2xl">🎤</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Gravar Relato
              </h3>
              {isRecording && (
                <div className="text-red-600 font-medium mb-2">
                  🔴 Gravando: {formatTime(recordingTime)}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="bg-aldeia-primary hover:bg-aldeia-secondary text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Iniciar Gravação
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Parar Gravação
                </button>
              )}
            </div>
          </div>

          {/* File Upload Section */}
          <div className="text-center">
            <div className="text-gray-500 mb-3">ou</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/x-m4a,audio/mp4,.mp3,.wav,.m4a,.mp4"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              Selecionar Arquivo de Áudio
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Formatos suportados: MP3, WAV, M4A (máx. 50MB)
            </p>
          </div>

          {/* Selected Audio Display */}
          {audioFile && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Áudio selecionado:
                  </p>
                  <p className="text-sm text-green-600">{audioFile.name}</p>
                </div>
                <button
                  onClick={() => setAudioFile(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  ❌
                </button>
              </div>
            </div>
          )}

          {/* Submit Audio */}
          {audioFile && (
            <form onSubmit={handleAudioSubmit}>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-aldeia-primary hover:bg-aldeia-secondary disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {isLoading ? "Processando Áudio..." : "Criar Caso"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
