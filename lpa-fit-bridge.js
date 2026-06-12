/**
 * LPA Fit Index Playground Bridge
 *
 * Bu dosyayı index.html'in en altına ekleyin:
 * <script src="lpa-fit-bridge.js"></script>
 *
 * Step 0'daki Elbow Plot butonunun yanına "Fit Interpreter" butonu ekler.
 * Tıklanınca workflowData.results.enumeration verilerini localStorage'a yazar
 * ve lpa-fit-playground.html'i yeni sekmede açar.
 */

(function () {
  'use strict';

  // Butonu ekle — DOM hazır olduğunda
  function injectButton() {
    const elbowBtn = document.getElementById('elbowPlotBtn');
    if (!elbowBtn) {
      // DOM henüz hazır değilse tekrar dene
      setTimeout(injectButton, 500);
      return;
    }

    // Zaten eklenmişse tekrar ekleme
    if (document.getElementById('fitPlaygroundBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'fitPlaygroundBtn';
    btn.className = 'btn btn-primary btn-small';
    btn.style.cssText = 'background: linear-gradient(135deg, #f08c00, #e67700); margin-left: 6px;';
    btn.innerHTML = `
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
        <path d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
      </svg>
      Fit Interpreter
    `;
    btn.title = 'Fit indekslerini interaktif playground\'da analiz et';
    btn.onclick = launchFitPlayground;

    elbowBtn.parentElement.appendChild(btn);
  }

  function launchFitPlayground() {
    // workflowData erişimi kontrol
    if (typeof workflowData === 'undefined' || !workflowData.results || !workflowData.results.enumeration) {
      alert('Henüz enumeration verisi yok. Önce Mplus çıktılarını yükleyin.');
      return;
    }

    const enumData = workflowData.results.enumeration;
    if (enumData.length === 0) {
      alert('Enumeration sonuçları boş. Önce Step 0\'da Mplus .out dosyalarını analiz edin.');
      return;
    }

    // Grupları ayır
    const groups = {};
    enumData.forEach(item => {
      const groupMatch = item.model.match(/Group\s*(\d+)/i);
      const groupName = groupMatch ? 'Group ' + groupMatch[1] : 'All';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    });

    // Her grup için fit verilerini hazırla
    const payload = {
      timestamp: Date.now(),
      groups: {},
      sampleSize: null,
      numVars: null
    };

    // Örneklem ve değişken sayısını bulmaya çalış
    const sampleInput = document.getElementById('sampleSize');
    if (sampleInput) payload.sampleSize = parseInt(sampleInput.value) || null;

    // Değişken sayısını indicators'dan çıkar
    const indicatorsInput = document.getElementById('indicators');
    if (indicatorsInput && indicatorsInput.value) {
      const vars = indicatorsInput.value.trim().split(/\s+/);
      payload.numVars = vars.length;
    }

    Object.keys(groups).forEach(groupName => {
      const models = groups[groupName];
      // k'ya göre sırala
      models.sort((a, b) => parseInt(a.k) - parseInt(b.k));

      payload.groups[groupName] = models.map(m => ({
        k: parseInt(m.k) || 0,
        model: m.model,
        aic: parseFloat(m.aic) || 0,
        bic: parseFloat(m.bic) || 0,
        abic: parseFloat(m.sabic) || 0,
        entropy: parseFloat(m.entropy) || 0,
        blrt_p: parseFloat(m.blrt_p) || 1,
        almr_p: parseFloat(m.almr_p) || 1,
        ll: parseFloat(m.ll) || 0,
        fp: parseInt(m.fp) || 0,
        caic: parseFloat(m.caic) || 0,
        proportions: m.proportions || []
      }));
    });

    // localStorage'a yaz
    localStorage.setItem('lpa_fit_data', JSON.stringify(payload));

    // Playground'u aç
    const playgroundUrl = new URL('lpa-fit-playground.html', window.location.href);
    playgroundUrl.searchParams.set('from', 'app');
    playgroundUrl.searchParams.set('t', Date.now());
    window.open(playgroundUrl.toString(), '_blank');
  }

  // Buton görünürlüğünü Step 0'da kontrol et
  function updateButtonVisibility() {
    const btn = document.getElementById('fitPlaygroundBtn');
    if (!btn) return;

    const isStep0 = typeof currentStep !== 'undefined' && currentStep === 0;
    const hasData = typeof workflowData !== 'undefined' &&
      workflowData.results &&
      workflowData.results.enumeration &&
      workflowData.results.enumeration.length > 0;

    btn.style.display = (isStep0 && hasData) ? 'inline-flex' : 'none';
  }

  // goToStep override ile görünürlük takibi
  function hookStepChanges() {
    if (typeof goToStep === 'undefined') {
      setTimeout(hookStepChanges, 500);
      return;
    }

    const originalGoToStep = goToStep;
    window.goToStep = function () {
      originalGoToStep.apply(this, arguments);
      setTimeout(updateButtonVisibility, 100);
    };

    // parseOutput hook
    if (typeof parseOutput !== 'undefined') {
      const originalParseOutput = parseOutput;
      window.parseOutput = function () {
        originalParseOutput.apply(this, arguments);
        setTimeout(updateButtonVisibility, 200);
      };
    }

    // updateResultsTable hook
    if (typeof updateResultsTable !== 'undefined') {
      const originalUpdate = updateResultsTable;
      window.updateResultsTable = function () {
        originalUpdate.apply(this, arguments);
        setTimeout(updateButtonVisibility, 100);
      };
    }
  }

  // Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectButton();
      hookStepChanges();
    });
  } else {
    injectButton();
    hookStepChanges();
  }
})();
