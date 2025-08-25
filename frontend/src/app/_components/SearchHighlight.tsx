import React from 'react';

interface SearchHighlightProps {
  text: string;
  searchQuery: string;
  className?: string;
}

export function SearchHighlight({ text, searchQuery, className = '' }: SearchHighlightProps) {
  if (!searchQuery.trim()) {
    return <span className={className}>{text}</span>;
  }

  // 検索クエリを分割（スペース区切り）
  const searchTerms = searchQuery.trim().split(/\s+/);
  
  // 各検索語を正規表現でエスケープ
  const escapedTerms = searchTerms.map(term => 
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  
  // 検索語のパターンを作成（大文字小文字を区別しない）
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  
  // テキストを分割してハイライト部分を特定
  const parts = text.split(pattern);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // 検索語にマッチする部分をハイライト
        if (searchTerms.some(term => 
          part.toLowerCase().includes(term.toLowerCase())
        )) {
          return (
            <span 
              key={index} 
              className="bg-yellow-200 underline decoration-yellow-400 decoration-2"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

// 電話番号検索用のハイライト（ハイフンを無視）
export function PhoneSearchHighlight({ phone, searchQuery, className = '' }: {
  phone: string | null;
  searchQuery: string;
  className?: string;
}) {
  if (!phone || !searchQuery.trim()) {
    return <span className={className}>{phone || '-'}</span>;
  }

  // 電話番号からハイフンを除去
  const normalizedPhone = phone.replace(/[^\d]/g, '');
  const normalizedQuery = searchQuery.replace(/[^\d]/g, '');
  
  if (normalizedPhone.includes(normalizedQuery)) {
    return (
      <span className={className}>
        <span className="bg-yellow-200 underline decoration-yellow-400 decoration-2">
          {phone}
        </span>
      </span>
    );
  }
  
  return <span className={className}>{phone}</span>;
}
