// Limpa dados de simulações anteriores ao iniciar um novo relatório
    sessionStorage.clear();

    let introTimer = null;

    function pularIntro() {
      if (introTimer) clearTimeout(introTimer);
      const intro = document.getElementById('cinematic-intro');
      if (intro) {
        intro.classList.add('intro-hidden');
        document.body.classList.add('intro-pulada');
        const card = document.querySelector('.landing-card');
        if (card) card.classList.add('imediato');
      }
    }

    // Controle da Intro Cinematográfica
    window.addEventListener('load', () => {
      // Deixa a intro tocar por 4.5 segundos e depois some
      introTimer = setTimeout(pularIntro, 4500);
      if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') pularIntro();
    });

    // Preenche a data de hoje por padrão
    document.getElementById('data_reuniao').valueAsDate = new Date();

    // Recupera nome do assessor salvo (praticidade entre reuniões)
    const assessorSalvo = localStorage.getItem('nome_assessor');
    if (assessorSalvo) {
      document.getElementById('nome_assessor').value = assessorSalvo;
    }

    // Enter navega entre campos
    document.querySelectorAll('input').forEach((input, i, arr) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (i < arr.length - 1) arr[i + 1].focus();
          else iniciarSimulacao();
        }
      });
    });

    function iniciarSimulacao() {
      const assessor = document.getElementById('nome_assessor').value.trim();
      const cliente = document.getElementById('nome_cliente').value.trim();
      const data = document.getElementById('data_reuniao').value;
      const erroEl = document.getElementById('erro-msg');

      if (!assessor || !cliente) {
        erroEl.style.display = 'block';
        if (!assessor) document.getElementById('nome_assessor').focus();
        else document.getElementById('nome_cliente').focus();
        return;
      }

      erroEl.style.display = 'none';

      // Limpa dados anteriores e define simulação como ativa
      sessionStorage.clear();
      sessionStorage.setItem('simulacao_ativa', 'true');

      // Persiste o assessor para a próxima sessão (conveniência)
      localStorage.setItem('nome_assessor', assessor);

      // Salva os dados da reunião no sessionStorage
      sessionStorage.setItem('nome_assessor', assessor);
      sessionStorage.setItem('nome_cliente', cliente);
      sessionStorage.setItem('familia', JSON.stringify({ nome: cliente }));
      sessionStorage.setItem('data_reuniao',
        data ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
      );

      window.location.href = 'patrimonio.html';
    }
