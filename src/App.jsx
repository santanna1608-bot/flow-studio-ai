import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SpeechCaptionStudio from './components/SpeechCaptionStudio';
import Navbar from './components/Navbar';
import PresetAndFormatSelector from './components/PresetAndFormatSelector';
import CharacterPool from './components/CharacterPool';
import AudioMasterSection from './components/AudioMasterSection';
import ScriptBreakdownEditor from './components/ScriptBreakdownEditor';
import GenerationPanel from './components/GenerationPanel';
import MasterPlayer from './components/MasterPlayer';
import MasterExportModal from './components/MasterExportModal';
import ToastNotification from './components/ToastNotification';

import { VIDEO_PRESETS } from './data/initialData';

import { prepareAudioBuffer } from './utils/audioEngine';
import { masterAudioEngine } from './utils/audioEngine';

export default function App() {
  // Project settings state
  const [projectName, setProjectName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [isFreeform, setIsFreeform] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('16:9'); // "16:9" or "9:16"

  const [videoProvider, setVideoProvider] = useState('omni');

  // Characters state (R2V Pool)
  const [characters, setCharacters] = useState([]);

  // Audio state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [narration, setNarration] = useState({});
  const [captions, setCaptions] = useState({ style: '', cues: [] });
  const [isSpeechBusy, setIsSpeechBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Script & Scenes state
  const [scriptText, setScriptText] = useState('');
  const [scenes, setScenes] = useState([]);

  // Generation state
  const [isRendering, setIsRendering] = useState(false);

  // Modals & UI state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [isExporting, setIsExporting] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const playbackPending = useRef(false);
  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const preset = VIDEO_PRESETS.find(p => p.id === selectedPresetId);
  const filmTrack = useMemo(() => ({ kind: 'film', scenes, narration, music: currentTrack, name: 'Música + narração + falas dos clipes' }), [scenes, narration, currentTrack]);
  useEffect(() => {
    masterAudioEngine.loadTrack(filmTrack);
    // Synchronize the controls with the external audio engine after rebuilding its mix.
    // eslint-disable-next-line react/set-state-in-effect
    setIsPlaying(false); setCurrentTime(0);
    return () => masterAudioEngine.pause();
  }, [filmTrack]);

  // Audio Playback Sync Loop
  useEffect(() => {
    let animId;

    const syncTime = () => {
      if (isPlaying) {
        const cur = masterAudioEngine.getCurrentTime();
        setCurrentTime(cur);
      }
      animId = requestAnimationFrame(syncTime);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(syncTime);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  // Toast Notification System
  const notify = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Audio Play/Pause Toggle
  const handleTogglePlay = useCallback(async () => {
    if (playbackPending.current || !totalDuration || isExporting || isSpeechBusy) return;
    if (masterAudioEngine.playing) {
      masterAudioEngine.pause(); setIsPlaying(false);
    } else {
      playbackPending.current = true;
      try {
        if (masterAudioEngine.getCurrentTime() >= totalDuration) await masterAudioEngine.seek(0);
        const started = await masterAudioEngine.play();
        setIsPlaying(started && masterAudioEngine.playing);
      } catch (error) { notify('Não foi possível reproduzir o áudio: ' + error.message, 'error'); }
      finally { playbackPending.current = false; }
    }
  }, [totalDuration, isExporting, isSpeechBusy, notify]);
  const handleSeek = useCallback((time) => {
    const target = Math.max(0, Math.min(totalDuration, time));
    setCurrentTime(target);
    masterAudioEngine.seek(target).catch(error => { setIsPlaying(false); notify(error.message, 'error'); });
  }, [totalDuration, notify]);
  const openExport = () => { if (isRendering || isBreakingDown || isSpeechBusy) { notify('Aguarde a operação atual terminar.', 'info'); return; } masterAudioEngine.pause(); setIsPlaying(false); setIsExportModalOpen(true); };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Character Pool Actions
  const handleAddCharacter = (newChar) => {
    setCharacters(prev => [...prev, newChar]);
  };

  const handleUpdateCharacter = (charId, updates) => {
    const tag = characters.find(c => c.id === charId)?.tag;
    setScenes(prev => prev.map(s => s.characterTag === tag ? { ...s, operationName: null, needsRegeneration: !!s.generatedVideoUrl } : s));
    setCharacters(prev =>
      prev.map(c => (c.id === charId ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCharacter = (charId) => {
    setCharacters(prev => prev.filter(c => c.id !== charId));
    setScenes(prev => prev.map(s => s.characterTag === characters.find(c => c.id === charId)?.tag ? { ...s, characterTag: '', operationName: null, needsRegeneration: !!s.generatedVideoUrl } : s));
    notify('Personagem removido do pool.', 'info');
  };

  // Audio Master Actions
  const handleSelectTrack = (track) => {
    masterAudioEngine.loadTrack(track);
    setCurrentTrack(track);
    if (isPlaying) {
      masterAudioEngine.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
  };

  const handleUploadCustomTrack = async (track) => {
    try {
      masterAudioEngine.init();
      const buffer = await prepareAudioBuffer(masterAudioEngine.ctx, track);
      track = { ...track, duration: buffer.duration };
    } catch { notify('Arquivo de áudio inválido ou formato não suportado.', 'error'); return; }
    masterAudioEngine.loadTrack(track);
    setCurrentTrack(track);
    if (isPlaying) {
      masterAudioEngine.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
    notify('Trilha de áudio carregada e validada.', 'success');
  };

  // A new session always begins with empty user fields.
  const handleResetProject = () => {
    if (!window.confirm('Limpar os campos e começar um projeto em branco?')) return;
    masterAudioEngine.pause();
    masterAudioEngine.loadTrack(null);
    setIsPlaying(false); setCurrentTime(0);
    setProjectName(''); setSelectedPresetId(''); setIsFreeform(true);
    setScriptText(''); setScenes([]); setCharacters([]); setCurrentTrack(null);
    setNarration({}); setCaptions({ style: '', cues: [] });
    setIsExportModalOpen(false);
    notify('Campos limpos. Preencha seus próprios prompts.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* 1. Master Navbar */}
      <Navbar
        projectName={projectName}
        setProjectName={setProjectName}
        totalScenes={scenes.length}
        totalDuration={totalDuration}
        aspectRatio={aspectRatio}
        isRendering={isRendering || isExporting || isBreakingDown || isSpeechBusy}
        onOpenExport={openExport}
        onReset={handleResetProject}
      />

      {/* Main Studio Modular Layout */}
      <p role="status" className="text-center text-xs text-slate-400 pt-3">Ao abrir ou recarregar a página, o editor começa vazio.</p>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Module 1: Project & Config (Presets & Formats) */}
        <fieldset disabled={isRendering || isExporting || isBreakingDown || isSpeechBusy} id="module-presets">
          <PresetAndFormatSelector
            selectedPresetId={selectedPresetId}
            onSelectPreset={id => { setSelectedPresetId(id); setScenes(prev => prev.map(s => ({ ...s, operationName: null, needsRegeneration: !!s.generatedVideoUrl }))); }}
            isFreeform={isFreeform}
            onToggleFreeform={value => { setIsFreeform(value); setScenes(prev => prev.map(s => ({ ...s, operationName: null, needsRegeneration: !!s.generatedVideoUrl }))); }}
            aspectRatio={aspectRatio}
            onChangeAspectRatio={(ratio) => {
              setAspectRatio(ratio);
              setScenes(prev => prev.map(s => ({ ...s, operationName: null, needsRegeneration: !!s.generatedVideoUrl })));
              notify(`Formato alterado para ${ratio} (${ratio === '16:9' ? 'Horizontal Widescreen' : 'Vertical Reels'})`, 'info');
            }}
          />
        </fieldset>

        {/* Module 2 & 3: Character Pool (R2V) + Audio Master (2-Column Grid) */}
        <fieldset disabled={isRendering || isExporting || isBreakingDown || isSpeechBusy} className="grid grid-cols-1 gap-6">
          {/* Module 2: Character Pool (Reference-to-Video) */}
          <CharacterPool
            characters={characters}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onNotify={notify}
          />

          {/* Module 3: Audio & Music Master */}
          <AudioMasterSection
            currentTrack={currentTrack}
            onSelectTrack={handleSelectTrack}
            onUploadCustomTrack={handleUploadCustomTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            currentTime={currentTime}
            duration={totalDuration}
            onSeek={handleSeek}
            onNotify={notify}
          />
        </fieldset>

        {/* Module 4: Script Editor & Breakdown Script */}
        <fieldset disabled={isRendering || isExporting || isBreakingDown || isSpeechBusy} id="module-script">
          <ScriptBreakdownEditor
            scriptText={scriptText}
            setScriptText={setScriptText}
            onProcessingChange={setIsBreakingDown}
            scenes={scenes}
            onUpdateScenes={setScenes}
            characters={characters}
            onNotify={notify}
          />
        </fieldset>

        {/* Module 5: Generation Panel & AI Render */}
        <section id="module-generation">
          <GenerationPanel
            scenes={scenes}
            onUpdateScenes={setScenes}
            isRendering={isRendering}
            setIsRendering={setIsRendering}
            aspectRatio={aspectRatio}
            provider={videoProvider}
            onChangeProvider={setVideoProvider}
            preset={isFreeform ? null : preset}
            characters={characters}
            disabled={isExporting || isBreakingDown || isSpeechBusy}
            onNotify={notify}
          />
        </section>

        <SpeechCaptionStudio scenes={scenes} onUpdateScenes={setScenes} characters={characters}
          narration={narration} onNarration={setNarration} captions={captions} onCaptions={setCaptions}
          disabled={isRendering || isExporting || isBreakingDown} onBusy={value => { setIsSpeechBusy(value); if (value) { masterAudioEngine.pause(); setIsPlaying(false); } }} onNotify={notify} />

        {/* Module 6: Master Player & Assembly Room */}
        <section id="module-player">
          <MasterPlayer
            scenes={scenes}
            aspectRatio={aspectRatio}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            currentTime={currentTime}
            onSeek={handleSeek}
            currentTrack={currentTrack}
            characters={characters}
            accent={isFreeform ? undefined : preset?.accent}
            captions={captions}
            suspended={isExporting}
            onNotify={notify}
            onOpenExport={openExport}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-[#0d0f14] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 justify-center">
            <span>🎬</span>
            <strong className="text-slate-300">FLOW STUDIO AI</strong> — Estúdio de roteiro, geração Veo e Omni Flash e montagem de vídeos
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Google Veo + Omni Flash via Gemini API</span>
            <span>•</span>
            <span>Montagem local em Full HD</span>
            <span>•</span>
            <span>Vozes ElevenLabs e legendas</span>
          </div>
        </div>
      </footer>

      {/* Export Master Film Modal */}
      <MasterExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onBusy={setIsExporting}
        characters={characters}
        accent={isFreeform ? undefined : preset?.accent}
        projectName={projectName}
        scenes={scenes}
        aspectRatio={aspectRatio}
        currentTrack={currentTrack}
        filmTrack={filmTrack}
        captions={captions}
        onNotify={notify}
      />

      {/* Toast Notification Container */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
