// Certificate guard for MotmaenBash extension
// Checks that shaparak.ir pages are served with a certificate that chains up to one of
// Firefox's built-in root certificates. A root certificate installed on the device (for
// example one handed out to bank customers) can issue a valid-looking certificate for any
// website, so a gateway page secured by such a root may be intercepted even though the
// browser shows a padlock.

// Check whether a hostname is shaparak.ir or one of its subdomains
function isShaparakHost(hostname) {
  const host = (hostname || '').toLowerCase().replace(/\.$/, '');
  return host === 'shaparak.ir' || host.endsWith('.shaparak.ir');
}

// Get the common name of a distinguished name such as "CN=Example CA,O=Example,C=US"
function getCommonName(distinguishedName) {
  if (!distinguishedName) return null;

  const match = distinguishedName.match(/(?:^|,)\s*CN=([^,]+)/i);
  return match ? match[1].trim() : distinguishedName;
}

// Build a certificate verdict from the result of webRequest.getSecurityInfo()
function evaluateSecurityInfo(securityInfo) {
  // No TLS information for this response, e.g. it was served from a cache
  if (!securityInfo || securityInfo.state === 'insecure') {
    return { status: CERTIFICATE_STATUS.UNKNOWN };
  }

  if (securityInfo.state === 'broken') {
    return { status: CERTIFICATE_STATUS.INVALID };
  }

  const certificates = Array.isArray(securityInfo.certificates) ? securityInfo.certificates : [];
  const serverCertificate = certificates[0];
  const rootCertificate = certificates[certificates.length - 1];

  const verdict = {
    issuer: serverCertificate ? getCommonName(serverCertificate.issuer) : null,
    root: rootCertificate ? getCommonName(rootCertificate.subject) : null
  };

  // The user has bypassed a certificate error for this page
  if (securityInfo.isUntrusted || securityInfo.isDomainMismatch || securityInfo.isNotValidAtThisTime) {
    return { ...verdict, status: CERTIFICATE_STATUS.INVALID };
  }

  // The chain ends at a root certificate that doesn't ship with Firefox
  if (!rootCertificate || rootCertificate.isBuiltInRoot !== true) {
    return { ...verdict, status: CERTIFICATE_STATUS.UNTRUSTED_ROOT };
  }

  return { ...verdict, status: CERTIFICATE_STATUS.OK };
}

// Combine the database result of a URL with the certificate verdict of its page
function applyCertificateVerdict(securityResult, url, verdict) {
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (error) {
    return securityResult;
  }

  if (!isShaparakHost(urlObj.hostname) || (securityResult && securityResult.secure === false)) {
    return securityResult;
  }

  if (urlObj.protocol === 'http:') {
    verdict = { status: CERTIFICATE_STATUS.NOT_SECURE };
  }

  // Without a verdict the gateway can't be vouched for,
  // e.g. the page was opened before the extension was installed
  if (!verdict || verdict.status === CERTIFICATE_STATUS.UNKNOWN) {
    if (securityResult && securityResult.secure === true) {
      return {
        ...securityResult,
        secure: null,
        certificate: { status: CERTIFICATE_STATUS.UNKNOWN }
      };
    }
    return securityResult;
  }

  if (verdict.status === CERTIFICATE_STATUS.OK) {
    return securityResult;
  }

  return {
    secure: false,
    type: 0,
    level: 1,
    match: 0,
    certificate: verdict
  };
}

class CertificateGuard {
  constructor() {
    // tabId -> Map(hostname -> verdict of the last page loaded from that host in the tab)
    this.verdicts = new Map();
  }

  // Listener for webRequest.onHeadersReceived, registered with the "blocking" option
  // because getSecurityInfo() only works while the request is blocked
  async onHeadersReceived(details) {
    if (typeof details.tabId !== 'number' || details.tabId < 0) return {};

    try {
      const securityInfo = await browser.webRequest.getSecurityInfo(details.requestId, {
        certificateChain: true
      });
      this.storeVerdict(details.tabId, new URL(details.url).hostname, evaluateSecurityInfo(securityInfo));
    } catch (error) {
      console.error('Error checking certificate:', error);
    }

    return {};
  }

  // Store the verdict of a page, keeping a known verdict if the new response had no TLS information
  storeVerdict(tabId, hostname, verdict) {
    if (!this.verdicts.has(tabId)) {
      this.verdicts.set(tabId, new Map());
    }

    const tabVerdicts = this.verdicts.get(tabId);
    if (verdict.status === CERTIFICATE_STATUS.UNKNOWN && tabVerdicts.has(hostname)) return;

    tabVerdicts.set(hostname, verdict);
  }

  // Get the certificate verdict of the page loaded from a URL in a tab
  getVerdict(tabId, url) {
    if (typeof tabId !== 'number') return null;

    try {
      const tabVerdicts = this.verdicts.get(tabId);
      return (tabVerdicts && tabVerdicts.get(new URL(url).hostname)) || null;
    } catch (error) {
      return null;
    }
  }

  forgetTab(tabId) {
    this.verdicts.delete(tabId);
  }
}

window.CertificateGuard = CertificateGuard;
