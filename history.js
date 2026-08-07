// history.js - Manages response history and email templates

// Response History Manager
class ResponseHistoryManager {
  constructor() {
    this.storageKey = 'responseHistory';
    this.maxHistoryItems = 100;
    this.categories = [
      'business',
      'personal',
      'follow-up',
      'thank-you',
      'introduction',
      'request',
      'scheduling',
      'inquiry',
      'informational',
      'problem-solving',
      'general'
    ];
  }
  
  // Save a response to history
  async saveResponse(emailId, response, metadata = {}) {
    try {
      const { responseHistory = [] } = await browser.storage.local.get(this.storageKey);
      
      // Auto-categorize if no category is provided
      let category = metadata.category || 'general';
      if (!metadata.category) {
        category = await this.autoCategorizeResponse(response, metadata.subject || '');
      }
      
      // Create history item with metadata
      const historyItem = {
        id: this.generateId(),
        emailId,
        response,
        timestamp: Date.now(),
        metadata: {
          subject: metadata.subject || '',
          recipient: metadata.recipient || '',
          category: category,
          style: metadata.style || '',
          length: metadata.length || '',
          tags: metadata.tags || this.generateTags(response, metadata.subject || ''),
          ...metadata
        }
      };
      
      // Add to history (at the beginning)
      responseHistory.unshift(historyItem);
      
      // Limit history size
      if (responseHistory.length > this.maxHistoryItems) {
        responseHistory.length = this.maxHistoryItems;
      }
      
      // Save to storage
      await browser.storage.local.set({ [this.storageKey]: responseHistory });
      console.log('Response saved to history:', historyItem.id);
      
      return historyItem.id;
    } catch (error) {
      console.error('Error saving response to history:', error);
      throw error;
    }
  }
  
  // Auto-categorize a response based on content analysis
  async autoCategorizeResponse(response, subject) {
    try {
      // Try to use AI for categorization if available
      if (window.callAIApi) {
        const prompt = `Analyze the following email response and categorize it into EXACTLY ONE of these categories: ${this.categories.join(', ')}. 
        Only respond with the category name, nothing else.
        
        Subject: ${subject}
        
        Response:
        ${response.substring(0, 500)}`;
        
        try {
          // Get settings
          const settings = await browser.storage.local.get([
            'selectedModel',
            'geminiApiKey',
            'openaiApiKey'
          ]);
          
          const result = await window.callAIApi(
            prompt, 
            settings.selectedModel || 'gemini', 
            settings.geminiApiKey, 
            settings.openaiApiKey,
            'low'
          );
          
          // Extract just the category name from the response
          const category = result.trim().toLowerCase();
          
          // Validate that the returned category is in our list
          if (this.categories.includes(category)) {
            return category;
          }
        } catch (error) {
          console.error('Error auto-categorizing with AI:', error);
          // Fall back to rule-based categorization
        }
      }
      
      // Rule-based categorization as fallback
      return this.ruleBasedCategorization(response, subject);
    } catch (error) {
      console.error('Error in auto-categorization:', error);
      return 'general';
    }
  }
  
  // Rule-based categorization as a fallback method
  ruleBasedCategorization(response, subject) {
    const combinedText = (response + ' ' + subject).toLowerCase();
    
    // Define keywords for each category
    const categoryKeywords = {
      'business': ['meeting', 'project', 'deadline', 'client', 'proposal', 'contract', 'business'],
      'personal': ['family', 'friend', 'personal', 'weekend', 'holiday', 'vacation'],
      'follow-up': ['follow up', 'following up', 'checking in', 'status update', 'progress'],
      'thank-you': ['thank you', 'thanks', 'grateful', 'appreciate', 'appreciation'],
      'introduction': ['introduce', 'introduction', 'nice to meet', 'pleasure to meet', 'connecting'],
      'request': ['request', 'asking', 'could you', 'would you', 'please provide', 'need your'],
      'scheduling': ['schedule', 'calendar', 'meeting', 'appointment', 'available', 'time', 'date'],
      'inquiry': ['question', 'inquiry', 'wondering', 'interested in', 'information about'],
      'informational': ['inform', 'update', 'notify', 'announcement', 'news', 'information'],
      'problem-solving': ['issue', 'problem', 'resolve', 'solution', 'fix', 'trouble', 'concern']
    };
    
    // Score each category based on keyword matches
    const scores = {};
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      scores[category] = 0;
      
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          scores[category] += 1;
        }
      }
    }
    
    // Find the category with the highest score
    let bestCategory = 'general';
    let highestScore = 0;
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    }
    
    return bestCategory;
  }
  
  // Generate tags based on content analysis
  generateTags(response, subject) {
    const combinedText = (response + ' ' + subject).toLowerCase();
    const tags = [];
    
    // Common business tags
    const tagKeywords = {
      'urgent': ['urgent', 'asap', 'immediately', 'emergency'],
      'action-required': ['action', 'required', 'need to', 'must', 'important'],
      'question': ['question', '?', 'wondering', 'curious'],
      'meeting': ['meeting', 'calendar', 'schedule', 'appointment'],
      'feedback': ['feedback', 'thoughts', 'opinion', 'review'],
      'deadline': ['deadline', 'due date', 'by tomorrow', 'by next week'],
      'collaboration': ['collaborate', 'together', 'team', 'partnership'],
      'report': ['report', 'data', 'numbers', 'statistics', 'results'],
      'approval': ['approve', 'approval', 'permission', 'authorize'],
      'fyi': ['fyi', 'for your information', 'just letting you know']
    };
    
    // Add tags based on keyword matches
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          tags.push(tag);
          break; // Only add the tag once
        }
      }
    }
    
    // Add style and length tags if available in the response
    if (combinedText.includes('professional')) tags.push('professional');
    if (combinedText.includes('friendly')) tags.push('friendly');
    if (combinedText.includes('concise')) tags.push('concise');
    if (combinedText.includes('detailed')) tags.push('detailed');
    
    // Limit to 5 tags maximum
    return [...new Set(tags)].slice(0, 5); // Remove duplicates and limit
  }
  
  // Get all response history
  async getHistory(filters = {}) {
    try {
      const { responseHistory = [] } = await browser.storage.local.get(this.storageKey);
      
      // Apply filters if provided
      if (Object.keys(filters).length > 0) {
        return responseHistory.filter(item => {
          // Filter by search term (across response content and metadata)
          if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            const searchableText = [
              item.response, 
              item.metadata.subject, 
              item.metadata.recipient,
              item.metadata.category,
              ...(item.metadata.tags || [])
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
              return false;
            }
          }
          
          // Filter by category
          if (filters.category && item.metadata.category !== filters.category) {
            return false;
          }
          
          // Filter by tag
          if (filters.tag && (!item.metadata.tags || !item.metadata.tags.includes(filters.tag))) {
            return false;
          }
          
          // Filter by style
          if (filters.style && item.metadata.style !== filters.style) {
            return false;
          }
          
          // Filter by length
          if (filters.length && item.metadata.length !== filters.length) {
            return false;
          }

          // Filter by AI model
          if (filters.model && item.metadata.model !== filters.model) {
            return false;
          }

          // Filter by date range
          if (filters.startDate && item.timestamp < filters.startDate) {
            return false;
          }
          
          if (filters.endDate && item.timestamp > filters.endDate) {
            return false;
          }
          
          return true;
        });
      }
      
      return responseHistory;
    } catch (error) {
      console.error('Error getting response history:', error);
      throw error;
    }
  }
  
  // Get a specific response by ID
  async getResponseById(id) {
    try {
      const { responseHistory = [] } = await browser.storage.local.get(this.storageKey);
      return responseHistory.find(item => item.id === id) || null;
    } catch (error) {
      console.error('Error getting response by ID:', error);
      throw error;
    }
  }
  
  // Delete a response from history
  async deleteResponse(id) {
    try {
      const { responseHistory = [] } = await browser.storage.local.get(this.storageKey);
      const updatedHistory = responseHistory.filter(item => item.id !== id);
      
      if (updatedHistory.length !== responseHistory.length) {
        await browser.storage.local.set({ [this.storageKey]: updatedHistory });
        console.log('Response deleted from history:', id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting response from history:', error);
      throw error;
    }
  }
  
  // Clear all history
  async clearHistory() {
    try {
      await browser.storage.local.set({ [this.storageKey]: [] });
      console.log('Response history cleared');
      return true;
    } catch (error) {
      console.error('Error clearing response history:', error);
      throw error;
    }
  }
  
  // Helper method to generate a unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}

// Template Manager
class TemplateManager {
  constructor() {
    this.storageKey = 'emailTemplates';
    this.categories = [
      'customer-service',
      'internal',
      'follow-up',
      'thank-you',
      'introduction',
      'request',
      'general'
    ];
  }
  
  // Save a template
  async saveTemplate(template) {
    try {
      const { emailTemplates = [] } = await browser.storage.local.get(this.storageKey);
      
      // Check if template already exists (update it)
      const existingIndex = template.id ? 
        emailTemplates.findIndex(t => t.id === template.id) : -1;
      
      if (existingIndex >= 0) {
        // Update existing template
        emailTemplates[existingIndex] = {
          ...emailTemplates[existingIndex],
          ...template,
          updatedAt: Date.now()
        };
      } else {
        // Add new template
        emailTemplates.push({
          id: this.generateId(),
          name: template.name,
          content: template.content,
          category: template.category || 'general',
          variables: template.variables || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      // Save to storage
      await browser.storage.local.set({ [this.storageKey]: emailTemplates });
      console.log('Template saved:', template.name);
      
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }
  
  // Get all templates, optionally filtered (mirrors ResponseHistoryManager.getHistory's filter object shape)
  async getTemplates(filters = {}) {
    try {
      const { emailTemplates = [] } = await browser.storage.local.get(this.storageKey);

      if (Object.keys(filters).length > 0) {
        return emailTemplates.filter(template => {
          // Filter by category
          if (filters.category && template.category !== filters.category) {
            return false;
          }

          // Filter by search term (across name, content and category)
          if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            const searchableText = [
              template.name,
              template.content,
              template.category,
              ...(template.variables || [])
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchTerm)) {
              return false;
            }
          }

          return true;
        });
      }

      return emailTemplates;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }
  
  // Get a specific template by ID
  async getTemplateById(id) {
    try {
      const { emailTemplates = [] } = await browser.storage.local.get(this.storageKey);
      return emailTemplates.find(template => template.id === id) || null;
    } catch (error) {
      console.error('Error getting template by ID:', error);
      throw error;
    }
  }
  
  // Delete a template
  async deleteTemplate(id) {
    try {
      const { emailTemplates = [] } = await browser.storage.local.get(this.storageKey);
      const updatedTemplates = emailTemplates.filter(template => template.id !== id);
      
      if (updatedTemplates.length !== emailTemplates.length) {
        await browser.storage.local.set({ [this.storageKey]: updatedTemplates });
        console.log('Template deleted:', id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
  
  // Apply template variables to template content
  applyTemplateVariables(templateContent, variables) {
    let content = templateContent;
    
    // Replace variables in the format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, value);
    });
    
    return content;
  }
  
  // Extract variables from template content
  extractTemplateVariables(templateContent) {
    const variableRegex = /{{(.*?)}}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(templateContent)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  }
  
  // Get available template categories
  getCategories() {
    return this.categories;
  }
  
  // Helper method to generate a unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}

// Export the managers
window.ResponseHistoryManager = ResponseHistoryManager;
window.TemplateManager = TemplateManager;
