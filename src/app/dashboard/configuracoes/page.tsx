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
  XCircle,
  Pencil,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ApiIntegracao {
  id: string;
  nome: string;
  apiUrl: string;
  ativa: boolean;
  criadoEm: string;
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

  const [configSystextil, setConfigSystextil] = useState({
    systextil_token_url: '',
    systextil_client_id: '',
    systextil_client_secret: '',
  });

  const [apis, setApis] = useState<ApiIntegracao[]>([]);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiIntegracao | null>(null);
  const [apiForm, setApiForm] = useState({ nome: '', apiUrl: '', ativa: true });

  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const [configRes, apisRes] = await Promise.all([
        fetch('/api/configuracoes'),
        fetch('/api/apis-integracao'),
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
        setConfigSystextil({
          systextil_token_url: config.systextil_token_url || '',
          systextil_client_id: config.systextil_client_id || '',
          systextil_client_secret: config.systextil_client_secret || '',
        });
      }

      if (apisRes.ok) {
        setApis(await apisRes.json());
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

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

      if (!res.ok) throw new Error('Erro ao salvar');

      toast({ title: 'Sucesso', description: 'Configurações gerais salvas' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function salvarConfigSystextil() {
    setSaving(true);
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configSystextil),
      });

      if (!res.ok) throw new Error('Erro ao salvar');

      toast({ title: 'Sucesso', description: 'Configurações do Systextil salvas' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function salvarApi() {
    try {
      if (!apiForm.nome || !apiForm.apiUrl) {
        toast({ title: 'Aviso', description: 'Nome e URL são obrigatórios', variant: 'warning' });
        return;
      }

      const method = editingApi ? 'PUT' : 'POST';
      const body = editingApi
        ? { id: editingApi.id, ...apiForm }
        : apiForm;

      const res = await fetch('/api/apis-integracao', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Erro ao salvar API');

      toast({
        title: 'Sucesso',
        description: editingApi ? 'API atualizada' : 'API criada',
      });

      setApiModalOpen(false);
      setEditingApi(null);
      setApiForm({ nome: '', apiUrl: '', ativa: true });
      carregarTudo();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar a API', variant: 'destructive' });
    }
  }

  async function excluirApi(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta API?')) return;

    try {
      const res = await fetch('/api/apis-integracao', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Erro ao excluir');

      toast({ title: 'Sucesso', description: 'API excluída' });
      carregarTudo();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' });
    }
  }

  async function testarApi(apiId?: string) {
    try {
      const url = apiId
        ? `/api/systextil/testar?api_id=${apiId}`
        : '/api/systextil/testar';
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Erro no teste', description: data.error, variant: 'destructive' });
      } else {
        toast({
          title: 'Teste OK',
          description: `Token obtido. ${data.data?.total || 0} OPs encontradas.`,
        });
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao testar API', variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral" className="gap-2">
            <Building2 className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Globe className="h-4 w-4" />
            APIs Externas
          </TabsTrigger>
          <TabsTrigger value="banco" className="gap-2">
            <Database className="h-4 w-4" />
            Banco de Dados
          </TabsTrigger>
        </TabsList>

        {/* Aba: Configurações Gerais */}
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
                    <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                    <Input
                      id="nomeEmpresa"
                      value={configGeral.nomeEmpresa}
                      onChange={(e) => setConfigGeral({ ...configGeral, nomeEmpresa: e.target.value })}
                      placeholder="Ex: Têxtil São Paulo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={configGeral.cnpj}
                      onChange={(e) => setConfigGeral({ ...configGeral, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={configGeral.telefone}
                      onChange={(e) => setConfigGeral({ ...configGeral, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={configGeral.email}
                      onChange={(e) => setConfigGeral({ ...configGeral, email: e.target.value })}
                      placeholder="contato@empresa.com.br"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={configGeral.endereco}
                    onChange={(e) => setConfigGeral({ ...configGeral, endereco: e.target.value })}
                    placeholder="Rua Exemplo, 123 - São Paulo, SP"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={salvarConfigGeral} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Dados'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aparência e Regional</CardTitle>
                <CardDescription>Personalize a aparência e configurações regionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tema">Tema</Label>
                    <select
                      id="tema"
                      value={configGeral.tema}
                      onChange={(e) => setConfigGeral({ ...configGeral, tema: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                      <option value="system">Sistema</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idioma">Idioma</Label>
                    <select
                      id="idioma"
                      value={configGeral.idioma}
                      onChange={(e) => setConfigGeral({ ...configGeral, idioma: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fusoHorario">Fuso Horário</Label>
                    <select
                      id="fusoHorario"
                      value={configGeral.fusoHorario}
                      onChange={(e) => setConfigGeral({ ...configGeral, fusoHorario: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Formatar Números</Label>
                      <p className="text-sm text-muted-foreground">
                        Usar formatação brasileira para números (1.000,50)
                      </p>
                    </div>
                    <Switch
                      checked={configGeral.formatarNumeros}
                      onCheckedChange={(checked) => setConfigGeral({ ...configGeral, formatarNumeros: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notificações</Label>
                      <p className="text-sm text-muted-foreground">
                        Ativar notificações do sistema
                      </p>
                    </div>
                    <Switch
                      checked={configGeral.notificacoesAtivas}
                      onCheckedChange={(checked) => setConfigGeral({ ...configGeral, notificacoesAtivas: checked })}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={salvarConfigGeral} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Aparência'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: APIs Externas */}
        <TabsContent value="api">
          <div className="grid gap-6">
            {/* Credenciais compartilhadas */}
            <Card>
              <CardHeader>
                <CardTitle>Credenciais Compartilhadas</CardTitle>
                <CardDescription>
                  Client ID, Client Secret e Token URL — usados por todas as APIs Systextil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systextil_token_url">URL do Token OAuth</Label>
                  <Input
                    id="systextil_token_url"
                    value={configSystextil.systextil_token_url}
                    onChange={(e) =>
                      setConfigSystextil({ ...configSystextil, systextil_token_url: e.target.value })
                    }
                    placeholder="https://promoda.systextil.com.br/apexbd/erp/oauth/token"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="systextil_client_id">Client ID</Label>
                    <Input
                      id="systextil_client_id"
                      value={configSystextil.systextil_client_id}
                      onChange={(e) =>
                        setConfigSystextil({ ...configSystextil, systextil_client_id: e.target.value })
                      }
                      placeholder="vM_z3JIQSR7fMml912X4Wg.."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systextil_client_secret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="systextil_client_secret"
                        type={showClientSecret ? 'text' : 'password'}
                        value={configSystextil.systextil_client_secret}
                        onChange={(e) =>
                          setConfigSystextil({ ...configSystextil, systextil_client_secret: e.target.value })
                        }
                        placeholder="v6CnE7I6vI6JkYn7DOIQ6A.."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                      >
                        {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={salvarConfigSystextil} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Credenciais'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de APIs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>APIs Cadastradas</CardTitle>
                  <CardDescription>
                    Endpoints de dados — cada API tem sua URL, todas usam as mesmas credenciais
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingApi(null);
                    setApiForm({ nome: '', apiUrl: '', ativa: true });
                    setApiModalOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova API
                </Button>
              </CardHeader>
              <CardContent>
                {apis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma API cadastrada. Clique em "Nova API" para adicionar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {apis.map((api) => (
                      <div
                        key={api.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          {api.ativa ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium">{api.nome}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {api.apiUrl}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Testar"
                            onClick={() => testarApi(api.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => {
                              setEditingApi(api);
                              setApiForm({ nome: api.nome, apiUrl: api.apiUrl, ativa: api.ativa });
                              setApiModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            title="Excluir"
                            onClick={() => excluirApi(api.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: Banco de Dados */}
        <TabsContent value="banco">
          <Card>
            <CardHeader>
              <CardTitle>Banco de Dados</CardTitle>
              <CardDescription>
                As configurações de banco são gerenciadas via variáveis de ambiente no Vercel.
                As configurações acima (credenciais e APIs) são salvas diretamente no banco de dados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">Variáveis de ambiente necessárias no Vercel:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>DATABASE_URL</code> — URL de conexão com o PostgreSQL</li>
                  <li><code>NEXTAUTH_URL</code> — URL da aplicação</li>
                  <li><code>NEXTAUTH_SECRET</code> — Secret do NextAuth</li>
                </ul>
                <p className="mt-3 font-medium mb-2">As variáveis abaixo não são mais necessárias (agora ficam no banco):</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground/70">
                  <li><code className="line-through">SYSTEXTIL_CLIENT_ID</code></li>
                  <li><code className="line-through">SYSTEXTIL_CLIENT_SECRET</code></li>
                  <li><code className="line-through">SYSTEXTIL_TOKEN_URL</code></li>
                  <li><code className="line-through">SYSTEXTIL_API_URL</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de API */}
      <Dialog open={apiModalOpen} onOpenChange={setApiModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingApi ? 'Editar API' : 'Nova API'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiNome">Nome</Label>
              <Input
                id="apiNome"
                value={apiForm.nome}
                onChange={(e) => setApiForm({ ...apiForm, nome: e.target.value })}
                placeholder="Ex: Systextil Promoda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">URL da API (endpoint de dados)</Label>
              <Input
                id="apiUrl"
                value={apiForm.apiUrl}
                onChange={(e) => setApiForm({ ...apiForm, apiUrl: e.target.value })}
                placeholder="https://promoda.systextil.com.br/apexbd/erp/systextil-intg-plm/api_apontador_ops"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={apiForm.ativa}
                onCheckedChange={(checked) => setApiForm({ ...apiForm, ativa: checked })}
              />
              <Label>Ativa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApiModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarApi}>
              {editingApi ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
