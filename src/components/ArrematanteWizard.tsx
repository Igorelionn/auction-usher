import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrematanteInfo, LoteInfo, DocumentoInfo, Auction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, X as XIcon, Upload, Trash2, Plus, AlertCircle, Eye, Users } from "lucide-react";
import { StringDatePicker } from "@/components/ui/date-picker";
import { parseCurrencyToNumber } from "@/lib/utils";
import { calcularValorTotal, obterQuantidadeTotalParcelas } from "@/lib/parcelamento-calculator";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper para interpretar números com formato brasileiro
// 1.000 = mil, 1.000,50 = mil e cinquenta centavos
const parseBrazilianNumber = (value: string): number | undefined => {
  if (value === "") return undefined;
  // Remove espaços
  let cleaned = value.trim();
  // Substitui vírgula por ponto (vírgula é decimal no Brasil)
  // Mas primeiro, remove pontos (separadores de milhar)
  cleaned = cleaned.replace(/\./g, '');
  cleaned = cleaned.replace(/,/g, '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
};

// Helper para formatar CPF ou CNPJ automaticamente
const formatCpfCnpj = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 14 dígitos (tamanho do CNPJ)
  const limited = numbers.slice(0, 14);
  
  // Se tem até 11 dígitos, formata como CPF
  if (limited.length <= 11) {
    // CPF: 000.000.000-00
    return limited
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  
  // Se tem mais de 11 dígitos, formata como CNPJ
  // CNPJ: 00.000.000/0000-00
  return limited
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

// Helper para formatar telefone automaticamente
const formatTelefone = (value: string, codigoPais: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  switch (codigoPais) {
    case '+55': // Brasil
      {
        const limited = numbers.slice(0, 11);
        // Celular (11 dígitos): (00) 00000-0000
        if (limited.length > 10) {
          return limited
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
        }
        // Fixo (10 dígitos): (00) 0000-0000
        return limited
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
    
    case '+1': // EUA/Canadá
      {
        const limited = numbers.slice(0, 10);
        // Formato: (000) 000-0000
        return limited
          .replace(/(\d{3})(\d)/, '($1) $2')
          .replace(/(\d{3})(\d{1,4})$/, '$1-$2');
      }
    
    case '+54': // Argentina
      {
        const limited = numbers.slice(0, 10);
        // Formato: (000) 000-0000
        return limited
          .replace(/(\d{2,4})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
    
    case '+52': // México
      {
        const limited = numbers.slice(0, 10);
        // Formato: (000) 000-0000
        return limited
          .replace(/(\d{3})(\d)/, '($1) $2')
          .replace(/(\d{3})(\d{1,4})$/, '$1-$2');
      }
    
    case '+56': // Chile
      {
        const limited = numbers.slice(0, 9);
        // Formato: 0 0000-0000
        return limited
          .replace(/(\d{1})(\d)/, '$1 $2')
          .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
    
    case '+57': // Colômbia
      {
        const limited = numbers.slice(0, 10);
        // Formato: (000) 000-0000
        return limited
          .replace(/(\d{3})(\d)/, '($1) $2')
          .replace(/(\d{3})(\d{1,4})$/, '$1-$2');
      }
    
    case '+595': // Paraguai
    case '+598': // Uruguai
      {
        const limited = numbers.slice(0, 9);
        // Formato: (00) 000-000
        return limited
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{3})(\d{1,3})$/, '$1-$2');
      }
    
    case '+351': // Portugal
    case '+34': // Espanha
      {
        const limited = numbers.slice(0, 9);
        // Formato: 000 000 000
        return limited
          .replace(/(\d{3})(\d)/, '$1 $2')
          .replace(/(\d{3})(\d{1,3})$/, '$1 $2');
      }
    
    case '+33': // França
      {
        const limited = numbers.slice(0, 9);
        // Formato: 00 00 00 00 00
        return limited
          .replace(/(\d{2})(\d)/, '$1 $2')
          .replace(/(\d{2})(\d)/, '$1 $2')
          .replace(/(\d{2})(\d)/, '$1 $2')
          .replace(/(\d{2})(\d{1,2})$/, '$1 $2');
      }
    
    case '+49': // Alemanha
      {
        const limited = numbers.slice(0, 11);
        // Formato: 0000 00000000
        return limited
          .replace(/(\d{4})(\d{1,7})$/, '$1 $2');
      }
    
    case '+44': // Reino Unido
      {
        const limited = numbers.slice(0, 10);
        // Formato: 0000 000000
        return limited
          .replace(/(\d{4})(\d{1,6})$/, '$1 $2');
      }
    
    case '+86': // China
    case '+81': // Japão
    case '+82': // Coreia do Sul
      {
        const limited = numbers.slice(0, 11);
        // Formato: 000-0000-0000
        return limited
          .replace(/(\d{3})(\d)/, '$1-$2')
          .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
    
    case '+91': // Índia
      {
        const limited = numbers.slice(0, 10);
        // Formato: 00000-00000
        return limited
          .replace(/(\d{5})(\d{1,5})$/, '$1-$2');
      }
    
    default:
      // Para países não especificados, limita a 15 dígitos e retorna sem formatação
      return numbers.slice(0, 15);
  }
};

// Helper para formatar CEP automaticamente
const formatCep = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 8 dígitos
  const limited = numbers.slice(0, 8);
  
  // Formata como CEP: 00000-000
  return limited.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

// Valida formato de e-mail
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  // Regex padrão para validação de e-mail
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Componente de bandeira SVG
const FlagIcon = ({ countryCode, countryName }: { countryCode: string; countryName?: string }) => {
  const flagClass = "w-6 h-4 rounded-sm overflow-hidden flex-shrink-0";
  
  // Para +1, diferenciar entre EUA e Canadá pelo nome
  if (countryCode === '+1' && countryName === 'Canadá') {
    return (
      <svg className={flagClass} viewBox="0 0 24 16" fill="none">
        <rect width="6" height="16" fill="#FF0000"/>
        <rect x="6" width="12" height="16" fill="white"/>
        <rect x="18" width="6" height="16" fill="#FF0000"/>
        <path d="M12 5 L13 7 L11.5 7.5 L13 8 L12 10 L11.5 8.5 L10 8 L11.5 7.5 Z" fill="#FF0000"/>
      </svg>
    );
  }
  
  switch (countryCode) {
    case '+55': // Brasil
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="#009B3A"/>
          <path d="M12 2 L22 8 L12 14 L2 8 Z" fill="#FFDF00"/>
          <circle cx="12" cy="8" r="3.5" fill="#002776"/>
        </svg>
      );
    case '+1': // EUA
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="#B22234"/>
          <rect y="1.2" width="24" height="1.2" fill="white"/>
          <rect y="3.6" width="24" height="1.2" fill="white"/>
          <rect y="6" width="24" height="1.2" fill="white"/>
          <rect y="8.4" width="24" height="1.2" fill="white"/>
          <rect y="10.8" width="24" height="1.2" fill="white"/>
          <rect y="13.2" width="24" height="1.2" fill="white"/>
          <rect width="10" height="8.4" fill="#3C3B6E"/>
        </svg>
      );
    case '+54': // Argentina
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="5.33" fill="#74ACDF"/>
          <rect y="5.33" width="24" height="5.33" fill="white"/>
          <rect y="10.67" width="24" height="5.33" fill="#74ACDF"/>
          <circle cx="12" cy="8" r="2" fill="#F6B40E" stroke="#85340A" strokeWidth="0.3"/>
        </svg>
      );
    case '+52': // México
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="8" height="16" fill="#006847"/>
          <rect x="8" width="8" height="16" fill="white"/>
          <rect x="16" width="8" height="16" fill="#CE1126"/>
        </svg>
      );
    case '+56': // Chile
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="8" fill="white"/>
          <rect y="8" width="24" height="8" fill="#D52B1E"/>
          <rect width="8" height="8" fill="#0039A6"/>
          <path d="M4 3 L5 5 L3.5 5.5 L5 6 L4 8 L3.5 6.5 L2 6 L3.5 5.5 Z" fill="white"/>
        </svg>
      );
    case '+57': // Colômbia
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="8" fill="#FCD116"/>
          <rect y="8" width="24" height="4" fill="#003893"/>
          <rect y="12" width="24" height="4" fill="#CE1126"/>
        </svg>
      );
    case '+595': // Paraguai
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="5.33" fill="#D52B1E"/>
          <rect y="5.33" width="24" height="5.33" fill="white"/>
          <rect y="10.67" width="24" height="5.33" fill="#0038A8"/>
        </svg>
      );
    case '+598': // Uruguai
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="white"/>
          <rect y="0" width="24" height="1.8" fill="#0038A8"/>
          <rect y="3.6" width="24" height="1.8" fill="#0038A8"/>
          <rect y="7.2" width="24" height="1.8" fill="#0038A8"/>
          <rect y="10.8" width="24" height="1.8" fill="#0038A8"/>
          <rect y="14.4" width="24" height="1.6" fill="#0038A8"/>
          <rect width="8" height="8" fill="white"/>
          <circle cx="4" cy="4" r="2" fill="#FCD116"/>
        </svg>
      );
    case '+593': // Equador
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="8" fill="#FFD100"/>
          <rect y="8" width="24" height="4" fill="#0072CE"/>
          <rect y="12" width="24" height="4" fill="#EF3340"/>
        </svg>
      );
    case '+51': // Peru
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="8" height="16" fill="#D91023"/>
          <rect x="8" width="8" height="16" fill="white"/>
          <rect x="16" width="8" height="16" fill="#D91023"/>
        </svg>
      );
    case '+58': // Venezuela
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="5.33" fill="#FFCC00"/>
          <rect y="5.33" width="24" height="5.33" fill="#00247D"/>
          <rect y="10.67" width="24" height="5.33" fill="#CF142B"/>
        </svg>
      );
    case '+591': // Bolívia
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="5.33" fill="#D52B1E"/>
          <rect y="5.33" width="24" height="5.33" fill="#F9E300"/>
          <rect y="10.67" width="24" height="5.33" fill="#007A3D"/>
        </svg>
      );
    case '+351': // Portugal
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="10" height="16" fill="#006600"/>
          <rect x="10" width="14" height="16" fill="#FF0000"/>
        </svg>
      );
    case '+34': // Espanha
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="4" fill="#AA151B"/>
          <rect y="4" width="24" height="8" fill="#F1BF00"/>
          <rect y="12" width="24" height="4" fill="#AA151B"/>
        </svg>
      );
    case '+33': // França
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="8" height="16" fill="#002395"/>
          <rect x="8" width="8" height="16" fill="white"/>
          <rect x="16" width="8" height="16" fill="#ED2939"/>
        </svg>
      );
    case '+49': // Alemanha
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="5.33" fill="#000000"/>
          <rect y="5.33" width="24" height="5.33" fill="#DD0000"/>
          <rect y="10.67" width="24" height="5.33" fill="#FFCE00"/>
        </svg>
      );
    case '+44': // Reino Unido
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="#012169"/>
          <path d="M0 0 L24 16 M24 0 L0 16" stroke="white" strokeWidth="3"/>
          <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="2"/>
          <path d="M12 0 V16 M0 8 H24" stroke="white" strokeWidth="5"/>
          <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="3"/>
        </svg>
      );
    case '+39': // Itália
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="8" height="16" fill="#009246"/>
          <rect x="8" width="8" height="16" fill="white"/>
          <rect x="16" width="8" height="16" fill="#CE2B37"/>
        </svg>
      );
    case '+86': // China
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="#DE2910"/>
          <path d="M4 3 L5 5.5 L2.5 4 L5.5 4 L3 5.5 Z" fill="#FFDE00"/>
        </svg>
      );
    case '+81': // Japão
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="white"/>
          <circle cx="12" cy="8" r="4" fill="#BC002D"/>
        </svg>
      );
    case '+82': // Coreia do Sul
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="white"/>
          <circle cx="12" cy="8" r="4" fill="#CD2E3A"/>
          <circle cx="12" cy="8" r="4" fill="#0047A0" clipPath="url(#half)"/>
        </svg>
      );
    case '+91': // Índia
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="5.33" fill="#FF9933"/>
          <rect y="5.33" width="24" height="5.33" fill="white"/>
          <rect y="10.67" width="24" height="5.33" fill="#138808"/>
          <circle cx="12" cy="8" r="2" fill="transparent" stroke="#000080" strokeWidth="0.5"/>
        </svg>
      );
    default:
      // Bandeira genérica cinza
      return (
        <svg className={flagClass} viewBox="0 0 24 16" fill="none">
          <rect width="24" height="16" fill="#e5e7eb"/>
        </svg>
      );
  }
};

// Lista de códigos de países para telefone organizados por região
const COUNTRY_CODES = [
  {
    region: "América do Sul",
    countries: [
      { code: "+55", country: "Brasil" },
      { code: "+54", country: "Argentina" },
      { code: "+56", country: "Chile" },
      { code: "+57", country: "Colômbia" },
      { code: "+593", country: "Equador" },
      { code: "+595", country: "Paraguai" },
      { code: "+51", country: "Peru" },
      { code: "+598", country: "Uruguai" },
      { code: "+58", country: "Venezuela" },
      { code: "+591", country: "Bolívia" },
    ],
  },
  {
    region: "América do Norte",
    countries: [
      { code: "+1", country: "Estados Unidos" },
      { code: "+1", country: "Canadá" },
      { code: "+52", country: "México" },
    ],
  },
  {
    region: "Europa",
    countries: [
      { code: "+351", country: "Portugal" },
      { code: "+34", country: "Espanha" },
      { code: "+33", country: "França" },
      { code: "+49", country: "Alemanha" },
      { code: "+44", country: "Reino Unido" },
      { code: "+39", country: "Itália" },
    ],
  },
  {
    region: "Ásia",
    countries: [
      { code: "+86", country: "China" },
      { code: "+81", country: "Japão" },
      { code: "+82", country: "Coreia do Sul" },
      { code: "+91", country: "Índia" },
    ],
  },
];

interface ArrematanteWizardProps {
  initial: {
    arrematante?: ArrematanteInfo;
    lotes: LoteInfo[];
    auctionName: string;
    auctionId: string;
    auction?: Auction; // Adicionado para acessar arrematantes existentes
    defaultDiaVencimento?: number;
    defaultQuantidadeParcelas?: number;
    defaultMesInicio?: string;
  };
  onSubmit: (values: Partial<ArrematanteInfo>) => Promise<void> | void;
  onCancel?: () => void;
  isNewArrematante?: boolean; // Indica se está criando novo (não editando)
}

// Interface para resposta da API ViaCEP
interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

// Interface para resposta da BrasilAPI
interface BrasilApiResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
}

interface FormValues {
  id?: string; // ID do arrematante quando estiver editando
  nome: string;
  documento: string;
  telefone: string;
  codigoPais: string;
  email: string;
  endereco: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  loteId: string;
  mercadoriaId: string;
  tipoPagamento: "a_vista" | "parcelamento" | "entrada_parcelamento";
  valorPagar: string;
  valorEntrada: string;
  quantidadeParcelas: number;
  mesInicioPagamento: string;
  diaVencimentoMensal: number;
  parcelasPagas: number;
  percentualJurosAtraso: number;
  tipoJurosAtraso: "simples" | "composto";
  documentos: DocumentoInfo[];
  pago: boolean;
  dataVencimentoVista?: string;
  dataEntrada?: string;
  // Campos do novo sistema de pagamento
  valorLance?: string;
  fatorMultiplicador?: string;
  usaFatorMultiplicador?: boolean;
  parcelasTriplas?: number;
  parcelasDuplas?: number;
  parcelasSimples?: number;
}

export function ArrematanteWizard({ initial, onSubmit, onCancel, isNewArrematante = false }: ArrematanteWizardProps) {
  // Verificar se deve mostrar seleção de arrematante (quando há múltiplos)
  const arrematantesExistentes = useMemo(() => initial.auction?.arrematantes || [], [initial.auction?.arrematantes]);
  const shouldShowSelection = arrematantesExistentes.length > 1 && !initial.arrematante && !isNewArrematante;
  
  console.log('🔍 [ArrematanteWizard] Verificando seleção:', {
    qtdArrematantes: arrematantesExistentes.length,
    hasArrematanteInicial: !!initial.arrematante,
    isNewArrematante,
    shouldShowSelection,
    startStep: shouldShowSelection ? -1 : 0
  });
  
  const [currentStep, setCurrentStep] = useState(shouldShowSelection ? -1 : 0); // -1 = etapa de seleção
  const [selectedArrematanteId, setSelectedArrematanteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [tentouDataIncompativel, setTentouDataIncompativel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchCpf, setSearchCpf] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAllBidders, setShowAllBidders] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  
  // Estados para busca na etapa de seleção
  const [searchCpfSelection, setSearchCpfSelection] = useState("");
  const [isTypingSelection, setIsTypingSelection] = useState(false);
  const [showAllBiddersSelection, setShowAllBiddersSelection] = useState(false);
  const [isHoveringButtonSelection, setIsHoveringButtonSelection] = useState(false);
  
  // Declarar values primeiro
  const [values, setValues] = useState<FormValues>(() => {
    const arr = initial.arrematante;
    
    console.log('📥 CONDIÇÕES DE PAGAMENTO - Carregando do banco:', {
      tipoPagamento: arr?.tipoPagamento,
      dataVencimentoVista: arr?.dataVencimentoVista,
      dataEntrada: arr?.dataEntrada,
      valorLance: arr?.valorLance,
      fatorMultiplicador: arr?.fatorMultiplicador,
      usaFatorMultiplicador: arr?.usaFatorMultiplicador,
      parcelasTriplas: arr?.parcelasTriplas,
      parcelasDuplas: arr?.parcelasDuplas,
      parcelasSimples: arr?.parcelasSimples
    });
    
    // ✅ Separar código país do telefone se existir
    let telefoneNum = arr?.telefone || "";
    let codigoPaisVal = "+55"; // Padrão Brasil
    if (telefoneNum && telefoneNum.startsWith("+")) {
      const match = telefoneNum.match(/^(\+\d+)\s+(.+)$/);
      if (match) {
        codigoPaisVal = match[1]; // Ex: "+55"
        telefoneNum = match[2];    // Ex: "(11) 98765-4321"
      }
    }
    
    // ✅ PRIORIZAR campos separados do banco (novos campos)
    // Se não existirem, tentar parsear do endereço completo (compatibilidade com dados antigos)
    const cepVal = arr?.cep || "";
    let ruaVal = arr?.rua || "";
    let numeroVal = arr?.numero || "";
    let complementoVal = arr?.complemento || "";
    let bairroVal = arr?.bairro || "";
    let cidadeVal = arr?.cidade || "";
    let estadoVal = arr?.estado || "";
    
    // ⚠️ FALLBACK: Se os campos separados não existirem, tentar parsear do endereço completo (dados antigos)
    if (!ruaVal && !bairroVal && !cidadeVal && arr?.endereco) {
      console.log('⚠️ Usando fallback - parseando endereço completo');
      
      // Tentar extrair informações do endereço salvo
      // Formato esperado: "Rua X, nº Y, Complemento, Bairro, Cidade - UF"
      const enderecoPartes = arr.endereco.split(',').map(p => p.trim());
      
      if (enderecoPartes.length >= 1) {
        ruaVal = enderecoPartes[0];
      }
      
      // Procurar número (nº X)
      const numeroParte = enderecoPartes.find(p => p.startsWith('nº '));
      if (numeroParte) {
        numeroVal = numeroParte.replace('nº ', '');
      }
      
      // Última parte geralmente é "Cidade - UF"
      const ultimaParte = enderecoPartes[enderecoPartes.length - 1];
      const cidadeEstadoMatch = ultimaParte?.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
      if (cidadeEstadoMatch) {
        cidadeVal = cidadeEstadoMatch[1].trim();
        estadoVal = cidadeEstadoMatch[2].trim();
        
        // Penúltima parte é o bairro
        if (enderecoPartes.length >= 2) {
          bairroVal = enderecoPartes[enderecoPartes.length - 2];
        }
      }
      
      // Parte do meio pode ser complemento (se existir mais de 3 partes e não for número)
      if (enderecoPartes.length > 3) {
        const complementoPossivel = enderecoPartes.slice(1, -2).find(p => !p.startsWith('nº '));
        if (complementoPossivel) {
          complementoVal = complementoPossivel;
        }
      }
    }
    
    return {
      id: arr?.id, // ID do arrematante quando estiver editando
      nome: arr?.nome || "",
      documento: arr?.documento || "",
      telefone: telefoneNum,
      codigoPais: codigoPaisVal,
      email: arr?.email || "",
      endereco: arr?.endereco || "",
      cep: cepVal,
      rua: ruaVal,
      numero: numeroVal,
      complemento: complementoVal,
      bairro: bairroVal,
      cidade: cidadeVal,
      estado: estadoVal,
      loteId: arr?.loteId || "",
      mercadoriaId: arr?.mercadoriaId || "", // ✅ CORRIGIDO: agora carrega do arr
      tipoPagamento: arr?.tipoPagamento || "parcelamento",
      valorPagar: arr?.valorPagar || "",
      valorEntrada: arr?.valorEntrada || "",
      quantidadeParcelas: arr?.quantidadeParcelas || initial.defaultQuantidadeParcelas || 12,
      mesInicioPagamento: arr?.mesInicioPagamento || initial.defaultMesInicio || new Date().toISOString().slice(0, 10),
      diaVencimentoMensal: arr?.diaVencimentoMensal || initial.defaultDiaVencimento || 15,
      parcelasPagas: arr?.parcelasPagas || 0,
      percentualJurosAtraso: arr?.percentualJurosAtraso || 0,
      tipoJurosAtraso: arr?.tipoJurosAtraso || "composto",
      documentos: arr?.documentos || [],
      pago: arr?.pago || false,
      dataVencimentoVista: arr?.dataVencimentoVista,
      dataEntrada: arr?.dataEntrada,
      // Campos do novo sistema
      valorLance: arr?.valorLance ? String(arr.valorLance) : undefined,
      fatorMultiplicador: arr?.fatorMultiplicador ? String(arr.fatorMultiplicador) : undefined,
      usaFatorMultiplicador: arr?.usaFatorMultiplicador,
      parcelasTriplas: arr?.parcelasTriplas,
      parcelasDuplas: arr?.parcelasDuplas,
      parcelasSimples: arr?.parcelasSimples,
    };
  });

  // Informações do lote selecionado para exibição
  const infoLoteSelecionado = useMemo(() => {
    if (!values.loteId) return null;
    
    const lote = initial.lotes.find(l => l.id === values.loteId);
    if (!lote) return null;

    return { lote };
  }, [values.loteId, initial.lotes]);

  // Calcular automaticamente a quantidade total de parcelas baseado nas configurações
  const quantidadeParcelasCalculada = useMemo(() => {
    return obterQuantidadeTotalParcelas(
      values.parcelasTriplas || 0,
      values.parcelasDuplas || 0,
      values.parcelasSimples || 0
    );
  }, [values.parcelasTriplas, values.parcelasDuplas, values.parcelasSimples]);

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  // ✅ Sincronizar mesInicioPagamento com diaVencimentoMensal
  useEffect(() => {
    // Se tem mesInicioPagamento e diaVencimentoMensal, ajustar o dia
    if (values.mesInicioPagamento && values.diaVencimentoMensal) {
      // Parse da data ISO ignorando fuso horário
      const [ano, mes, dia] = values.mesInicioPagamento.split('-').map(Number);
      const diaAtual = dia;
      
      // Se o dia for diferente do diaVencimentoMensal, ajustar
      if (diaAtual !== values.diaVencimentoMensal) {
        // Criar nova data com o dia correto (mes-1 porque Date usa 0-11 para meses)
        const novaData = new Date(ano, mes - 1, values.diaVencimentoMensal);
        const novaDataISO = novaData.toISOString().slice(0, 10);
        
        // Atualizar apenas se for diferente (previne loop infinito)
        if (novaDataISO !== values.mesInicioPagamento) {
          setValues(prev => ({ ...prev, mesInicioPagamento: novaDataISO }));
        }
      }
    }
    // Incluir ambas as dependências: o efeito precisa rodar quando qualquer uma mudar
  }, [values.diaVencimentoMensal, values.mesInicioPagamento]);

  // ✅ Detectar quando está digitando no campo de busca
  useEffect(() => {
    if (searchCpf && !showAllBidders) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setIsTyping(false);
      }, 800); // Espera 800ms após parar de digitar
      
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [searchCpf, showAllBidders]);

  // ✅ Detectar quando está digitando no campo de busca da seleção
  useEffect(() => {
    if (searchCpfSelection) {
      setIsTypingSelection(true);
      const timer = setTimeout(() => {
        setIsTypingSelection(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsTypingSelection(false);
    }
  }, [searchCpfSelection]);

  // ✅ Atualizar endereço completo sempre que os campos de endereço mudarem
  useEffect(() => {
    if (values.rua || values.numero || values.bairro || values.cidade || values.estado) {
      const partes = [
        values.rua,
        values.numero ? `nº ${values.numero}` : null,
        values.complemento || null,
        values.bairro,
        values.cidade && values.estado ? `${values.cidade} - ${values.estado}` : null
      ].filter(Boolean);
      
      const enderecoCompleto = partes.join(', ');
      
      // Atualizar o campo endereco se houver mudanças
      if (enderecoCompleto && enderecoCompleto !== values.endereco) {
        setValues(prev => ({ ...prev, endereco: enderecoCompleto }));
      }
    }
  }, [values.rua, values.numero, values.complemento, values.bairro, values.cidade, values.estado, values.endereco]);

  // Buscar CEP usando API mundial (OpenCEP + BrasilAPI como fallback)
  const buscarCep = async (cep: string) => {
    const cepNumeros = cep.replace(/\D/g, '');
    
    if (cepNumeros.length !== 8) return;
    
    setLoadingCep(true);
    setCepError(null);
    
    try {
      let data: ViaCepResponse | null = null;
      
      // Tentar com BrasilAPI (API mais mundial e moderna)
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepNumeros}`);
        
        if (response.ok) {
          const brasilData: BrasilApiResponse = await response.json();
          
          // Converter para formato padrão
          data = {
            cep: brasilData.cep,
            logradouro: brasilData.street || "",
            complemento: "",
            bairro: brasilData.neighborhood || "",
            localidade: brasilData.city || "",
            uf: brasilData.state || ""
          };
        }
      } catch (error) {
        console.warn("BrasilAPI falhou, tentando ViaCEP...");
      }
      
      // Fallback: ViaCEP
      if (!data) {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`);
        if (response.ok) {
          data = await response.json();
        }
      }
      
      // Se nenhuma API funcionou
      if (!data) {
        setCepError("Não foi possível conectar aos serviços de CEP. Preencha manualmente.");
        return;
      }
      
      // Verifica se o CEP foi encontrado
      if (data.erro) {
        setCepError("CEP não encontrado. Por favor, verifique o CEP digitado.");
        return;
      }
      
      // Monta o endereço completo
      const enderecoCompleto = [
        data.logradouro,
        data.bairro,
        data.localidade,
        data.uf
      ]
        .filter(parte => parte && parte.trim())
        .join(", ");
      
      // Atualiza os campos
        setValues(prev => ({
          ...prev,
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
        endereco: enderecoCompleto
        }));
      
      console.log("✅ CEP encontrado com sucesso:", cepNumeros);
      setCepError(null);
    } catch (error) {
      console.error("❌ Erro ao buscar CEP:", error);
      setCepError("Erro ao buscar CEP. Por favor, preencha manualmente.");
    } finally {
      setLoadingCep(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Nome e Documento
        return !!(values.nome && values.documento);
      case 1: // Telefone e Email
        return !!(values.telefone && values.email && isValidEmail(values.email));
      case 2: // Endereço
        return !!(values.cep && values.rua && values.numero && values.bairro && values.cidade && values.estado);
      case 3: { // Mercadoria
        if (!values.loteId || !values.mercadoriaId) return false;
        // Verificar se o lote tem mercadorias cadastradas
        const lote = initial.lotes.find(l => l.id === values.loteId);
        if (!lote || !lote.mercadorias || lote.mercadorias.length === 0) return false;
        return true;
      }
      case 4: // Condições de Pagamento
        if (!values.tipoPagamento) return false;
        
        // À vista: validar valor e data
        if (values.tipoPagamento === "a_vista") {
          if (!values.dataVencimentoVista) return false;
          if (!values.valorPagar) return false;
          const valorParsed = parseCurrencyToNumber(values.valorPagar);
          if (!valorParsed || valorParsed <= 0) return false;
        }
        
        // Parcelamento: validar fator multiplicador
        if (values.tipoPagamento === "parcelamento") {
          if (!values.valorLance || !values.fatorMultiplicador) return false;
          
          const valorLanceParsed = parseBrazilianNumber(values.valorLance);
          const fatorParsed = parseBrazilianNumber(values.fatorMultiplicador);
          
          if (!valorLanceParsed || !fatorParsed) return false;
          if (valorLanceParsed <= 0 || fatorParsed <= 0) return false;
          
          // Validar compatibilidade das parcelas se configuradas
          const triplas = values.parcelasTriplas || 0;
          const duplas = values.parcelasDuplas || 0;
          const simples = values.parcelasSimples || 0;
          const totalParcelas = triplas + duplas + simples;
          
          if (totalParcelas > 0) {
            const somaCalculada = (triplas * 3) + (duplas * 2) + (simples * 1);
            if (somaCalculada !== fatorParsed) return false;
          }
        }
        
        // Entrada + Parcelamento: validar data, entrada e fator
        if (values.tipoPagamento === "entrada_parcelamento") {
          if (!values.dataEntrada) return false;
          if (!values.valorEntrada) return false;
          if (!values.valorLance || !values.fatorMultiplicador) return false;
          
          const valorLanceParsed = parseBrazilianNumber(values.valorLance);
          const fatorParsed = parseBrazilianNumber(values.fatorMultiplicador);
          
          if (!valorLanceParsed || !fatorParsed) return false;
          if (valorLanceParsed <= 0 || fatorParsed <= 0) return false;
          
          // Validar compatibilidade das parcelas se configuradas
          const triplas = values.parcelasTriplas || 0;
          const duplas = values.parcelasDuplas || 0;
          const simples = values.parcelasSimples || 0;
          const totalParcelas = triplas + duplas + simples;
          
          if (totalParcelas > 0) {
            const somaCalculada = (triplas * 3) + (duplas * 2) + (simples * 1);
            if (somaCalculada !== fatorParsed) return false;
          }
        }
        
        return true;
      case 5: { // Parcelas e Dia (só se não for à vista)
        if (values.tipoPagamento === "a_vista") return true; // Pular validação se for à vista
        // Validar quantidade calculada OU manual (compatibilidade)
        const qtdParcelas = quantidadeParcelasCalculada > 0 ? quantidadeParcelasCalculada : values.quantidadeParcelas;
        // ✅ Validar que o dia esteja entre 1 e 31
        const diaValido = values.diaVencimentoMensal && values.diaVencimentoMensal >= 1 && values.diaVencimentoMensal <= 31;
        return !!(qtdParcelas > 0 && diaValido);
      }
      case 6: { // Mês de Início (só se não for à vista)
        if (values.tipoPagamento === "a_vista") return true; // Pular validação se for à vista
        
        // Validar se a data existe
        if (!values.mesInicioPagamento) return false;
        
        // ✅ Validar compatibilidade: dia da data deve ser igual ao dia do vencimento mensal
        // Parse da data ISO ignorando fuso horário
        const [ano, mes, dia] = values.mesInicioPagamento.split('-').map(Number);
        const diaDataInicio = dia;
        
        if (diaDataInicio !== values.diaVencimentoMensal) {
          return false; // Incompatibilidade!
        }
        
        return true;
      }
      case 7: // Status do Pagamento (Parcelas Pagas)
        return values.parcelasPagas !== undefined; // Validar se foi preenchido
      case 8: // Juros em Caso de Atraso
        return values.percentualJurosAtraso !== undefined; // Validar se foi preenchido
      case 9: // Documentos
        return true; // Opcional
      default:
        return true;
    }
  };

  const handleNext = () => {
    setAttemptedNext(true);
    
    if (!validateCurrentStep()) {
      // Não avança - a validação já mostra o indicador visual
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setAttemptedNext(false); // Reset ao avançar com sucesso
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAttemptedNext(false); // Reset ao voltar
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onCancel) onCancel();
    }, 300);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calcular valorPagar baseado no tipo de pagamento
      let valorPagarFinal = values.valorPagar;
      
      if (values.tipoPagamento === "parcelamento" || values.tipoPagamento === "entrada_parcelamento") {
        // Calcular automaticamente pelo fator multiplicador
        if (values.valorLance && values.fatorMultiplicador) {
          const valorLanceParsed = parseBrazilianNumber(values.valorLance);
          const fatorParsed = parseBrazilianNumber(values.fatorMultiplicador);
          if (valorLanceParsed && fatorParsed) {
            const valorCalculado = calcularValorTotal(valorLanceParsed, fatorParsed);
            valorPagarFinal = valorCalculado.toFixed(2);
          }
        }
      }

      // Usar quantidade de parcelas calculada automaticamente
      const quantidadeParcelasFinal = quantidadeParcelasCalculada > 0 
        ? quantidadeParcelasCalculada 
        : values.quantidadeParcelas;

      console.log('💾 CONDIÇÕES DE PAGAMENTO - Values:', {
        tipoPagamento: values.tipoPagamento,
        dataVencimentoVista: values.dataVencimentoVista,
        dataEntrada: values.dataEntrada,
        valorLance: values.valorLance,
        fatorMultiplicador: values.fatorMultiplicador,
        usaFatorMultiplicador: values.usaFatorMultiplicador,
        parcelasTriplas: values.parcelasTriplas,
        parcelasDuplas: values.parcelasDuplas,
        parcelasSimples: values.parcelasSimples
      });

      const arrematanteData: Partial<ArrematanteInfo> = {
        id: selectedArrematanteId || initial.arrematante?.id || undefined, // ✅ Incluir ID do arrematante selecionado
        nome: values.nome,
        documento: values.documento || undefined,
        telefone: values.telefone ? `${values.codigoPais} ${values.telefone}` : undefined,
        email: values.email || undefined,
        endereco: values.endereco || undefined,
        // ✅ Campos de endereço detalhados
        cep: values.cep || undefined,
        rua: values.rua || undefined,
        numero: values.numero || undefined,
        complemento: values.complemento || undefined,
        bairro: values.bairro || undefined,
        cidade: values.cidade || undefined,
        estado: values.estado || undefined,
        loteId: values.loteId || undefined,
        mercadoriaId: values.mercadoriaId || undefined,
        tipoPagamento: values.tipoPagamento,
        valorPagar: valorPagarFinal,
        valorPagarNumerico: parseCurrencyToNumber(valorPagarFinal),
        valorEntrada: values.valorEntrada || undefined,
        quantidadeParcelas: quantidadeParcelasFinal, // ✅ Usando valor calculado
        mesInicioPagamento: values.mesInicioPagamento,
        diaVencimentoMensal: values.diaVencimentoMensal,
        parcelasPagas: values.parcelasPagas,
        percentualJurosAtraso: values.percentualJurosAtraso,
        tipoJurosAtraso: "composto", // Sempre juros compostos
        documentos: values.documentos,
        pago: values.pago,
        dataVencimentoVista: values.dataVencimentoVista,
        dataEntrada: values.dataEntrada,
        // Campos do sistema de fator multiplicador (para parcelamento e entrada_parcelamento)
        ...((values.tipoPagamento === "parcelamento" || values.tipoPagamento === "entrada_parcelamento") && {
          valorLance: parseBrazilianNumber(values.valorLance),
          fatorMultiplicador: parseBrazilianNumber(values.fatorMultiplicador),
          usaFatorMultiplicador: true,
          // ✅ CORREÇÃO: Garantir que sejam números válidos ou undefined (nunca strings ou arrays)
          parcelasTriplas: typeof values.parcelasTriplas === 'number' ? values.parcelasTriplas : undefined,
          parcelasDuplas: typeof values.parcelasDuplas === 'number' ? values.parcelasDuplas : undefined,
          parcelasSimples: typeof values.parcelasSimples === 'number' ? values.parcelasSimples : undefined,
        }),
      };
      
      console.log('💾 CONDIÇÕES DE PAGAMENTO - arrematanteData:', {
        tipoPagamento: arrematanteData.tipoPagamento,
        dataVencimentoVista: arrematanteData.dataVencimentoVista,
        dataEntrada: arrematanteData.dataEntrada,
        valorLance: arrematanteData.valorLance,
        fatorMultiplicador: arrematanteData.fatorMultiplicador,
        usaFatorMultiplicador: arrematanteData.usaFatorMultiplicador,
        parcelasTriplas: arrematanteData.parcelasTriplas,
        parcelasDuplas: arrematanteData.parcelasDuplas,
        parcelasSimples: arrematanteData.parcelasSimples
      });
      
      console.log('📋 DADOS COMPLETOS DO ARREMATANTE:', arrematanteData);
      
      await onSubmit(arrematanteData);
      
      console.log('✅ [Wizard] onSubmit concluído com sucesso');
      
      // ✅ NÃO chamar handleClose() - o componente pai vai fechar
      // handleClose() pode causar conflitos com o fechamento do pai
    } catch (error) {
      console.error('❌ [Wizard] Erro ao submeter formulário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDocs: DocumentoInfo[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // ✅ Converter arquivo para Base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      newDocs.push({
        id: Date.now().toString() + i,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        url: base64, // ✅ Salvar Base64 ao invés de blob URL
      });
    }

    updateField("documentos", [...values.documentos, ...newDocs]);
    // Resetar o input para permitir upload do mesmo arquivo novamente
    event.target.value = '';
  };

  const removeDocument = (id: string) => {
    const doc = values.documentos.find(d => d.id === id);
    // ✅ Não precisa mais revogar blob URLs, pois agora usamos Base64
    if (doc?.url && doc.url.startsWith('blob:')) {
      URL.revokeObjectURL(doc.url);
    }
    updateField("documentos", values.documentos.filter(d => d.id !== id));
  };

  const allSteps = [
    {
      id: "nome-documento",
      title: "Identificação",
      content: (
        <div className="space-y-8">
          {/* Botão Importar (apenas se for novo arrematante E existirem arrematantes) */}
          {isNewArrematante && initial.auction?.arrematantes && initial.auction.arrematantes.length > 0 && (
            <div className="pb-4">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="text-gray-700 hover:text-gray-900 font-medium text-sm hover:underline decoration-gray-700 underline-offset-4 transition-all"
              >
                Importar Dados de Arrematante Existente
              </button>
            </div>
          )}
          
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Qual o nome do arrematante?</Label>
            <Input
              type="text"
              placeholder="Ex: João Silva"
              value={values.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">CPF ou CNPJ</Label>
            <Input
              type="text"
              placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
              value={values.documento}
              onChange={(e) => {
                const formatted = formatCpfCnpj(e.target.value);
                updateField("documento", formatted);
              }}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
          </div>
        </div>
      )
    },
    {
      id: "contato",
      title: "Contato",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Telefone</Label>
            <div className="flex gap-3">
              <Select
                value={values.codigoPais}
                onValueChange={(v) => updateField("codigoPais", v)}
              >
                <SelectTrigger className="w-[180px] h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus:border-black focus-visible:border-black focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none px-0 bg-transparent [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <SelectValue>
                    <FlagIcon countryCode={values.codigoPais} />
                    <span>{values.codigoPais}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  sideOffset={5} 
                  className="z-[100000] max-h-[300px] overflow-auto [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]>span]:justify-start"
                >
                  {COUNTRY_CODES.map((region) => (
                    <SelectGroup key={region.region}>
                      <SelectLabel className="ps-2 text-xs font-semibold text-gray-500">
                        {region.region}
                      </SelectLabel>
                      {region.countries.map((country) => (
                        <SelectItem 
                          key={`${country.code}-${country.country}`} 
                          value={country.code}
                          data-country={country.country}
                        >
                          <FlagIcon countryCode={country.code} countryName={country.country} />
                          <span className="truncate">{country.code} - {country.country}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              
            <Input
              type="text"
                placeholder={(() => {
                  switch(values.codigoPais) {
                    case '+55': return "(11) 98765-4321";
                    case '+1': return "(555) 123-4567";
                    case '+54': return "(11) 1234-5678";
                    case '+52': return "(55) 1234-5678";
                    case '+56': return "9 8765-4321";
                    case '+57': return "(300) 123-4567";
                    case '+595': return "(21) 123-456";
                    case '+598': return "(99) 123-456";
                    case '+351': return "912 345 678";
                    case '+34': return "612 345 678";
                    case '+33': return "06 12 34 56 78";
                    case '+49': return "1511 1234567";
                    case '+44': return "7700 123456";
                    case '+86': return "138-0000-0000";
                    case '+81': return "090-1234-5678";
                    case '+82': return "010-1234-5678";
                    case '+91': return "98765-43210";
                    default: return "Digite o número";
                  }
                })()}
              value={values.telefone}
                onChange={(e) => {
                  const formatted = formatTelefone(e.target.value, values.codigoPais);
                  updateField("telefone", formatted);
                }}
                className="flex-1 wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">E-mail</Label>
            <Input
              type="email"
              placeholder="Ex: joao@email.com"
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
            {attemptedNext && values.email && !isValidEmail(values.email) && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                E-mail inválido. Use o formato: exemplo@dominio.com
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "endereco",
      title: "Endereço",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">CEP</Label>
            <Input
              type="text"
              placeholder="Ex: 12345-678"
              value={values.cep}
              onChange={(e) => {
                const formatted = formatCep(e.target.value);
                updateField("cep", formatted);
                setCepError(null);
                if (formatted.replace(/\D/g, '').length === 8) {
                  buscarCep(formatted);
                }
              }}
              disabled={loadingCep}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
            {loadingCep && <p className="text-sm text-gray-500">Buscando CEP...</p>}
            {cepError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {cepError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3 col-span-2">
              <Label className="text-lg font-normal text-gray-600">Rua</Label>
              <Input
                type="text"
                placeholder="Ex: Rua das Flores"
                value={values.rua}
                onChange={(e) => updateField("rua", e.target.value)}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-normal text-gray-600">Número</Label>
              <Input
                type="text"
                placeholder="Ex: 123"
                value={values.numero}
                onChange={(e) => updateField("numero", e.target.value)}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-normal text-gray-600">Complemento</Label>
              <Input
                type="text"
                placeholder="Ex: Apto 101 (opcional)"
                value={values.complemento}
                onChange={(e) => updateField("complemento", e.target.value)}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-normal text-gray-600">Bairro</Label>
              <Input
                type="text"
                placeholder="Ex: Centro"
                value={values.bairro}
                onChange={(e) => updateField("bairro", e.target.value)}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-normal text-gray-600">Cidade</Label>
              <Input
                type="text"
                placeholder="Ex: São Paulo"
                value={values.cidade}
                onChange={(e) => updateField("cidade", e.target.value)}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-normal text-gray-600">Estado</Label>
              <Input
                type="text"
                placeholder="Ex: SP"
                value={values.estado}
                onChange={(e) => updateField("estado", e.target.value.toUpperCase())}
                maxLength={2}
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: "mercadoria",
      title: "Mercadoria Arrematada",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Selecione o lote</Label>
            <Select
              value={values.loteId}
              onValueChange={(v) => {
                updateField("loteId", v);
                updateField("mercadoriaId", ""); // Limpar mercadoria ao mudar lote
              }}
            >
              <SelectTrigger className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus:border-gray-800 focus-visible:ring-0 focus-visible:outline-none focus:outline-none active:outline-none outline-none ring-0 px-0 bg-transparent [&:focus]:ring-0 [&:active]:ring-0">
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5} className="z-[100000] max-h-[300px] overflow-auto">
                {initial.lotes.map((lote) => (
                  <SelectItem key={lote.id} value={lote.id}>
                    Lote {lote.numero} - {lote.descricao || "Sem descrição"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {values.loteId && infoLoteSelecionado && (
            <>
              {(!infoLoteSelecionado.lote.mercadorias || infoLoteSelecionado.lote.mercadorias.length === 0) ? (
                <Alert className="border-amber-500 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <p className="text-sm">
                      <span className="font-semibold">Este lote não possui mercadorias cadastradas.</span>
                      <br />
                      Por favor, adicione mercadorias ao lote no formulário do leilão antes de criar um arrematante.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (() => {
                // Verificar se todas as mercadorias já foram arrematadas
                const arrematantesExistentes = initial.auction?.arrematantes || [];
                
                // ID do arrematante atual sendo editado (pode vir de várias fontes)
                const arrematanteAtualId = values.id || initial.arrematante?.id || selectedArrematanteId;
                
                // Obter IDs das mercadorias já arrematadas (exceto a do arrematante atual se estiver editando)
                const mercadoriasArrematadas = arrematantesExistentes
                  .filter(arr => {
                    // Se estiver editando, permitir a mercadoria atual deste arrematante
                    if (arrematanteAtualId) {
                      return arr.id !== arrematanteAtualId;
                    }
                    return true;
                  })
                  .map(arr => arr.mercadoriaId)
                  .filter(Boolean);
                
                // Filtrar mercadorias disponíveis do lote
                const mercadoriasDisponiveis = infoLoteSelecionado.lote.mercadorias?.filter(
                  m => !mercadoriasArrematadas.includes(m.id)
                ) || [];
                
                const totalMercadorias = infoLoteSelecionado.lote.mercadorias?.length || 0;
                
                // Se todas as mercadorias já foram arrematadas
                if (totalMercadorias > 0 && mercadoriasDisponiveis.length === 0) {
                  return (
                    <p className="text-sm text-red-600 mt-2 flex items-start gap-1.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Todas as mercadorias deste lote já foram arrematadas. Por favor, selecione outro lote ou edite um arrematante existente deste lote.
                      </span>
                    </p>
                  );
                }
                
                // Caso contrário, mostrar a seleção de mercadorias normalmente
                return (
                <div className="space-y-3">
                  <Label className="text-lg font-normal text-gray-600">Selecione a mercadoria</Label>
                  <Select
                    value={values.mercadoriaId}
                    onValueChange={(v) => updateField("mercadoriaId", v)}
                  >
                    <SelectTrigger className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus:border-gray-800 focus-visible:ring-0 focus-visible:outline-none focus:outline-none active:outline-none outline-none ring-0 px-0 bg-transparent [&:focus]:ring-0 [&:active]:ring-0">
                      <SelectValue placeholder="Selecione a mercadoria" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} className="z-[100000] max-h-[300px] overflow-auto">
                      {(() => {
                        // Obter todos os arrematantes existentes do leilão
                        const arrematantesExistentes = initial.auction?.arrematantes || [];
                        
                        // ID do arrematante atual sendo editado (pode vir de várias fontes)
                        const arrematanteAtualId = values.id || initial.arrematante?.id || selectedArrematanteId;
                        
                        // Obter IDs das mercadorias já arrematadas (exceto a do arrematante atual se estiver editando)
                        const mercadoriasArrematadas = arrematantesExistentes
                          .filter(arr => {
                            // Se estiver editando, permitir a mercadoria atual deste arrematante
                            if (arrematanteAtualId) {
                              return arr.id !== arrematanteAtualId;
                            }
                            return true;
                          })
                          .map(arr => arr.mercadoriaId)
                          .filter(Boolean);
                        
                        // Filtrar mercadorias disponíveis
                        const mercadoriasDisponiveis = infoLoteSelecionado.lote.mercadorias?.filter(
                          m => !mercadoriasArrematadas.includes(m.id)
                        ) || [];
                        
                        const mercadoriasIndisponiveis = infoLoteSelecionado.lote.mercadorias?.filter(
                          m => mercadoriasArrematadas.includes(m.id)
                        ) || [];
                        
                        return (
                          <>
                            {mercadoriasDisponiveis.map((mercadoria) => (
                              <SelectItem key={mercadoria.id} value={mercadoria.id}>
                                {mercadoria.titulo || mercadoria.descricao}
                              </SelectItem>
                            ))}
                            {mercadoriasIndisponiveis.length > 0 && mercadoriasDisponiveis.length > 0 && (
                              <div className="px-2 py-1.5">
                                <div className="border-t border-gray-200 my-1"></div>
                              </div>
                            )}
                            {mercadoriasIndisponiveis.map((mercadoria) => (
                              <SelectItem 
                                key={mercadoria.id} 
                                value={mercadoria.id}
                                disabled
                                className="opacity-50"
                              >
                                {mercadoria.titulo || mercadoria.descricao} (Já arrematada)
                              </SelectItem>
                            ))}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                  {(() => {
                    // Mostrar aviso se houver mercadorias já arrematadas
                    const arrematantesExistentes = initial.auction?.arrematantes || [];
                    
                    // ID do arrematante atual sendo editado (pode vir de várias fontes)
                    const arrematanteAtualId = values.id || initial.arrematante?.id || selectedArrematanteId;
                    
                    const mercadoriasArrematadas = arrematantesExistentes
                      .filter(arr => {
                        // Se estiver editando, permitir a mercadoria atual deste arrematante
                        if (arrematanteAtualId) {
                          return arr.id !== arrematanteAtualId;
                        }
                        return true;
                      })
                      .map(arr => arr.mercadoriaId)
                      .filter(Boolean);
                    
                    const mercadoriasIndisponiveis = infoLoteSelecionado.lote.mercadorias?.filter(
                      m => mercadoriasArrematadas.includes(m.id)
                    ) || [];
                    
                    if (mercadoriasIndisponiveis.length > 0) {
                      const quantidade = mercadoriasIndisponiveis.length;
                      const textoAviso = quantidade === 1
                        ? `${quantidade} mercadoria já foi arrematada e não está disponível para seleção.`
                        : `${quantidade} mercadorias já foram arrematadas e não estão disponíveis para seleção.`;
                      
                      return (
                        <p className="text-sm text-gray-700 mt-2 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                          {textoAviso}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                );
              })()}
            </>
          )}

          {values.loteId && infoLoteSelecionado && values.mercadoriaId && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                <span className="font-medium">Leilão:</span> {initial.auctionName}
              </p>
                <p>
                  <span className="font-medium">Lote:</span> {infoLoteSelecionado.lote.numero} - {infoLoteSelecionado.lote.descricao}
                </p>
                <p>
                  <span className="font-medium">Mercadoria:</span>{" "}
                  {infoLoteSelecionado.lote.mercadorias?.find(m => m.id === values.mercadoriaId)?.titulo || 
                   infoLoteSelecionado.lote.mercadorias?.find(m => m.id === values.mercadoriaId)?.descricao}
                </p>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: "condicoes-pagamento",
      title: "Condições de Pagamento",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Como deseja pagar?</Label>
            <Select
              value={values.tipoPagamento}
              onValueChange={(v) => updateField("tipoPagamento", v as "a_vista" | "parcelamento" | "entrada_parcelamento")}
            >
              <SelectTrigger className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus:border-gray-800 focus-visible:ring-0 focus-visible:outline-none focus:outline-none active:outline-none outline-none ring-0 px-0 bg-transparent [&:focus]:ring-0 [&:active]:ring-0">
                <SelectValue placeholder="Selecione o tipo de pagamento" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="parcelamento">Parcelamento</SelectItem>
                <SelectItem value="entrada_parcelamento">Entrada + Parcelamento</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* À Vista */}
          {values.tipoPagamento === "a_vista" && (
            <>
              <div className="space-y-3">
                <Label className="text-lg font-normal text-gray-600">Valor a Pagar</Label>
            <Input
              type="text"
              placeholder="Ex: R$ 50.000,00"
              value={values.valorPagar}
              onChange={(e) => updateField("valorPagar", e.target.value)}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-3">
                <Label className="text-lg font-normal text-gray-600">Data de Pagamento</Label>
                <StringDatePicker
                  value={values.dataVencimentoVista || ""}
                  onChange={(v) => updateField("dataVencimentoVista", v)}
                  placeholder="Selecione a data"
                  className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent"
                />
              </div>
            </>
          )}

          {/* Entrada + Parcelamento */}
          {values.tipoPagamento === "entrada_parcelamento" && (
            <>
              <div className="space-y-3">
                <Label className="text-lg font-normal text-gray-600">Valor da Entrada</Label>
            <Input
              type="text"
              placeholder="Ex: R$ 5.000,00"
              value={values.valorEntrada}
              onChange={(e) => updateField("valorEntrada", e.target.value)}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
          </div>

              <div className="space-y-3">
                <Label className="text-lg font-normal text-gray-600">Data de pagamento da entrada</Label>
                <StringDatePicker
                  value={values.dataEntrada || ""}
                  onChange={(v) => updateField("dataEntrada", v)}
                  placeholder="Selecione a data"
                  className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent"
                />
              </div>
            </>
          )}

          {/* Sistema de Fator Multiplicador - Para parcelamento e entrada_parcelamento */}
          {(values.tipoPagamento === "parcelamento" || values.tipoPagamento === "entrada_parcelamento") && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-lg font-normal text-gray-600">Valor do Lance (R$)</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 1.000,00"
                    value={values.valorLance || ""}
                    onChange={(e) => updateField("valorLance", e.target.value)}
                    className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                  />
                  {values.valorLance && (() => {
                    const parsed = parseBrazilianNumber(values.valorLance);
                    if (parsed !== undefined && parsed <= 0) {
                      return (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          O valor do lance deve ser maior que zero
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="space-y-3">
                  <Label className="text-lg font-normal text-gray-600">Fator Multiplicador</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 30"
                    value={values.fatorMultiplicador || ""}
                    onChange={(e) => updateField("fatorMultiplicador", e.target.value)}
                    className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                  />
                  {values.fatorMultiplicador && (() => {
                    const parsed = parseBrazilianNumber(values.fatorMultiplicador);
                    if (parsed !== undefined && parsed <= 0) {
                      return (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          O fator multiplicador deve ser maior que zero
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {values.valorLance && values.fatorMultiplicador && (() => {
                const valorLanceParsed = parseBrazilianNumber(values.valorLance);
                const fatorParsed = parseBrazilianNumber(values.fatorMultiplicador);
                if (valorLanceParsed && fatorParsed && valorLanceParsed > 0 && fatorParsed > 0) {
                  return (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        Valor Total: R$ {valorLanceParsed.toFixed(2)} × {fatorParsed} = {" "}
                        <span className="font-semibold text-gray-900">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcularValorTotal(valorLanceParsed, fatorParsed))}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-4">
                <Label className="text-lg font-normal text-gray-900">Configuração de Parcelas</Label>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Parcelas Triplas</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={values.parcelasTriplas || ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                        updateField("parcelasTriplas", value);
                      }}
                      className="h-12 text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                    />
                    <p className="text-xs text-gray-400">Valor × 3</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Parcelas Duplas</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={values.parcelasDuplas || ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                        updateField("parcelasDuplas", value);
                      }}
                      className="h-12 text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                    />
                    <p className="text-xs text-gray-400">Valor × 2</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Parcelas Simples</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={values.parcelasSimples || ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                        updateField("parcelasSimples", value);
                      }}
                      className="h-12 text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-black focus-visible:border-black"
                    />
                    <p className="text-xs text-gray-400">Valor × 1</p>
                  </div>
                </div>

                {/* Validação de compatibilidade das parcelas */}
                {values.valorLance && values.fatorMultiplicador && (() => {
                  const fatorParsed = parseBrazilianNumber(values.fatorMultiplicador);
                  if (!fatorParsed) return null;
                  
                  const triplas = values.parcelasTriplas || 0;
                  const duplas = values.parcelasDuplas || 0;
                  const simples = values.parcelasSimples || 0;
                  const totalParcelas = triplas + duplas + simples;
                  const somaCalculada = (triplas * 3) + (duplas * 2) + (simples * 1);
                  
                  if (totalParcelas > 0 && somaCalculada !== fatorParsed) {
                    return (
                      <p className="text-sm text-red-600">
                        A configuração de parcelas não está compatível. O total calculado ({somaCalculada}) precisa ser igual ao fator multiplicador ({fatorParsed})
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: "parcelas",
      title: "Parcelamento",
      show: values.tipoPagamento !== "a_vista", // Não mostrar se for à vista
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Quantidade de parcelas</Label>
            <div className="relative">
            <Input
              type="number"
              min="1"
                value={quantidadeParcelasCalculada || values.quantidadeParcelas}
                readOnly
                disabled
                className="wizard-input h-14 text-base border-0 border-b-2 border-gray-300 rounded-none px-0 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              {quantidadeParcelasCalculada > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Calculado automaticamente: {values.parcelasTriplas || 0} triplas + {values.parcelasDuplas || 0} duplas + {values.parcelasSimples || 0} simples
                </p>
              )}
              {quantidadeParcelasCalculada === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Configure as parcelas na etapa "Condições de Pagamento"
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Dia do vencimento mensal</Label>
            <p className="text-sm text-gray-500 -mt-1">Este dia será usado automaticamente para o início do pagamento</p>
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 15"
              value={values.diaVencimentoMensal || ""}
              onChange={(e) => {
                const inputValue = e.target.value;
                
                // Se estiver vazio, permitir (será tratado no onBlur)
                if (inputValue === "") {
                  updateField("diaVencimentoMensal", undefined);
                  return;
                }
                
                const numValue = parseInt(inputValue);
                
                // ✅ Validar se está entre 1 e 31
                if (!isNaN(numValue)) {
                  if (numValue < 1) {
                    updateField("diaVencimentoMensal", 1);
                  } else if (numValue > 31) {
                    updateField("diaVencimentoMensal", 31);
                  } else {
                    updateField("diaVencimentoMensal", numValue);
                  }
                }
              }}
              onBlur={(e) => {
                // Se o campo estiver vazio ao sair, definir valor padrão
                if (!e.target.value || !values.diaVencimentoMensal) {
                  updateField("diaVencimentoMensal", 15);
                }
              }}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
            {!values.diaVencimentoMensal && attemptedNext && (
              <p className="text-sm text-red-600">
                Por favor, preencha o dia do vencimento mensal.
              </p>
            )}
            {values.diaVencimentoMensal && (values.diaVencimentoMensal < 1 || values.diaVencimentoMensal > 31) && (
              <p className="text-sm text-red-600">
                O dia deve estar entre 1 e 31.
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "inicio",
      title: "Data de Início",
      show: values.tipoPagamento !== "a_vista", // Não mostrar se for à vista
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Quando inicia o pagamento das parcelas?</Label>
            <StringDatePicker
              value={values.mesInicioPagamento || ""}
              onChange={(v) => {
                if (v && values.diaVencimentoMensal) {
                  // Parse da data ISO ignorando fuso horário
                  const [ano, mes, dia] = v.split('-').map(Number);
                  
                  // ✅ Verificar se o dia selecionado é compatível
                  if (dia !== values.diaVencimentoMensal) {
                    // ❌ Data incompatível - mostrar aviso e NÃO atualizar
                    setTentouDataIncompativel(true);
                    // Limpar aviso após 5 segundos
                    setTimeout(() => setTentouDataIncompativel(false), 5000);
                    return; // Não atualiza o campo
                  }
                  
                  // ✅ Data compatível - atualizar normalmente
                  setTentouDataIncompativel(false);
                  const novaData = new Date(ano, mes - 1, values.diaVencimentoMensal);
                  const novaDataISO = novaData.toISOString().slice(0, 10);
                  updateField("mesInicioPagamento", novaDataISO);
                } else {
                  updateField("mesInicioPagamento", v);
                }
              }}
              placeholder="Ex: 01/01/2024"
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent"
            />
            {tentouDataIncompativel && (
              <p className="text-sm text-red-600 mt-2">
                Data incompatível. O dia de vencimento mensal está definido como dia {values.diaVencimentoMensal}.
              </p>
            )}
            {values.mesInicioPagamento && (() => {
              // Parse da data ISO ignorando fuso horário
              const [ano, mes, dia] = values.mesInicioPagamento.split('-').map(Number);
              const diaDataInicio = dia;
              const incompativel = diaDataInicio !== values.diaVencimentoMensal;
              
              return incompativel ? (
                <p className="text-sm text-red-600 mt-2">
                  Por favor, selecione uma data que use o dia {values.diaVencimentoMensal} ou volte e altere o dia de vencimento mensal.
                </p>
              ) : null;
            })()}
          </div>
        </div>
      )
    },
    {
      id: "status",
      title: "Status do Pagamento",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Parcelas já pagas</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ex: 0"
              value={values.parcelasPagas ?? ""}
              onChange={(e) => {
                const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                updateField("parcelasPagas", value);
              }}
              onBlur={(e) => {
                // Se o campo estiver vazio ao sair, definir valor padrão
                if (!e.target.value || values.parcelasPagas === undefined) {
                  updateField("parcelasPagas", 0);
                }
              }}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
            <p className="text-sm text-gray-500">Informe quantas parcelas já foram pagas pelo arrematante</p>
            {values.parcelasPagas === undefined && attemptedNext && (
              <p className="text-sm text-red-600">
                Por favor, preencha a quantidade de parcelas já pagas.
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "juros",
      title: "Juros em Caso de Atraso",
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <Label className="text-lg font-normal text-gray-600">Percentual de Juros (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Ex: 2.5"
              value={values.percentualJurosAtraso ?? ""}
              onChange={(e) => {
                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                updateField("percentualJurosAtraso", value);
              }}
              onBlur={(e) => {
                // Se o campo estiver vazio ao sair, definir valor padrão
                if (!e.target.value || values.percentualJurosAtraso === undefined) {
                  updateField("percentualJurosAtraso", 0);
                }
              }}
              className="wizard-input h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
            />
            <p className="text-sm text-gray-500">Juros compostos aplicados mensalmente em caso de atraso no pagamento</p>
            {values.percentualJurosAtraso === undefined && attemptedNext && (
              <p className="text-sm text-red-600">
                Por favor, preencha o percentual de juros.
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "documentos",
      title: "Documentos",
      content: (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-normal text-gray-600">Documentos anexados</Label>
              <label className="cursor-pointer">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                    input?.click();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {values.documentos.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum documento adicionado</p>
            ) : values.documentos.length <= 3 ? (
              // Mostrar lista simples para até 3 documentos
              <div className="space-y-2">
                {values.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('📄 Abrindo documento:', { nome: doc.nome, url: doc.url?.substring(0, 50) + '...' });
                        if (doc.url) {
                          // Abrir documento em nova aba (visualização)
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head>
                                  <title>${doc.nome}</title>
                                  <style>
                                    body { margin: 0; padding: 0; }
                                    iframe { width: 100%; height: 100vh; border: none; }
                                  </style>
                                </head>
                                <body>
                                  <iframe src="${doc.url}"></iframe>
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        }
                      }}
                      className="text-sm text-gray-700 truncate flex-1 text-left hover:text-blue-600 transition-colors"
                    >
                      {doc.nome}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeDocument(doc.id);
                        setSelectedDocIndex(0);
                      }}
                      className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              // Usar seletor para mais de 3 documentos
              <>
                 <div className="flex items-center gap-3">
                   <Select
                     value={selectedDocIndex.toString()}
                     onValueChange={(v) => setSelectedDocIndex(parseInt(v))}
                   >
                     <SelectTrigger className="h-11 flex-1 border-gray-200 focus:ring-0 focus:outline-none focus-visible:ring-0">
                       <SelectValue>
                         Documento {selectedDocIndex + 1} de {values.documentos.length}
                       </SelectValue>
                     </SelectTrigger>
                     <SelectContent position="popper" sideOffset={5} className="z-[100000] max-h-[300px] overflow-auto">
                       {values.documentos.map((doc, index) => (
                         <SelectItem key={doc.id} value={index.toString()}>
                           {doc.nome}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const doc = values.documentos[selectedDocIndex];
                      console.log('📄 Abrindo documento:', { nome: doc?.nome, url: doc?.url?.substring(0, 50) + '...' });
                      if (doc?.url) {
                        // Abrir documento em nova aba (visualização)
                        const newWindow = window.open('', '_blank');
                        if (newWindow) {
                          newWindow.document.write(`
                            <html>
                              <head>
                                <title>${doc.nome}</title>
                                <style>
                                  body { margin: 0; padding: 0; }
                                  iframe { width: 100%; height: 100vh; border: none; }
                                </style>
                              </head>
                              <body>
                                <iframe src="${doc.url}"></iframe>
                              </body>
                            </html>
                          `);
                          newWindow.document.close();
                        }
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Visualizar documento"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const doc = values.documentos[selectedDocIndex];
                      if (doc) {
                        removeDocument(doc.id);
                        setSelectedDocIndex(Math.max(0, selectedDocIndex - 1));
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {values.documentos[selectedDocIndex] && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">{values.documentos[selectedDocIndex].nome}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {values.documentos[selectedDocIndex].tipo || "Tipo desconhecido"}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-400">
                    {values.documentos.length} {values.documentos.length === 1 ? 'documento' : 'documentos'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )
    },
  ];

  // Filtrar steps baseado nas condições (ex: esconder Parcelamento se for à vista)
  const steps = allSteps.filter(step => step.show !== false);

  // Handler para selecionar arrematante na etapa de seleção
  const handleSelectArrematante = (arrematanteId: string) => {
    const arrematante = arrematantesExistentes.find(a => a.id === arrematanteId);
    if (!arrematante) return;
    
    setSelectedArrematanteId(arrematanteId);
    setCurrentStep(0); // Ir para primeira etapa após seleção
    
    // Carregar dados do arrematante selecionado
    const arr = arrematante;
    let telefoneNum = arr?.telefone || "";
    let codigoPaisVal = "+55";
    if (telefoneNum && telefoneNum.startsWith("+")) {
      const match = telefoneNum.match(/^(\+\d+)\s+(.+)$/);
      if (match) {
        codigoPaisVal = match[1];
        telefoneNum = match[2];
      }
    }
    
    const [ruaVal, numeroVal, ...restoEndereco] = (arr?.endereco || "").split(", ");
    const complementoVal = restoEndereco.length > 0 ? restoEndereco.join(", ") : "";
    
    setValues({
      id: arr?.id || "", // Adicionar o ID do arrematante
      nome: arr?.nome || "",
      documento: arr?.documento || "",
      telefone: telefoneNum,
      codigoPais: codigoPaisVal,
      email: arr?.email || "",
      endereco: arr?.endereco || "",
      cep: arr?.cep || "",
      rua: arr?.rua || ruaVal || "",
      numero: arr?.numero || numeroVal || "",
      complemento: arr?.complemento || complementoVal || "",
      bairro: arr?.bairro || "",
      cidade: arr?.cidade || "",
      estado: arr?.estado || "",
      loteId: arr?.loteId || "",
      mercadoriaId: arr?.mercadoriaId || "",
      tipoPagamento: arr?.tipoPagamento || "parcelamento",
      valorPagar: arr?.valorPagar || "",
      valorEntrada: arr?.valorEntrada || "",
      quantidadeParcelas: arr?.quantidadeParcelas || initial.defaultQuantidadeParcelas || 12,
      mesInicioPagamento: arr?.mesInicioPagamento || initial.defaultMesInicio || "",
      diaVencimentoMensal: arr?.diaVencimentoMensal || initial.defaultDiaVencimento || 15,
      parcelasPagas: arr?.parcelasPagas || 0,
      percentualJurosAtraso: arr?.percentualJurosAtraso || 0,
      tipoJurosAtraso: arr?.tipoJurosAtraso || "composto",
      documentos: arr?.documentos || [],
      pago: arr?.pago || false,
      dataVencimentoVista: arr?.dataVencimentoVista || undefined,
      dataEntrada: arr?.dataEntrada || undefined,
      valorLance: arr?.valorLance?.toString() || "",
      fatorMultiplicador: arr?.fatorMultiplicador?.toString() || "",
      usaFatorMultiplicador: arr?.usaFatorMultiplicador || false,
      parcelasTriplas: arr?.parcelasTriplas || 0,
      parcelasDuplas: arr?.parcelasDuplas || 0,
      parcelasSimples: arr?.parcelasSimples || 0,
    });
  };

  // Filtrar arrematantes na etapa de seleção
  const arrematantesFiltradosSelection = useMemo(() => {
    if (!arrematantesExistentes || arrematantesExistentes.length === 0) return [];
    
    // Se está mostrando todos, retorna todos ordenados alfabeticamente
    if (showAllBiddersSelection && !searchCpfSelection) {
      return [...arrematantesExistentes].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
    }
    
    // Se tem busca, filtra por CPF/CNPJ (começando com os dígitos digitados)
    if (searchCpfSelection) {
      const cpfLimpo = searchCpfSelection.replace(/\D/g, '');
      const filtrados = arrematantesExistentes.filter(arr => {
        const docLimpo = arr.documento?.replace(/\D/g, '') || '';
        return docLimpo.startsWith(cpfLimpo); // Verifica se começa com os dígitos digitados
      });
      
      // Ordenar alfabeticamente por nome
      return filtrados.sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
    }
    
    return [];
  }, [arrematantesExistentes, searchCpfSelection, showAllBiddersSelection]);

  // Etapa de seleção de arrematante (quando currentStep === -1)
  const selectionStep = {
    id: "selecao",
    title: "Buscar Arrematante",
    content: (
      <div className="space-y-8">
        {/* Descrição */}
        <p className="text-gray-600">
          {showAllBiddersSelection 
            ? 'Navegue pela lista completa ou use a busca por CPF/CNPJ para filtrar'
            : 'Digite o CPF ou CNPJ para buscar o arrematante que deseja editar'
          }
        </p>

        {/* Campo de Busca por CPF/CNPJ */}
        <div className="space-y-3">
          <Label className="text-lg font-normal text-gray-600">CPF ou CNPJ</Label>
          <Input
            type="text"
            placeholder="Digite o CPF ou CNPJ para buscar"
            value={searchCpfSelection}
            onChange={(e) => {
              const formatted = formatCpfCnpj(e.target.value);
              setSearchCpfSelection(formatted);
            }}
            className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
          />
          {searchCpfSelection && arrematantesFiltradosSelection.length === 0 && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Nenhum arrematante encontrado com este CPF/CNPJ
            </p>
          )}
        </div>

        {/* Título - Sempre visível quando há busca ou showAll */}
        {(searchCpfSelection || showAllBiddersSelection) && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-normal text-gray-900">
              {isTypingSelection ? (
                <>
                  Buscando Arrematante
                  <span className="inline-flex ml-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}>.</span>
                  </span>
                </>
              ) : (
                'Arrematantes Encontrados'
              )}
            </h2>
            {arrematantesFiltradosSelection.length > 0 && (
              <span className="text-sm text-gray-500 font-normal">
                {arrematantesFiltradosSelection.length} {arrematantesFiltradosSelection.length === 1 ? 'encontrado' : 'encontrados'}
              </span>
            )}
          </div>
        )}
        
        {/* Lista de Arrematantes - Aparece quando há busca ou showAll */}
        {(searchCpfSelection || showAllBiddersSelection) && arrematantesFiltradosSelection.length > 0 && (
          <div className="space-y-3">
            {arrematantesFiltradosSelection.map((arrematante, index) => {
              const lote = initial.lotes?.find(l => l.id === arrematante.loteId);
              const mercadoria = lote?.mercadorias?.find(m => m.id === arrematante.mercadoriaId);
              
              return (
                <div
                  key={arrematante.id || index}
                  onClick={() => handleSelectArrematante(arrematante.id || '')}
                  className="group p-5 border border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all duration-200 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate group-hover:text-gray-950">{arrematante.nome}</h3>
                      <div className="mt-2 space-y-1">
                        {arrematante.documento && (
                          <p className="text-sm text-gray-600">{arrematante.documento}</p>
                        )}
                        {arrematante.email && (
                          <p className="text-sm text-gray-500 truncate">{arrematante.email}</p>
                        )}
                      </div>
                      {mercadoria && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Mercadoria Atual</p>
                          <p className="text-sm text-gray-700 font-medium">
                            {mercadoria.titulo || mercadoria.descricao}
                          </p>
                          {lote && (
                            <p className="text-xs text-gray-500 mt-1">
                              Lote {lote.numero} - {lote.descricao}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
  };

  const currentStepData = currentStep === -1 ? selectionStep : steps[currentStep];

  // Handler para importar dados de arrematante existente
  const handleImportArrematante = (arrematanteId: string) => {
    const arrematante = initial.auction?.arrematantes?.find(a => a.id === arrematanteId);
    if (!arrematante) return;
    
    // Importar APENAS dados pessoais (não lote, mercadoria, valores, etc)
    setValues(prev => ({
      ...prev,
      nome: arrematante.nome,
      documento: arrematante.documento || "",
      telefone: arrematante.telefone?.replace(/^\+\d+\s+/, "") || "", // Remover código país
      codigoPais: arrematante.telefone?.match(/^(\+\d+)/)?.[1] || "+55",
      email: arrematante.email || "",
      cep: arrematante.cep || "",
      rua: arrematante.rua || "",
      numero: arrematante.numero || "",
      complemento: arrematante.complemento || "",
      bairro: arrematante.bairro || "",
      cidade: arrematante.cidade || "",
      estado: arrematante.estado || "",
      endereco: arrematante.endereco || "",
    }));
    
    setShowImportModal(false);
    setSearchCpf(""); // Limpar busca ao fechar
  };

  // Filtrar arrematantes por CPF/CNPJ (modal de importação)
  const arrematantesFiltrados = useMemo(() => {
    if (!initial.auction?.arrematantes) return [];
    
    // Se está mostrando todos, retorna todos ordenados alfabeticamente
    if (showAllBidders && !searchCpf) {
      return [...initial.auction.arrematantes].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
    }
    
    // Se tem busca, filtra por CPF/CNPJ (começando com os dígitos digitados)
    if (searchCpf) {
      const cpfLimpo = searchCpf.replace(/\D/g, '');
      const filtrados = initial.auction.arrematantes.filter(arr => {
        const docLimpo = arr.documento?.replace(/\D/g, '') || '';
        return docLimpo.startsWith(cpfLimpo); // Verifica se começa com os dígitos digitados
      });
      
      // Ordenar alfabeticamente por nome
      return filtrados.sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
    }
    
    return [];
  }, [initial.auction?.arrematantes, searchCpf, showAllBidders]);

  return createPortal(
    <>
      {/* Wizard de Importação em Tela Cheia */}
      {showImportModal && (
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-white overflow-auto transition-opacity duration-300 opacity-100"
          style={{ 
            animation: 'wizardFadeIn 0.3s ease-out', 
            margin: 0, 
            padding: 0,
            zIndex: 100000
          }}
        >
          {/* Botão Fechar - Canto Superior Esquerdo */}
          <div className="fixed top-8 left-8 z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowImportModal(false)}
              className="rounded-full w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-700"
            >
              <XIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="min-h-screen flex">
            {/* Conteúdo Principal */}
            <div className="flex-1 flex items-center justify-center px-8 md:px-20 py-16">
              <div className="w-full max-w-2xl space-y-12">
                {/* Título */}
                <div>
                  <div className="flex items-center gap-4">
                    <h1 className="text-3xl md:text-4xl font-normal text-gray-900 leading-tight">
                      Buscar Arrematante
                    </h1>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowAllBidders(!showAllBidders);
                          if (!showAllBidders) {
                            setSearchCpf(''); // Limpar busca ao mostrar todos
                          }
                        }}
                        onMouseEnter={() => setIsHoveringButton(true)}
                        onMouseLeave={() => setIsHoveringButton(false)}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          showAllBidders 
                            ? 'bg-gray-900 text-white hover:bg-gray-800' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Users className="h-5 w-5" />
                      </button>
                      <span 
                        className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                          isHoveringButton 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-0 -translate-x-2 pointer-events-none'
                        } ${showAllBidders ? 'text-gray-900' : 'text-gray-600'}`}
                      >
                        {showAllBidders ? 'Ocultar lista' : 'Mostrar todos arrematantes'}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg text-gray-600 mt-4">
                    {showAllBidders 
                      ? 'Navegue pela lista completa ou use a busca por CPF/CNPJ para filtrar'
                      : 'Digite o CPF ou CNPJ para buscar e importar os dados pessoais de um arrematante existente'
                    }
                  </p>
                </div>

                {/* Campo de Busca por CPF/CNPJ */}
                <div className="space-y-3">
                  <Label className="text-lg font-normal text-gray-600">CPF ou CNPJ</Label>
                  <Input
                    type="text"
                    placeholder="Digite o CPF ou CNPJ para buscar"
                    value={searchCpf}
                    onChange={(e) => {
                      const formatted = formatCpfCnpj(e.target.value);
                      setSearchCpf(formatted);
                    }}
                    className="h-14 text-base border-0 border-b-2 border-gray-200 rounded-none focus-visible:border-gray-800 focus-visible:ring-0 focus-visible:outline-none px-0 bg-transparent placeholder:text-gray-400"
                  />
                  {searchCpf && arrematantesFiltrados.length === 0 && (
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Nenhum arrematante encontrado com este CPF/CNPJ
                    </p>
                  )}
                </div>

                {/* Título - Sempre visível */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-normal text-gray-900">
                    {isTyping ? (
                      <>
                        Buscando Arrematante
                        <span className="inline-flex ml-1">
                          <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}>.</span>
                        </span>
                      </>
                    ) : (
                      'Arrematantes Encontrados'
                    )}
                  </h2>
                  {(searchCpf || showAllBidders) && arrematantesFiltrados.length > 0 && (
                    <span className="text-sm text-gray-500 font-normal">
                      {arrematantesFiltrados.length} {arrematantesFiltrados.length === 1 ? 'encontrado' : 'encontrados'}
                    </span>
                  )}
                </div>

                {/* Lista de Arrematantes - Aparece quando há busca ou quando showAllBidders está ativo */}
                {(searchCpf || showAllBidders) && arrematantesFiltrados.length > 0 && (
                  <div className="space-y-3">
                    {arrematantesFiltrados.map((arrematante, index) => {
                    const lote = initial.auction?.lotes?.find(l => l.id === arrematante.loteId);
                    const mercadoria = lote?.mercadorias?.find(m => m.id === arrematante.mercadoriaId);
                    
                    return (
                      <div 
                        key={arrematante.id || index}
                        onClick={() => handleImportArrematante(arrematante.id || '')}
                        className="group p-5 border border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all duration-200 bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 truncate group-hover:text-gray-950">{arrematante.nome}</h3>
                            <div className="mt-2 space-y-1">
                              {arrematante.documento && (
                                <p className="text-sm text-gray-600">{arrematante.documento}</p>
                              )}
                              {arrematante.email && (
                                <p className="text-sm text-gray-500 truncate">{arrematante.email}</p>
                              )}
                            </div>
                            {mercadoria && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Mercadoria Atual</p>
                                <p className="text-sm text-gray-600 truncate">{mercadoria.titulo || mercadoria.descricao}</p>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-600 flex-shrink-0 ml-4 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Wizard Principal */}
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
          onClick={currentStep === -1 || currentStep === 0 ? handleClose : handleBack}
          className="rounded-full w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-700"
        >
          {currentStep === -1 || currentStep === 0 ? (
            <XIcon className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </Button>
      </div>

      <div className="min-h-screen flex">
        {/* Indicadores de Etapas - Lateral Esquerda */}
        {currentStep !== -1 && (
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
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 flex items-center justify-center px-8 md:px-20 py-16">
          <div className="w-full max-w-2xl space-y-12">
            {/* Título da Etapa */}
            <div>
              {currentStep === -1 ? (
                // Título com botão para etapa de seleção
                <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-normal text-gray-900 leading-tight">
                {currentStepData.title}
              </h1>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowAllBiddersSelection(!showAllBiddersSelection);
                        if (!showAllBiddersSelection) {
                          setSearchCpfSelection(''); // Limpar busca ao mostrar todos
                        }
                      }}
                      onMouseEnter={() => setIsHoveringButtonSelection(true)}
                      onMouseLeave={() => setIsHoveringButtonSelection(false)}
                      className={`p-2.5 rounded-lg transition-all duration-200 ${
                        showAllBiddersSelection 
                          ? 'bg-gray-900 text-white hover:bg-gray-800' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                    </button>
                    <span 
                      className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        isHoveringButtonSelection 
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-0 -translate-x-2 pointer-events-none'
                      } ${showAllBiddersSelection ? 'text-gray-900' : 'text-gray-600'}`}
                    >
                      {showAllBiddersSelection ? 'Ocultar lista' : 'Mostrar todos arrematantes'}
                    </span>
                  </div>
                </div>
              ) : (
                // Título normal para outras etapas
                <h1 className="text-3xl md:text-4xl font-normal text-gray-900 leading-tight">
                  {currentStepData.title}
                </h1>
              )}
            </div>

            {/* Conteúdo da Etapa */}
            <div>{currentStepData.content}</div>

            {/* Botão de Avançar - não mostrar na etapa de seleção */}
            {currentStep !== -1 && (
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
            )}
          </div>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
}


