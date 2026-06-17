import { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

const SUGGESTIONS = [
  "Care sunt ultimele 5 tichete deschise?",
  "Cate tickete sunt cu prioritate Critical?",
  "Care este echipa cu cele mai multe tichete?",
  "Cate tickete nu sunt rezolvate?",
  "Cate tichete a rezolvat fiecare echipa?",
];

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputText, setInputText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowSuggestions(false);
    onSendMessage(suggestion);
  };

  return (
    <div className="chat-input-area">
      <input
        type="text"
        className="chat-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' ? handleSend() : null}
        placeholder="Întreabă despre tichete..."
      />

      <div ref={suggestionsRef} className="suggestions-wrapper">
        <button
          className={`suggestions-btn ${showSuggestions ? 'active' : ''}`}
          onClick={() => setShowSuggestions(!showSuggestions)}
          title="Sugestii"
        >
          ✦
        </button>

        {showSuggestions && (
          <div className="suggestions-popover">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="chat-send-btn" onClick={handleSend} disabled={isLoading}>
        TRIMITE
      </button>
    </div>
  );
}