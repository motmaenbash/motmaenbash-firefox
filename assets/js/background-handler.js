// import DataManager from './data-manager.js';
// import { getSecurityMessage } from './utils.js';

class BackgroundHandler {
  constructor() {
    this.dataManager = new DataManager();
    this.certificateGuard = new CertificateGuard();
    this.initialized = false;

    // Registered right away so the background page can answer after it wakes up
    this.setupMessageListeners();
  }

  // Initialize the handler
  async init() {
    await this.dataManager.init();
    this.initialized = true;
  }

  // Set up message listeners for communication with content scripts and popup
  setupMessageListeners() {
    browser.runtime.onMessage.addListener(async (message, sender) => {
      try {
        if (message.action === 'checkSecurity' && message.url) {
          const tabId = typeof message.tabId === 'number' ? message.tabId : sender.tab && sender.tab.id;
          return await this.handleSecurityCheck(message.url, tabId);
        }

        if (message.action === 'updateDatabase') {
          return await this.handleDatabaseUpdate();
        }
      } catch (error) {
        console.error('Message handling error:', error);
        return { error: error.message || 'Unknown error' };
      }
    });
  }

  // Handle security check request
  async handleSecurityCheck(url, tabId) {
    try {
      if (!this.initialized) await this.dataManager.init();

      if (!url || typeof url !== 'string') {
        console.warn('Invalid URL provided to handleSecurityCheck:', url);
        return {
          securityResult: {
            secure: null,
            type: 0,
            level: 0,
            match: 0,
            error: 'Invalid URL'
          },
          message: {
            title: 'Invalid URL',
            text: 'The URL could not be verified',
            icon: '/assets/images/icon_neutral.png'
          }
        };
      }

      const securityResult = applyCertificateVerdict(
        await this.dataManager.checkUrlSecurity(url),
        url,
        this.certificateGuard.getVerdict(tabId, url)
      );
      const message = this.getSecurityMessage(securityResult);

      return {
        securityResult,
        message
      };
    } catch (error) {
      console.error('Error in handleSecurityCheck:', error);
      return {
        securityResult: {
          secure: null,
          type: 0,
          level: 0,
          match: 0,
          error: error.message
        },
        message: {
          title: 'Error checking security',
          text: 'An error occurred while verifying the URL',
          icon: '/assets/images/icon_neutral.png'
        }
      };
    }
  }

  // Handle database update request
  async handleDatabaseUpdate() {
    try {
      if (!this.initialized) {
        await this.dataManager.init();
      }

      const result = await this.dataManager.updateDatabase();

      return {
        success: true,
        count: result.count,
        timestamp: result.timestamp
      };
    } catch (error) {
      console.error('Error in handleDatabaseUpdate:', error);
      return {
        success: false,
        error: error.message || 'Unknown error updating database'
      };
    }
  }

  // Get security message based on result
  getSecurityMessage(result) {
    try {
      return getSecurityMessage(result);
    } catch (error) {
      console.error('Error getting security message:', error);
      return {
        title: 'Verification Error',
        text: 'Could not determine security status',
        icon: '/assets/images/icon_neutral.png'
      };
    }
  }
}

// export default BackgroundHandler;
window.BackgroundHandler = BackgroundHandler;
