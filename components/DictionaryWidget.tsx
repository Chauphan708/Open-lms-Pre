import React, { useState, useEffect } from 'react';
import { Search, Book, Volume2, X, Loader2 } from 'lucide-react';
import { lookupWord, lookupMultilingualWord, MinhqndLookupResponse } from '../services/externalApiService';
import { DictionaryEntry } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type DictMode = 'en-vi' | 'vi-en' | 'vi-vi' | 'en-en';

export const DictionaryWidget: React.FC<Props> = ({ isOpen, onClose }) => {
  const [word, setWord] = useState('');
  const [dictMode, setDictMode] = useState<DictMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dict_mode');
      if (saved) return saved as DictMode;
    }
    return 'en-vi';
  });
  const [result, setResult] = useState<DictionaryEntry | MinhqndLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save selected mode to local storage
  useEffect(() => {
    localStorage.setItem('dict_mode', dictMode);
  }, [dictMode]);

  // Reset result when changing dictionary modes
  useEffect(() => {
    setResult(null);
    setError('');
  }, [dictMode]);

  const handleSearch = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (dictMode === 'en-en') {
        const data = await lookupWord(word);
        if (data) {
          setResult(data);
        } else {
          setError('Không tìm thấy từ này.');
        }
      } else {
        const data = await lookupMultilingualWord(word);
        if (data && data.exists && data.results && data.results.length > 0) {
          setResult(data);
        } else {
          setError('Không tìm thấy từ này.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi tra cứu.');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (!word.trim()) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      const isEnglish = dictMode === 'en-vi' || dictMode === 'en-en';
      utterance.lang = isEnglish ? 'en-US' : 'vi-VN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const getFilteredMeanings = () => {
    if (!result || !('results' in result)) return [];
    const topResult = result.results[0];
    if (!topResult) return [];

    const targetLang = (dictMode === 'en-vi' || dictMode === 'vi-vi') ? 'vi' : 'en';
    return topResult.meanings.filter(m => m.definition_lang === targetLang);
  };

  if (!isOpen) return null;

  const isMinhqndResponse = result && 'results' in result;
  const filteredMinhqndMeanings = isMinhqndResponse ? getFilteredMeanings() : [];

  // Group Minhqnd meanings by Part of Speech (POS)
  const meaningsByPos: { [pos: string]: typeof filteredMinhqndMeanings } = {};
  if (isMinhqndResponse) {
    filteredMinhqndMeanings.forEach(m => {
      const posLabel = m.pos || 'Khác';
      if (!meaningsByPos[posLabel]) {
        meaningsByPos[posLabel] = [];
      }
      meaningsByPos[posLabel].push(m);
    });
  }

  // Get primary phonetic/pronunciation text
  const getPhoneticText = () => {
    if (!result) return '';
    if ('results' in result) {
      const topResult = result.results[0];
      if (!topResult) return '';
      // Find region appropriate pronunciation
      const isEnglish = dictMode === 'en-vi';
      const preferredRegion = isEnglish ? 'US' : 'Hà-Nội';
      const preferred = topResult.pronunciations.find(p => p.region === preferredRegion);
      return preferred?.ipa || topResult.pronunciations[0]?.ipa || '';
    } else {
      return result.phonetic || '';
    }
  };

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white rounded-xl shadow-2xl border border-indigo-100 z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in flex flex-col max-h-[460px]">
      {/* Header */}
      <div className="bg-indigo-600 p-3 flex justify-between items-center text-white flex-shrink-0">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Book className="h-4 w-4" /> Từ điển đa ngữ
        </h3>
        <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Dictionary Mode Tabs */}
      <div className="grid grid-cols-4 gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-150 text-[10px] font-bold flex-shrink-0">
        <button 
          onClick={() => setDictMode('en-vi')} 
          className={`py-1 rounded text-center transition-all ${dictMode === 'en-vi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          🇬🇧 Anh - Việt
        </button>
        <button 
          onClick={() => setDictMode('vi-en')} 
          className={`py-1 rounded text-center transition-all ${dictMode === 'vi-en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          🇻🇳 Việt - Anh
        </button>
        <button 
          onClick={() => setDictMode('vi-vi')} 
          className={`py-1 rounded text-center transition-all ${dictMode === 'vi-vi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          🇻🇳 Việt - Việt
        </button>
        <button 
          onClick={() => setDictMode('en-en')} 
          className={`py-1 rounded text-center transition-all ${dictMode === 'en-en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          🇬🇧 Anh - Anh
        </button>
      </div>

      {/* Search Container */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex gap-2">
          <input 
            value={word}
            onChange={e => setWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={
              dictMode === 'en-vi' || dictMode === 'en-en' 
                ? "Tra từ tiếng Anh..." 
                : "Tra từ tiếng Việt..."
            }
            className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-50 text-indigo-700 p-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Meanings Scroll Area */}
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
        {error && <p className="text-red-500 text-xs text-center font-medium my-4">{error}</p>}

        {result && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <h2 className="text-lg font-black text-gray-900 capitalize">{word}</h2>
                {getPhoneticText() && (
                  <p className="text-indigo-600 text-xs mt-0.5 font-mono">{getPhoneticText()}</p>
                )}
              </div>
              <button 
                onClick={playAudio} 
                className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-gray-50 transition-colors"
                title="Phát âm"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>

            {/* Meanings definition lists */}
            <div className="space-y-4">
              {/* Render Minhqnd results (Vietnamese/Multilingual) */}
              {isMinhqndResponse && (
                Object.keys(meaningsByPos).length > 0 ? (
                  Object.keys(meaningsByPos).map((pos, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{pos}</p>
                      <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1.5">
                        {meaningsByPos[pos].slice(0, 3).map((m, i) => (
                          <li key={i} className="leading-relaxed">
                            <span className="font-semibold text-gray-800">{m.definition}</span>
                            {m.example && (
                              <p className="text-[10px] text-gray-400 italic mt-0.5">Ví dụ: "{m.example}"</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-4">Không tìm thấy giải nghĩa tương thích với chế độ dịch này.</p>
                )
              )}

              {/* Render standard English Dictionary results (Anh - Anh) */}
              {!isMinhqndResponse && 'meanings' in result && (
                result.meanings.slice(0, 2).map((meaning: any, idx: number) => (
                  <div key={idx} className="space-y-1.5">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{meaning.partOfSpeech}</p>
                    <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1.5">
                      {meaning.definitions.slice(0, 2).map((def: any, i: number) => (
                        <li key={i} className="leading-relaxed">
                          <span className="font-medium text-gray-800">{def.definition}</span>
                          {def.example && (
                            <p className="text-[10px] text-gray-400 italic mt-0.5">Ex: "{def.example}"</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Attribution */}
      <div className="bg-gray-50 p-2 text-[9px] text-center text-gray-400 border-t flex-shrink-0">
        Nguồn: {dictMode === 'en-en' ? 'Free Dictionary API' : 'dict.minhqnd.com'}
      </div>
    </div>
  );
};
