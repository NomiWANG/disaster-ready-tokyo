import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import { formatDateTime } from './dateFormatter';

export function useDateFormatter() {
  const { language } = useContext(LanguageContext);

  return {
    /**
     * 格式化日期时间
     * @param {number|Date|string} date 时间戳 Date对象或日期字符串
     * @param {string} format 格式类型 date time datetime short long relative
     */
    formatDateTime: (date, format = 'datetime') => formatDateTime(date, language, format),
    
    /**
     * 格式化为日期（仅日期部分）
     */
    formatDate: (date) => formatDateTime(date, language, 'date'),
    
    /**
     * 格式化为时间（仅时间部分）
     */
    formatTime: (date) => formatDateTime(date, language, 'time'),
    
    /**
     * 格式化为短格式
     */
    formatShort: (date) => formatDateTime(date, language, 'short'),
    
    /**
     * 格式化为长格式（包含星期几）
     */
    formatLong: (date) => formatDateTime(date, language, 'long'),
    
    /**
     * 格式化为相对时间（例如：2小时前）
     */
    formatRelative: (date) => formatDateTime(date, language, 'relative'),
  };
}

export default useDateFormatter;
