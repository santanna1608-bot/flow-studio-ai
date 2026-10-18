import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PresetAndFormatSelector from './components/PresetAndFormatSelector';
import CharacterPool from './components/CharacterPool';
import AudioMasterSection from './components/AudioMasterSection';
import ScriptBreakdownEditor from './components/ScriptBreakdownEditor';
import GenerationPanel from './components/GenerationPanel';
import MasterPlayer from './components/MasterPlayer';
import MasterExportModal from './components/MasterExportModal';
import ToastNotification from './components/ToastNotification';

import {
  VIDEO_PRESETS,
  INITIAL_CHARACTERS,
  SAMPLE_AUDIO_TRACKS,
  SAMPLE_SCRIPTS,
  INITIAL_SCENES
} from './data/initialData';

import { masterAudioEngine } from './utils/audioEngine';

export default function App() {
  // Project settings state
  const [projectName, setProjectName] = useState('Cyberpunk Odyssey - A Fuga');
  const [selectedPresetId, setSelectedPresetId] = useState('midnight-neon');
  const [isFreeform, setIsFreeform] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9'); // "16:9" or "9:16"

  // Characters state (R2V Pool)
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);

  // Audio state
  const [currentTrack, setCurrentTrack] = useState(SAMPLE_AUDIO_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Script & Scenes state
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPTS[0].text);
  const [scenes, setScenes] = useState(INITIAL_SCENES);

  // Generation state
  const [isRendering, setIsRendering] = useState(false);

  // Modals & UI state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

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

  // Audio Play/Pause Toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      masterAudioEngine.pause();
      setIsPlaying(false);
    } else {
      masterAudioEngine.play(currentTrack?.bpm || 128);
      setIsPlaying(true);
    }
  };

  const handleSeek = (time) => {
    setCurrentTime(time);
    masterAudioEngine.seek(time);
  };

  // Toast Notification System
  const notify = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Character Pool Actions
  const handleAddCharacter = (newChar) => {
    setCharacters(prev => [...prev, newChar]);
  };

  const handleUpdateCharacter = (charId, updates) => {
    setCharacters(prev =>
      prev.map(c => (c.id === charId ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCharacter = (charId) => {
    setCharacters(prev => prev.filter(c => c.id !== charId));
    notify('Personagem removido do pool.', 'info');
  };

  // Audio Master Actions
  const handleSelectTrack = (track) => {
    setCurrentTrack(track);
    if (isPlaying) {
      masterAudioEngine.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
  };

  const handleUploadCustomTrack = (track) => {
    setCurrentTrack(track);
    if (isPlaying) {
      masterAudioEngine.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
  };

  // Reset to empty clean state
  const handleResetProject = () => {
    if (window.confirm('Deseja iniciar um novo projeto do zero?')) {
      setProjectName('Novo Filme IA');
      setSelectedPresetId('cinematic-drama');
      setIsFreeform(false);
      setScriptText('');
      setScenes([
        {
          id: `scene-${Date.now()}`,
          shotNumber: 1,
          title: 'Primeira Tomada',
          characterTag: characters[0]?.tag || '@Gabriel',
          cameraMovement: 'Slow Dolly In, 35mm Anamorphic, Low Angle',
          prompt: 'Abertura cinematográfica em plano detalhe com iluminação suave...',
          duration: 5,
          status: 'idle',
          progress: 0,
          thumbnailColor: 'from-amber-950 via-zinc-900 to-slate-900',
          visualStyleTag: 'Tomada #1'
        }
      ]);
      if (isPlaying) {
        masterAudioEngine.pause();
        setIsPlaying(false);
      }
      setCurrentTime(0);
      notify('Novo projeto em branco criado!', 'info');
    }
  };

  // Load Full Demo
  const handleLoadDemo = () => {
    setProjectName('Cyberpunk Odyssey - A Fuga');
    setSelectedPresetId('midnight-neon');
    setIsFreeform(false);
    setCharacters(INITIAL_CHARACTERS);
    setCurrentTrack(SAMPLE_AUDIO_TRACKS[0]);
    setScriptText(SAMPLE_SCRIPTS[0].text);
    setScenes(INITIAL_SCENES);
    notify('Projeto demo completo recarregado!', 'success');
  };

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* 1. Master Navbar */}
      <Navbar
        projectName={projectName}
        setProjectName={setProjectName}
        totalScenes={scenes.length}
        totalDuration={totalDuration}
        aspectRatio={aspectRatio}
        isRendering={isRendering}
        onOpenExport={() => setIsExportModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        onReset={handleResetProject}
      />

      {/* Main Studio Modular Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Module 1: Project & Config (Presets & Formats) */}
        <section id="module-presets">
          <PresetAndFormatSelector
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
            isFreeform={isFreeform}
            onToggleFreeform={setIsFreeform}
            aspectRatio={aspectRatio}
            onChangeAspectRatio={(ratio) => {
              setAspectRatio(ratio);
              notify(`Formato alterado para ${ratio} (${ratio === '16:9' ? 'Horizontal Widescreen' : 'Vertical Reels'})`, 'info');
            }}
          />
        </section>

        {/* Module 2 & 3: Character Pool (R2V) + Audio Master (2-Column Grid) */}
        <section className="grid grid-cols-1 gap-6">
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
        </section>

        {/* Module 4: Script Editor & Breakdown Script */}
        <section id="module-script">
          <ScriptBreakdownEditor
            scriptText={scriptText}
            setScriptText={setScriptText}
            scenes={scenes}
            onUpdateScenes={setScenes}
            characters={characters}
            onNotify={notify}
          />
        </section>

        {/* Module 5: Generation Panel & AI Render */}
        <section id="module-generation">
          <GenerationPanel
            scenes={scenes}
            onUpdateScenes={setScenes}
            isRendering={isRendering}
            setIsRendering={setIsRendering}
            onNotify={notify}
          />
        </section>

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
            onOpenExport={() => setIsExportModalOpen(true)}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-[#0d0f14] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 justify-center">
            <span>🎬</span>
            <strong className="text-slate-300">FLOW STUDIO AI</strong> — Estúdio de Alta Performance para Produção de Vídeos com IA
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>R2V Engine v3.2</span>
            <span>•</span>
            <span>Omni Flash Neural Diffusion</span>
            <span>•</span>
            <span>Audio AAC Muxer 48kHz</span>
          </div>
        </div>
      </footer>

      {/* Export Master Film Modal */}
      <MasterExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        scenes={scenes}
        aspectRatio={aspectRatio}
        currentTrack={currentTrack}
        onNotify={notify}
      />

      {/* Toast Notification Container */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
