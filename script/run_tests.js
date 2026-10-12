window.__PACE_ENABLE_SECURITY_TESTS__ = true;

async function executarTestesVisual() {
      const out = document.getElementById("output");
      out.textContent = "";

      // Sobrescreve console.log para exibir na tela
      const originalLog = console.log;
      const originalError = console.error;

      console.log = function(...args) {
        out.textContent += args.join(" ") + "\n";
        originalLog.apply(console, args);
      };

      console.error = function(...args) {
        out.textContent += args.join(" ") + "\n";
        originalError.apply(console, args);
      };

      try {
        if (window.rodarTestesTributario) {
          await window.rodarTestesTributario();
        }
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    }

    // Executa automaticamente ao carregar
    window.addEventListener("DOMContentLoaded", executarTestesVisual);
