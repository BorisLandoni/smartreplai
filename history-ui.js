// history-ui.js - UI interactions for response history and templates

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize managers
  const historyManager = new ResponseHistoryManager();
  const templateManager = new TemplateManager();

  // Turns a stored value (category, style, length, tag) into a localized label.
  // The stored value itself is never translated - only what we show on screen.
  // Unknown values fall back to the raw stored value.
  function localizedLabel(prefix, value) {
    if (!value) return '';
    const key = prefix + String(value).replace(/-/g, '_');
    const translated = t(key);
    return (translated && translated !== key) ? translated : value;
  }

  function categoryLabel(category) {
    return localizedLabel('history_cat_', category || 'general');
  }

  function styleLabel(style) {
    return localizedLabel('history_style_', style);
  }

  function lengthLabel(length) {
    return localizedLabel('history_len_', length);
  }

  function tagLabel(tag) {
    const asTag = localizedLabel('history_tag_', tag);
    return (asTag !== tag) ? asTag : localizedLabel('history_style_', tag);
  }

  // UI Elements - Tabs
  const historyTab = document.getElementById('history-tab');
  const templatesTab = document.getElementById('templates-tab');
  const historyContent = document.getElementById('history-content');
  const templatesContent = document.getElementById('templates-content');
  
  // UI Elements - History
  const historyList = document.getElementById('history-list');
  const historyDetail = document.getElementById('history-detail');
  const historySearch = document.getElementById('history-search');
  const historySearchBtn = document.getElementById('history-search-btn');
  const categoryFilter = document.getElementById('category-filter');
  const styleFilter = document.getElementById('style-filter');
  const lengthFilter = document.getElementById('length-filter');
  const advancedFilterBtn = document.getElementById('advanced-filter-btn');
  const advancedFilterPanel = document.getElementById('advanced-filter-panel');
  const tagFilters = document.getElementById('tag-filters');
  const startDateFilter = document.getElementById('start-date');
  const endDateFilter = document.getElementById('end-date');
  const modelFilter = document.getElementById('model-filter');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  
  // Pagination variables
  let currentPage = 1;
  let totalPages = 1;
  let itemsPerPage = 10;
  let allHistoryItems = [];
  
  // Current active filters
  let activeFilters = {
    searchTerm: '',
    category: '',
    style: '',
    length: '',
    tag: '',
    startDate: null,
    endDate: null,
    model: ''
  };
  
  // UI Elements - Templates
  const templatesList = document.getElementById('templates-list');
  const templateDetail = document.getElementById('template-detail');
  const templateSearch = document.getElementById('template-search');
  const templateSearchBtn = document.getElementById('template-search-btn');
  const templateCategoryFilter = document.getElementById('template-category-filter');
  const newTemplateBtn = document.getElementById('new-template-btn');
  const templateModal = document.getElementById('template-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const templateNameInput = document.getElementById('template-name');
  const templateCategorySelect = document.getElementById('template-category');
  const templateContentInput = document.getElementById('template-content');
  const templateVariablesDiv = document.getElementById('template-variables');
  const saveTemplateBtn = document.getElementById('save-template-btn');
  const cancelTemplateBtn = document.getElementById('cancel-template-btn');
  const templatePrevPageBtn = document.getElementById('template-prev-page');
  const templateNextPageBtn = document.getElementById('template-next-page');
  const templatePageInfo = document.getElementById('template-page-info');
  
  // Template pagination variables
  let templateCurrentPage = 1;
  let templateTotalPages = 1;
  let templateItemsPerPage = 10;
  let allTemplateItems = [];
  
  // Current template filters
  let templateFilters = {
    searchTerm: '',
    category: ''
  };
  
  // Current template being edited
  let currentTemplate = null;
  
  // Tab switching
  historyTab.addEventListener('click', () => {
    historyTab.classList.add('active');
    templatesTab.classList.remove('active');
    historyContent.classList.add('active');
    templatesContent.classList.remove('active');
  });
  
  templatesTab.addEventListener('click', () => {
    templatesTab.classList.add('active');
    historyTab.classList.remove('active');
    templatesContent.classList.add('active');
    historyContent.classList.remove('active');
    loadTemplates();
  });
  
  // Load initial history
  loadHistory();
  
  // Advanced filter button
  advancedFilterBtn.addEventListener('click', () => {
    advancedFilterPanel.style.display = advancedFilterPanel.style.display === 'none' ? 'block' : 'none';
  });
  
  // Tag filter clicks
  if (tagFilters) {
    const tagElements = tagFilters.querySelectorAll('.tag-filter');
    tagElements.forEach(tag => {
      tag.addEventListener('click', () => {
        // Toggle active class
        if (tag.classList.contains('active')) {
          tag.classList.remove('active');
          activeFilters.tag = '';
        } else {
          // Remove active class from all tags
          tagElements.forEach(t => t.classList.remove('active'));
          tag.classList.add('active');
          activeFilters.tag = tag.dataset.tag;
        }
      });
    });
  }
  
  // Apply filters button
  applyFiltersBtn.addEventListener('click', () => {
    activeFilters.startDate = startDateFilter.value ? new Date(startDateFilter.value).getTime() : null;
    activeFilters.endDate = endDateFilter.value ? new Date(endDateFilter.value + 'T23:59:59').getTime() : null;
    activeFilters.model = modelFilter.value;
    
    loadHistory(activeFilters);
    advancedFilterPanel.style.display = 'none';
  });
  
  // Reset filters button
  resetFiltersBtn.addEventListener('click', () => {
    // Reset all filter UI elements
    historySearch.value = '';
    categoryFilter.value = '';
    styleFilter.value = '';
    lengthFilter.value = '';
    startDateFilter.value = '';
    endDateFilter.value = '';
    modelFilter.value = '';
    
    // Reset tag filters
    const tagElements = tagFilters.querySelectorAll('.tag-filter');
    tagElements.forEach(tag => tag.classList.remove('active'));
    
    // Reset active filters object
    activeFilters = {
      searchTerm: '',
      category: '',
      style: '',
      length: '',
      tag: '',
      startDate: null,
      endDate: null,
      model: ''
    };
    
    // Reload history with reset filters
    loadHistory(activeFilters);
    advancedFilterPanel.style.display = 'none';
  });
  
  // History search
  historySearchBtn.addEventListener('click', () => {
    activeFilters.searchTerm = historySearch.value;
    loadHistory(activeFilters);
  });
  
  historySearch.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      activeFilters.searchTerm = historySearch.value;
      loadHistory(activeFilters);
    }
  });
  
  // Category filter
  categoryFilter.addEventListener('change', () => {
    activeFilters.category = categoryFilter.value;
    loadHistory(activeFilters);
  });
  
  // Style filter
  styleFilter.addEventListener('change', () => {
    activeFilters.style = styleFilter.value;
    loadHistory(activeFilters);
  });
  
  // Length filter
  lengthFilter.addEventListener('change', () => {
    activeFilters.length = lengthFilter.value;
    loadHistory(activeFilters);
  });
  
  // Clear history
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm(t('history_confirm_clear'))) {
      await historyManager.clearHistory();
      loadHistory();
      showEmptyHistoryDetail();
    }
  });
  
  // Template search
  templateSearchBtn.addEventListener('click', () => {
    templateFilters.searchTerm = templateSearch.value;
    loadTemplates(templateFilters);
  });
  
  templateSearch.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      templateFilters.searchTerm = templateSearch.value;
      loadTemplates(templateFilters);
    }
  });
  
  // Template category filter
  templateCategoryFilter.addEventListener('change', () => {
    templateFilters.category = templateCategoryFilter.value;
    loadTemplates(templateFilters);
  });
  
  // New template button
  newTemplateBtn.addEventListener('click', () => {
    openTemplateModal();
  });
  
  // Template content change - detect variables
  templateContentInput.addEventListener('input', () => {
    updateTemplateVariables();
  });
  
  // Modal close button
  closeModalBtn.addEventListener('click', () => {
    closeTemplateModal();
  });
  
  // Cancel template button
  cancelTemplateBtn.addEventListener('click', () => {
    closeTemplateModal();
  });
  
  // Save template button
  saveTemplateBtn.addEventListener('click', async () => {
    const name = templateNameInput.value.trim();
    const category = templateCategorySelect.value;
    const content = templateContentInput.value.trim();
    
    if (!name) {
      alert(t('history_alert_name_required'));
      return;
    }

    if (!content) {
      alert(t('history_alert_content_required'));
      return;
    }
    
    const variables = templateManager.extractTemplateVariables(content);
    
    const template = {
      id: currentTemplate ? currentTemplate.id : null,
      name,
      category,
      content,
      variables
    };
    
    await templateManager.saveTemplate(template);
    closeTemplateModal();
    loadTemplates();
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === templateModal) {
      closeTemplateModal();
    }
  });
  
  // Load history function
  async function loadHistory(filters = {}) {
    try {
      // Get all history items first
      allHistoryItems = await historyManager.getHistory(filters);
      
      // Calculate total pages
      totalPages = Math.max(1, Math.ceil(allHistoryItems.length / itemsPerPage));
      
      // Ensure current page is valid
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
      
      // Update pagination UI
      updatePaginationUI();
      
      // Clear history list
      historyList.innerHTML = '';
      
      if (allHistoryItems.length === 0) {
        historyList.innerHTML = `
          <div class="empty-state">
            <img src="icons/inbox.svg" alt="Empty" width="32" height="32">
            <p>${t('history_empty_no_history')}</p>
          </div>
        `;
        showEmptyHistoryDetail();
        return;
      }
      
      // Get items for current page
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, allHistoryItems.length);
      const currentPageItems = allHistoryItems.slice(startIndex, endIndex);
      
      // Populate history list
      currentPageItems.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.id = item.id;
        
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Truncate response for preview
        const previewText = item.response.substring(0, 100) + (item.response.length > 100 ? '...' : '');
        
        // Get style and length info
        const style = item.metadata.style ? `<span class="tag style-tag">${styleLabel(item.metadata.style)}</span>` : '';
        const length = item.metadata.length ? `<span class="tag length-tag">${lengthLabel(item.metadata.length)}</span>` : '';

        // Get tags
        let tagHtml = '';
        if (item.metadata.tags && item.metadata.tags.length > 0) {
          tagHtml = item.metadata.tags.map(tag => `<span class="tag">${tagLabel(tag)}</span>`).join('');
        }

        historyItem.innerHTML = `
          <div class="history-item-header">
            <div class="history-item-subject">${item.metadata.subject || t('history_no_subject')}</div>
            <div class="history-item-date">${formattedDate}</div>
          </div>
          <div class="history-item-recipient">${item.metadata.recipient || t('history_no_recipient')}</div>
          <div class="history-item-preview">${previewText}</div>
          <div class="history-item-footer">
            <div class="history-item-category">
              <span class="category-badge">${categoryLabel(item.metadata.category)}</span>
              ${style}
              ${length}
            </div>
            <div class="history-item-tags">
              ${tagHtml}
            </div>
          </div>
        `;
        
        historyItem.addEventListener('click', () => {
          // Remove selected class from all items
          const items = historyList.querySelectorAll('.history-item');
          items.forEach(i => i.classList.remove('selected'));
          
          // Add selected class to clicked item
          historyItem.classList.add('selected');
          
          // Show detail
          showHistoryDetail(item);
        });
        
        historyList.appendChild(historyItem);
      });
      
      // If this is the first load and we have items, select the first one
      if (historyList.querySelector('.history-item') && !historyList.querySelector('.history-item.selected')) {
        const firstItem = historyList.querySelector('.history-item');
        firstItem.classList.add('selected');
        showHistoryDetail(allHistoryItems[0]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      historyList.innerHTML = `
        <div class="empty-state error">
          <img src="icons/error.svg" alt="Error" width="32" height="32">
          <p>${t('history_error_loading_history')}: ${error.message}</p>
        </div>
      `;
    }
  }
  
  // Update pagination UI
  function updatePaginationUI() {
    // Update page info text
    pageInfo.textContent = `${t('history_page')} ${currentPage} ${t('history_page_of')} ${totalPages}`;
    
    // Enable/disable pagination buttons
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }
  
  // Pagination event listeners
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadHistory(activeFilters);
    }
  });
  
  nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadHistory(activeFilters);
    }
  });
  
  // Show history detail
  function showHistoryDetail(item) {
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    // Get style and length info
    const style = item.metadata.style ? `<span class="tag style-tag">${styleLabel(item.metadata.style)}</span>` : '';
    const length = item.metadata.length ? `<span class="tag length-tag">${lengthLabel(item.metadata.length)}</span>` : '';

    // Get tags
    let tagHtml = '';
    if (item.metadata.tags && item.metadata.tags.length > 0) {
      tagHtml = item.metadata.tags.map(tag => `<span class="tag">${tagLabel(tag)}</span>`).join('');
    }

    // Get model info
    const model = item.metadata.model ? `<div class="detail-field"><span class="field-label">${t('history_field_model')}</span> ${item.metadata.model}</div>` : '';

    // Get variant info
    const variant = item.metadata.variant ? `<div class="detail-field"><span class="field-label">${t('history_field_variant')}</span> ${item.metadata.variant}</div>` : '';

    historyDetail.innerHTML = `
      <div class="detail-header">
        <h2>${item.metadata.subject || t('history_no_subject')}</h2>
        <div class="detail-actions">
          <button class="action-btn template-btn" title="${t('history_title_save_as_template')}">
            <img src="icons/template.svg" alt="Template" width="14" height="14"> ${t('history_btn_template')}
          </button>
          <button class="action-btn delete-btn" title="${t('history_title_delete_response')}">
            <img src="icons/trash.svg" alt="Delete" width="14" height="14"> ${t('history_btn_delete')}
          </button>
        </div>
      </div>

      <div class="detail-metadata">
        <div class="detail-field"><span class="field-label">${t('history_field_date')}</span> ${formattedDate}</div>
        <div class="detail-field"><span class="field-label">${t('history_field_recipient')}</span> ${item.metadata.recipient || t('history_not_specified')}</div>
        <div class="detail-field">
          <span class="field-label">${t('history_field_category')}</span>
          <span class="category-badge">${categoryLabel(item.metadata.category)}</span>
        </div>
        ${model}
        ${variant}
        <div class="detail-field">
          <span class="field-label">${t('history_field_style_length')}</span>
          ${style} ${length}
        </div>
        <div class="detail-field">
          <span class="field-label">${t('history_field_tags')}</span>
          <div class="detail-tags">${tagHtml || t('history_no_tags')}</div>
        </div>
      </div>

      <div class="detail-content">
        <h3>${t('history_response_content')}</h3>
        <div class="response-content">${item.response.replace(/\n/g, '<br>')}</div>
      </div>
    `;
    
    // Add event listeners to buttons
    const templateBtn = historyDetail.querySelector('.template-btn');
    const deleteBtn = historyDetail.querySelector('.delete-btn');
    
    if (templateBtn) {
      templateBtn.addEventListener('click', () => saveResponseAsTemplate(item));
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm(t('history_confirm_delete_response'))) {
          await historyManager.deleteResponse(item.id);
          loadHistory(activeFilters);
          showEmptyHistoryDetail();
        }
      });
    }
  }
  
  // Show empty history detail
  function showEmptyHistoryDetail() {
    historyDetail.innerHTML = `
      <div class="empty-state">
        <img src="icons/envelope-open-text.svg" alt="Empty" width="32" height="32">
        <p>${t('history_empty_select_response')}</p>
      </div>
    `;
  }
  
  // Save response as template
  function saveResponseAsTemplate(item) {
    // Pre-fill template modal
    templateNameInput.value = item.metadata.subject || t('history_default_template_name');
    templateCategorySelect.value = item.metadata.category || 'general';
    templateContentInput.value = item.response;
    currentTemplate = null; // Create new template
    
    // Update template variables
    updateTemplateVariables();
    
    // Open modal
    templateModal.style.display = 'block';
  }
  
  // Load templates
  async function loadTemplates(filters = {}) {
    try {
      // Get all templates
      allTemplateItems = await templateManager.getTemplates(filters);
      
      // Calculate total pages
      templateTotalPages = Math.max(1, Math.ceil(allTemplateItems.length / templateItemsPerPage));
      
      // Ensure current page is valid
      if (templateCurrentPage > templateTotalPages) {
        templateCurrentPage = templateTotalPages;
      }
      
      // Update pagination UI
      updateTemplatePaginationUI();
      
      // Clear templates list
      templatesList.innerHTML = '';
      
      if (allTemplateItems.length === 0) {
        templatesList.innerHTML = `
          <div class="empty-state">
            <img src="icons/file.svg" alt="Empty" width="32" height="32">
            <p>${t('history_empty_no_templates')}</p>
          </div>
        `;
        showEmptyTemplateDetail();
        return;
      }
      
      // Get items for current page
      const startIndex = (templateCurrentPage - 1) * templateItemsPerPage;
      const endIndex = Math.min(startIndex + templateItemsPerPage, allTemplateItems.length);
      const currentPageItems = allTemplateItems.slice(startIndex, endIndex);
      
      // Populate templates list
      currentPageItems.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        templateItem.dataset.id = template.id;
        
        // Extract variables from template content
        const variables = templateManager.extractTemplateVariables(template.content);
        
        // Truncate content for preview
        const previewText = template.content.substring(0, 100) + (template.content.length > 100 ? '...' : '');
        
        // Create variables HTML
        let variablesHtml = '';
        if (variables.length > 0) {
          const displayVariables = variables.slice(0, 3);
          variablesHtml = displayVariables.map(v => `<span class="template-item-variable">${v}</span>`).join('');
          if (variables.length > 3) {
            variablesHtml += `<span class="template-item-variable">+${variables.length - 3} ${t('history_more_variables')}</span>`;
          }
        }

        templateItem.innerHTML = `
          <div class="template-item-header">
            <div class="template-item-name">${template.name}</div>
            <div class="template-item-category">${categoryLabel(template.category)}</div>
          </div>
          <div class="template-item-preview">${previewText}</div>
          <div class="template-item-footer">
            <div class="template-item-variables">
              ${variablesHtml}
            </div>
            <div class="template-item-date">
              ${new Date(template.timestamp).toLocaleDateString()}
            </div>
          </div>
        `;
        
        templateItem.addEventListener('click', () => {
          // Remove selected class from all items
          const items = templatesList.querySelectorAll('.template-item');
          items.forEach(i => i.classList.remove('selected'));
          
          // Add selected class to clicked item
          templateItem.classList.add('selected');
          
          // Show template detail
          showTemplateDetail(template);
        });
        
        templatesList.appendChild(templateItem);
      });
      
      // If this is the first load and we have items, select the first one
      if (templatesList.querySelector('.template-item') && !templatesList.querySelector('.template-item.selected')) {
        const firstItem = templatesList.querySelector('.template-item');
        firstItem.classList.add('selected');
        showTemplateDetail(allTemplateItems[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      templatesList.innerHTML = `
        <div class="empty-state error">
          <img src="icons/error.svg" alt="Error" width="32" height="32">
          <p>${t('history_error_loading_templates')}: ${error.message}</p>
        </div>
      `;
    }
  }
  
  // Update template pagination UI
  function updateTemplatePaginationUI() {
    // Update page info text
    templatePageInfo.textContent = `${t('history_page')} ${templateCurrentPage} ${t('history_page_of')} ${templateTotalPages}`;
    
    // Enable/disable pagination buttons
    templatePrevPageBtn.disabled = templateCurrentPage <= 1;
    templateNextPageBtn.disabled = templateCurrentPage >= templateTotalPages;
  }
  
  // Template pagination event listeners
  templatePrevPageBtn.addEventListener('click', () => {
    if (templateCurrentPage > 1) {
      templateCurrentPage--;
      loadTemplates(templateFilters);
    }
  });
  
  templateNextPageBtn.addEventListener('click', () => {
    if (templateCurrentPage < templateTotalPages) {
      templateCurrentPage++;
      loadTemplates(templateFilters);
    }
  });
  
  // Show template detail
  function showTemplateDetail(template) {
    const variables = templateManager.extractTemplateVariables(template.content);
    
    let variablesHtml = '';
    if (variables.length > 0) {
      variablesHtml = variables.map(v => `<span class="template-variable">${v}</span>`).join('');
    } else {
      variablesHtml = `<p class="no-variables">${t('history_no_variables_found')}</p>`;
    }

    templateDetail.innerHTML = `
      <div class="template-detail-header">
        <h2 class="template-detail-name">${template.name}</h2>
        <span class="template-detail-category">${categoryLabel(template.category)}</span>
      </div>
      <div class="template-detail-content">${template.content}</div>
      <div class="template-detail-variables">
        <h3>${t('history_label_template_variables')}</h3>
        <div class="template-variables">
          ${variablesHtml}
        </div>
      </div>
      <div class="template-detail-actions">
        <button class="filter-btn primary edit-template-btn" data-id="${template.id}">
          <img src="icons/edit.svg" alt="Edit" width="14" height="14"> ${t('history_btn_edit')}
        </button>
        <button class="filter-btn danger delete-template-btn" data-id="${template.id}">
          <img src="icons/trash.svg" alt="Delete" width="14" height="14"> ${t('history_btn_delete')}
        </button>
      </div>
    `;
    
    // Add event listeners to the buttons
    const editBtn = templateDetail.querySelector('.edit-template-btn');
    const deleteBtn = templateDetail.querySelector('.delete-template-btn');
    
    editBtn.addEventListener('click', () => {
      openTemplateModal(template);
    });
    
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`${t('history_confirm_delete_template')} "${template.name}"?`)) {
        await templateManager.deleteTemplate(template.id);
        loadTemplates(templateFilters);
      }
    });
  }
  
  // Show empty template detail
  function showEmptyTemplateDetail() {
    templateDetail.innerHTML = `
      <div class="empty-state">
        <img src="icons/file-alt.svg" alt="Select" width="32" height="32">
        <p>${t('history_empty_select_template')}</p>
      </div>
    `;
  }
  
  // Open template modal (for new template)
  function openTemplateModal(template = null) {
    // Clear form
    templateNameInput.value = template ? template.name : '';
    templateCategorySelect.value = template ? template.category : 'general';
    templateContentInput.value = template ? template.content : '';
    currentTemplate = template;
    
    // Clear variables
    templateVariablesDiv.innerHTML = `
      <p class="no-variables">${t('history_no_variables_detected')}</p>
    `;
    
    // Open modal
    templateModal.style.display = 'block';
  }
  
  // Close template modal
  function closeTemplateModal() {
    templateModal.style.display = 'none';
  }
  
  // Update template variables display
  function updateTemplateVariables() {
    const content = templateContentInput.value;
    const variables = templateManager.extractTemplateVariables(content);
    
    if (variables.length > 0) {
      templateVariablesDiv.innerHTML = variables.map(variable => 
        `<span class="variable-tag">${variable}</span>`
      ).join('');
    } else {
      templateVariablesDiv.innerHTML = `
        <p class="no-variables">${t('history_no_variables_detected')}</p>
      `;
    }
  }
});
