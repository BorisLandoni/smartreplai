document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const triageEnabledInput = document.getElementById('triage-enabled');
  const triageUrgentInput = document.getElementById('triage-urgent-definition');
  const triageBudgetInput = document.getElementById('triage-budget');
  const triageRefreshBtn = document.getElementById('triage-refresh-senders');
  const triageStatus = document.getElementById('triage-status');
  const deepseekApiKeyInput = document.getElementById('deepseek-api-key');
  const deepseekModelSelect = document.getElementById('deepseek-model');
  const geminiApiKeyInput = document.getElementById('gemini-api-key');
  const openaiApiKeyInput = document.getElementById('openai-api-key');
  const mistralApiKeyInput = document.getElementById('mistral-api-key');
  const ollamaHostInput = document.getElementById('ollama-host');
  const ollamaModelSelect = document.getElementById('ollama-model');
  const ollamaCustomModelInput = document.getElementById('ollama-custom-model');
  const ollamaCustomModelContainer = document.getElementById('ollama-custom-model-container');
  const modelSelect = document.getElementById('model-select');
  const reasoningEffortSelect = document.getElementById('reasoning-effort');
  const userSignatureInput = document.getElementById('user-signature');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');
  
  // Get test connection buttons and status elements
  const testDeepseekBtn = document.getElementById('test-deepseek-btn');
  const testGeminiBtn = document.getElementById('test-gemini-btn');
  const testOpenaiBtn = document.getElementById('test-openai-btn');
  const testMistralBtn = document.getElementById('test-mistral-btn');
  const testOllamaBtn = document.getElementById('test-ollama-btn');
  
  const deepseekStatus = document.getElementById('deepseek-status');
  const geminiStatus = document.getElementById('gemini-status');
  const openaiStatus = document.getElementById('openai-status');
  const mistralStatus = document.getElementById('mistral-status');
  const ollamaStatus = document.getElementById('ollama-status');
  
  const enableFallbackCheckbox = document.getElementById('enable-fallback');
  const fallbackModelsContainer = document.getElementById('fallback-models-container');
  const fallbackModel1Select = document.getElementById('fallback-model-1');
  const fallbackModel2Select = document.getElementById('fallback-model-2');
  const fallbackModel3Select = document.getElementById('fallback-model-3');
  
  // Add password visibility toggle functionality
  document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-for');
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<i class="fas fa-eye"></i>';
      }
    });
  });
  
  // Function to update UI based on selected model
  function updateUIForSelectedModel() {
    const selectedModel = modelSelect.value;
    
    // Show/hide reasoning effort based on model selection
    if (reasoningEffortSelect.hasAttribute('data-show-for-model')) {
      const showForModel = reasoningEffortSelect.getAttribute('data-show-for-model');
      const reasoningEffortGroup = reasoningEffortSelect.closest('.setting-group');
      
      if (selectedModel === showForModel) {
        reasoningEffortGroup.style.display = 'block';
      } else {
        reasoningEffortGroup.style.display = 'none';
      }
    }
    
    // Show a provider's block whenever that provider is in use — as primary OR as a fallback.
    // Keying this on the primary alone made the fallback impossible to configure: the validation
    // below still demands an Ollama host, while the field to type it into is hidden.
    toggleSection('ollama-settings', isProviderInUse('ollama'));
    toggleSection('deepseek-settings', isProviderInUse('deepseek'));
  }

  function isProviderInUse(provider) {
    if (modelSelect.value === provider) {
      return true;
    }

    return [fallbackModel1Select, fallbackModel2Select, fallbackModel3Select]
      .some(select => select && select.value === provider);
  }

  function toggleSection(elementId, visible) {
    const section = document.getElementById(elementId);

    if (section) {
      section.style.display = visible ? 'block' : 'none';
    }
  }
  
  // Add event listener for model selection change
  modelSelect.addEventListener('change', updateUIForSelectedModel);

  // Picking a provider as fallback has to reveal its settings too, same as picking it as primary.
  [fallbackModel1Select, fallbackModel2Select, fallbackModel3Select].forEach(select => {
    if (select) {
      select.addEventListener('change', updateUIForSelectedModel);
    }
  });
  
  // Show/hide Ollama custom model input based on selection
  ollamaModelSelect.addEventListener('change', () => {
    if (ollamaModelSelect.value === 'custom') {
      ollamaCustomModelContainer.style.display = 'block';
    } else {
      ollamaCustomModelContainer.style.display = 'none';
    }
  });
  
  // Show/hide fallback models container based on checkbox
  enableFallbackCheckbox.addEventListener('change', () => {
    fallbackModelsContainer.style.display = enableFallbackCheckbox.checked ? 'block' : 'none';
  });
  
  // Load saved settings
  try {
    const settings = await browser.storage.local.get([
      'deepseekApiKey',
      'deepseekModel',
      'geminiApiKey',
      'openaiApiKey',
      'mistralApiKey',
      'ollamaHost',
      'ollamaModel',
      'ollamaCustomModel',
      'selectedModel',
      'reasoningEffort',
      'userSignature',
      'enableFallback',
      'fallbackModels'
    ]);
    
    // Deliberately not logging the settings object: it carries every API key in clear text.

    // Set input values from storage
    // Triage settings live under their own key, with the defaults declared in triage.js so the two
    // cannot drift apart.
    const { triageConfig } = await browser.storage.local.get('triageConfig');
    const triage = Object.assign({
      enabled: false,
      urgentDefinition: 'Un collaboratore o un fornitore chiede una decisione, una conferma o un dato entro oggi o domani, oppure segnala un problema che blocca il lavoro.',
      dailyCallBudget: 200
    }, triageConfig || {});

    triageEnabledInput.checked = triage.enabled;
    triageUrgentInput.value = triage.urgentDefinition;
    triageBudgetInput.value = triage.dailyCallBudget;

    if (settings.deepseekApiKey) deepseekApiKeyInput.value = settings.deepseekApiKey;
    if (settings.deepseekModel) deepseekModelSelect.value = settings.deepseekModel;
    if (settings.geminiApiKey) geminiApiKeyInput.value = settings.geminiApiKey;
    if (settings.openaiApiKey) openaiApiKeyInput.value = settings.openaiApiKey;
    if (settings.mistralApiKey) mistralApiKeyInput.value = settings.mistralApiKey;
    if (settings.ollamaHost) ollamaHostInput.value = settings.ollamaHost;
    if (settings.ollamaModel) ollamaModelSelect.value = settings.ollamaModel;
    if (settings.ollamaCustomModel) ollamaCustomModelInput.value = settings.ollamaCustomModel;
    if (settings.selectedModel) modelSelect.value = settings.selectedModel;
    if (settings.reasoningEffort) reasoningEffortSelect.value = settings.reasoningEffort;
    if (settings.userSignature) userSignatureInput.value = settings.userSignature;
    
    // Set fallback settings
    if (settings.enableFallback !== undefined) {
      enableFallbackCheckbox.checked = settings.enableFallback;
      fallbackModelsContainer.style.display = settings.enableFallback ? 'block' : 'none';
    }
    
    // Set fallback model selections
    if (settings.fallbackModels && Array.isArray(settings.fallbackModels)) {
      if (settings.fallbackModels[0]) fallbackModel1Select.value = settings.fallbackModels[0];
      if (settings.fallbackModels[1]) fallbackModel2Select.value = settings.fallbackModels[1];
      if (settings.fallbackModels[2]) fallbackModel3Select.value = settings.fallbackModels[2];
    }
    
    // Show/hide Ollama custom model input based on saved selection
    if (settings.ollamaModel === 'custom') {
      ollamaCustomModelContainer.style.display = 'block';
    } else {
      ollamaCustomModelContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showMainStatus(t('err_loading_settings') + error.message, 'error');
  }
  
  // Test Gemini connection button click handler
  testGeminiBtn.addEventListener('click', async () => {
    try {
      geminiStatus.textContent = t('options_testing_gemini');
      geminiStatus.className = 'status-message status-info';

      const apiKey = geminiApiKeyInput.value.trim();
      if (!apiKey) {
        showStatus(geminiStatus, t('err_gemini_key_required'), 'error');
        return;
      }

      const result = await browser.runtime.sendMessage({
        action: 'testConnection',
        model: 'gemini',
        apiKey
      });

      showStatus(geminiStatus, result.connected ? t('options_gemini_test_ok') : result.message,
                 result.connected ? 'success' : 'error');
    } catch (error) {
      console.error('Error testing Gemini connection:', error);
      showStatus(geminiStatus, `${t('err_generic_prefix')}${error.message}`, 'error');
    }
  });
  
  // Test OpenAI connection button click handler
  testOpenaiBtn.addEventListener('click', async () => {
    try {
      openaiStatus.textContent = t('options_testing_openai');
      openaiStatus.className = 'status-message status-info';

      const apiKey = openaiApiKeyInput.value.trim();
      if (!apiKey) {
        showStatus(openaiStatus, t('err_openai_key_required'), 'error');
        return;
      }
      
      // First test O3-mini
      const o3Result = await browser.runtime.sendMessage({
        action: 'testConnection',
        model: 'openai',
        apiKey
      });
      
      // Then test GPT-4o
      const gpt4oResult = await browser.runtime.sendMessage({
        action: 'testConnection',
        model: 'gpt4o',
        apiKey
      });
      
      // Show combined result
      if (o3Result.connected && gpt4oResult.connected) {
        showStatus(openaiStatus, t('options_openai_test_ok_both'), 'success');
      } else if (o3Result.connected) {
        showStatus(openaiStatus, t('options_openai_test_o3_only') + gpt4oResult.message, 'warning');
      } else if (gpt4oResult.connected) {
        showStatus(openaiStatus, t('options_openai_test_gpt4o_only') + o3Result.message, 'warning');
      } else {
        showStatus(openaiStatus, `${t('err_openai_test_failed')}${o3Result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      showStatus(openaiStatus, `${t('err_generic_prefix')}${error.message}`, 'error');
    }
  });
  
  // Test Mistral connection button click handler
  triageRefreshBtn.addEventListener('click', async () => {
    try {
      showStatus(triageStatus, t('options_triage_refreshing'), 'info');
      await browser.runtime.sendMessage({ action: 'refreshKnownSenders' });
      showStatus(triageStatus, t('options_triage_refreshed'), 'success');
    } catch (error) {
      console.error('Error refreshing known senders:', error);
      showStatus(triageStatus, `${t('err_generic_prefix')}${error.message}`, 'error');
    }
  });

  testDeepseekBtn.addEventListener('click', async () => {
    try {
      deepseekStatus.textContent = t('options_testing_deepseek');
      deepseekStatus.className = 'status-message status-info';

      const apiKey = deepseekApiKeyInput.value.trim();
      if (!apiKey) {
        showStatus(deepseekStatus, t('err_deepseek_key_required'), 'error');
        return;
      }

      const result = await browser.runtime.sendMessage({
        action: 'testConnection',
        model: 'deepseek',
        apiKey,
        modelName: deepseekModelSelect.value
      });

      showStatus(deepseekStatus, result.connected ? t('options_deepseek_test_ok') : result.message,
                 result.connected ? 'success' : 'error');
    } catch (error) {
      console.error('Error testing DeepSeek connection:', error);
      showStatus(deepseekStatus, `${t('err_generic_prefix')}${error.message}`, 'error');
    }
  });

  testMistralBtn.addEventListener('click', async () => {
    try {
      mistralStatus.textContent = t('options_testing_mistral');
      mistralStatus.className = 'status-message status-info';

      const apiKey = mistralApiKeyInput.value.trim();
      if (!apiKey) {
        showStatus(mistralStatus, t('err_mistral_key_required'), 'error');
        return;
      }

      const result = await browser.runtime.sendMessage({
        action: 'testConnection',
        model: 'mistral',
        apiKey
      });

      showStatus(mistralStatus, result.connected ? t('options_mistral_test_ok') : result.message,
                 result.connected ? 'success' : 'error');
    } catch (error) {
      console.error('Error testing Mistral connection:', error);
      showStatus(mistralStatus, `${t('err_generic_prefix')}${error.message}`, 'error');
    }
  });
  
  // Test Ollama connection button click handler
  testOllamaBtn.addEventListener('click', async () => {
    try {
      ollamaStatus.textContent = t('options_testing_ollama');
      ollamaStatus.className = 'status-message status-info';

      const host = ollamaHostInput.value.trim();
      if (!host) {
        showStatus(ollamaStatus, t('err_ollama_host_required'), 'error');
        return;
      }

      let modelName = ollamaModelSelect.value;
      if (modelName === 'custom') {
        modelName = ollamaCustomModelInput.value.trim();
        if (!modelName) {
          showStatus(ollamaStatus, t('err_ollama_custom_model_required'), 'error');
          return;
        }
      }
      
      const result = await browser.runtime.sendMessage({
        action: 'testConnection',
        model: 'ollama',
        host,
        modelName
      });
      
      if (result.connected) {
        // If we have available models, update the dropdown and show them
        if (result.availableModels && result.availableModels.length > 0) {
          // Update the model dropdown with available models
          updateOllamaModelDropdown(result.availableModels);
          
          // Create a message with the available models
          const modelsMessage = `
            <div>
              <p>${t('options_ollama_test_ok')}</p>
              <p>${t('options_ollama_available_models')}</p>
              <ul class="models-list">
                ${result.availableModels.map(model => `<li>${model}</li>`).join('')}
              </ul>
              <p>${result.modelExists ? t('options_ollama_model_available') : result.modelMessage}</p>
            </div>
          `;
          
          // Show the message with HTML
          ollamaStatus.innerHTML = modelsMessage;
          ollamaStatus.className = 'status-message status-success with-list';
        } else {
          // Just show a simple success message
          showStatus(ollamaStatus, result.message, 'success');
        }
      } else {
        // Show error message
        showStatus(ollamaStatus, result.message, 'error');
      }
    } catch (error) {
      console.error('Error testing Ollama connection:', error);
      showStatus(ollamaStatus, `${t('err_generic_prefix')}${error.message}`, 'error');
    }
  });
  
  // Function to update the Ollama model dropdown with available models
  function updateOllamaModelDropdown(availableModels) {
    // Keep the custom option
    const customOption = ollamaModelSelect.querySelector('option[value="custom"]');
    
    // Clear existing options except the custom option
    ollamaModelSelect.innerHTML = '';
    
    // Add available models as options
    availableModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      ollamaModelSelect.appendChild(option);
    });
    
    // Add the custom option back
    if (customOption) {
      ollamaModelSelect.appendChild(customOption);
    } else {
      // If custom option doesn't exist, create it
      const option = document.createElement('option');
      option.value = 'custom';
      option.textContent = t('options_ollama_custom_option');
      ollamaModelSelect.appendChild(option);
    }
    
    // If the current selected model is in the list, select it
    const currentModel = ollamaModelSelect.value;
    if (availableModels.includes(currentModel)) {
      ollamaModelSelect.value = currentModel;
    } else if (ollamaModelSelect.options.length > 0) {
      // Otherwise select the first model
      ollamaModelSelect.selectedIndex = 0;
    }
  }
  
  // Save button click handler
  saveBtn.addEventListener('click', async () => {
    try {
      // Get values from inputs
      const deepseekApiKey = deepseekApiKeyInput.value.trim();
      const deepseekModel = deepseekModelSelect.value;

      const parsedBudget = parseInt(triageBudgetInput.value, 10);
      const triageConfig = {
        enabled: triageEnabledInput.checked,
        urgentDefinition: triageUrgentInput.value.trim(),
        // A blank or nonsensical budget must not disable the brake altogether.
        dailyCallBudget: Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : 200
      };
      const geminiApiKey = geminiApiKeyInput.value.trim();
      const openaiApiKey = openaiApiKeyInput.value.trim();
      const mistralApiKey = mistralApiKeyInput.value.trim();
      const ollamaHost = ollamaHostInput.value.trim();
      const ollamaModel = ollamaModelSelect.value;
      const ollamaCustomModel = ollamaCustomModelInput.value.trim();
      const selectedModel = modelSelect.value;
      const reasoningEffort = reasoningEffortSelect.value;
      const userSignature = userSignatureInput.value.trim();
      const enableFallback = enableFallbackCheckbox.checked;
      
      // Get fallback model selections
      const fallbackModels = [
        fallbackModel1Select.value,
        fallbackModel2Select.value,
        fallbackModel3Select.value
      ];
      
      // Validate required fields based on selected model
      if (selectedModel === 'deepseek' && !deepseekApiKey) {
        showMainStatus(t('err_deepseek_key_required_primary'), 'error');
        return;
      }

      if (selectedModel === 'gemini' && !geminiApiKey) {
        showMainStatus(t('err_gemini_key_required_primary'), 'error');
        return;
      }

      if (selectedModel === 'openai' && !openaiApiKey) {
        showMainStatus(t('err_openai_key_required_primary'), 'error');
        return;
      }

      if (selectedModel === 'gpt4o' && !openaiApiKey) {
        showMainStatus(t('err_openai_key_required_gpt4o'), 'error');
        return;
      }

      if (selectedModel === 'mistral' && !mistralApiKey) {
        showMainStatus(t('err_mistral_key_required_primary'), 'error');
        return;
      }

      if (selectedModel === 'ollama' && !ollamaHost) {
        showMainStatus(t('err_ollama_host_required_primary'), 'error');
        return;
      }

      if (selectedModel === 'ollama' && ollamaModel === 'custom' && !ollamaCustomModel) {
        showMainStatus(t('err_ollama_custom_model_required'), 'error');
        return;
      }
      
      // Validate fallback models if enabled
      if (enableFallback) {
        // Check if any fallback model is the same as the primary model
        if (fallbackModels.some(model => model === selectedModel && model !== 'none')) {
          showMainStatus(t('err_fallback_duplicate_primary'), 'error');
          return;
        }

        // Check if fallback models have required API keys
        for (const fallbackModel of fallbackModels) {
          if (fallbackModel === 'gemini' && !geminiApiKey) {
            showMainStatus(t('err_gemini_key_required_fallback'), 'error');
            return;
          }

          if (fallbackModel === 'openai' && !openaiApiKey) {
            showMainStatus(t('err_openai_key_required_fallback'), 'error');
            return;
          }

          if (fallbackModel === 'gpt4o' && !openaiApiKey) {
            showMainStatus(t('err_openai_key_required_fallback_gpt4o'), 'error');
            return;
          }

          if (fallbackModel === 'deepseek' && !deepseekApiKey) {
            showMainStatus(t('err_deepseek_key_required_fallback'), 'error');
            return;
          }

          if (fallbackModel === 'mistral' && !mistralApiKey) {
            showMainStatus(t('err_mistral_key_required_fallback'), 'error');
            return;
          }

          if (fallbackModel === 'ollama' && !ollamaHost) {
            showMainStatus(t('err_ollama_host_required_fallback'), 'error');
            return;
          }

          if (fallbackModel === 'ollama' && ollamaModel === 'custom' && !ollamaCustomModel) {
            showMainStatus(t('err_ollama_custom_model_required_fallback'), 'error');
            return;
          }
        }
      }
      
      // Save settings to storage
      await browser.storage.local.set({
        triageConfig,
        deepseekApiKey,
        deepseekModel,
        geminiApiKey,
        openaiApiKey,
        mistralApiKey,
        ollamaHost,
        ollamaModel,
        ollamaCustomModel,
        selectedModel,
        reasoningEffort,
        userSignature,
        enableFallback,
        fallbackModels
      });
      
      showMainStatus(t('options_settings_saved'), 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMainStatus(t('err_saving_settings') + error.message, 'error');
    }
  });
  
  // Function to show status message
  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message status-${type}`;
    
    // Clear status after 5 seconds
    setTimeout(() => {
      element.textContent = '';
      element.className = 'status-message';
    }, 5000);
  }
  
  // Function to show the main status message
  function showMainStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = `status-message status-${type}`;
    
    // Clear status after 5 seconds
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-message';
    }, 5000);
  }
  
  // Initialize UI based on current model selection
  updateUIForSelectedModel();
});

// Add CSS for the warning status, model selector, and fallback UI
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .warning {
      background-color: var(--warning-color);
      color: var(--warning-text);
    }
    
    .model-selector {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 10px;
    }
    
    .model-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      transition: background-color 0.2s;
    }
    
    .model-option:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
    
    .model-option input[type="radio"] {
      margin-top: 3px;
    }
    
    .model-option label {
      margin-bottom: 0;
      font-weight: 500;
    }
    
    .model-description {
      color: var(--light-text);
      font-size: 12px;
      margin-top: 4px;
      margin-left: 24px;
    }
    
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    
    .checkbox-item label {
      margin-bottom: 0;
      font-weight: normal;
    }
    
    .fallback-order {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    
    .arrow {
      color: var(--light-text);
      font-size: 16px;
    }
    
    .status-message {
      padding: 8px;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .status-message.status-success {
      background-color: #c6efce;
      color: #2e865f;
    }
    
    .status-message.status-error {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .status-message.status-info {
      background-color: #cff4fc;
      color: #0a53be;
    }
    
    .models-list {
      margin: 8px 0;
      padding-left: 20px;
      max-height: 150px;
      overflow-y: auto;
      background-color: rgba(255, 255, 255, 0.7);
      border-radius: 4px;
      padding: 8px 8px 8px 25px;
    }
    
    .models-list li {
      margin-bottom: 4px;
      font-family: monospace;
    }
    
    .status-message.with-list {
      padding: 12px;
    }
    
    .status-message.status-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .status-message.status-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .status-message.status-info {
      background-color: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
  `;
  document.head.appendChild(style);
});

// Debugging helper: lists which settings exist without ever printing their values, since storage
// holds the API keys in clear text and this used to dump all of them to the console on every load.
async function debugStorage() {
  try {
    const allSettings = await browser.storage.local.get(null);
    console.log('Settings present in storage:', Object.keys(allSettings));
  } catch (error) {
    console.error('Error debugging storage:', error);
  }
}

// Call debugStorage on page load to check what's in storage
document.addEventListener('DOMContentLoaded', debugStorage);