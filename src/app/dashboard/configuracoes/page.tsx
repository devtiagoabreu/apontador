'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Save, Building2, Globe, Database, Eye, EyeOff, TestTube } from 'lucide-react';

interface ConfigGeral {
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  tema: 'light' | 'dark' | 'system';
  idioma: string;
  fusoHorario: string;
  formatarNumeros: boolean;
  notificacoesAtivas: boolean;
}

interface ConfigApi {
  systextilTokenUrl: string;
  systextilApiUrl: string;
  systextilClientId: string;
  systextilClientSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  webhookAtivo: boolean;
}

interface ConfigBanco {
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbSsl: boolean;
  dbPoolMin: number;
  dbPoolMax: number;
  dbConnectionTimeout: number;
  dbIdleTimeout: number;
}

const defaultConfigGeral: ConfigGeral = {
  nomeEmpresa: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  tema: 'light',
  idioma: 'pt-BR',
  fusoHorario: 'America/Sao_Paulo',
  formatarNumeros: true,
  notificacoesAtivas: true,
};

const defaultConfigApi: ConfigApi = {
  systextilTokenUrl: 'https://promoda.systextil.com.br/apexbd/erp/oauth/token',
  systextilApiUrl: 'https://promoda.systextil.com.br/apexbd/erp/systextil-intg-plm/api_apontador_ops',
  systextilClientId: '',
  systextilClientSecret: '',
  webhookUrl: '',
  webhookSecret: '',
  webhookAtivo: false,
};

const defaultConfigBanco: ConfigBanco = {
  dbHost: '',
  dbPort: '5432',
  dbName: '',
  dbUser: '',
  dbPassword: '',
  dbSsl: true,
  dbPoolMin: 2,
  dbPoolMax: 10,
  dbConnectionTimeout: 10000,
  dbIdleTimeout: 30000,
};

export default function ConfiguracoesPage() {
  const [configGeral, setConfigGeral] = useState<ConfigGeral>(defaultConfigGeral);
  const [configApi, setConfigApi] = useState<ConfigApi>(defaultConfigApi);
  const [configBanco, setConfigBanco] = useState<ConfigBanco>(defaultConfigBanco);
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  function carregarConfiguracoes() {
    try {
      const geral = localStorage.getItem('config_geral');
      const api = localStorage.getItem('config_api');
      const banco = localStorage.getItem('config_banco');

      if (geral) setConfigGeral({ ...defaultConfigGeral, ...JSON.parse(geral) });
      if (api) setConfigApi({ ...defaultConfigApi, ...JSON.parse(api) });
      if (banco) setConfigBanco({ ...defaultConfigBanco, ...JSON.parse(banco) });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  async function salvarConfiguracoes() {
    setSaving(true);
    try {
      localStorage.setItem('config_geral', JSON.stringify(configGeral));
      localStorage.setItem('config_api', JSON.stringify(configApi));
      localStorage.setItem('config_banco', JSON.stringify(configBanco));

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function testarConexaoBanco() {
    setTesting(true);
    try {
      const response = await fetch('/api/test-db');
      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Conexão com o banco de dados estabelecida com sucesso',
        });
      } else {
        throw new Error('Falha na conexão');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar ao banco de dados',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
        <Button onClick={salvarConfiguracoes} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
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
                <CardDescription>
                  Informações básicas da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                    <Input
                      id="nomeEmpresa"
                      value={configGeral.nomeEmpresa}
                      onChange={(e) =>
                        setConfigGeral({ ...configGeral, nomeEmpresa: e.target.value })
                      }
                      placeholder="Ex: Têxtil São Paulo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={configGeral.cnpj}
                      onChange={(e) =>
                        setConfigGeral({ ...configGeral, cnpj: e.target.value })
                      }
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={configGeral.telefone}
                      onChange={(e) =>
                        setConfigGeral({ ...configGeral, telefone: e.target.value })
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={configGeral.email}
                      onChange={(e) =>
                        setConfigGeral({ ...configGeral, email: e.target.value })
                      }
                      placeholder="contato@empresa.com.br"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={configGeral.endereco}
                    onChange={(e) =>
                      setConfigGeral({ ...configGeral, endereco: e.target.value })
                    }
                    placeholder="Rua Exemplo, 123 - São Paulo, SP"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aparência e Regional</CardTitle>
                <CardDescription>
                  Personalize a aparência e configurações regionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tema">Tema</Label>
                    <select
                      id="tema"
                      value={configGeral.tema}
                      onChange={(e) =>
                        setConfigGeral({
                          ...configGeral,
                          tema: e.target.value as ConfigGeral['tema'],
                        })
                      }
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
                      onChange={(e) =>
                        setConfigGeral({ ...configGeral, idioma: e.target.value })
                      }
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
                      onChange={(e) =>
                        setConfigGeral({ ...configGeral, fusoHorario: e.target.value })
                      }
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
                      onCheckedChange={(checked) =>
                        setConfigGeral({ ...configGeral, formatarNumeros: checked })
                      }
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
                      onCheckedChange={(checked) =>
                        setConfigGeral({ ...configGeral, notificacoesAtivas: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: APIs Externas */}
        <TabsContent value="api">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Systextil</CardTitle>
                <CardDescription>
                  Configuração de integração com o ERP Systextil (OAuth2 Client Credentials)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="systextilTokenUrl">URL do Token OAuth</Label>
                    <Input
                      id="systextilTokenUrl"
                      value={configApi.systextilTokenUrl}
                      onChange={(e) =>
                        setConfigApi({ ...configApi, systextilTokenUrl: e.target.value })
                      }
                      placeholder="https://promoda.systextil.com.br/apexbd/erp/oauth/token"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="systextilApiUrl">URL da API de Dados (OPs)</Label>
                    <Input
                      id="systextilApiUrl"
                      value={configApi.systextilApiUrl}
                      onChange={(e) =>
                        setConfigApi({ ...configApi, systextilApiUrl: e.target.value })
                      }
                      placeholder="https://promoda.systextil.com.br/apexbd/erp/systextil-intg-plm/api_apontador_ops"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systextilClientId">Client ID</Label>
                    <Input
                      id="systextilClientId"
                      value={configApi.systextilClientId}
                      onChange={(e) =>
                        setConfigApi({ ...configApi, systextilClientId: e.target.value })
                      }
                      placeholder="vM_z3JIQSR7fMml912X4Wg.."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systextilClientSecret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="systextilClientSecret"
                        type={showToken ? 'text' : 'password'}
                        value={configApi.systextilClientSecret}
                        onChange={(e) =>
                          setConfigApi({ ...configApi, systextilClientSecret: e.target.value })
                        }
                        placeholder="v6CnE7I6vI6JkYn7DOIQ6A.."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Como funciona:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>O <strong>Client ID</strong> e <strong>Client Secret</strong> são codificados em Base64 e enviados via header <code>Authorization: Basic</code></li>
                    <li>O token OAuth é obtido automaticamente via <code>POST</code> na URL do token com <code>grant_type=client_credentials</code></li>
                    <li>O token é cacheado em memória e renovado 60 segundos antes de expirar</li>
                    <li>Os dados das OPs são buscados via <code>GET</code> na URL da API com <code>Authorization: Bearer</code></li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Configuração de webhooks para notificações externas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Webhooks Ativos</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar eventos para URLs externas
                    </p>
                  </div>
                  <Switch
                    checked={configApi.webhookAtivo}
                    onCheckedChange={(checked) =>
                      setConfigApi({ ...configApi, webhookAtivo: checked })
                    }
                  />
                </div>

                {configApi.webhookAtivo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="webhookUrl">URL do Webhook</Label>
                      <Input
                        id="webhookUrl"
                        value={configApi.webhookUrl}
                        onChange={(e) =>
                          setConfigApi({ ...configApi, webhookUrl: e.target.value })
                        }
                        placeholder="https://seu-servico.com.br/webhook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="webhookSecret">Secret do Webhook</Label>
                      <div className="relative">
                        <Input
                          id="webhookSecret"
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={configApi.webhookSecret}
                          onChange={(e) =>
                            setConfigApi({ ...configApi, webhookSecret: e.target.value })
                          }
                          placeholder="Chave secreta..."
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        >
                          {showWebhookSecret ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: Banco de Dados */}
        <TabsContent value="banco">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conexão</CardTitle>
                <CardDescription>
                  Configurações de conexão com o banco de dados PostgreSQL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="dbHost">Host</Label>
                    <Input
                      id="dbHost"
                      value={configBanco.dbHost}
                      onChange={(e) =>
                        setConfigBanco({ ...configBanco, dbHost: e.target.value })
                      }
                      placeholder="ep-snowy-wind-123456.us-east-2.aws.neon.tech"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dbPort">Porta</Label>
                    <Input
                      id="dbPort"
                      value={configBanco.dbPort}
                      onChange={(e) =>
                        setConfigBanco({ ...configBanco, dbPort: e.target.value })
                      }
                      placeholder="5432"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbName">Nome do Banco</Label>
                  <Input
                    id="dbName"
                    value={configBanco.dbName}
                    onChange={(e) =>
                      setConfigBanco({ ...configBanco, dbName: e.target.value })
                    }
                    placeholder="neondb"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dbUser">Usuário</Label>
                    <Input
                      id="dbUser"
                      value={configBanco.dbUser}
                      onChange={(e) =>
                        setConfigBanco({ ...configBanco, dbUser: e.target.value })
                      }
                      placeholder="neondb_owner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dbPassword">Senha</Label>
                    <div className="relative">
                      <Input
                        id="dbPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={configBanco.dbPassword}
                        onChange={(e) =>
                          setConfigBanco({ ...configBanco, dbPassword: e.target.value })
                        }
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Conexão SSL</Label>
                    <p className="text-sm text-muted-foreground">
                      Usar SSL para a conexão com o banco de dados
                    </p>
                  </div>
                  <Switch
                    checked={configBanco.dbSsl}
                    onCheckedChange={(checked) =>
                      setConfigBanco({ ...configBanco, dbSsl: checked })
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={testarConexaoBanco}
                    disabled={testing}
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    {testing ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pool de Conexões</CardTitle>
                <CardDescription>
                  Configurações de pool e timeouts do banco de dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dbPoolMin">Mínimo de Conexões</Label>
                    <Input
                      id="dbPoolMin"
                      type="number"
                      value={configBanco.dbPoolMin}
                      onChange={(e) =>
                        setConfigBanco({
                          ...configBanco,
                          dbPoolMin: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dbPoolMax">Máximo de Conexões</Label>
                    <Input
                      id="dbPoolMax"
                      type="number"
                      value={configBanco.dbPoolMax}
                      onChange={(e) =>
                        setConfigBanco({
                          ...configBanco,
                          dbPoolMax: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dbConnectionTimeout">Timeout de Conexão (ms)</Label>
                    <Input
                      id="dbConnectionTimeout"
                      type="number"
                      value={configBanco.dbConnectionTimeout}
                      onChange={(e) =>
                        setConfigBanco({
                          ...configBanco,
                          dbConnectionTimeout: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dbIdleTimeout">Timeout de Idle (ms)</Label>
                    <Input
                      id="dbIdleTimeout"
                      type="number"
                      value={configBanco.dbIdleTimeout}
                      onChange={(e) =>
                        setConfigBanco({
                          ...configBanco,
                          dbIdleTimeout: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
