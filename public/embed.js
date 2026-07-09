(function () {
  // Prevent duplicate insertion
  if (document.getElementById("ellie-chat-container")) return;

  function shouldHideWidgetOnCurrentPage() {
    try {
      const pathname = window.location.pathname
        .replace(/\/+$/, "")
        .toLowerCase();
      return pathname === "/caregiver-portal";
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
      width: "90px",
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

  // Helper to force styles on container and iframe
  function applyStyles() {
    const s = STATES[currentState];
    if (!s) return;

    const activeContainer = document.getElementById("ellie-chat-container");
    const activeIframe = document.getElementById("ellie-chat-iframe");
    const isMobile = window.innerWidth < 640;

    let width = s.width;
    if (currentState === "closed" && showBubbleState) {
      width = isMobile ? "100%" : "420px";
    }

    // Apply strict styles to the container div
    if (activeContainer) {
      activeContainer.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        border: none !important;
        overflow: hidden !important;
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        max-width: none !important;
        max-height: none !important;
        display: block !important;
        box-sizing: border-box !important;
        top: auto !important;
        left: auto !important;
        transform: none !important;
        width: ${width} !important;
        height: ${s.height} !important;
        min-width: ${width} !important;
        min-height: ${s.height} !important;
        max-width: ${width} !important;
        max-height: ${s.height} !important;
        bottom: ${s.bottom} !important;
        right: ${s.right} !important;
        pointer-events: ${s.pointerEvents} !important;
      `;
    }

    // Apply strict styles to the iframe
    if (activeIframe) {
      activeIframe.style.cssText = `
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
      `;
    }
  }

  // Create elements
  const container = document.createElement("div");
  container.id = "ellie-chat-container";

  const iframe = document.createElement("iframe");
  iframe.id = "ellie-chat-iframe";
  iframe.src = `${baseUrl}/widget`;
  iframe.allow = "clipboard-read; clipboard-write; camera; microphone";

  const allowedOrigin = new URL(iframe.src).origin;
  console.log("[Ellie Embed] Iframe Src:", iframe.src);
  console.log("[Ellie Embed] Allowed Origin:", allowedOrigin);

  container.appendChild(iframe);

  // Set up MutationObserver to protect elements against style hijacking
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "style" ||
          mutation.attributeName === "class")
      ) {
        observer.disconnect();
        applyStyles();
        startObserving();
      }
    });
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
    document.body.appendChild(container);
    applyStyles();
    startObserving();

    // Hard enforcer loop: verifies parenting, overrides hijacked styles, handles clones
    setInterval(function () {
      const activeContainer = document.getElementById("ellie-chat-container");
      if (activeContainer && activeContainer.parentElement !== document.body) {
        console.log(
          "%c[Ellie Chat]%c Container was reparented. Re-appending to body.",
          "color: #2563eb; font-weight: bold;",
          "color: inherit;",
        );
        document.body.appendChild(activeContainer);
      }
      applyStyles();
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWidget);
  } else {
    injectWidget();
  }

  // Listen to messages from the widget
  window.addEventListener(
    "message",
    function (event) {
      if (!event.data || event.data.type !== "ellie-chat-widget") return;

      console.log(
        "%c[Ellie Chat]%c Received message from origin: %c%s%c with data:",
        "color: #2563eb; font-weight: bold;",
        "color: inherit;",
        "color: #059669; font-weight: bold;",
        event.origin,
        "color: inherit;",
        event.data,
      );

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
          event.origin,
        );
        return;
      }

      const isOpen = event.data.isOpen;
      const isMobile = window.innerWidth < 640;
      showBubbleState = !!event.data.showBubble;

      if (!isOpen) {
        console.log(
          "%c[Ellie Chat]%c Transitioning to closed state. showBubble: %s",
          "color: #2563eb; font-weight: bold;",
          "color: inherit;",
          showBubbleState,
        );
        currentState = "closed";
      } else {
        console.log(
          "%c[Ellie Chat]%c Transitioning to open state. Mobile: %s",
          "color: #2563eb; font-weight: bold;",
          "color: inherit;",
          isMobile,
        );
        currentState = isMobile ? "open_mobile" : "open_desktop";
      }

      applyStyles();
    },
    true,
  ); // Listen in the capture phase to prevent other scripts from blocking it
})();
