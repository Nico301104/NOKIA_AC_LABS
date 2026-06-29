import api from "../../services/api.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { useState, useEffect, useRef } from 'react';
import type { Message } from '../../types/Message';
import { formatTime, formatDate, isSameDay, getGreeting } from '../../components/AiChat/utils.ts';
import { ChatInput } from '../../components/AiChat/ChatInput/ChatInput';
import { ChatGuideModal } from '../../components/AiChat/ChatGuideModal/ChatGuideModal';
import './Chat.css';
import Footer from '../../components/footer/Footer.tsx';

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeMessage: Message = {
      role: 'ai',
      text: `${getGreeting()}! Sunt asistentul de ticketing Nokia. Cu ce vă pot ajuta?`,
      timestamp: new Date(),
      isWelcome: true,
    };

    const loadHistory = async () => {
      try {
        const response = await api.get(`${API_BASE_URL}/history/1`);
        const history = response.data.map((msg: { role: string, text: string, timestamp: string }) => ({
          role: msg.role === 'user' ? 'user' : 'ai',
          text: msg.text,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
        setMessages(history.length > 0 ? [...history, welcomeMessage] : [welcomeMessage]);
      } catch (error) {
        console.error("Nu s-a putut încărca istoricul:", error);
        setMessages([welcomeMessage]);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const el = chatWindowRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      setShowScrollBtn(!isNearBottom);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (text.trim() === "" || isLoading) return;

    const userMessage: Message = { role: "user", text, timestamp: new Date() };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await api.post(`${API_BASE_URL}/chat`, {
        message: text,
        conversation_id: 1,
        user_id: 1,
        ticket_id: "INC0001"
      });
      const aiMessage: Message = {
        role: "ai",
        text: response.data.natural_response,
        timestamp: new Date(),
      };
      setMessages([...newHistory, aiMessage]);
    } catch (error) {
      console.error("Eroare:", error);
      const errorMessage: Message = {
        role: "error",
        text: "Eroare: Nu m-am putut conecta la server.",
        timestamp: new Date(),
      };
      setMessages([...newHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({ top: chatWindowRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <>
    <div className="chat-container">
      <header className="chat-header">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/ca/Nokia_2023.svg"
          alt="Nokia Logo"
          style={{ height: '30px', width: 'auto' }}
        />
        <h2>Asistent Ticketing Nokia</h2>
        <button className="guide-btn" onClick={() => setShowGuide(true)}>?</button>
      </header>

      <div className="chat-messages-wrapper">
        <div ref={chatWindowRef} className="chat-window">
          {messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const showDateSeparator = !msg.isWelcome && (!prevMsg || !isSameDay(prevMsg.timestamp, msg.timestamp));

            return (
              <div key={index} className="chat-message">
                {showDateSeparator && (
                  <div className="date-separator">
                    <span className="date-text">{formatDate(msg.timestamp)}</span>
                  </div>
                )}

                <div className={`msg-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div className={`msg-bubble ${msg.role}`}>
                    {msg.text}
                  </div>
                  {!msg.isWelcome && (
                    <span className="msg-time">{formatTime(msg.timestamp)}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ minHeight: '20px', flexShrink: 0 }} />
        </div>

        {showScrollBtn && (
          <button className="scroll-to-bottom-btn" onClick={scrollToBottom}>↓</button>
        )}
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner" />
          SE PROCESEAZĂ...
        </div>
      )}

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />

      {showGuide && <ChatGuideModal onClose={() => setShowGuide(false)} />}
    </div>

      <Footer />

    </>

  );
}