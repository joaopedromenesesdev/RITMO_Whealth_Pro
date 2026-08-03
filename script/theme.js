function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateChartsTheme(isDark);
}

function updateChartsTheme(isDark) {
  const textColor = isDark ? "#e2e8f0" : "#1a2b49";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  if (typeof Chart !== "undefined") {
    Chart.defaults.color = textColor;
    Chart.defaults.scale.grid.color = gridColor;
    
    // Refresh active charts if they exist in the window scope
    const charts = [window.g1, window.g2, window.g3, window.g4, window.grafico, window.graficoEvolucao, window.graficoGeral, window.graficoAplicacoes, window.graficoImoveis, window.graficoEmpresas];
    charts.forEach(chart => {
      if (chart) {
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.update();
      }
    });
  }
}

// Initial check
(function() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    // We can't update charts yet because they might not be initialized
  }
})();
