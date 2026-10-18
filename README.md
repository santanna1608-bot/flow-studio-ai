# 🎬 FLOW STUDIO AI — Estúdio de Criação de Vídeos por IA

Uma aplicação web moderna, responsiva e de alta performance inspirada nos estúdios profissionais de criação de vídeos por Inteligência Artificial (estilo Google Flow, Runway Gen-3 e Pika Studio).

---

## 🚀 Tecnologias Utilizadas

- **Framework:** React 19 + Vite 8
- **Estilização:** Tailwind CSS v4 com paleta Dark Mode sofisticada (carvão/ardósia, acentos âmbar `#f59e0b`, laranja escuro `#ea580c`, ciano e verde esmeralda `#10b981`)
- **Ícones:** Lucide React
- **Áudio:** Web Audio API com analisador FFT em tempo real para visualizador de espectro/waveform e sintetizador de trilha mestre
- **Vídeo & Exportação:** HTML5 Canvas + MediaRecorder API para renderização e exportação real de arquivos `.mp4`
- **Feedback & Animações:** Canvas Confetti e sistema de Toasts reativos

---

## 🛠️ Funcionalidades Implementadas

### 1. Projeto & Configuração (Presets e Formatos)
- **Seletor de Presets:**
  - *Midnight Neon City* (Cyberpunk, neon reflections, anamorphic flare)
  - *Cinematic Drama* (35mm film, chiaroscuro, arri alexa 65)
  - *Hyperlapse Golden Hour* (Luz dourada, partículas de poeira)
  - *Anime Studio Master* (Makoto Shinkai aesthetic, nuvens volumétricas)
  - *Dark Sci-Fi Dystopia* (Brutalist megastructure, dense industrial fog)
  - *Configuração Livre:* Desativa estilos pré-definidos para prompts 100% livres.
- **Formato de Vídeo com Alternância Interativa:**
  - **16:9 Horizontal** (Widescreen 1920×1080)
  - **9:16 Vertical** (Reels / TikTok / Shorts 1080×1920)

### 2. Character Pool (Consistência Visual IA — R2V)
- Definição de tags únicas (ex: `@Gabriel`, `@Elena`, `@Kael_Cyborg`).
- Prompts fixos de consistência Reference-to-Video (vestimenta, traços faciais, iluminação e estilo).
- Botão **"+ Upload / Selecionar Referência"** para envio de fotos base de consistência visual.
- Cadastro e edição de novos personagens.

### 3. Áudio & Música Mestre
- Gerenciamento de trilha sonora em `.mp3` ou `.wav` para guiar a montagem e sincronização rítmica.
- Biblioteca de trilhas integradas (Synthwave 128 BPM, Trailer Orquestral Épico, Lo-Fi Chill) com sintetizador sonoro instantâneo caso não envie arquivo local.
- **Visualizador Waveform em Canvas:** Análise de espectro sonoro em tempo real.
- Controles de reprodução: Play, Pause, Scrubber, Volume e Mute.

### 4. Editor de Roteiro & Quebra de Cenas (Breakdown Script)
- Área de texto livre para inserção de roteiros, letras de música ou conceitos de vídeo.
- Modelos pré-carregados (Cyberpunk e Trailer de Ação).
- Botão **"Breakdown Script (Gerar Cenas)"**:
  - Decomposição inteligente em tomadas individuais de 3 a 10 segundos.
  - Associação automática de tags de personagem (`@Gabriel`, etc.).
  - Seleção de movimentos de câmera cinematográficos (*Dolly In, Macro Orbit, Tracking Shot, FPV Drone*).
  - Reordenação (Mover para Cima/Baixo), duplicação e exclusão de tomadas.

### 5. Painel de Geração & Renderização IA
- Botão **"GENERATE FILM (Renderizar Cenas)"**.
- Simulação de telemetria autônoma:
  1. *Tokenização de Prompts*
  2. *Injeção da Matriz R2V do Personagem*
  3. *Processamento de Difusão Latente (Omni Flash Engine)*
  4. *Upscaling Neural e Interpolação 4K*
- Barras de progresso individuais e globais com badges de status (*Pronta, Renderizando, Fila*).

### 6. Sala de Montagem & Finalização (Master Player)
- Player de vídeo integrado com transição sequencial de todas as tomadas em ordem cronológica.
- Sincronização em tempo real com a trilha sonora mestre.
- **Aspect Ratio Dinâmico:** O container do player adapta seu formato e borda iluminada entre 16:9 e 9:16.
- Timeline com marcadores de corte por cena, playhead interativo, controles de cena anterior/próxima, loop e tela cheia.

### 7. Exportação Master & Download
- Modal com ficha técnica detalhada do projeto:
  - Resolução Full HD (1920×1080 ou 1080×1920)
  - Codec de Vídeo H.264 High Profile / MP4
  - Codec de Áudio AAC Estéreo 320kbps (48kHz)
  - Cenas Consolidadas e Duração Total
- Botão **"DOWNLOAD FILM (.MP4)"**:
  - Gravação real da sequência via Canvas + MediaRecorder
  - Download automático do arquivo `.mp4`
  - Efeito comemorativo de confetti ao finalizar

---

## 💻 Como Rodar o Projeto

O servidor de desenvolvimento já está ativo em:
```
http://localhost:5173/
```

Para rodar manualmente em outro terminal:
```bash
npm install
npm run dev
```

Para gerar a versão de produção:
```bash
npm run build
```
