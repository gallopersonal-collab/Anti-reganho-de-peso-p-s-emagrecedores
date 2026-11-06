import React, { useState } from 'react';
import axios from 'axios';
import { Copy, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toaster, toast } from '@/components/ui/sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OBJETIVOS = [
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'autoridade', label: 'Autoridade' },
  { value: 'venda', label: 'Venda (link na bio)' },
];
const TONS = [
  { value: 'direto', label: 'Direto' },
  { value: 'inspirador', label: 'Inspirador' },
  { value: 'tecnico', label: 'Técnico' },
];
const QUANTIDADES = ['1', '2', '3', '4', '5'];

const SENHA_KEY = 'legendas_senha';
const lerSenha = () => {
  try { return sessionStorage.getItem(SENHA_KEY) || ''; } catch { return ''; }
};
const salvarSenha = (v) => {
  try { v ? sessionStorage.setItem(SENHA_KEY, v) : sessionStorage.removeItem(SENHA_KEY); } catch { /* ignore */ }
};

const msgBloqueio = (err) => {
  const segundos = Number(err.response?.headers?.['retry-after']) || 0;
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  return `Muitas tentativas de senha. Tente de novo em ${minutos} min.`;
};

const ERROS = {
  503: 'O provedor de IA está fora do ar. O FreeLLMAPI está rodando?',
  504: 'O provedor de IA demorou demais. Tente de novo.',
  502: 'O provedor de IA respondeu com erro. Tente de novo.',
};

const TelaSenha = ({ onEntrar }) => {
  const [valor, setValor] = useState('');
  const [verificando, setVerificando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (!valor) return;
    setVerificando(true);
    try {
      await axios.get(`${API}/llm/config`, { headers: { 'X-Access-Password': valor } });
      salvarSenha(valor);
      onEntrar(valor);
    } catch (err) {
      const status = err.response?.status;
      toast.error(
        status === 429 ? msgBloqueio(err)
          : status === 401 ? 'Senha incorreta.'
          : status === 503 ? 'A senha ainda não foi configurada no servidor.'
          : 'Não foi possível conectar ao servidor.'
      );
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1FAEE] flex items-center justify-center px-4">
      <Toaster position="top-center" />
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <form onSubmit={entrar} className="space-y-4">
            <div className="flex items-center gap-2 text-[#012578]">
              <Lock className="h-5 w-5" />
              <h1 className="text-xl font-bold">Gerador de legendas</h1>
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha de acesso</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="bg-white"
              />
            </div>
            <Button
              type="submit"
              disabled={verificando || !valor}
              className="w-full bg-[#1CAF35] hover:bg-[#179a2e] text-white font-semibold"
            >
              {verificando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const Campo = ({ label, value, onChange, options, id }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const LegendasPage = () => {
  const [senha, setSenha] = useState(lerSenha);
  const [tema, setTema] = useState('');
  const [objetivo, setObjetivo] = useState('engajamento');
  const [tom, setTom] = useState('direto');
  const [quantidade, setQuantidade] = useState('3');
  const [legendas, setLegendas] = useState([]);
  const [loading, setLoading] = useState(false);

  const gerar = async (e) => {
    e.preventDefault();
    if (tema.trim().length < 3) {
      toast.error('Descreva o tema do post.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/llm/legendas`, {
        tema: tema.trim(),
        objetivo,
        tom,
        quantidade: Number(quantidade),
      }, { headers: { 'X-Access-Password': senha } });
      setLegendas(data.legendas);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        toast.error(msgBloqueio(err));
        return;
      }
      if (status === 401) {
        salvarSenha('');
        setSenha('');
        toast.error('Senha inválida. Entre de novo.');
        return;
      }
      toast.error(ERROS[status] || 'Não foi possível gerar as legendas.');
    } finally {
      setLoading(false);
    }
  };

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Legenda copiada.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  if (!senha) return <TelaSenha onEntrar={setSenha} />;

  return (
    <div className="min-h-screen bg-[#F1FAEE] py-10 md:py-16">
      <Toaster position="top-center" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1CAF35]">Instituto Gallo Personal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#012578]">Gerador de legendas</h1>
          <p className="mt-2 text-gray-600">Legendas de Instagram para o Curso Anti-Reganho. Revise antes de publicar.</p>
          <button
            type="button"
            onClick={() => { salvarSenha(''); setSenha(''); }}
            className="mt-2 text-sm text-gray-500 underline hover:text-[#012578]"
          >
            Sair
          </button>
        </header>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={gerar} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tema">Tema do post</Label>
                <Textarea
                  id="tema"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Ex.: por que o aluno perde massa magra durante o Mounjaro"
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo id="objetivo" label="Objetivo" value={objetivo} onChange={setObjetivo} options={OBJETIVOS} />
                <Campo id="tom" label="Tom" value={tom} onChange={setTom} options={TONS} />
                <Campo
                  id="quantidade"
                  label="Quantidade"
                  value={quantidade}
                  onChange={setQuantidade}
                  options={QUANTIDADES.map((q) => ({ value: q, label: q }))}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#1CAF35] hover:bg-[#179a2e] text-white font-semibold"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loading ? 'Gerando...' : 'Gerar legendas'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4" data-testid="legendas-resultado">
          {legendas.map((legenda, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="whitespace-pre-line text-gray-800 leading-relaxed">{legenda}</p>
                  <Button variant="outline" size="sm" onClick={() => copiar(legenda)} aria-label={`Copiar legenda ${i + 1}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
