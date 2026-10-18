//FLOW AI Video Studio - Initial Presets, Characters, Audio & Demo Data

export const VIDEO_PRESETS = [
  {
    id: "midnight-neon",
    name: "Midnight Neon City",
    description: "Estética Cyberpunk noir, luzes de neon pulsantes, asfalto molhado com reflexos e lentes anamórficas.",
    stylePrompt: "cyberpunk aesthetic, rainy neo-tokyo streets, vibrant neon reflections, anamorphic lens flare, moody atmospheric haze, 35mm film grain, 8k cinematic lighting",
    badge: "Cyberpunk",
    color: "from-purple-900 to-cyan-900",
    accent: "#06b6d4"
  },
  {
    id: "cinematic-drama",
    name: "Cinematic Drama",
    description: "Iluminação chiaroscuro dramática, profundidade de campo rasa, tons quentes e textura cinematográfica 35mm.",
    stylePrompt: "cinematic movie still, chiaroscuro lighting, shallow depth of field, 35mm film, warm color grade, atmospheric shadows, hyper-realistic skin textures, arri alexa 65",
    badge: "Cinema Master",
    color: "from-amber-950 to-stone-900",
    accent: "#f59e0b"
  },
  {
    id: "hyperlapse-golden",
    name: "Hyperlapse Golden Hour",
    description: "Luz solar dourada do entardecer, céu vibrante com partículas de poeira e movimentos de câmera dinâmicos.",
    stylePrompt: "golden hour sunlight, god rays, warm volumetric haze, dynamic camera movement, epic cinematic landscape, rich amber tones, photorealistic 8k octane render",
    badge: "Golden Hour",
    color: "from-amber-900 to-orange-950",
    accent: "#ea580c"
  },
  {
    id: "anime-studio",
    name: "Anime Studio Master",
    description: "Estilo anime cinematográfico inspirado em Makoto Shinkai, nuvens volumétricas e paleta de cores lírica.",
    stylePrompt: "anime cinematic wallpaper, makoto shinkai aesthetic, breathtaking volumetric cumulus clouds, vibrant saturated sky, detailed line art, soft emotional lighting, masterpiece",
    badge: "Anime High-End",
    color: "from-blue-900 to-indigo-950",
    accent: "#6366f1"
  },
  {
    id: "dark-scifi",
    name: "Dark Sci-Fi Dystopia",
    description: "Megarrubricas colossais, névoa densa, arquitetura brutalista e tons monocromáticos de titânio.",
    stylePrompt: "dark brutalist sci-fi megastructure, dense industrial fog, monochromatic titanium tones, blade runner 2049 mood, monumental scale, cinematic matte painting",
    badge: "Sci-Fi",
    color: "from-zinc-900 to-slate-950",
    accent: "#94a3b8"
  },
  {
    id: "custom-free",
    name: "Configuração Livre (Prompt Puro)",
    description: "Sem estilo pré-definido. Seus prompts de roteiro terão 100% de controle sobre a direção de arte.",
    stylePrompt: "",
    badge: "Livre",
    color: "from-neutral-900 to-neutral-950",
    accent: "#10b981"
  }
];

export const INITIAL_CHARACTERS = [
  {
    id: "char-1",
    tag: "@Gabriel",
    name: "Gabriel Silva",
    role: "Protagonista / Piloto Renegado",
    outfitPrompt: "Homem latino de 28 anos, jaqueta de couro preta surrada com gola alta e detalhes em neon âmbar, cabelo curto escuro despojado, cicatriz sutil sobre a sobrancelha esquerda, olhar determinado e reflexivo.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    referenceStatus: "Ativo (R2V Vinculado)",
    consistencyWeight: 0.92
  },
  {
    id: "char-2",
    tag: "@Elena",
    name: "Elena Vance",
    role: "Hacker / Engenheira Quântica",
    outfitPrompt: "Mulher de 26 anos, olhos cor de avelã luminosos, óculos de realidade aumentada com aro fino dourado, sobretudo cinza escuro de tecido tecnológico com capuz dobrado, cabelo trançado lateralmente.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    referenceStatus: "Ativo (R2V Vinculado)",
    consistencyWeight: 0.88
  },
  {
    id: "char-3",
    tag: "@Kael_Cyborg",
    name: "Kael 09",
    role: "Guardião Androide",
    outfitPrompt: "Androide humanoide com braço esquerdo de fibra de carbono fosca, olhos fotônicos ciano discretos, traje tático minimalista preto com linhas reflexivas luminescentes.",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
    referenceStatus: "Ativo (R2V Vinculado)",
    consistencyWeight: 0.95
  }
];

export const SAMPLE_AUDIO_TRACKS = [
  {
    id: "track-1",
    name: "Cyberpunk Pulse (Synthwave 128 BPM)",
    artist: "Flow Master Audio",
    duration: 28,
    bpm: 128,
    genre: "Synthwave / Cinematic Beat",
    type: "preset",
    fileUrl: null // will be synthesized via Web Audio or user upload
  },
  {
    id: "track-2",
    name: "Epic Orchestral Odyssey",
    artist: "Hans Zimmer Style AI",
    duration: 32,
    bpm: 90,
    genre: "Cinematic Trailer",
    type: "preset",
    fileUrl: null
  },
  {
    id: "track-3",
    name: "Midnight Tokyo Lo-Fi Beats",
    artist: "Aura Soundscape",
    duration: 25,
    bpm: 84,
    genre: "Ambient Chill",
    type: "preset",
    fileUrl: null
  }
];

export const SAMPLE_SCRIPTS = [
  {
    id: "script-cyber",
    title: "A Fuga em Neo-Metrópole (Cyberpunk)",
    text: `Cena 1: A chuva cai pesada sobre os arranha-céus iluminados por outdoors holográficos azuis e laranjas. @Gabriel caminha lentamente com as mãos nos bolsos da jaqueta de couro preta, olhando para trás desconfiado.

Cena 2: Na entrada de uma estação subterrânea secreta, @Elena digita velozmente em um terminal holográfico flutuante enquanto seus óculos dourados refletem fluxos de dados em alta velocidade.

Cena 3: @Gabriel e @Elena se encontram no beco dos fundos. Os faróis de um drone de vigilância passam varrendo a fumaça de vapor que sobe dos bueiros.

Cena 4: @Kael_Cyborg intercepta o drone de vigilância com um golpe preciso de seu braço de fibra de carbono, criando uma chuva de faíscas azuis na escuridão.

Cena 5: Os três correm em direção à nave de fuga oculta no heliponto da torre abandonada enquanto a cidade acorda ao fundo em tons dourados e violetas.`
  },
  {
    id: "script-trailer",
    title: "O Despertar da Centelha (Ação & Suspense)",
    text: `Cena 1: O silêncio do deserto cósmico antes da tempestade. @Gabriel observa um monólito colossal que emite uma pulsação de energia dourada constante.

Cena 2: @Elena ajusta o dispositivo quântico portátil enquanto as areias ao redor começam a levitar contra a gravidade em câmera lenta.

Cena 3: Close-up extremo nos olhos de @Gabriel quando ele toca o artefato antigo e uma onda de choque de partículas ilumina seu rosto.

Cena 4: A nave espacial decola verticalmente rompendo a atmosfera planetária com turbinas de plasma em potência máxima.`
  }
];

export const INITIAL_SCENES = [
  {
    id: "scene-1",
    shotNumber: 1,
    title: "Chuva e Reflexos em Neo-Metrópole",
    characterTag: "@Gabriel",
    cameraMovement: "Slow Dolly In, 35mm Anamorphic, Low Angle",
    prompt: "@Gabriel caminha solitário pela calçada molhada de Neo-Metrópole sob chuva fina. Reflexos de neon azul e âmbar espelhados no chão de asfalto. Vento suave balança a jaqueta de couro.",
    duration: 6,
    status: "ready", // "idle", "rendering", "ready", "error"
    progress: 100,
    thumbnailColor: "from-blue-950 via-slate-900 to-amber-950",
    visualStyleTag: "Chuva & Reflexos",
    motionType: "pan-slow",
    generatedVideoUrl: null
  },
  {
    id: "scene-2",
    shotNumber: 2,
    title: "Terminal Quântico no Subsolo",
    characterTag: "@Elena",
    cameraMovement: "Macro Orbit, Shallow Depth of Field, 50mm",
    prompt: "@Elena em frente ao terminal holográfico com dados dourados flutuando no ar escuro. Seus óculos de realidade aumentada piscam ao processar códigos quânticos.",
    duration: 5,
    status: "ready",
    progress: 100,
    thumbnailColor: "from-amber-950 via-zinc-900 to-cyan-950",
    visualStyleTag: "Holograma Flutuante",
    motionType: "zoom-in",
    generatedVideoUrl: null
  },
  {
    id: "scene-3",
    shotNumber: 3,
    title: "O Encontro no Beco Escondido",
    characterTag: "@Gabriel",
    cameraMovement: "Tracking Shot, Lateral Pan Right, Cinematic 24fps",
    prompt: "@Gabriel encontra @Elena entre colunas de concreto maciço. Névoa volumétrica e faróis distantes cortando a escuridão da noite urbana.",
    duration: 6,
    status: "ready",
    progress: 100,
    thumbnailColor: "from-slate-900 via-indigo-950 to-orange-950",
    visualStyleTag: "Névoa Volumétrica",
    motionType: "pan-lateral",
    generatedVideoUrl: null
  },
  {
    id: "scene-4",
    shotNumber: 4,
    title: "Intervenção do Guardião Androide",
    characterTag: "@Kael_Cyborg",
    cameraMovement: "High Speed Arc, Fast Push-In, Shutter 180°",
    prompt: "@Kael_Cyborg ativa o braço de fibra de carbono bloqueando o sensor inimigo. Feixes de partículas de faíscas elétricas azuis explodem no quadro.",
    duration: 5,
    status: "ready",
    progress: 100,
    thumbnailColor: "from-cyan-950 via-zinc-900 to-purple-950",
    visualStyleTag: "Faíscas & Ação",
    motionType: "arc-fast",
    generatedVideoUrl: null
  },
  {
    id: "scene-5",
    shotNumber: 5,
    title: "A Fuga para o Horizonte",
    characterTag: "@Gabriel",
    cameraMovement: "Epic Drone Crane Up, Wide Angle 18mm, Sunset Reveal",
    prompt: "Visão panorâmica ampla da torre de lançamento enquanto a nave dispara rumo às nuvens ao entardecer com o horizonte da cidade ao fundo.",
    duration: 6,
    status: "ready",
    progress: 100,
    thumbnailColor: "from-orange-950 via-amber-900 to-indigo-950",
    visualStyleTag: "Decolagem Épica",
    motionType: "crane-up",
    generatedVideoUrl: null
  }
];

export const CAMERA_MOVEMENTS = [
  "Slow Dolly In, 35mm Anamorphic, Low Angle",
  "Macro Orbit, Shallow Depth of Field, 50mm",
  "Tracking Shot, Lateral Pan Right, Cinematic 24fps",
  "High Speed Arc, Fast Push-In, Shutter 180°",
  "Epic Drone Crane Up, Wide Angle 18mm",
  "FPV Drone Chase, Ultra Dynamic, Motion Blur",
  "Static Master Shot, Arri Alexa 65, Symmetry",
  "Whip Pan Transition, Handheld Organic Cam"
];
