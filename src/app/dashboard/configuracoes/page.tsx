'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Save,
  Building2,
  Globe,
  Database,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle2,
  Pencil,
  Link2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ApiIntegracao {
  id: string;
  sistemaId: string;
  nome: string;
  apiUrl: string;
  metodo: string;
  ativa: boolean;
  criadoEm: string;
}

interface SistemaIntegracao {
  id: string;
  nome: string;
  tokenUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  ativa: boolean;
  criadoEm: string;
  apis: ApiIntegracao[];
}

export default function ConfiguracoesPage() {
  const [configGeral, setConfigGeral] = useState({
    nomeEmpresa: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    tema: 'light' as 'light' | 'dark' | 'system',
    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    formatarNumeros: true,
    notificacoesAtivas: true,
  });

  const [sistemas, setSistemas] = useState<SistemaIntegracao[]>([]);
  const [expandedSistema, setExpandedSistema] = useState<string | null>(null);

  const [sistemaModalOpen, setSistemaModalOpen] = useState(false);
  const [editingSistema, setEditingSistema] = useState<SistemaIntegracao | null>(null);
  const [sistemaForm, setSistemaForm] = useState({
    nome: '',
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    ativa: true,
  });

  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiIntegracao | null>(null);
  const [apiForm, setApiForm] = useState({ nome: '', apiUrl: '', metodo: 'GET', ativa: true });
  const [apiSistemaId, setApiSistemaId] = useState('');

  const [showClientId, setShowClientId] = useState<string | null>(null);
  const [showClientSecret, setShowClientSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const [configRes, sistemasRes] = await Promise.all([
        fetch('/api/configuracoes'),
        fetch('/api/sistemas-integracao'),
      ]);

      if (configRes.ok) {
        const config = await configRes.json();
        setConfigGeral((prev) => ({
          ...prev,
          nomeEmpresa: config.nome_empresa || '',
          cnpj: config.cnpj || '',
          endereco: config.endereco || '',
          telefone: config.telefone || '',
          email: config.email || '',
          tema: config.tema || 'light',
          idioma: config.idioma || 'pt-BR',
          fusoHorario: config.fuso_horario || 'America/Sao_Paulo',
          formatarNumeros: config.formatar_numeros !== 'false',
          notificacoesAtivas: config.notificacoes_ativas !== 'false',
        }));
      }

      if (sistemasRes.ok) {
        setSistemas(await sistemasRes.json());
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar configurações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // --- Config Geral ---
  async function salvarConfigGeral() {
    setSaving(true);
    try {
      const dados = {
        nome_empresa: configGeral.nomeEmpresa,
        cnpj: configGeral.cnpj,
        endereco: configGeral.endereco,
        telefone: configGeral.telefone,
        email: configGeral.email,
        tema: configGeral.tema,
        idioma: configGeral.idioma,
        fuso_horario: configGeral.fusoHorario,
        formatar_numeros: String(configGeral.formatarNumeros),
        notificacoes_ativas: String(configGeral.notificacoesAtivas),
      };
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Sucesso', description: 'Configurações salvas' });
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // --- Sistemas ---
  async function salvarSistema() {
    try {
      if (!sistemaForm.nome) {
        toast({ title: 'Aviso', description: 'Nome é obrigatório', variant: 'warning' });
        return;
      }
      const method = editingSistema ? 'PUT' : 'POST';
      const body = editingSistema ? { id: editingSistema.id, ...sistemaForm } : sistemaForm;

      const res = await fetch('/api/sistemas-integracao', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();

      toast({ title: 'Sucesso', description: editingSistema ? 'Sistema atualizado' : 'Sistema criado' });
      setSistemaModalOpen(false);
      setEditingSistema(null);
      setSistemaForm({ nome: '', tokenUrl: '', clientId: '', clientSecret: '', ativa: true });
      carregarTudo();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar sistema', variant: 'destructive' });
    }
  }

  async function excluirSistema(id: string) {
    if (!confirm('Excluir este sistema e todas as suas APIs?')) return;
    try {
      const res = await fetch('/api/sistemas-integracao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Sucesso', description: 'Sistema excluído' });
      carregarTudo();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao excluir', variant: 'destructive' });
    }
  }

  // --- APIs ---
  async function salvarApi() {
    try {
      if (!apiForm.nome || !apiForm.apiUrl) {
        toast({ title: 'Aviso', description: 'Nome e URL são obrigatórios', variant: 'warning' });
        return;
      }
      const method = editingApi ? 'PUT' : 'POST';
      const body = editingApi
        ? { id: editingApi.id, ...apiForm }
        : { sistemaId: apiSistemaId, ...apiForm };

      const res = await fetch('/api/apis-integracao', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();

      toast({ title: 'Sucesso', description: editingApi ? 'API atualizada' : 'API criada' });
      setApiModalOpen(false);
      setEditingApi(null);
      setApiForm({ nome: '', apiUrl: '', metodo: 'GET', ativa: true });
      carregarTudo();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar API', variant: 'destructive' });
    }
  }

  async function excluirApi(id: string) {
    if (!confirm('Excluir esta API?')) return;
    try {
      const res = await fetch('/api/apis-integracao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Sucesso', description: 'API excluída' });
      carregarTudo();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao excluir', variant: 'destructive' });
    }
  }

  async function testarConexao(sistemaId: string, apiId?: string) {
    try {
      const params = new URLSearchParams({ sistema_id: sistemaId });
      if (apiId) params.set('api_id', apiId);
      const res = await fetch(`/api/systextil/testar?${params}`);
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Erro no teste', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Teste OK', description: `${data.data?.sistema} — ${data.data?.total || 0} registros` });
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao testar', variant: 'destructive' });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral" className="gap-2"><Building2 className="h-4 w-4" /> Geral</TabsTrigger>
          <TabsTrigger value="api" className="gap-2"><Globe className="h-4 w-4" /> APIs Externas</TabsTrigger>
          <TabsTrigger value="banco" className="gap-2"><Database className="h-4 w-4" /> Banco de Dados</TabsTrigger>
        </TabsList>

        {/* Aba: Geral */}
        <TabsContent value="geral">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações básicas da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input value={configGeral.nomeEmpresa} onChange={(e) => setConfigGeral({ ...configGeral, nomeEmpresa: e.target.value })} placeholder="Ex: Têxtil São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={configGeral.cnpj} onChange={(e) => setConfigGeral({ ...configGeral, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={configGeral.telefone} onChange={(e) => setConfigGeral({ ...configGeral, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={configGeral.email} onChange={(e) => setConfigGeral({ ...configGeral, email: e.target.value })} placeholder="contato@empresa.com.br" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={configGeral.endereco} onChange={(e) => setConfigGeral({ ...configGeral, endereco: e.target.value })} placeholder="Rua Exemplo, 123" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={salvarConfigGeral} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Aparência e Regional</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <select value={configGeral.tema} onChange={(e) => setConfigGeral({ ...configGeral, tema: e.target.value as any })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="light">Claro</option><option value="dark">Escuro</option><option value="system">Sistema</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <select value={configGeral.idioma} onChange={(e) => setConfigGeral({ ...configGeral, idioma: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="pt-BR">Português</option><option value="en-US">English</option><option value="es">Español</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuso Horário</Label>
                    <select value={configGeral.fusoHorario} onChange={(e) => setConfigGeral({ ...configGeral, fusoHorario: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="America/Sao_Paulo">São Paulo</option><option value="America/Manaus">Manaus</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div><Label className="text-base">Formatar Números</Label><p className="text-sm text-muted-foreground">Formatação brasileira (1.000,50)</p></div>
                    <Switch checked={configGeral.formatarNumeros} onCheckedChange={(c) => setConfigGeral({ ...configGeral, formatarNumeros: c })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div><Label className="text-base">Notificações</Label><p className="text-sm text-muted-foreground">Ativar notificações do sistema</p></div>
                    <Switch checked={configGeral.notificacoesAtivas} onCheckedChange={(c) => setConfigGeral({ ...configGeral, notificacoesAtivas: c })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={salvarConfigGeral} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: APIs Externas */}
        <TabsContent value="api">
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Sistemas de Integração</h2>
                <p className="text-sm text-muted-foreground">Cada sistema tem suas credenciais e endpoints próprios</p>
              </div>
              <Button onClick={() => { setEditingSistema(null); setSistemaForm({ nome: '', tokenUrl: '', clientId: '', clientSecret: '', ativa: true }); setSistemaModalOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />Novo Sistema
              </Button>
            </div>

            {sistemas.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum sistema cadastrado</CardContent></Card>
            ) : (
              sistemas.map((sistema) => (
                <Card key={sistema.id}>
                  <CardHeader className="cursor-pointer" onClick={() => setExpandedSistema(expandedSistema === sistema.id ? null : sistema.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedSistema === sistema.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <div>
                          <CardTitle className="text-base">{sistema.nome}</CardTitle>
                          <CardDescription>{sistema.apis.length} endpoint(s) cadastrado(s)</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Testar" onClick={() => testarConexao(sistema.id)}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => { setEditingSistema(sistema); setSistemaForm({ nome: sistema.nome, tokenUrl: sistema.tokenUrl || '', clientId: sistema.clientId || '', clientSecret: sistema.clientSecret || '', ativa: sistema.ativa }); setSistemaModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Excluir" onClick={() => excluirSistema(sistema.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSistema === sistema.id && (
                    <CardContent className="space-y-4">
                      {/* Credenciais */}
                      <div className="rounded-lg bg-muted p-4 space-y-3">
                        <p className="text-sm font-medium">Credenciais</p>
                        <div className="space-y-2">
                          <Label className="text-xs">Token URL</Label>
                          <Input value={sistema.tokenUrl || ''} readOnly className="bg-background text-sm h-9" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Client ID</Label>
                            <div className="relative">
                              <Input type={showClientId === sistema.id ? 'text' : 'password'} value={sistema.clientId || ''} readOnly className="bg-background text-sm h-9 pr-10" />
                              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" onClick={() => setShowClientId(showClientId === sistema.id ? null : sistema.id)}>
                                {showClientId === sistema.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Client Secret</Label>
                            <div className="relative">
                              <Input type={showClientSecret === sistema.id ? 'text' : 'password'} value={sistema.clientSecret || ''} readOnly className="bg-background text-sm h-9 pr-10" />
                              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" onClick={() => setShowClientSecret(showClientSecret === sistema.id ? null : sistema.id)}>
                                {showClientSecret === sistema.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Endpoints */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Endpoints</p>
                          <Button size="sm" variant="outline" onClick={() => { setEditingApi(null); setApiSistemaId(sistema.id); setApiForm({ nome: '', apiUrl: '', metodo: 'GET', ativa: true }); setApiModalOpen(true); }}>
                            <Link2 className="mr-1 h-3 w-3" />Adicionar Endpoint
                          </Button>
                        </div>
                        {sistema.apis.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum endpoint cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {sistema.apis.map((api) => (
                              <div key={api.id} className="flex items-center justify-between rounded border p-3">
                                <div className="flex items-center gap-3">
                                  {api.ativa ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <span className="h-4 w-4" />}
                                  <div>
                                    <p className="text-sm font-medium">{api.nome}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span className="bg-blue-100 text-blue-700 px-1 rounded text-[10px] font-mono">{api.metodo}</span>
                                      <span className="truncate max-w-sm">{api.apiUrl}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Testar" onClick={() => testarConexao(sistema.id, api.id)}>
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => { setEditingApi(api); setApiSistemaId(sistema.id); setApiForm({ nome: api.nome, apiUrl: api.apiUrl, metodo: api.metodo, ativa: api.ativa }); setApiModalOpen(true); }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" title="Excluir" onClick={() => excluirApi(api.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Aba: Banco de Dados */}
        <TabsContent value="banco">
          <Card>
            <CardHeader>
              <CardTitle>Banco de Dados</CardTitle>
              <CardDescription>Configurações de banco gerenciadas via variáveis de ambiente no Vercel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">Variáveis necessárias no Vercel:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>DATABASE_URL</code></li>
                  <li><code>NEXTAUTH_URL</code></li>
                  <li><code>NEXTAUTH_SECRET</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Sistema */}
      <Dialog open={sistemaModalOpen} onOpenChange={setSistemaModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingSistema ? 'Editar Sistema' : 'Novo Sistema'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={sistemaForm.nome} onChange={(e) => setSistemaForm({ ...sistemaForm, nome: e.target.value })} placeholder="Ex: Systextil, Microdata, Bling..." />
            </div>
            <div className="space-y-2">
              <Label>URL do Token OAuth</Label>
              <Input value={sistemaForm.tokenUrl} onChange={(e) => setSistemaForm({ ...sistemaForm, tokenUrl: e.target.value })} placeholder="https://api.exemplo.com/oauth/token" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={sistemaForm.clientId} onChange={(e) => setSistemaForm({ ...sistemaForm, clientId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" value={sistemaForm.clientSecret} onChange={(e) => setSistemaForm({ ...sistemaForm, clientSecret: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={sistemaForm.ativa} onCheckedChange={(c) => setSistemaForm({ ...sistemaForm, ativa: c })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSistemaModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvarSistema}>{editingSistema ? 'Atualizar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal API/Endpoint */}
      <Dialog open={apiModalOpen} onOpenChange={setApiModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingApi ? 'Editar Endpoint' : 'Novo Endpoint'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={apiForm.nome} onChange={(e) => setApiForm({ ...apiForm, nome: e.target.value })} placeholder="Ex: Consulta OPs, Produtos..." />
            </div>
            <div className="space-y-2">
              <Label>URL do Endpoint *</Label>
              <Input value={apiForm.apiUrl} onChange={(e) => setApiForm({ ...apiForm, apiUrl: e.target.value })} placeholder="https://api.exemplo.com/v1/ops" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método</Label>
                <select value={apiForm.metodo} onChange={(e) => setApiForm({ ...apiForm, metodo: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2 pb-2">
                  <Switch checked={apiForm.ativa} onCheckedChange={(c) => setApiForm({ ...apiForm, ativa: c })} />
                  <Label>Ativa</Label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApiModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvarApi}>{editingApi ? 'Atualizar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
