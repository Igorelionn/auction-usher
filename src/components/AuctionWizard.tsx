import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AuctionFormValues } from "@/components/AuctionForm";
import { LoteInfo, MercadoriaInfo, ItemCustoInfo, ItemPatrocinioInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StringDatePicker } from "@/components/ui/date-picker";
import { ChevronLeft, ChevronRight, Check, Plus, X as XIcon, Trash2, Image as ImageIcon } from "lucide-react";
import { calcularValorTotal } from "@/lib/parcelamento-calculator";
import { ParcelamentoPreview } from "@/components/ParcelamentoPreview";
import { parseCurrencyToNumber } from "@/lib/utils";

interface AuctionWizardProps {
  initial: AuctionFormValues;
  onSubmit: (values: AuctionFormValues) => Promise<void> | void;
  onCancel?: () => void;
  initialStep?: number;
  initialLoteIndex?: number;
}

export function AuctionWizard({ initial, onSubmit, onCancel, initialStep, initialLoteIndex }: AuctionWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep ?? 0);
  const [values, setValues] = useState<AuctionFormValues>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLoteIndex, setSelectedLoteIndex] = useState(initialLoteIndex ?? 0);
  const [selectedMercadoriaIndex, setSelectedMercadoriaIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  
  // Estados para custos e patrocínios
  const [costItems, setCostItems] = useState<ItemCustoInfo[]>(initial.detalheCustos || []);
  const [sponsorItems, setSponsorItems] = useState<ItemPatrocinioInfo[]>(initial.detalhePatrocinios || []);
  const [selectedCostIndex, setSelectedCostIndex] = useState(0);
  const [selectedSponsorIndex, setSelectedSponsorIndex] = useState(0);
  
  // Estado para validação de datas
  const [dataInvalida, setDataInvalida] = useState(false);

  // Verificar se data de início é posterior à data de término
  useEffect(() => {
    if (values.dataInicio && values.dataEncerramento) {
      // Converter strings de data (formato DD/MM/YYYY ou YYYY-MM-DD) para Date
      const parseDate = (dateStr: string): Date => {
        if (dateStr.includes('/')) {
          // Formato DD/MM/YYYY
          const [dia, mes, ano] = dateStr.split('/');
          return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else {
          // Formato YYYY-MM-DD
          const [ano, mes, dia] = dateStr.split('-');
          return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        }
      };
      
      const dataInicio = parseDate(values.dataInicio);
      const dataFim = parseDate(values.dataEncerramento);
      
      // Verificar se data de início é posterior à data de término
      if (dataInicio > dataFim) {
        setDataInvalida(true);
      } else {
        setDataInvalida(false);
      }
    } else {
      setDataInvalida(false);
    }
  }, [values.dataInicio, values.dataEncerramento]);

  // Atualizar status automaticamente baseado nas datas
  useEffect(() => {
    if (values.dataInicio && values.dataEncerramento) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas datas
      
      // Converter strings de data (formato DD/MM/YYYY ou YYYY-MM-DD) para Date
      const parseDate = (dateStr: string): Date => {
        if (dateStr.includes('/')) {
          // Formato DD/MM/YYYY
          const [dia, mes, ano] = dateStr.split('/');
          return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else {
          // Formato YYYY-MM-DD
          const [ano, mes, dia] = dateStr.split('-');
          return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        }
      };
      
      const dataInicio = parseDate(values.dataInicio);
      const dataFim = parseDate(values.dataEncerramento);
      
      let novoStatus: "agendado" | "em_andamento" | "finalizado" = "agendado";
      
      if (dataFim < hoje) {
        // Se data de encerramento já passou, está finalizado
        novoStatus = "finalizado";
      } else if (dataInicio <= hoje && hoje <= dataFim) {
        // Se está entre data de início e fim, está em andamento
        novoStatus = "em_andamento";
      } else if (dataInicio > hoje) {
        // Se data de início é futura, está agendado
        novoStatus = "agendado";
      }
      
      // Atualizar status apenas se for diferente do atual
      if (values.status !== novoStatus) {
        setValues(prev => ({ ...prev, status: novoStatus }));
      }
    }
  }, [values.dataInicio, values.dataEncerramento, values.status]);

  const updateField = (field: keyof AuctionFormValues, value: AuctionFormValues[keyof AuctionFormValues]) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const updateLote = <K extends keyof LoteInfo>(index: number, field: K, value: LoteInfo[K]) => {
    const updatedLotes = [...(values.lotes || [])];
    updatedLotes[index] = { ...updatedLotes[index], [field]: value };
    updateField("lotes", updatedLotes);
  };

  const addMercadoriaToLote = (loteIndex: number) => {
    const updatedLotes = [...(values.lotes || [])];
    const currentMercadorias = updatedLotes[loteIndex].mercadorias || [];
    const newMercadoria: MercadoriaInfo = {
      id: Date.now().toString(),
      titulo: "",
      descricao: "",
      valor: "0",
      valorNumerico: 0
    };
    updatedLotes[loteIndex].mercadorias = [...currentMercadorias, newMercadoria];
    updateField("lotes", updatedLotes);
    // Seta o índice para a nova mercadoria (último índice do array atualizado)
    setSelectedMercadoriaIndex(currentMercadorias.length);
  };

  const updateMercadoria = (loteIndex: number, mercadoriaIndex: number, field: keyof MercadoriaInfo, value: string | number) => {
    const updatedLotes = [...(values.lotes || [])];
    const mercadorias = [...(updatedLotes[loteIndex].mercadorias || [])];
    mercadorias[mercadoriaIndex] = { ...mercadorias[mercadoriaIndex], [field]: value };
    updatedLotes[loteIndex].mercadorias = mercadorias;
    updateField("lotes", updatedLotes);
  };

  const removeMercadoria = (loteIndex: number, mercadoriaIndex: number) => {
    const updatedLotes = [...(values.lotes || [])];
    const mercadorias = updatedLotes[loteIndex].mercadorias?.filter((_, i) => i !== mercadoriaIndex) || [];
    updatedLotes[loteIndex].mercadorias = mercadorias;
    updateField("lotes", updatedLotes);
    // Ajusta o índice selecionado após remover
    if (mercadorias.length === 0) {
      setSelectedMercadoriaIndex(0);
    } else if (mercadoriaIndex >= mercadorias.length) {
      setSelectedMercadoriaIndex(mercadorias.length - 1);
    }
  };

  const addLote = () => {
    const newLote: LoteInfo = {
      id: Date.now().toString(),
      numero: `${(values.lotes?.length || 0) + 1}`.padStart(3, '0'),
      descricao: "",
      mercadorias: [],
      status: 'disponivel'
    };
    updateField("lotes", [...(values.lotes || []), newLote]);
  };

  const addMercadoria = (loteIndex: number) => {
    const newMercadoria: MercadoriaInfo = {
      id: Date.now().toString(),
      tipo: "",
      descricao: "",
      valor: "0,00",
      valorNumerico: 0
    };
    const updatedLotes = [...(values.lotes || [])];
    updatedLotes[loteIndex] = {
      ...updatedLotes[loteIndex],
      mercadorias: [...(updatedLotes[loteIndex].mercadorias || []), newMercadoria]
    };
    updateField("lotes", updatedLotes);
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Informações Básicas
        return !!(values.nome && values.identificacao);
      case 1: // Datas
        return !!(values.dataInicio && values.dataEncerramento) && !dataInvalida;
      case 2: // Local
        if (values.local === "presencial" || values.local === "hibrido") {
          return !!(values.local && values.endereco);
        }
        return !!values.local;
      case 3: // Status
        return !!values.status;
      case 4: // Lotes
        return (values.lotes?.length || 0) > 0;
      case 5: // Pagamento
        return true; // Opcional
      case 6: // Custos e Patrocínios
        return costItems.length > 0 && sponsorItems.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      alert("Por favor, preencha todos os campos obrigatórios antes de avançar.");
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onCancel) onCancel();
    }, 300); // Duração da animação de fade-out
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      id: "basico",
      title: "Informações Básicas do Leilão",
      content: (
          <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Como devemos chamar este leilão?</Label>
            <Input
              type="text"
              placeholder="Ex: Leilão Beneficente 2024"
              value={values.nome || ""}
              onChange={(e) => updateField("nome", e.target.value)}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Qual o código de identificação?</Label>
            <Input
              type="text"
              placeholder="Ex: LEI-2024-001"
              value={values.identificacao || ""}
              onChange={(e) => updateField("identificacao", e.target.value)}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
          </div>
        </div>
      )
    },
    {
      id: "datas",
      title: "Datas do Leilão",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Quando o leilão começa?</Label>
            <StringDatePicker
              value={values.dataInicio || ""}
              onChange={(v) => updateField("dataInicio", v)}
              placeholder="Ex: 01/01/2024"
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Quando o leilão termina?</Label>
            <StringDatePicker
              value={values.dataEncerramento || ""}
              onChange={(v) => updateField("dataEncerramento", v)}
              placeholder="Ex: 31/12/2024"
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent"
            />
          </div>

          {dataInvalida && (
            <p className="mt-4 text-sm text-red-600">
              A data de início não pode ser posterior à data de término
            </p>
          )}
        </div>
      )
    },
    {
      id: "local",
      title: "Local e Modalidade",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Como será realizado?</Label>
            <Select
              value={values.local || ""}
              onValueChange={(v) => updateField("local", v)}
            >
              <SelectTrigger className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus:border-gray-800 focus-visible:ring-0 focus-visible:outline-none focus:outline-none active:outline-none outline-none ring-0 px-0 bg-transparent [&:focus]:ring-0 [&:active]:ring-0">
                <SelectValue placeholder="Ex: Presencial" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(values.local === "presencial" || values.local === "hibrido") && (
            <div className="space-y-3">
              <Label className="text-lg font-normal text-gray-600">Qual o endereço?</Label>
              <Input
                type="text"
                placeholder="Ex: Rua Principal, 123 - Centro"
                value={values.endereco || ""}
                onChange={(e) => updateField("endereco", e.target.value)}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>
          )}
        </div>
      )
    },
    {
      id: "status",
      title: "Status do Leilão",
      content: (
          <div className="space-y-3">
          <Label className="text-lg font-normal text-gray-600">Qual o status atual do leilão?</Label>
          <Select
            value={values.status || "agendado"}
            onValueChange={(v) => updateField("status", v)}
          >
            <SelectTrigger className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus:border-gray-800 focus-visible:ring-0 focus-visible:outline-none focus:outline-none active:outline-none outline-none ring-0 px-0 bg-transparent [&:focus]:ring-0 [&:active]:ring-0">
              <SelectValue placeholder="Ex: Agendado" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="z-[100000]">
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    },
    {
      id: "lotes",
      title: "Configuração de Lotes",
      content: (
        <div className="space-y-6">
          {(values.lotes || []).length === 0 ? (
            <div className="space-y-4">
              <Label className="text-lg font-normal text-gray-600">
                Quantos lotes terá este leilão?
              </Label>
              <Button
                type="button"
                onClick={() => {
                  addLote();
                  setSelectedLoteIndex(0);
                }}
                variant="outline"
                className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Lote
              </Button>
            </div>
          ) : (
            <>
              {/* Seletor de Lote */}
              <div className="space-y-3">
                <Label className="text-lg font-normal text-gray-600">Selecione o lote para editar</Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedLoteIndex.toString()}
                    onValueChange={(v) => {
                      setSelectedLoteIndex(parseInt(v));
                      setSelectedMercadoriaIndex(0);
                    }}
                  >
                    <SelectTrigger className="h-12 flex-1 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                      {(values.lotes || []).map((lote, index) => (
                        <SelectItem key={lote.id} value={index.toString()}>
                          Lote {lote.numero} {lote.descricao ? `- ${lote.descricao.substring(0, 30)}...` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    type="button"
                    onClick={() => {
                      addLote();
                      setSelectedLoteIndex((values.lotes || []).length);
                    }}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 hover:bg-gray-100"
                  >
                    <Plus className="h-5 w-5 text-gray-900 hover:text-gray-900" />
                  </Button>
                </div>
                
                <p className="text-sm text-gray-500">
                  Total: {(values.lotes || []).length} lote(s)
                </p>
              </div>

              {/* Formulário do Lote Selecionado */}
              {values.lotes && values.lotes[selectedLoteIndex] && (
                <div className="p-6 border border-gray-200 rounded-lg space-y-6 bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Lote {values.lotes[selectedLoteIndex].numero}
                    </h3>
                    {(values.lotes || []).length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedLotes = values.lotes?.filter((_, i) => i !== selectedLoteIndex);
                          updateField("lotes", updatedLotes);
                          setSelectedLoteIndex(Math.max(0, selectedLoteIndex - 1));
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XIcon className="h-4 w-4 mr-1" />
                        Remover Lote
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Número do Lote</Label>
                      <Input
                        type="text"
                        placeholder="Ex: 001"
                        value={values.lotes[selectedLoteIndex].numero || ""}
                        onChange={(e) => updateLote(selectedLoteIndex, "numero", e.target.value)}
                        className="h-12 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Descrição do Lote</Label>
                      <Textarea
                        placeholder="Ex: Touros Nelore PO"
                        value={values.lotes[selectedLoteIndex].descricao || ""}
                        onChange={(e) => updateLote(selectedLoteIndex, "descricao", e.target.value)}
                        className="min-h-[100px] focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                      />
                    </div>

                    {/* Seção de Imagens do Lote */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Imagens do Lote</Label>
                        {values.lotes[selectedLoteIndex].imagens && values.lotes[selectedLoteIndex].imagens.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {values.lotes[selectedLoteIndex].imagens.length} {values.lotes[selectedLoteIndex].imagens.length === 1 ? 'imagem' : 'imagens'}
                          </span>
          )}
        </div>
                      
                      {/* Upload Area */}
                      <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 font-medium">Clique para adicionar imagens</p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP</p>
              </div>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              const currentImages = values.lotes[selectedLoteIndex].imagens || [];
                              
                              // Converter arquivos para base64
                              const newImagesPromises = files.map(file => {
                                return new Promise<string>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => resolve(reader.result as string);
                                  reader.onerror = reject;
                                  reader.readAsDataURL(file);
                                });
                              });
                              
                              try {
                                const newImages = await Promise.all(newImagesPromises);
                                updateLote(selectedLoteIndex, "imagens", [...currentImages, ...newImages]);
                              } catch (error) {
                                console.error('Erro ao converter imagens:', error);
                              }
                            }
                          }}
                  />
                      </label>

                      {/* Preview Grid */}
                      {values.lotes[selectedLoteIndex].imagens && values.lotes[selectedLoteIndex].imagens.length > 0 && (
                        <div className="grid grid-cols-5 gap-3">
                          {values.lotes[selectedLoteIndex].imagens.map((img, imgIndex) => (
                            <div key={imgIndex} className="relative group aspect-square">
                              <img
                                src={img}
                                alt={`Imagem ${imgIndex + 1}`}
                                className="w-full h-full object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedImages = values.lotes[selectedLoteIndex].imagens.filter((_, i) => i !== imgIndex);
                                  updateLote(selectedLoteIndex, "imagens", updatedImages);
                        }}
                                className="absolute top-2 right-2 w-7 h-7 bg-white text-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-50 hover:text-red-600"
                              >
                                <XIcon className="h-4 w-4" />
                              </button>
                    </div>
                          ))}
                        </div>
                      )}
                  </div>

                    {/* Seção de Mercadorias */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Mercadorias do Lote</Label>
                        <button
                          type="button"
                          onClick={() => addMercadoriaToLote(selectedLoteIndex)}
                          className="w-8 h-8 flex items-center justify-center text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                    </div>

                      {(!values.lotes[selectedLoteIndex].mercadorias || values.lotes[selectedLoteIndex].mercadorias?.length === 0) ? (
                        <p className="text-sm text-gray-400 py-4">Nenhuma mercadoria adicionada</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                <Select
                              value={selectedMercadoriaIndex.toString()}
                              onValueChange={(v) => setSelectedMercadoriaIndex(parseInt(v))}
                >
                              <SelectTrigger className="h-12 flex-1 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                <SelectValue>
                                  {(() => {
                                    const merc = values.lotes[selectedLoteIndex].mercadorias?.[selectedMercadoriaIndex];
                                    const mercNum = String(selectedMercadoriaIndex + 1).padStart(3, '0');
                                    const titulo = merc?.titulo || "Nova Mercadoria";
                                    const displayText = `Mercadoria ${mercNum} - ${titulo}`;
                                    return displayText.length > 50 ? displayText.substring(0, 47) + "..." : displayText;
                                  })()}
                                </SelectValue>
                  </SelectTrigger>
                              <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                                {values.lotes[selectedLoteIndex].mercadorias?.map((merc, index) => {
                                  const mercNum = String(index + 1).padStart(3, '0');
                                  const titulo = merc.titulo || "Nova Mercadoria";
                                  return (
                                    <SelectItem key={merc.id} value={index.toString()}>
                                      Mercadoria {mercNum} - {titulo}
                                    </SelectItem>
                                  );
                                })}
                  </SelectContent>
                </Select>

                            <button
                              type="button"
                              onClick={() => removeMercadoria(selectedLoteIndex, selectedMercadoriaIndex)}
                              className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                      </div>

                          {values.lotes[selectedLoteIndex].mercadorias?.[selectedMercadoriaIndex] && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                                <Label className="text-sm text-gray-600">Título da Mercadoria</Label>
                        <Input
                                  type="text"
                                  placeholder="Ex: Touro Nelore Registrado"
                                  value={values.lotes[selectedLoteIndex].mercadorias[selectedMercadoriaIndex].titulo || ""}
                                  onChange={(e) => updateMercadoria(selectedLoteIndex, selectedMercadoriaIndex, "titulo", e.target.value)}
                                  className="h-10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                      />
                      </div>

                      <div className="space-y-2">
                                <Label className="text-sm text-gray-600">Quantidade</Label>
                        <Input
                          type="number"
                                  placeholder="Ex: 10"
                                  min="1"
                                  value={values.lotes[selectedLoteIndex].mercadorias[selectedMercadoriaIndex].quantidade || ""}
                          onChange={(e) => {
                                    const valor = e.target.value === "" ? undefined : parseInt(e.target.value);
                                    updateMercadoria(selectedLoteIndex, selectedMercadoriaIndex, "quantidade", valor as number);
                          }}
                                  className="h-10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                        />
                                <p className="text-xs text-gray-500">Informe a quantidade de unidades desta mercadoria no lote</p>
                      </div>

                      <div className="space-y-2">
                                <Label className="text-sm text-gray-600">Descrição da Mercadoria</Label>
                                <Textarea
                                  placeholder="Ex: Touro da raça Nelore, 3 anos, peso aproximado 850kg, registro ABCZ"
                                  value={values.lotes[selectedLoteIndex].mercadorias[selectedMercadoriaIndex].descricao}
                                  onChange={(e) => updateMercadoria(selectedLoteIndex, selectedMercadoriaIndex, "descricao", e.target.value)}
                                  className="min-h-[80px] text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                      />
                      </div>
                    </div>
                    )}
                </>
              )}
            </div>
                      </div>
                      </div>
              )}
            </>
          )}
        </div>
      )
    },
    {
      id: "custos",
      title: "Custos e Patrocínios",
      content: (
        <div className="space-y-10">
          {/* Seção de Custos */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-normal text-gray-600">Custos do leilão</Label>
              <button
                type="button"
                onClick={() => {
                  const newItem: ItemCustoInfo = {
                    id: Date.now().toString(),
                    descricao: "",
                    valor: "",
                    valorNumerico: 0
                  };
                  const newItems = [...costItems, newItem];
                  setCostItems(newItems);
                  updateField("detalheCustos", newItems);
                  setSelectedCostIndex(newItems.length - 1);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            {costItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum custo adicionado</p>
            ) : (
              <>
                {/* Seletor de Custo */}
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedCostIndex.toString()}
                    onValueChange={(v) => setSelectedCostIndex(parseInt(v))}
                  >
                    <SelectTrigger className="h-11 flex-1 border-gray-200 focus:ring-0 focus:outline-none focus-visible:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                      {costItems.map((item, index) => (
                        <SelectItem key={item.id} value={index.toString()}>
                          {item.descricao || `Custo ${index + 1}`} {item.valor ? `- R$ ${item.valor}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {costItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = costItems.filter((_, i) => i !== selectedCostIndex);
                        setCostItems(newItems);
                        updateField("detalheCustos", newItems);
                        updateField("custosNumerico", newItems.reduce((sum, i) => sum + i.valorNumerico, 0));
                        setSelectedCostIndex(Math.max(0, selectedCostIndex - 1));
                      }}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Formulário do Custo Selecionado */}
                {costItems[selectedCostIndex] && (
                  <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Descrição</Label>
                      <Input
                        type="text"
                        placeholder="Ex: Transporte, Alimentação..."
                        value={costItems[selectedCostIndex].descricao}
                        onChange={(e) => {
                          const newItems = [...costItems];
                          newItems[selectedCostIndex].descricao = e.target.value;
                          setCostItems(newItems);
                          updateField("detalheCustos", newItems);
                        }}
                        className="wizard-input h-12 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Valor (R$)</Label>
                      <Input
                        type="text"
                        placeholder="Ex: 1.500,00"
                        value={costItems[selectedCostIndex].valor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^[\d.,]*$/.test(value)) {
                            const numericValue = parseCurrencyToNumber(value);
                            const newItems = [...costItems];
                            newItems[selectedCostIndex].valor = value;
                            newItems[selectedCostIndex].valorNumerico = numericValue;
                            setCostItems(newItems);
                            updateField("detalheCustos", newItems);
                            updateField("custosNumerico", newItems.reduce((sum, i) => sum + i.valorNumerico, 0));
                          }
                        }}
                        className="wizard-input h-12 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                )}

                {/* Total de Custos */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-400">{costItems.length} {costItems.length === 1 ? 'custo' : 'custos'}</span>
                  <span className="text-sm font-medium text-gray-700">
                    Total: {costItems.reduce((sum, item) => sum + item.valorNumerico, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Seção de Patrocínios */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-normal text-gray-600">Patrocínios do leilão</Label>
              <button
                type="button"
                onClick={() => {
                  const newItem: ItemPatrocinioInfo = {
                    id: Date.now().toString(),
                    nomePatrocinador: "",
                    valor: "",
                    valorNumerico: 0
                  };
                  const newItems = [...sponsorItems, newItem];
                  setSponsorItems(newItems);
                  updateField("detalhePatrocinios", newItems);
                  setSelectedSponsorIndex(newItems.length - 1);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            {sponsorItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum patrocinador adicionado</p>
            ) : (
              <>
                {/* Seletor de Patrocinador */}
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedSponsorIndex.toString()}
                    onValueChange={(v) => setSelectedSponsorIndex(parseInt(v))}
                  >
                    <SelectTrigger className="h-11 flex-1 border-gray-200 focus:ring-0 focus:outline-none focus-visible:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                      {sponsorItems.map((item, index) => (
                        <SelectItem key={item.id} value={index.toString()}>
                          {item.nomePatrocinador || `Patrocinador ${index + 1}`} {item.valor ? `- R$ ${item.valor}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {sponsorItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = sponsorItems.filter((_, i) => i !== selectedSponsorIndex);
                        setSponsorItems(newItems);
                        updateField("detalhePatrocinios", newItems);
                        updateField("patrociniosTotal", newItems.reduce((sum, i) => sum + i.valorNumerico, 0));
                        setSelectedSponsorIndex(Math.max(0, selectedSponsorIndex - 1));
                      }}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Formulário do Patrocinador Selecionado */}
                {sponsorItems[selectedSponsorIndex] && (
                  <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Nome do patrocinador</Label>
                      <Input
                        type="text"
                        placeholder="Ex: Empresa ABC, João Silva..."
                        value={sponsorItems[selectedSponsorIndex].nomePatrocinador}
                        onChange={(e) => {
                          const newItems = [...sponsorItems];
                          newItems[selectedSponsorIndex].nomePatrocinador = e.target.value;
                          setSponsorItems(newItems);
                          updateField("detalhePatrocinios", newItems);
                        }}
                        className="wizard-input h-12 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Valor (R$)</Label>
                      <Input
                        type="text"
                        placeholder="Ex: 5.000,00"
                        value={sponsorItems[selectedSponsorIndex].valor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^[\d.,]*$/.test(value)) {
                            const numericValue = parseCurrencyToNumber(value);
                            const newItems = [...sponsorItems];
                            newItems[selectedSponsorIndex].valor = value;
                            newItems[selectedSponsorIndex].valorNumerico = numericValue;
                            setSponsorItems(newItems);
                            updateField("detalhePatrocinios", newItems);
                            updateField("patrociniosTotal", newItems.reduce((sum, i) => sum + i.valorNumerico, 0));
                          }
                        }}
                        className="wizard-input h-12 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                )}

                {/* Total de Patrocínios */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-400">{sponsorItems.length} {sponsorItems.length === 1 ? 'patrocinador' : 'patrocinadores'}</span>
                  <span className="text-sm font-medium text-gray-700">
                    Total: {sponsorItems.reduce((sum, item) => sum + item.valorNumerico, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )
    },
  ];

  const currentStepData = steps[currentStep];

    return createPortal(
      <div 
        className={`fixed inset-0 top-0 left-0 right-0 bottom-0 bg-white overflow-auto transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ 
          animation: isClosing ? 'none' : 'wizardFadeIn 0.3s ease-out', 
          margin: 0, 
          padding: 0,
          zIndex: 99999
        }}
      >
        {/* Botão Voltar/Fechar - Canto Superior Esquerdo */}
      <div className="fixed top-8 left-8 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={currentStep === 0 ? handleClose : handleBack}
          className="rounded-full w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-700"
        >
          {currentStep === 0 ? (
            <XIcon className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </Button>
      </div>

      <div className="min-h-screen flex">
        {/* Indicadores de Etapas - Lateral Esquerda */}
        <div className="hidden md:flex flex-col justify-center w-80 px-12">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                onClick={() => goToStep(index)}
                className={`text-lg font-normal transition-colors duration-200 cursor-pointer hover:text-gray-600 ${
                  index === currentStep
                    ? "text-gray-700"
                    : index < currentStep
                    ? "text-gray-400"
                    : "text-gray-300"
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 flex items-center justify-center px-8 md:px-20 py-16">
          <div className="w-full max-w-2xl space-y-12">
            {/* Título da Etapa */}
            <div>
              <h1 className="text-3xl md:text-4xl font-normal text-gray-900 leading-tight">
                {currentStepData.title}
              </h1>
            </div>

            {/* Conteúdo da Etapa */}
            <div>{currentStepData.content}</div>

            {/* Botão de Avançar */}
            <div className="pt-4">
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="w-full h-14 text-base font-normal bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-all duration-200"
                  size="lg"
                >
                  Avançar
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-14 text-base font-normal bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-all duration-200"
                  size="lg"
                >
                  {isSubmitting ? "Salvando..." : "Concluir"}
                  {!isSubmitting && <Check className="h-5 w-5 ml-2" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
