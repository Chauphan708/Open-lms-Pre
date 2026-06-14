import React, { useState } from 'react';
import { Search, Book, Volume2, X, Loader2 } from 'lucide-react';
import { lookupWord } from '../services/externalApiService';
import { DictionaryEntry } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DictionaryWidget: React.FC<Props> = ({ isOpen, onClose }) => {
  const [word, setWord] = useState('');
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    const data = await lookupWord(word);
    if (data) {
      setResult(data);
    } else {
      setError('Không tìm thấy từ này.');
    }
    setLoading(false);
  };

  const playAudio = () => {
      // Basic Text-to-Speech fallback since API audio varies
      if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(result?.word || '');
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white rounded-xl shadow-2xl border border-indigo-100 z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
      {/* Header */}
      <div className="bg-indigo-600 p-3 flex justify-between items-center text-white">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Book className="h-4 w-4" /> Từ điển (Anh-Anh)
        </h3>
        <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="flex gap-2 mb-4">
          <input 
            value={word}
            onChange={e => setWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Tra từ..."
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {result && (
          <div className="space-y-3">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">{result.word}</h2>
                <p className="text-indigo-600 text-sm">{result.phonetic}</p>
              </div>
              <button onClick={playAudio} className="text-gray-500 hover:text-indigo-600 p-1">
                <Volume2 className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {result.meanings.slice(0, 2).map((meaning, idx) => (
                <div key={idx}>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">{meaning.partOfSpeech}</p>
                  <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                    {meaning.definitions.slice(0, 2).map((def, i) => (
                      <li key={i}>
                        {def.definition}
                        {def.example && <p className="text-xs text-gray-400 italic mt-0.5">"{def.example}"</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="bg-gray-50 p-2 text-[10px] text-center text-gray-400">
        Powered by Free Dictionary API
      </div>
    </div>
  );
};
