import React, { useState, useEffect, useRef } from 'react';
import { chatbotAPI, getPropertyImageUrl } from './api';
import AIExpressInterestModal from './AIExpressInterestModal';
import './ChatBotWidget.css';

export default function ChatBotWidget({ user, onNavigateProperty }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPropForAiInterest, setSelectedPropForAiInterest] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "👋 **Hello and Namaskaram!** I am **QuestBot**, your intelligent assistant for HomeQuest AI.\n\nI can help you find properties across Kerala, explain our **Kerala ML Highway Price Advisor**, or guide you on how to list properties as an owner.",
      properties: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "🔍 Find 3BHK villas in Kakkanad under 80 Lakhs",
    "🛣️ How does the NH 66 ML price boost work?",
    "🏡 How do I list my property as an owner?",
    "📍 How do I search properties near me?",
    "🔑 How do I reset my password?",
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      // Build history for RAG context
      const history = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await chatbotAPI.sendMessage(text, history);

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.reply || "I've analyzed the request for you.",
        properties: res.suggested_properties || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "⚠️ Sorry, I encountered an issue processing your query. Please try again or check your connection.",
        properties: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Instant 1-Click Auto-Send: Finds who is sending, creates explanation, and dispatches to seller
  const handleInstantAutoSend = async (property) => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const activeUser = user || storedUser;

    const senderName = activeUser?.first_name
      ? `${activeUser.first_name} ${activeUser.last_name || ''}`.trim()
      : activeUser?.username || 'Verified HomeQuest Buyer';
    const senderEmail = activeUser?.email || 'buyer@homequest.ai';
    const senderPhone = activeUser?.phone_number || '';

    setLoading(true);
    try {
      const res = await chatbotAPI.autoSendInquiry({
        property_id: property.id,
        user_request: "I am actively looking to buy this property with organized financing and would like to schedule an inspection.",
        buyer_name: senderName,
        buyer_email: senderEmail,
        buyer_phone: senderPhone,
        intent_tone: 'ready_to_buy',
      });

      const confirmMsg = {
        id: Date.now(),
        sender: 'bot',
        text: `✅ **Inquiry Automatically Sent to Owner!**\n\n👤 **Sender Identified:** ${senderName} (${senderEmail}${senderPhone ? ` • ${senderPhone}` : ''})\n🏡 **Target Listing:** **${property.title}** (${property.formatted_price})\n👤 **Delivered to Seller:** **${res.property?.owner_name || property.seller_name || 'Property Owner'}**\n\n📝 **AI-Generated Explanation Sent:**\n> "${res.ai_explanation}"\n\n*The owner has received this in their dashboard inbox and will get in touch with you directly!*`,
        properties: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, confirmMsg]);
    } catch (err) {
      console.error(err);
      const errMsg = {
        id: Date.now(),
        sender: 'bot',
        text: `⚠️ Could not automatically send inquiry: ${err.response?.data?.error || err.message}. Please try again.`,
        properties: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render bold & linebreaks in message text
  const renderFormattedText = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Replace **text** with <strong>text</strong>
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="msg-line">
          {parts.map((p, i) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={i}>{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </span>
      );
    });
  };

  return (
    <div className="chatbot-root">
      {/* 1. Floating Action Button */}
      {!isOpen && (
        <button
          className="chatbot-trigger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
        >
          <span className="trigger-icon">🤖</span>
          <span className="trigger-label">QuestBot AI</span>
          <span className="trigger-pulse"></span>
        </button>
      )}

      {/* 2. Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="header-bot-info">
              <div className="avatar-wrapper">
                <span className="avatar-icon">🤖</span>
                <span className="online-indicator"></span>
              </div>
              <div>
                <h4 className="bot-name">QuestBot AI</h4>
                <span className="bot-tagline">HomeQuest Real Estate Assistant</span>
              </div>
            </div>
            <button
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Quick Suggestions Strip */}
          <div className="chatbot-suggestions-bar">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                className="suggestion-chip"
                onClick={() => handleSendMessage(sug)}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="chatbot-messages-body">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble-row ${m.sender === 'user' ? 'row-user' : 'row-bot'}`}
              >
                {m.sender === 'bot' && <div className="mini-bot-avatar">🤖</div>}
                <div className={`chat-bubble ${m.sender}`}>
                  <div className="bubble-text">{renderFormattedText(m.text)}</div>

                  {/* Render Property Cards embedded in bot response */}
                  {m.properties && m.properties.length > 0 && (
                    <div className="chat-properties-grid">
                      {m.properties.map((p) => (
                        <div key={p.id} className="chat-prop-card">
                          <img
                            src={getPropertyImageUrl(p)}
                            alt={p.title}
                            className="chat-prop-thumb"
                          />
                          <div className="chat-prop-details">
                            <span className="chat-prop-title">{p.title}</span>
                            <span className="chat-prop-loc">📍 {p.city}</span>
                            <div className="chat-prop-meta">
                              <span className="chat-prop-price">{p.formatted_price}</span>
                              <span className="chat-prop-type">{p.property_type}</span>
                            </div>
                            <div className="chat-prop-card-actions">
                              <button
                                type="button"
                                className="chat-btn-ai-auto"
                                onClick={() => handleInstantAutoSend(p)}
                                title="Auto-detect credentials, generate explanation & send to owner"
                              >
                                ⚡ 1-Click Send
                              </button>
                              <button
                                type="button"
                                className="chat-btn-ai-interest"
                                onClick={() => setSelectedPropForAiInterest(p)}
                                title="Review AI explanation & custom requirement"
                              >
                                🔍 Review
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="bubble-time">{m.timestamp}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-row row-bot">
                <div className="mini-bot-avatar">🤖</div>
                <div className="chat-bubble bot typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="chatbot-footer">
            <input
              type="text"
              className="chat-input-field"
              placeholder="Ask QuestBot (e.g. 3BHK in Kochi or how to list)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* AI Express Interest Modal from Chatbot */}
      {selectedPropForAiInterest && (
        <AIExpressInterestModal
          property={selectedPropForAiInterest}
          user={user}
          onClose={() => setSelectedPropForAiInterest(null)}
          onSuccess={(prop) => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                sender: 'bot',
                text: `🎉 **Purchase Inquiry Delivered!** I have forwarded your personalized inquiry for **${prop.title}** directly to the property seller (${prop.seller_name || 'Owner'}). They will reach out to you shortly via phone or email!`,
                properties: [],
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }}
        />
      )}
    </div>
  );
}
