# Campus Marketplace — Customer Support Chatbot Feature

> **Branch:** `customer_support-chatbot`  
> **Team:** Group 5  
> **Framework:** Expo SDK 57 (React Native / TypeScript / Firebase)

An interactive campus marketplace application designed for university students to buy, sell, rent, and borrow items with a built-in instant **Customer Support Chatbot**.

---

## 🌟 Feature Spotlight: Customer Support Chatbot

To ensure students can easily navigate the marketplace, search for items, and learn how to list or rent products, this branch introduces an integrated, rule-based **Customer Support Chatbot**.

### Key Capabilities

- **⚡ Instant, Deterministic Responses:** Operates on an intelligent FAQ rule-engine with keyword & intent matching for 100% reliable, instant responses.
- **🔑 Zero External API Key Dependency:** Completely free, offline-ready, and requires no paid third-party AI keys (OpenAI / Gemini / Anthropic).
- **💬 Clean Chat Interface:**
  - Distinct message bubbles (left-aligned assistant bubbles in soft mint, right-aligned student bubbles in brand dark green).
  - Timestamps, sender labels, and typing indicator simulation.
- **💡 Welcome Message & Quick-Reply Chips:**
  - Displays interactive suggestion chips on start:
    - *"🔍 How do I search for items?"*
    - *"🏷️ How do I sell an item?"*
    - *"🤝 How does Rent & Borrow work?"*
    - *"📦 Browse Categories"*
    - *"🔒 Campus Safety & Rules"*
- **📊 Real Marketplace Data Integration:** References real active categories and listings dynamically from the app data.
- **🛡️ Isolated & Safe:** Does not modify or disrupt existing peer-to-peer buyer-seller messaging (`MessagesPage.tsx`).

---

## 🏗 Modular Architecture

The chatbot feature is built as an independent modular package (`src/features/support-chatbot/`):

```text
src/
├── features/
│   └── support-chatbot/
│       ├── components/
│       │   ├── SupportChatButton.tsx   # Floating pill button (🤖 Need Help? Chat with Bot ›)
│       │   ├── SupportChatModal.tsx    # Slide-up modal container
│       │   └── SupportChatScreen.tsx   # Full chat UI with message list, quick replies, & input
│       ├── knowledgeBase.ts            # Intent matcher, FAQ knowledge base, and automated answers
│       ├── types.ts                    # TypeScript types (ChatMessage, QuickReplyOption)
│       ├── index.ts                    # Public barrel export
│       └── README.md                   # Feature documentation
├── App.tsx                             # Global launcher button & modal state management
