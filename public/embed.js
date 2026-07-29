(function () {
  // Prevent duplicate insertion
  if (document.getElementById("ellie-chat-container")) return;

  function shouldHideWidgetOnCurrentPage() {
    try {
      const pathname = window.location.pathname
        .replace(/\/+$/, "")
        .toLowerCase();
      return pathname === "/caregiver-resources";
    } catch (e) {
      return false;
    }
  }

  if (shouldHideWidgetOnCurrentPage()) {
    console.log("[Ellie Embed] Widget disabled on this page.");
    return;
  }

  console.log("[Ellie Embed] Script loaded.");

  const WIDGET_BASE_URL = "https://ellie-abcachieve-agent.vercel.app";
  let baseUrl = WIDGET_BASE_URL;

  try {
    const scriptElement =
      document.currentScript ||
      (function () {
        const scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1];
      })();
    if (scriptElement && scriptElement.src) {
      const url = new URL(scriptElement.src);
      if (
        url.hostname === "localhost" ||
        url.hostname.endsWith(".vercel.app")
      ) {
        baseUrl = url.origin;
      }
    }
  } catch (e) {
    console.error("[Ellie Embed] Error deriving baseUrl:", e);
  }

  console.log("[Ellie Embed] Derived baseUrl:", baseUrl);

  // Desired state tracking
  let currentState = "closed";
  let showBubbleState = false;

  const STATES = {
    closed: {
      width: "420px",
      height: "90px",
      bottom: "16px",
      right: "16px",
      pointerEvents: "none",
    },
    open_desktop: {
      width: "480px",
      height: "670px",
      bottom: "16px",
      right: "16px",
      pointerEvents: "auto",
    },
    open_mobile: {
      width: "100%",
      height: "100%",
      bottom: "0px",
      right: "0px",
      pointerEvents: "auto",
    },
  };

  let lastAppliedCss = "";

  function getContainerCss() {
    const s = STATES[currentState] || STATES.closed;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

    let width = s.width;
    let height = s.height;
    if (currentState === "closed" && isMobile) {
      width = "100%";
    }

    return `
      position: fixed !important;
      z-index: 2147483647 !important;
      border: none !important;
      overflow: hidden !important;
      background: transparent !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      display: block !important;
      box-sizing: border-box !important;
      top: auto !important;
      left: auto !important;
      transform: translateZ(0) !important;
      will-change: width, height !important;
      contain: layout paint !important;
      width: ${width} !important;
      height: ${height} !important;
      min-width: ${width} !important;
      min-height: ${height} !important;
      max-width: ${width} !important;
      max-height: ${height} !important;
      bottom: ${s.bottom} !important;
      right: ${s.right} !important;
      pointer-events: ${s.pointerEvents} !important;
    `.replace(/\s+/g, " ").trim();
  }

  const iframeCss = `
    width: 100% !important;
    height: 100% !important;
    min-width: 100% !important;
    min-height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    border: none !important;
    background: transparent !important;
    pointer-events: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    display: block !important;
    box-sizing: border-box !important;
  `.replace(/\s+/g, " ").trim();

  // Helper to force styles on container and iframe only when changed
  function applyStyles(force) {
    const activeContainer = document.getElementById("ellie-chat-container");
    const activeIframe = document.getElementById("ellie-chat-iframe");
    const targetCss = getContainerCss();

    if (activeContainer && (force || lastAppliedCss !== targetCss)) {
      activeContainer.style.cssText = targetCss;
      lastAppliedCss = targetCss;
    }

    if (activeIframe && (force || activeIframe.style.cssText !== iframeCss)) {
      activeIframe.style.cssText = iframeCss;
    }
  }

  // Create elements
  const container = document.createElement("div");
  container.id = "ellie-chat-container";

  // Pre-apply fixed overlay styles BEFORE appending to DOM
  // so browser NEVER measures element in document layout flow (eliminates CLS)
  container.style.cssText = getContainerCss();

  const iframe = document.createElement("iframe");
  iframe.id = "ellie-chat-iframe";
  iframe.src = `${baseUrl}/widget`;
  iframe.allow = "clipboard-read; clipboard-write; camera; microphone";
  iframe.title = "Ellie Chat Assistant";
  iframe.style.cssText = iframeCss;

  let allowedOrigin = baseUrl;
  try {
    allowedOrigin = new URL(iframe.src).origin;
  } catch (e) {}

  console.log("[Ellie Embed] Iframe Src:", iframe.src);
  console.log("[Ellie Embed] Allowed Origin:", allowedOrigin);

  container.appendChild(iframe);

  // Set up MutationObserver to protect elements against style hijacking
  let isUpdatingStyles = false;
  const observer = new MutationObserver(function (mutations) {
    if (isUpdatingStyles) return;
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "style" || mutation.attributeName === "class")
      ) {
        isUpdatingStyles = true;
        applyStyles(true);
        isUpdatingStyles = false;
        break;
      }
    }
  });

  function startObserving() {
    const activeContainer = document.getElementById("ellie-chat-container");
    const activeIframe = document.getElementById("ellie-chat-iframe");
    if (activeContainer) {
      observer.observe(activeContainer, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }
    if (activeIframe) {
      observer.observe(activeIframe, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }
  }

  // Safe injection method that guarantees document.body is available
  function injectWidget() {
    if (document.getElementById("ellie-chat-container")) return;
    
    // Always append directly to body or root element
    const parentNode = document.body || document.documentElement;
    if (parentNode) {
      parentNode.appendChild(container);
      applyStyles(true);
      startObserving();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWidget);
  } else {
    injectWidget();
  }

  // Passive window resize listener to update styles on layout change
  window.addEventListener("resize", function () {
    applyStyles();
  }, { passive: true });

  // Listen to messages from the widget
  window.addEventListener(
    "message",
    function (event) {
      if (!event.data || event.data.type !== "ellie-chat-widget") return;

      const isAllowedOrigin =
        event.origin === allowedOrigin ||
        event.origin === "null" ||
        event.origin.indexOf("localhost") !== -1 ||
        event.origin.indexOf(".vercel.app") !== -1;

      if (!isAllowedOrigin) {
        console.warn(
          "%c[Ellie Chat]%c Blocked message due to origin mismatch. Expected: %c%s%c Got: %c%s",
          "color: #dc2626; font-weight: bold;",
          "color: inherit;",
          "color: #059669; font-weight: bold;",
          allowedOrigin,
          "color: inherit;",
          "color: #dc2626; font-weight: bold;",
          event.origin
        );
        return;
      }

      const isOpen = event.data.isOpen;
      const isMobile = window.innerWidth < 640;
      showBubbleState = !!event.data.showBubble;

      if (!isOpen) {
        currentState = "closed";
      } else {
        currentState = isMobile ? "open_mobile" : "open_desktop";
      }

      applyStyles();
    },
    true
  );
})();

