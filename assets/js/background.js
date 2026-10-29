// import BackgroundHandler from './background-handler.js';

const handler = new BackgroundHandler();

// Check the certificate chain of every shaparak.ir page
browser.webRequest.onHeadersReceived.addListener(
  (details) => handler.certificateGuard.onHeadersReceived(details),
  { urls: ['https://*.shaparak.ir/*'], types: ['main_frame'] },
  ['blocking']
);

browser.tabs.onRemoved.addListener((tabId) => {
  handler.certificateGuard.forgetTab(tabId);
});

// Setup alarm for daily database updates
function setupUpdateAlarm() {
  browser.alarms.create('updateDatabase', {
    periodInMinutes: 1440 // Once per day
  });
}

// Handle extension install/update
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      await handler.init();
      await handler.handleDatabaseUpdate();
      console.log('Database initialized and updated');
      setupUpdateAlarm();
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }
});

// Handle alarm for periodic updates
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateDatabase') {
    try {
      const result = await handler.handleDatabaseUpdate();
      console.log(`Database updated with ${result.count} entries`);
    } catch (error) {
      console.error('Error updating database:', error);
    }
  }
});

// Check tab URL changes
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url || changeInfo.status !== 'complete') return;

  try {
    const url = new URL(tab.url);

    if (!handler.initialized) {
      await handler.init();
    }

    await handler.dataManager.checkForUpdate();

    const { securityResult, message } = await handler.handleSecurityCheck(tab.url, tabId);

    const iconPath = message?.icon || 'assets/images/icon_neutral.png';
    const title = message?.title || 'Motmaen Bash';

    // Set icon
    await browser.browserAction.setIcon({
      tabId,
      path: { 128: iconPath }
    });

    // Set title
    await browser.browserAction.setTitle({
      tabId,
      title
    });

    // Store result for popup
    await browser.storage.local.set({
      currentUrl: tab.url,
      securityResult,
      message
    });

    // Open popup if insecure
    if (securityResult?.secure === false) {
      browser.browserAction.openPopup();
    }

    // Send message to content script (optional)
    if (url.hostname.endsWith('.shaparak.ir')) {
      browser.tabs.sendMessage(tabId, {
        action: 'updateSecurity',
        securityResult,
        message
      });
    }
  } catch (error) {
    console.error('Error checking tab URL:', error);
  }
});

// open Web Site Motmaenbash After Install 
browser.runtime.onInstalled.addListener(() => {
  browser.tabs.create({
    url: "https://motmaenbash.ir/"
  });
});
