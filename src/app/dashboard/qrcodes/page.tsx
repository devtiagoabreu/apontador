'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from '@/components/ui/use-toast';
import { Printer, Download, QrCode, Loader2 } from 'lucide-react';

interface Maquina {
  id: string;
  nome: string;
  codigo: string;
}

interface Operador {
  id: string;
  nome: string;
  matricula: string;
}

interface OP {
  op: number;
  produto: string;
}

export default function QRCodesPage() {
  const [activeTab, setActiveTab] = useState('maquinas');
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [ops, setOps] = useState<OP[]>([]);
  const [selectedMaquina, setSelectedMaquina] = useState<string>('');
  const [selectedOperador, setSelectedOperador] = useState<string>('');
  const [selectedOP, setSelectedOP] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [qrValue, setQrValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      await Promise.all([
        carregarMaquinas(),
        carregarOperadores(),
        carregarOps()
      ]);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function carregarMaquinas() {
    const response = await fetch('/api/maquinas');
    const data = await response.json();
    setMaquinas(data);
  }

  async function carregarOperadores() {
    const response = await fetch('/api/usuarios?nivel=OPERADOR');
    const data = await response.json();
    setOperadores(data);
  }

  async function carregarOps() {
    const response = await fetch('/api/ops?limit=100');
    const data = await response.json();
    setOps(data.data || []);
  }

  function gerarQRCode() {
    let url = '';
    
    switch (activeTab) {
      case 'maquinas':
        if (!selectedMaquina) {
          toast({
            title: 'Erro',
            description: 'Selecione uma máquina',
            variant: 'destructive',
          });
          return;
        }
        url = `${window.location.origin}/qr/machine/${selectedMaquina}`;
        break;
        
      case 'operadores':
        if (!selectedOperador) {
          toast({
            title: 'Erro',
            description: 'Selecione um operador',
            variant: 'destructive',
          });
          return;
        }
        url = `${window.location.origin}/qr/operator/${selectedOperador}`;
        break;
        
      case 'ops':
        if (!selectedOP) {
          toast({
            title: 'Erro',
            description: 'Selecione uma OP',
            variant: 'destructive',
          });
          return;
        }
        url = `${window.location.origin}/qr/op/${selectedOP}`;
        break;
    }
    
    setQrValue(url);
  }

  function imprimirQRCode() {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  }

  function downloadQRCode() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `qrcode-${activeTab}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  function imprimirMultiplos() {
    const urls = [];
    switch (activeTab) {
      case 'maquinas':
        if (!selectedMaquina) return;
        for (let i = 0; i < quantidade; i++) {
          urls.push(`${window.location.origin}/qr/machine/${selectedMaquina}`);
        }
        break;
      // ... similar para outros casos
    }
    
    // Abrir janela de impressão com múltiplos QR Codes
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Codes</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
              .qr-item { text-align: center; page-break-inside: avoid; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="no-print">
              <button onclick="window.print()">Imprimir</button>
              <button onclick="window.close()">Fechar</button>
            </div>
            <div class="qr-grid">
              ${urls.map(url => `
                <div class="qr-item">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}" />
                  <p>${url.split('/').pop()}</p>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">QR Codes</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="maquinas">Máquinas</TabsTrigger>
          <TabsTrigger value="operadores">Operadores</TabsTrigger>
          <TabsTrigger value="ops">Ordens de Produção</TabsTrigger>
        </TabsList>

        <TabsContent value="maquinas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code para Máquina</CardTitle>
              <CardDescription>
                Gere QR Codes para identificar máquinas no chão de fábrica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione a Máquina</Label>
                <Select value={selectedMaquina} onValueChange={setSelectedMaquina}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinas.map((maquina) => (
                      <SelectItem key={maquina.id} value={maquina.id}>
                        {maquina.codigo} - {maquina.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade (para impressão em lote)</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value))}
                />
              </div>

              <Button onClick={gerarQRCode} className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                Gerar QR Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operadores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code para Operador</CardTitle>
              <CardDescription>
                Gere QR Codes para login rápido dos operadores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Operador</Label>
                <Select value={selectedOperador} onValueChange={setSelectedOperador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um operador" />
                  </SelectTrigger>
                  <SelectContent>
                    {operadores.map((op) => (
                      <SelectItem key={op.id} value={op.matricula}>
                        {op.matricula} - {op.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={gerarQRCode} className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                Gerar QR Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code para OP</CardTitle>
              <CardDescription>
                Gere QR Codes para identificar ordens de produção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione a OP</Label>
                <Select value={selectedOP} onValueChange={setSelectedOP}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma OP" />
                  </SelectTrigger>
                  <SelectContent>
                    {ops.map((op) => (
                      <SelectItem key={op.op} value={op.op.toString()}>
                        OP {op.op} - {op.produto.substring(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={gerarQRCode} className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                Gerar QR Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {qrValue && (
        <Card className={printMode ? 'print:block' : ''}>
          <CardHeader>
            <CardTitle>QR Code Gerado</CardTitle>
            <CardDescription>{qrValue}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={qrValue} size={200} />
            </div>
            
            {!printMode && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadQRCode}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={imprimirQRCode}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={imprimirMultiplos}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir {quantidade} cópias
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}