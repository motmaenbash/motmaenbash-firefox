// Popup script for MotmaenBash extension
// Handles displaying security information in the popup
async function updatePopupContent() {
  const statusIcon = document.getElementById('status_icon');
  const statusTitle = document.getElementById('status_title');
  let detailsContainer = document.getElementById('security_details') || document.createElement('div');
  detailsContainer.id = 'security_details';

  detailsContainer.innerHTML = '';
  if (detailsContainer.parentNode) {
    detailsContainer.parentNode.removeChild(detailsContainer);
  }

  try {
    const data = await browser.storage.local.get(['currentUrl', 'securityResult', 'message']);
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });

    if (tabs && tabs[0] && tabs[0].url) {
      const currentTabUrl = tabs[0].url;
      let result = data;

      // The stored result belongs to another page, so ask the background script
      if (!(data.currentUrl && data.message && data.currentUrl === currentTabUrl)) {
        result = await browser.runtime.sendMessage({
          action: 'checkSecurity',
          url: currentTabUrl,
          tabId: tabs[0].id
        });
      }

      if (result && result.message) {
        statusIcon.src = result.message.icon;
        statusTitle.className = result.message.className || 'status_title_nok';
        statusTitle.innerHTML = result.message.title;

        if (result.securityResult && result.securityResult.certificate) {
          showCertificateDetails(detailsContainer, result.securityResult.certificate, result.message);
          statusTitle.parentNode.insertBefore(detailsContainer, statusTitle.nextSibling);
        } else if (result.securityResult && result.securityResult.secure === false) {
          const typeName = getTypeName(result.securityResult.type);
          const levelName = getLevelName(result.securityResult.level);
          const matchType = result.securityResult.match === 1 ? 'دامنه' : 'آدرس کامل';

          detailsContainer.innerHTML = `
            <div class="security_detail">
              <span class="detail_label">نوع تهدید:</span> 
              <span class="detail_value">${typeName}</span>
            </div>
            <div class="security_detail">
              <span class="detail_label">سطح هشدار:</span> 
              <span class="detail_value">${levelName}</span>
            </div>
            <div class="security_detail">
              <span class="detail_label">تطابق:</span> 
              <span class="detail_value">${matchType}</span>
            </div>
          `;

          statusTitle.parentNode.insertBefore(detailsContainer, statusTitle.nextSibling);
        }
      }
    }
  } catch (error) {
    console.error('Error updating popup content:', error);
  }
}

// Show why the certificate of a payment gateway page couldn't be trusted.
// Certificate names come from the server, so they are only ever set as text.
function showCertificateDetails(container, certificate, message) {
  const addText = (text) => {
    const line = document.createElement('div');
    line.className = 'security_detail_text';
    line.textContent = text;
    container.appendChild(line);
  };

  const addDetail = (label, value) => {
    const row = document.createElement('div');
    row.className = 'security_detail';

    const labelElement = document.createElement('span');
    labelElement.className = 'detail_label';
    labelElement.textContent = label;

    const valueElement = document.createElement('span');
    valueElement.className = 'detail_value';
    valueElement.dir = 'ltr';
    valueElement.textContent = value;

    row.append(labelElement, valueElement);
    container.appendChild(row);
  };

  if (message.text) addText(message.text);
  if (certificate.issuer) addDetail('صادرکننده گواهی:', certificate.issuer);
  if (certificate.root) addDetail('گواهی ریشه:', certificate.root);
  if (message.hint) addText(message.hint);
}

document.addEventListener('DOMContentLoaded', () => {
  updatePopupContent();

  browser.tabs.onActivated.addListener(() => {
    updatePopupContent();
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      updatePopupContent();
    }
  });

  const updateButton = document.getElementById('update_database');
  if (updateButton) {
    updateButton.addEventListener('click', async () => {
      updateButton.textContent = 'در حال بروزرسانی...';
      updateButton.disabled = true;

      try {
        const response = await browser.runtime.sendMessage({ action: 'updateDatabase' });
        if (response && response.success) {
          updateButton.textContent = 'بروزرسانی با موفقیت انجام شد';
          setTimeout(() => {
            updateButton.textContent = 'بروزرسانی پایگاه داده';
            updateButton.disabled = false;
          }, 2000);
        } else {
          updateButton.textContent = 'خطا در بروزرسانی';
          updateButton.disabled = false;
        }
      } catch (error) {
        updateButton.textContent = 'خطا در بروزرسانی';
        updateButton.disabled = false;
      }
    });
  }
});
