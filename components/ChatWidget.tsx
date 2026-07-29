"use client";

import { useRef, useState, useEffect, FormEvent } from "react";
import { Card, Button, ScrollShadow, Avatar } from "@heroui/react";
import { useChatWidget } from "../hooks/useChatWidget";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessages } from "./chat/ChatMessages";
import { ChatComposer } from "./chat/ChatComposer";

export default function ChatWidget() {
  const {
    isOpen,
    setIsOpen,
    sessionId,
    input,
    setInput,
    messages,
    error,
    isReady,
    isProcessing,
    handleSubmit,
    sendText,
    isUploading,
  } = useChatWidget();

  const [mounted, setMounted] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("How can I help? 👋");
  const hasAutoOpenedRef = useRef(false);
  const introTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const bubbleHideTimerRef = useRef<number | null>(null);
  const bubbleMessages = [
    "How can I help? 👋",
    "Need support with ABA therapy?",
    "Ask me anything about services.",
    "I’m here when you need me.",
  ];

  const pickRandomBubbleMessage = () => {
    const randomIndex = Math.floor(Math.random() * bubbleMessages.length);
    return bubbleMessages[randomIndex];
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsEmbedded(window.self !== window.top);
      setBubbleText("How can I help? 👋");
      setShowBubble(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (introTimerRef.current) {
        window.clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }

      if (bubbleTimerRef.current) {
        window.clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = null;
      }

      if (bubbleHideTimerRef.current) {
        window.clearTimeout(bubbleHideTimerRef.current);
        bubbleHideTimerRef.current = null;
      }

      setShowBubble(false);
      return;
    }

    if (introTimerRef.current) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }

    if (bubbleTimerRef.current) {
      window.clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = null;
    }

    if (bubbleHideTimerRef.current) {
      window.clearTimeout(bubbleHideTimerRef.current);
      bubbleHideTimerRef.current = null;
    }

    setShowBubble(true);
    setBubbleText(pickRandomBubbleMessage());

    const hideDelay = 3000 + Math.floor(Math.random() * 2000);
    bubbleHideTimerRef.current = window.setTimeout(() => {
      setShowBubble(false);
    }, hideDelay);

    const scheduleNextBubble = () => {
      const delay = 30000 + Math.floor(Math.random() * 30000);
      bubbleTimerRef.current = window.setTimeout(() => {
        setBubbleText(pickRandomBubbleMessage());
        setShowBubble(true);

        if (bubbleHideTimerRef.current) {
          window.clearTimeout(bubbleHideTimerRef.current);
          bubbleHideTimerRef.current = null;
        }

        const nextHideDelay = 3000 + Math.floor(Math.random() * 2000);
        bubbleHideTimerRef.current = window.setTimeout(() => {
          setShowBubble(false);
        }, nextHideDelay);

        scheduleNextBubble();
      }, delay);
    };

    scheduleNextBubble();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (introTimerRef.current) {
        window.clearTimeout(introTimerRef.current);
      }
      if (bubbleTimerRef.current) {
        window.clearTimeout(bubbleTimerRef.current);
      }
      if (bubbleHideTimerRef.current) {
        window.clearTimeout(bubbleHideTimerRef.current);
      }
    };
  }, []);

  const [image, setImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const avatarSrc = "/portrait.png";
  const quickPrompts = ["Yes", "No", "Español"];

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing]);

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  // Communicate widget state (open/close and message state) to the parent window (e.g. WordPress host)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMessageEmpty = messages.length === 0;
    const payload = {
      type: "ellie-chat-widget",
      isOpen,
      isMessageEmpty,
      showBubble,
    };
    window.parent.postMessage(payload, "*");
  }, [isOpen, messages.length, showBubble]);

  // Clear the uploading preview once the real message with the image
  // has appeared in the message list (not based on isUploading, which
  // fires too early — before sendMessage adds the message to the list)
  useEffect(() => {
    if (!uploadingImage) return;

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: any) => m.role === "user");
    const hasFilePart = lastUserMsg?.parts?.some((p: any) => p.type === "file");

    if (hasFilePart) {
      URL.revokeObjectURL(uploadingImage);
      setUploadingImage(null);
    }
  }, [messages, uploadingImage]);

  const clearAttachment = () => {
    if (image) {
      URL.revokeObjectURL(image);
    }
    setImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSend = (e?: FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!input.trim() && !image) return;

    // Keep a copy of the blob URL for the uploading preview
    if (image) {
      setUploadingImage(image);
    }

    handleSubmit(e, selectedFile);

    // Clear composer state but DON'T revoke the blob URL yet —
    // uploadingImage still needs it
    setImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!mounted || !sessionId) return null;

  const isMessageEmpty = messages.length === 0;

  // Memoized avatar
  const AiAvatar = () => (
    <div className="relative shrink-0">
      <div className="rounded-full bg-[conic-gradient(from_135deg,#8b5cf6_0deg,#ec4899_72deg,#facc15_146deg,#22c55e_220deg,#06b6d4_292deg,#8b5cf6_360deg)] p-0.75 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <Avatar className="w-19 h-19 rounded-full border-0 bg-white">
          <Avatar.Image alt="AI Assistant" src={avatarSrc} />
          <Avatar.Fallback>AI</Avatar.Fallback>
        </Avatar>
      </div>
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22c55e] border-2 border-white rounded-full" />
    </div>
  );

  return (
    <div
      className={
        isEmbedded
          ? "w-full h-full flex items-end justify-end p-0"
          : `fixed bottom-6 z-50 ${isOpen ? "left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0" : "right-6"}`
      }
    >
      {isOpen && (
        <Card
          className={`w-[95vw] max-w-105 sm:w-110 md:w-115 ${isMessageEmpty ? "h-72" : "h-160"} p-0 rounded-3xl  shadow-2xl/10`}
        >
          <ChatHeader
            title="Ellie"
            subtitle="Online"
            avatarSrc={avatarSrc}
            onMinimize={() => setIsOpen(false)}
            isMessageEmpty={isMessageEmpty}
          />

          <ScrollShadow
            className="flex-1 px-0 scrollbar-hide"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#ccc transparent",
            }}
          >
            <ChatMessages
              messages={messages as unknown as never[]}
              isLoading={isProcessing}
              isEmptyConversationState={isMessageEmpty}
              quickPrompts={quickPrompts}
              onQuickPromptSelect={(prompt) => {
                let message = "";

                if (prompt === quickPrompts[2]) {
                  message =
                    "Me interesa la terapia ABA. ¿Podría responderme en español, por favor?";
                } else if (prompt === "Yes") {
                  message = "Yes, I am interested in ABA therapy.";
                } else if (prompt === "No") {
                  message = "No, I am not interested in ABA therapy.";
                } else {
                  message = `${prompt} I am interested in ABA therapy.`;
                }

                // Update the composer visually and send immediately
                setInput(message);
                // Use sendText to avoid relying on setInput being asynchronous
                sendText(message);
              }}
              avatarSrc={avatarSrc}
              uploadingImage={uploadingImage}
            />

            <div ref={messagesEndRef} />
          </ScrollShadow>

          <ChatComposer
            image={image}
            input={input}
            isLoading={isProcessing}
            onImageClear={clearAttachment}
            onImageUpload={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
                if (file.size > MAX_FILE_SIZE) {
                  alert(
                    "File size exceeds the 5MB limit. Please upload a smaller file.",
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  return;
                }
                setSelectedFile(file);
                setImage(URL.createObjectURL(file));
              }
            }}
            onInputChange={(value) => setInput(value)}
            onInputKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(e);
              }
            }}
            onSend={() => onSend(undefined)}
            placeholder="Message..."
            fileInputRef={fileInputRef}
            inputRef={inputRef}
            isEmptyConversationState={isMessageEmpty}
          />
        </Card>
      )}

      {/* Bubble Button */}
      {!isOpen && (
        <div className="relative">
          <div
            className={`absolute right-full top-1/2 z-10 mr-4 -translate-y-1/2 transition-all duration-500 ease-out ${showBubble ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"}`}
            aria-hidden="true"
          >
            <div className="relative rounded-[22px] bg-white px-5 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.16)] ring-1 ring-black/5">
              <p className="whitespace-nowrap text-[18px] leading-none text-[#222]">
                {bubbleText}
              </p>
              <span className="absolute -right-1.25 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white ring-1 ring-black/5" />
            </div>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="group h-20 w-20 rounded-full cursor-pointer focus:outline-none flex items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-transparent border-none p-0 outline-none"
            aria-label="Open chat"
          >
            <AiAvatar />
          </button>
        </div>
      )}
    </div>
  );
}
