# Flow Studio — roteiro, Google Veo, Omni Flash e montagem local

Aplicação React 19 + Vite, com servidor Node.js para proteger as chaves e integrar Google Veo e Gemini Omni Flash pela Gemini API.

## Executar

Requer Node.js 22.16 ou mais recente (recomendado: Node 24) e Chrome ou Edge atualizado.

~~~powershell
npm install
npm run dev
~~~

Abra http://127.0.0.1:5173. Use sempre o mesmo endereço: localhost e 127.0.0.1 têm armazenamentos distintos no navegador.

Para produção local:

~~~powershell
npm run build
npm start
~~~

O servidor de produção fica em http://127.0.0.1:3000. Não publique esse servidor local na internet sem autenticação e controle de acesso.

## Configurar Veo

Edite o arquivo .env.local criado na raiz e defina GEMINI_API_KEY localmente. O modelo padrão é veo-3.1-generate-preview; VEO_MODEL permite substituí-lo por outro modelo compatível com o mesmo contrato.

Não use prefixo VITE_ em chaves. Nunca coloque segredos no código, no Git ou no chat. O arquivo .env.example contém apenas os nomes das configurações. Reinicie npm run dev depois de mudar o ambiente.

A conta Gemini API precisa ter acesso ao Veo e faturamento habilitado. Uma assinatura do aplicativo Gemini, por si só, não configura a API deste app. Cada clique em Gerar envia um pedido que pode consumir créditos.

A integração segue a documentação oficial:
https://ai.google.dev/gemini-api/docs/veo

- Cada pedido gera um clipe Full HD de 8 segundos; a duração da cena na montagem define o trecho utilizado.
- Preset, prompt da cena, câmera e descrição do personagem compõem o pedido.
- Referências PNG, JPEG ou WebP de até 5 MB enviadas por upload acompanham o pedido como imagens de referência. URLs externas de avatares ficam somente no cadastro.
- O serviço faz a geração; o app consulta a operação até o vídeo ficar disponível e salva o MP4 em .flow-data/videos.
- Retomar consulta o pedido já enviado. Parar acompanhamento interrompe a consulta local, mas não cancela o processamento nem a cobrança no Google.
- Depois de uma falha definitiva, descarte o vínculo da operação antes de enviar um novo pedido.
- Alterações em prompts, personagens, preset ou formato mantêm o clipe anterior com aviso para gerar novamente.

Sem chave, o editor, a importação de clipes, a montagem e o storyboard continuam disponíveis. Os botões Veo ficam desabilitados; nenhum vídeo é declarado gerado artificialmente.

## Áudio, reprodução e exportação

É possível importar vídeos de até 200 MB por cena e áudio de até 50 MB. A trilha mestre é repetida até o fim do filme na prévia e no arquivo final. Ela substitui o áudio dos clipes; o áudio original do Veo é preservado no download individual do MP4.

A montagem usa os clipes reais. Cenas sem clipe são identificadas como storyboard e usam texto, fundo animado e imagens locais cadastradas. Essas cenas não são vídeos de IA.

A exportação captura o canvas em 1920×1080 ou 1080×1920 e grava a duração completa em tempo real. Mantenha a aba visível; ocultá-la interrompe a gravação com mensagem para tentar novamente. É possível cancelar e baixar novamente o resultado.

Instale FFmpeg e deixe ffmpeg no PATH, ou configure FFMPEG_PATH no ambiente. Com FFmpeg, o servidor finaliza o arquivo como MP4/H.264/AAC, 30 fps e duração exata da montagem. Sem ele, o app usa o formato suportado pelo navegador, MP4 ou WebM, com duração e FPS sujeitos à gravação do navegador. O MIME e a extensão correspondem ao formato real.

## Campos vazios a cada abertura

O editor começa vazio ao abrir ou recarregar a página: nome, roteiro, tomadas, personagens e trilha não são preenchidos nem restaurados automaticamente. O modo livre começa ativo, sem prompt de estilo injetado.

Adicionar uma tomada ou personagem também abre os campos de texto em branco. Os dados digitados ficam disponíveis apenas durante a sessão atual; recarregar a página ou usar Novo limpa o editor. As chaves do servidor e os vídeos já baixados no disco permanecem preservados.

## TypeSafe / Jev

TYPESAFE_API_KEY é opcional, lida somente no servidor. O breakdown divide o roteiro por parágrafos e pode consultar Jev para selecionar personagem principal e movimento de câmera. Só envia as cenas e os candidatos necessários. Respostas com baixa confiança usam as opções locais; falhas da API são informadas e preservam a divisão local.

A interface só informa o modelo auxiliar depois de uma resposta real bem-sucedida. Jev não gera vídeos e não substitui o Veo.

Documentação: https://docs.typesafe.ai/api

## Verificações

~~~powershell
npm test
npm run lint
npm run build
~~~

Os testes cobrem o relógio do áudio, seek, troca de trilha, cortes da timeline, formatos de saída, validação e contrato Veo, cache de vídeo, leitura por Range e seleção auxiliar Jev. Os serviços pagos são simulados nos testes. A finalização MP4 também tem um teste real com FFmpeg; ele é ignorado quando o executável não estiver disponível.

## Omni Flash ao lado do Veo

No painel **5. Vídeos — Veo e Omni Flash**, escolha **Google Veo** ou **Gemini Omni Flash** em **Modelo de geração**. A escolha vale durante a sessão. O editor inicia com Omni Flash disponível e sem prompts preenchidos.

Omni Flash usa a mesma GEMINI_API_KEY já configurada. Não é necessário cadastrar outra chave. O modelo padrão é gemini-omni-1.1-flash; opcionalmente, configure OMNI_MODEL em .env.local. A disponibilidade depende do acesso da sua conta ao modelo e da região.

A integração usa a Interactions API do Google, com solicitação de vídeo em 1080p e entrega por URI. A duração é pedida no prompt, conforme o contrato Omni; a montagem é limitada à duração real do clipe recebido. O app suporta a resposta REST em steps/model_output e a resposta com output_video. Também aceita vídeo inline caso o serviço o retorne.

O servidor acompanha o pedido e consulta o arquivo até o estado ACTIVE antes de baixar o MP4. Os clipes e o andamento do arquivo ficam salvos localmente; retomar não cria outro pedido. Se o servidor reiniciar enquanto a solicitação inicial síncrona ainda estiver em andamento, o app avisa que o pedido pode continuar no Google, em vez de reenviá-lo automaticamente.

A troca do seletor não altera clipes anteriores. Cada clipe indica o modelo que o produziu, e pedidos pendentes são retomados no provedor original. Esta integração adiciona geração por texto e referência de imagem local; edição e extensão de vídeo por conversa não fazem parte deste fluxo.

Documentação oficial: https://ai.google.dev/gemini-api/docs/omni

## Vozes, legendas e lipsync — ElevenLabs

Adicione `ELEVENLABS_API_KEY=` ao `.env.local`, preencha a chave apenas nesse arquivo e reinicie `npm run dev`. Não use prefixo `VITE_`. Nenhuma chave é enviada ao navegador. O campo já foi criado na instalação local; as outras chaves foram preservadas.

Na área **Vozes, legendas e lipsync**, carregue as vozes da conta e filtre por apresentação masculina, feminina ou neutra. O catálogo vem da API, sem vozes fictícias. A narração e cada cena têm texto e voz próprios. A geração usa `eleven_multilingual_v2`, produz MP3 e tempos reais por caractere. É possível ouvir e baixar o áudio antes da montagem.

As legendas são geradas desses tempos, em quatro estilos: clássica, caixa escura, destaque amarelo e karaokê por palavra. Escolha o estilo e aplique as legendas. Também é possível colar/editar SRT, aplicar e baixar o SRT. O estilo é gravado na imagem do filme exportado; SRT conserva texto e tempos. Alterações posteriores em áudio, ordem ou duração exigem reaplicar legendas. Narração e fala sobrepostas devem ser evitadas ou ajustadas no SRT.

A montagem mistura música de fundo a 25%, narração e fala por cena. Sem fala substituta, usa o áudio original decodificável do clipe. Marque **Usar áudio do clipe com lipsync** depois de importar um resultado sincronizado para evitar dobrar a voz. Falas maiores que a cena e narrações maiores que o filme são cortadas; o editor avisa.

**Personagem novo com lipsync:** cadastre uma imagem local PNG/JPEG/WebP de até 5 MB, associe o personagem à cena e gere sua fala. O botão de personagem falando usa Creatify Aurora pela API Image & Video da ElevenLabs, saída nativa 720p. O resultado substitui o clipe dessa cena e usa a duração recebida. O identificador é guardado na sessão para retomar o mesmo pedido sem gerar novamente. Recarregar o editor apaga todos os campos, inclusive o vínculo de retomada, conforme a preferência de projeto em branco.

**Vídeo pronto, inclusive Veo/Omni:** os modelos de edição de lipsync estão no painel ElevenLabs, mas não no contrato público da API consultada. O app oferece o caminho para esse painel. Baixe a fala e o vídeo, sincronize no painel e importe o resultado na cena. Esta etapa externa é manual; não há sincronização automática de vídeo existente dentro do app.

Os serviços usam créditos e permissões da conta ElevenLabs. Foram testados com respostas simuladas; nenhuma geração paga foi executada durante a implementação.

Referências: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps/ ; https://elevenlabs.io/docs/api-reference/voices/search ; https://elevenlabs.io/docs/api-reference/flows/video/create ; https://elevenlabs.io/docs/overview/capabilities/image-video
