# LocalizAR Admin 🛠️

**Versão:** 1.0.0  
**Status:** Restrito - Apenas Administradores

![WebXR](https://img.shields.io/badge/WebXR-Enabled-brightgreen)
![React](https://img.shields.io/badge/React-19.1.1-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.179.1-orange)

---

## 📋 Sobre

**LocalizAR Admin** é o painel administrativo para criação e gerenciamento de pontos de interesse em Realidade Aumentada. Use esta aplicação para configurar eventos e criar experiências AR para seus visitantes.

### 🎯 Funcionalidades Administrativas

- **📱 Calibração por QR Code:** Defina o ponto de referência do evento
- **➕ Criação de Pontos:** Adicione pontos de interesse em AR
- **💾 Gerenciamento:** Visualize e gerencie todos os pontos criados
- **☁️ Sincronização:** Dados salvos automaticamente no Supabase
- **📊 Estatísticas:** Acompanhe quantos pontos foram criados

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+
- Conta Supabase configurada
- Smartphone com suporte WebXR
- HTTPS (obrigatório)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/localizar-admin.git
cd localizar-admin

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# Crie um arquivo .env.local com:
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase

# 4. Execute em desenvolvimento
npm run dev

# 5. Build para produção
npm run build
```

---

## 🗄️ Configuração do Banco de Dados

### Estrutura da Tabela `pontos` no Supabase:

```sql
CREATE TABLE pontos (
  id TEXT PRIMARY KEY,
  pos_x FLOAT NOT NULL,
  pos_y FLOAT NOT NULL,
  pos_z FLOAT NOT NULL,
  qr_referencia TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca rápida por evento
CREATE INDEX idx_pontos_qr ON pontos(qr_referencia);
```

---

## 📱 Como Usar (Administrador)

### 1. Preparação do Evento

- Imprima QR Codes únicos para cada evento
- Coloque o QR Code no ponto de entrada/referência do local

### 2. Calibração

1. Acesse a aplicação admin
2. Clique em **"Calibrar com QR Code"**
3. Aponte para o QR Code do evento
4. **IMPORTANTE:** Mantenha o celular estável após detectar o QR

### 3. Criação de Pontos

1. Após calibração, clique em **"Start AR"**
2. Mova o dispositivo para detectar superfícies
3. Toque no **retículo verde** para criar pontos
4. Os pontos são salvos automaticamente no Supabase

### 4. Gerenciamento

- Visualize o número de pontos criados
- Recalibre se necessário
- Monitore os dados no painel do Supabase

---

## ⚠️ Boas Práticas

### Durante a Calibração:
- ✅ Mantenha o QR Code bem iluminado
- ✅ Segure o celular estável durante a detecção
- ✅ Aguarde a confirmação antes de mover o dispositivo
- ❌ Não mova o celular até AR inicializar completamente

### Durante a Criação de Pontos:
- ✅ Crie pontos em locais bem visíveis
- ✅ Distribua pontos de forma estratégica
- ✅ Teste a experiência como visitante antes do evento
- ❌ Evite criar pontos muito próximos

---

## 🔒 Segurança

Esta aplicação é **restrita a administradores**. Recomendações:

1. **Não distribua publicamente** esta versão
2. Configure **autenticação** no Supabase
3. Use **Row Level Security (RLS)** para proteger dados
4. Mantenha as **credenciais seguras**

### Exemplo de RLS Policy:

```sql
-- Permitir apenas inserção de pontos (para admins)
CREATE POLICY "Admin can insert points"
ON pontos FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Permitir leitura para todos (visitantes)
CREATE POLICY "Anyone can read points"
ON pontos FOR SELECT
USING (true);
```

---

## 🛠️ Tecnologias

- React 19.1.1
- Three.js 0.179.1
- WebXR Device API
- Supabase (backend)
- jsQR (scanner QR)
- LocalStorage (cache local)

---

## 📊 Monitoramento

Acompanhe métricas importantes:

- Número total de pontos criados
- Pontos por evento (QR Code)
- Timestamp de criação
- Erros de sincronização

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Pontos em posições erradas | Refaça calibração mantendo celular estável |
| Erro ao salvar no Supabase | Verifique credenciais e conexão |
| Modelo 3D não carrega | Confirme que `map_pointer_3d_icon.glb` está em `/public/` |
| AR não inicia | Use HTTPS obrigatoriamente |

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes

---

## 📧 Contato

Para suporte administrativo, entre em contato com a equipe de desenvolvimento.

---

**⚠️ USO RESTRITO - APENAS PARA ADMINISTRADORES AUTORIZADOS ⚠️**