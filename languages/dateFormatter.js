// Date and time formatting utility
// Formats dates and times based on user's language settings

/**
 * Format date and time
 * @param number date timestamp Date object or date string
 * @param string language Language code (zh, en, ja)
 * @param string format Format type (date, time, datetime, short, long, relative)
 * @returns string Formatted string
 */
export function formatDateTime(date, language = 'zh', format = 'datetime') {
  if (!date) return '';

  const dateObj = typeof date === 'number' || typeof date === 'string'
    ? new Date(date)
    : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  // Locale preferences by language
  const localeMap = {
    zh: 'zh-CN',
    en: 'en-US',
    ja: 'ja-JP',
  };

  const locale = localeMap[language] || localeMap.zh;

  switch (format) {
    case 'date':
      // Date only
      return formatDate(dateObj, locale, language);

    case 'time':
      // Time only
      return formatTime(dateObj, locale, language);

    case 'datetime':
      // Date and time
      return formatFullDateTime(dateObj, locale, language);

    case 'short':
      // Short format - omit year or use relative time
      return formatShortDateTime(dateObj, locale, language);

    case 'long':
      // Long format - include day of week
      return formatLongDateTime(dateObj, locale, language);

    case 'relative':
      // Relative time e.g. 2 hours ago
      return formatRelativeTime(dateObj, language);

    default:
      return formatFullDateTime(dateObj, locale, language);
  }
}

/**
 * Format date only
 */
function formatDate(date, locale, language) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  switch (language) {
    case 'zh':
      return `${year}年${month}月${day}日`;
    case 'ja':
      return `${year}年${month}月${day}日`;
    case 'en':
    default:
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[month - 1]} ${day}, ${year}`;
  }
}

/**
 * Format time only
 */
function formatTime(date, locale, language) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const paddedMinutes = minutes.toString().padStart(2, '0');

  switch (language) {
    case 'zh':
    case 'ja':
      return `${hours}:${paddedMinutes}`;
    case 'en':
    default:
      // 12-hour format with AM PM
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${paddedMinutes} ${period}`;
  }
}

/**
 * Format full date and time
 */
function formatFullDateTime(date, locale, language) {
  const dateStr = formatDate(date, locale, language);
  const timeStr = formatTime(date, locale, language);

  switch (language) {
    case 'zh':
      return `${dateStr} ${timeStr}`;
    case 'ja':
      return `${dateStr} ${timeStr}`;
    case 'en':
    default:
      return `${dateStr} at ${timeStr}`;
  }
}

/**
 * Format short date and time
 */
function formatShortDateTime(date, locale, language) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateDay - today) / (1000 * 60 * 60 * 24));

  const timeStr = formatTime(date, locale, language);

  if (diffDays === 0) {
    // Today
    switch (language) {
      case 'zh':
        return `今天 ${timeStr}`;
      case 'ja':
        return `今日 ${timeStr}`;
      case 'en':
      default:
        return `Today at ${timeStr}`;
    }
  } else if (diffDays === -1) {
    // Yesterday
    switch (language) {
      case 'zh':
        return `昨天 ${timeStr}`;
      case 'ja':
        return `昨日 ${timeStr}`;
      case 'en':
      default:
        return `Yesterday at ${timeStr}`;
    }
  } else if (diffDays === 1) {
    // Tomorrow
    switch (language) {
      case 'zh':
        return `明天 ${timeStr}`;
      case 'ja':
        return `明日 ${timeStr}`;
      case 'en':
      default:
        return `Tomorrow at ${timeStr}`;
    }
  } else {
    // Other dates
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (language) {
      case 'zh':
        return `${month}月${day}日 ${timeStr}`;
      case 'ja':
        return `${month}月${day}日 ${timeStr}`;
      case 'en':
      default:
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[month - 1]} ${day} at ${timeStr}`;
    }
  }
}

/**
 * Format long date and time with day of week
 */
function formatLongDateTime(date, locale, language) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  const weekdayNames = {
    zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };

  const timeStr = formatTime(date, locale, language);
  const weekday = weekdayNames[language][dayOfWeek];

  switch (language) {
    case 'zh':
      return `${year}年${month}月${day}日 ${weekday} ${timeStr}`;
    case 'ja':
      return `${year}年${month}月${day}日 (${weekday}) ${timeStr}`;
    case 'en':
    default:
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${weekday}, ${monthNames[month - 1]} ${day}, ${year} at ${timeStr}`;
  }
}

/**
 * Format relative time e.g. 2 hours ago
 */
function formatRelativeTime(date, language) {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const templates = {
    zh: {
      justNow: '刚刚',
      secondsAgo: '{n}秒前',
      minutesAgo: '{n}分钟前',
      hoursAgo: '{n}小时前',
      daysAgo: '{n}天前',
      weeksAgo: '{n}周前',
      monthsAgo: '{n}个月前',
      yearsAgo: '{n}年前',
    },
    ja: {
      justNow: 'たった今',
      secondsAgo: '{n}秒前',
      minutesAgo: '{n}分前',
      hoursAgo: '{n}時間前',
      daysAgo: '{n}日前',
      weeksAgo: '{n}週間前',
      monthsAgo: '{n}ヶ月前',
      yearsAgo: '{n}年前',
    },
    en: {
      justNow: 'Just now',
      secondsAgo: '{n} seconds ago',
      minutesAgo: '{n} minutes ago',
      hoursAgo: '{n} hours ago',
      daysAgo: '{n} days ago',
      weeksAgo: '{n} weeks ago',
      monthsAgo: '{n} months ago',
      yearsAgo: '{n} years ago',
    },
  };

  const t = templates[language] || templates.zh;

  if (diffSeconds < 10) {
    return t.justNow;
  } else if (diffSeconds < 60) {
    return t.secondsAgo.replace('{n}', diffSeconds);
  } else if (diffMinutes < 60) {
    return t.minutesAgo.replace('{n}', diffMinutes);
  } else if (diffHours < 24) {
    return t.hoursAgo.replace('{n}', diffHours);
  } else if (diffDays < 7) {
    return t.daysAgo.replace('{n}', diffDays);
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return t.weeksAgo.replace('{n}', weeks);
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return t.monthsAgo.replace('{n}', months);
  } else {
    const years = Math.floor(diffDays / 365);
    return t.yearsAgo.replace('{n}', years);
  }
}

/**
 * Export convenient hook functions
 */
export default {
  formatDateTime,
  formatDate: (date, language) => formatDate(typeof date === 'number' ? new Date(date) : date, null, language),
  formatTime: (date, language) => formatTime(typeof date === 'number' ? new Date(date) : date, null, language),
  formatRelative: (date, language) => formatRelativeTime(typeof date === 'number' ? new Date(date) : date, language),
};
