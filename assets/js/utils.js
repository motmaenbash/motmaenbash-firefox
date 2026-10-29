// Utility functions for MotmaenBash extension

// Result of checking the certificate of a payment gateway page
const CERTIFICATE_STATUS = {
  OK: 'ok',
  UNKNOWN: 'unknown',
  NOT_SECURE: 'not_secure',
  INVALID: 'invalid',
  UNTRUSTED_ROOT: 'untrusted_root'
};

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getTypeName(type) {
  switch (type) {
    case 1: return 'فشینیگ';
    case 2: return 'کلاه‌برداری';
    case 3: return 'پانزی';
    case 4: return 'دیگر';
    default: return 'ناشناخته';
  }
}

function getLevelName(level) {
  switch (level) {
    case 1: return 'خطر';
    case 2: return 'هشدار';
    case 3: return 'خنثی';
    case 4: return 'اطلاعات';
    default: return 'ناشناخته';
  }
}

function getCertificateMessage(certificate) {
  switch (certificate.status) {
    case CERTIFICATE_STATUS.UNKNOWN:
      return {
        title: 'گواهی امنیتی درگاه بررسی نشد',
        text: 'صفحه را دوباره بارگذاری کنید تا گواهی امنیتی این درگاه بررسی شود',
        icon: '/assets/images/icon_128.png',
        className: 'status_title_nok'
      };
    case CERTIFICATE_STATUS.NOT_SECURE:
      return {
        title: 'هشدار: اتصال ناامن به درگاه پرداخت',
        text: 'این صفحه بدون رمزنگاری (HTTPS) باز شده است. اطلاعات کارت خود را وارد نکنید',
        icon: '/assets/images/icon_danger.png',
        className: 'status_title_danger'
      };
    case CERTIFICATE_STATUS.INVALID:
      return {
        title: 'هشدار: گواهی امنیتی نامعتبر',
        text: 'گواهی امنیتی این درگاه معتبر نیست و مرورگر درباره آن هشدار داده است. صفحه را ببندید و اطلاعات کارت خود را وارد نکنید',
        icon: '/assets/images/icon_danger.png',
        className: 'status_title_danger'
      };
    default:
      return {
        title: 'هشدار: احتمال شنود درگاه پرداخت',
        text: 'گواهی امنیتی این درگاه را مرجعی صادر کرده که جزو مراجع معتبر مرورگر نیست و روی دستگاه شما نصب شده است؛ پس برنامه یا شخص دیگری می‌تواند اطلاعات این صفحه را ببیند. اگر نام گواهی ریشه‌ی زیر را نمی‌شناسید، اطلاعات کارت خود را وارد نکنید',
        hint: 'اگر آنتی‌ویروس شما (مثل ESET یا Kaspersky) ترافیک HTTPS را بررسی می‌کند، علت این هشدار همان است و می‌توانید این بررسی را برای درگاه‌های پرداخت خاموش کنید.',
        icon: '/assets/images/icon_danger.png',
        className: 'status_title_danger'
      };
  }
}

function getSecurityMessage(result) {
  if (!result || typeof result !== 'object') {
    return {
      title: 'وضعیت نامشخص',
      text: 'اطلاعات کافی برای بررسی امنیت در دسترس نیست',
      icon: '/assets/images/icon_neutral.png',
      className: 'status_title_nok'
    };
  }

  if (result.certificate) {
    return getCertificateMessage(result.certificate);
  }

  if (result.secure === true) {
    return {
      title: 'درگاه پرداخت امن، مطمئن باش',
      text: 'این درگاه پرداخت معتبر و امن است',
      icon: '/assets/images/icon_ok.png',
      className: 'status_title_ok'
    };
  } else if (result.secure === false) {
    const type = typeof result.type === 'number' ? result.type : 0;
    const level = typeof result.level === 'number' ? result.level : 0;

    const typeName = getTypeName(type);
    const levelName = getLevelName(level);

    let title, text;

    switch (type) {
      case 1:
        title = 'هشدار: درگاه پرداخت جعلی';
        text = 'این درگاه پرداخت جعلی است و قصد سرقت اطلاعات شما را دارد';
        break;
      case 2:
        title = 'هشدار: کلاهبرداری';
        text = 'این سایت با هدف کلاهبرداری ایجاد شده است';
        break;
      case 3:
        title = 'هشدار: طرح پانزی';
        text = 'این سایت مرتبط با طرح‌های پانزی و کلاهبرداری مالی است';
        break;
      default:
        title = 'هشدار: سایت مشکوک';
        text = 'این سایت در لیست سایت‌های مشکوک قرار دارد';
    }

    return {
      title: title,
      text: text,
      icon: '/assets/images/icon_danger.png',
      className: 'status_title_danger',
      type: typeName,
      level: levelName
    };
  } else {
    return {
      title: 'این صفحه یک درگاه پرداخت نیست',
      text: 'تنها در صورت مشاهده تیک سبز رنگ، مطمئن باش که یک درگاه امن و معتبر است',
      icon: '/assets/images/icon_128.png',
      className: 'status_title_nok'
    };
  }
}
