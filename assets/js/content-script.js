// Content script for MotmaenBash extension
// Create security verification overlay
function createSecurityOverlay(message) {
  const existingOverlay = document.getElementById('motmaenBashCornerSign');
  if (existingOverlay) existingOverlay.remove();

  const overlayDiv = document.createElement('div');
  overlayDiv.id = 'motmaenBashCornerSign';

  if (message.className) {
    overlayDiv.className = message.className;
  }

  // Only verified or dangerous gateways get a sign
  let imgSrc;
  if (message.icon && message.icon.includes('icon_danger.png')) {
    imgSrc = browser.runtime.getURL('assets/images/icon_danger.png');
  } else if (message.icon && message.icon.includes('icon_ok.png')) {
    imgSrc = browser.runtime.getURL('assets/images/sign.png');
  } else {
    return;
  }

  overlayDiv.innerHTML = `<a href="https://motmaenbash.milad.nu" target="_blank">
    <img title="${message.description || message.title || 'مطمئن باش'}"
    id="motmaenBashCornerSignLogo" 
    src="${imgSrc}"/>
  </a>`;

  document.body.insertBefore(overlayDiv, document.body.firstChild);
}

// Initial check for current URL
(async () => {
  const url = new URL(location.href);
  if (url.hostname.match(/\.shaparak\.ir$/i)) {
    try {
      // The gateway is only marked as verified once its certificate has been checked
      const response = await browser.runtime.sendMessage({ action: 'checkSecurity', url: location.href });
      if (response && response.message) {
        createSecurityOverlay(response.message);
      }
    } catch (error) {
      console.error('Error sending checkSecurity message:', error);
    }
  }
})();

// Listen for security updates from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateSecurity') {
    createSecurityOverlay(message.message);
    return Promise.resolve({ success: true });
  }
});
