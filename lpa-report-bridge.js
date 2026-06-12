/**
 * LPA Full Report Generator Bridge
 *
 * index.html'in altina ekleyin:
 * <script src="lpa-report-bridge.js"></script>
 *
 * Header'a "Full Report" butonu ekler.
 * Tum adimlardan (enumeration + similarity + predictive + explanatory) verileri
 * toplayip lpa-report.html'e gonderir.
 */

(function () {
  'use strict';

  function injectButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) {
      setTimeout(injectButton, 500);
      return;
    }
    if (document.getElementById('fullReportBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'fullReportBtn';
    btn.className = 'btn btn-primary';
    btn.style.cssText = 'background: linear-gradient(135deg, #1A9E6E, #15825a);';
    btn.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
        <path d="M4.5 12.5A.5.5 0 0 1 5 12h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-2A.5.5 0 0 1 5 10h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-2A.5.5 0 0 1 5 8h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-2A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
      </svg>
      Full Report
    `;
    btn.title = 'Tum adimlarin APA raporunu olustur';
    btn.onclick = launchFullReport;

    // Export All butonundan once ekle
    const exportBtn = headerActions.querySelector('button[onclick="exportAll()"]');
    if (exportBtn) {
      headerActions.insertBefore(btn, exportBtn);
    } else {
      headerActions.appendChild(btn);
    }
  }

  function launchFullReport() {
    if (typeof workflowData === 'undefined') {
      alert('workflowData bulunamadi.');
      return;
    }

    const payload = {
      timestamp: Date.now(),
      config: {
        nProfiles: workflowData.nProfiles || 0,
        nGroups: workflowData.nGroups || 1,
        groupVar: workflowData.groupVar || '',
        profileVars: workflowData.profileVars || [],
        predictors: workflowData.predictors || '',
        outcomes: workflowData.outcomes || '',
        varianceSpec: workflowData.varianceSpec || 'free',
        dataset: workflowData.dataset || '',
      },

      // Step 0: Enumeration
      enumeration: (workflowData.results.enumeration || []).map(e => ({
        model: e.model,
        k: e.k,
        ll: e.ll,
        fp: e.fp,
        aic: e.aic,
        bic: e.bic,
        caic: e.caic,
        sabic: e.sabic,
        almr_p: e.almr_p,
        blrt_p: e.blrt_p,
        entropy: e.entropy,
        proportions: e.proportions || [],
        randomStarts: e.randomStarts || null,
      })),

      // Step 1: Similarity Tests
      similarity: (workflowData.results.multigroup || [])
        .filter(r => r.stage && ['Configural Similarity', 'Structural Similarity', 'Dispersion Similarity', 'Distributional Similarity'].includes(r.stage))
        .map(s => ({
          stage: s.stage,
          model: s.model,
          k: s.k,
          groups: s.groups,
          ll: s.ll,
          fp: s.fp,
          aic: s.aic,
          bic: s.bic,
          caic: s.caic,
          sabic: s.sabic,
          entropy: s.entropy,
          decision: s.decision || '',
          latentTransition: s.latentTransition || null,
        })),

      // Step 3: Predictive
      predictive: (workflowData.results.multigroup || [])
        .filter(r => r.stage && r.stage === 'Predictive')
        .map(p => ({
          stage: p.stage,
          model: p.model,
          k: p.k,
          ll: p.ll,
          fp: p.fp,
          aic: p.aic,
          bic: p.bic,
          sabic: p.sabic,
          entropy: p.entropy,
          decision: p.decision || '',
          referenceProfile: p.referenceProfile || null,
          multinomialResults: p.multinomialResults || null,
        })),

      // Step 4: Explanatory
      explanatory: (workflowData.results.multigroup || [])
        .filter(r => r.stage && r.stage === 'Explanatory')
        .map(e => ({
          stage: e.stage,
          model: e.model,
          k: e.k,
          ll: e.ll,
          fp: e.fp,
          aic: e.aic,
          bic: e.bic,
          sabic: e.sabic,
          entropy: e.entropy,
          decision: e.decision || '',
          explanatoryResults: e.explanatoryResults || null,
          outcomes: e.outcomes || '',
        })),
    };

    localStorage.setItem('lpa_full_report', JSON.stringify(payload));
    const url = new URL('lpa-report.html', window.location.href);
    url.searchParams.set('t', Date.now());
    window.open(url.toString(), '_blank');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
