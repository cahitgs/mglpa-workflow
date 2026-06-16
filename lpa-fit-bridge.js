/**
 * LPA Fit Index Playground Bridge
 *
 * Add this file at the very bottom of index.html:
 * <script src="lpa-fit-bridge.js"></script>
 *
 * Adds a "Fit Interpreter" button next to the Elbow Plot button on Step 0.
 * When clicked, it writes the workflowData.results.enumeration data to
 * localStorage and opens lpa-fit-playground.html in a new tab.
 */

(function () {
  'use strict';

  // Inject the button once the DOM is ready
  function injectButton() {
    const elbowBtn = document.getElementById('elbowPlotBtn');
    if (!elbowBtn) {
      // DOM not ready yet -> retry
      setTimeout(injectButton, 500);
      return;
    }

    // Skip if it has already been added
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
    btn.title = 'Analyze the fit indices in an interactive playground';
    btn.onclick = launchFitPlayground;

    elbowBtn.parentElement.appendChild(btn);
  }

  function launchFitPlayground() {
    // Check access to workflowData
    if (typeof workflowData === 'undefined' || !workflowData.results || !workflowData.results.enumeration) {
      alert('No enumeration data yet. Please load the Mplus outputs first.');
      return;
    }

    const enumData = workflowData.results.enumeration;
    if (enumData.length === 0) {
      alert('Enumeration results are empty. Please analyze the Mplus .out files in Step 0 first.');
      return;
    }

    // Split into groups
    const groups = {};
    enumData.forEach(item => {
      const groupMatch = item.model.match(/Group\s*(\d+)/i);
      const groupName = groupMatch ? 'Group ' + groupMatch[1] : 'All';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    });

    // Prepare the fit data for each group
    const payload = {
      timestamp: Date.now(),
      groups: {},
      sampleSize: null,
      numVars: null
    };

    // Try to find the sample size and the number of variables
    const sampleInput = document.getElementById('sampleSize');
    if (sampleInput) payload.sampleSize = parseInt(sampleInput.value) || null;

    // Derive the number of variables from the indicators field
    const indicatorsInput = document.getElementById('indicators');
    if (indicatorsInput && indicatorsInput.value) {
      const vars = indicatorsInput.value.trim().split(/\s+/);
      payload.numVars = vars.length;
    }

    Object.keys(groups).forEach(groupName => {
      const models = groups[groupName];
      // Sort by k
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

    // Write to localStorage
    localStorage.setItem('lpa_fit_data', JSON.stringify(payload));

    // Open the playground
    const playgroundUrl = new URL('lpa-fit-playground.html', window.location.href);
    playgroundUrl.searchParams.set('from', 'app');
    playgroundUrl.searchParams.set('t', Date.now());
    window.open(playgroundUrl.toString(), '_blank');
  }

  // Control the button visibility on Step 0.
  // The button stays visible throughout Step 0 (the main Class-Enumeration page),
  // whether or not enumeration data has been loaded yet; if it is clicked before
  // any data exists, launchFitPlayground() shows an explanatory alert.
  function updateButtonVisibility() {
    const btn = document.getElementById('fitPlaygroundBtn');
    if (!btn) return;

    const isStep0 = typeof currentStep !== 'undefined' && currentStep === 0;

    btn.style.display = isStep0 ? 'inline-flex' : 'none';
  }

  // Track visibility by overriding goToStep
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

  // Start
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
