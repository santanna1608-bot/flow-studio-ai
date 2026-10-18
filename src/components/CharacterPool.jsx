import React, { useState, useRef } from 'react';
import { Users, Upload, Plus, Trash2, CheckCircle2, ShieldCheck, Tag, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function CharacterPool({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onNotify
}) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingCharId, setEditingCharId] = useState(null);

  // Form states for new/edit
  const [formTag, setFormTag] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formOutfit, setFormOutfit] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');

  const fileInputRef = useRef(null);
  const activeCharUploadIdRef = useRef(null);

  const startAddNew = () => {
    setFormTag(`@Personagem_${characters.length + 1}`);
    setFormName('');
    setFormRole('Personagem Coadjuvante');
    setFormOutfit('Roupa padrão consistente, traços faciais definidos, iluminação 35mm');
    setFormAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80');
    setEditingCharId(null);
    setIsAddingNew(true);
  };

  const handleSaveNew = (e) => {
    e.preventDefault();
    if (!formTag.startsWith('@')) {
      onNotify('A tag do personagem deve começar com @ (ex: @Gabriel)', 'error');
      return;
    }

    const newChar = {
      id: `char-${Date.now()}`,
      tag: formTag.trim(),
      name: formName || formTag.replace('@', ''),
      role: formRole,
      outfitPrompt: formOutfit,
      avatarUrl: formAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      referenceStatus: 'Ativo (R2V Vinculado)',
      consistencyWeight: 0.90
    };

    onAddCharacter(newChar);
    setIsAddingNew(false);
    onNotify(`Personagem ${newChar.tag} adicionado ao pool com consistência R2V!`, 'success');
  };

  const handleFileUpload = (e, charId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Por favor envie um arquivo de imagem válido (.jpg, .png, .webp)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (charId) {
        onUpdateCharacter(charId, { avatarUrl: dataUrl, referenceStatus: 'Custom (R2V Uploaded)' });
        onNotify('Referência visual R2V atualizada com sucesso!', 'success');
      } else {
        setFormAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUploadForChar = (charId) => {
    activeCharUploadIdRef.current = charId;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-[#12151c] border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e, activeCharUploadIdRef.current)}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              2. Character Pool (Consistência Visual R2V)
            </h2>
            <p className="text-xs text-slate-400">
              Reference-to-Video: Mantenha rostos, roupas e traços idênticos em todas as cenas geradas
            </p>
          </div>
        </div>

        <button
          onClick={startAddNew}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
          <span>+ Novo Personagem</span>
        </button>
      </div>

      {/* Characters Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {characters.map((char) => (
          <div
            key={char.id}
            className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 group relative"
          >
            {/* Top row: Avatar & Basic Info */}
            <div className="flex items-start gap-3">
              {/* Reference Image with Overlay Hover */}
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-950 group/avatar">
                <img
                  src={char.avatarUrl}
                  alt={char.name}
                  className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                />
                {/* Upload Hover Button */}
                <button
                  onClick={() => triggerUploadForChar(char.id)}
                  title="Trocar imagem de referência R2V"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-[9px] text-white font-medium transition-opacity cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
                  Trocar
                </button>
              </div>

              {/* Tag and Role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 truncate">
                    {char.tag}
                  </span>
                  {characters.length > 1 && (
                    <button
                      onClick={() => onDeleteCharacter(char.id)}
                      title="Remover personagem"
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <h3 className="text-xs font-semibold text-white truncate">{char.name}</h3>
                <p className="text-[11px] text-slate-400 truncate">{char.role}</p>
              </div>
            </div>

            {/* Consistency Prompt Box */}
            <div className="mt-2.5 bg-slate-950/70 border border-slate-800/70 rounded-lg p-2 text-[11px] text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Prompt Fixo de Consistência R2V:
              </span>
              <p className="line-clamp-2 italic text-slate-300/90 text-[11px] leading-relaxed">
                "{char.outfitPrompt}"
              </p>
            </div>

            {/* Action Bottom Row: Upload Reference Button & Status */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
              <button
                onClick={() => triggerUploadForChar(char.id)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3 h-3 text-cyan-400" />
                <span>+ Upload Referência</span>
              </button>

              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">R2V Travado (92%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Character Modal / Inline Overlay */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Cadastrar Personagem com Consistência R2V
              </h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tag do Personagem (Use @ para invocar nas cenas)
                </label>
                <input
                  type="text"
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  placeholder="@Gabriel"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome Completo / Identificação
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Gabriel Silva"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Papel no Roteiro
                </label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="Protagonista / Agente Cibernético"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Prompt Fixo de Consistência (Vestimenta, Cabelo, Idade, Traços)
                </label>
                <textarea
                  value={formOutfit}
                  onChange={(e) => setFormOutfit(e.target.value)}
                  rows={3}
                  placeholder="Jaqueta de couro preta surrada, cabelo curto escuro, olhar firme, iluminação dramática 35mm..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Imagem de Referência (URL ou Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formAvatarUrl}
                    onChange={(e) => setFormAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400 text-xs"
                  />
                  <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 cursor-pointer flex items-center gap-1 font-medium shrink-0">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, null)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Personagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
