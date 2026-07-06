
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  children: string;
  className?: string;
  inline?: boolean;
}

const MathText: React.FC<MathTextProps> = ({ children, className, inline = false }) => {
  const isPoetry = React.useMemo(() => {
    return children && children.includes(' / ');
  }, [children]);

  // Preprocess text to convert \( ... \) to $ ... $ and \[ ... \] to $$ ... $$
  const preprocessText = React.useCallback((val: string) => {
    if (!val) return '';
    let text = val;
    // Strip "Mức độ: ..." lines/metadata from rendering
    text = text.replace(/(?:Mức\s*độ|Độ\s*khó)\s*[:.-]?\s*(?:Nhận\s*biết|Kết\s*nối|Thông\s*hiểu|Vận\s*dụng(?: cao)?|NB|KN|TH|VD(?:C)?)/gi, '');
    // Auto bold-italic for quoted text: "abc" -> ***"abc"*** and “abc” -> ***“abc”***
    text = text.replace(/"([^"\\\n\r]{2,})"/g, '***"$1"***');
    text = text.replace(/“([^”\\\n\r]{2,})”/g, '***“$1”***');
    // Replace \[ and \] with $$
    text = text.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
    // Replace \( and \) with $
    text = text.replace(/\\\(/g, '$$').replace(/\\\)/g, '$$');
    // Escape markdown blockquote syntax if a line starts with >
    text = text.replace(/^(>)/gm, '\\>');
    // Escape markdown bold interpretation for [__]
    text = text.replace(/\[__\]/g, '[\\_\\_]');
    return text;
  }, []);

  if (isPoetry) {
    const lines = children.split(/\s+\/\s+/);
    return (
      <span className={`block my-2 text-left md:pl-12 font-medium italic ${className || ''}`}>
        {lines.map((line, idx) => (
          <span key={idx} className="block leading-relaxed min-h-[1.5em]">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <span className="inline">{children}</span>,
                img: ({ src, alt }) => (
                  <img 
                    src={src} 
                    alt={alt} 
                    className="max-w-full md:max-w-lg h-auto rounded-2xl shadow-md my-4 border border-gray-100 block transition-transform duration-300 hover:scale-[1.01]"
                    loading="lazy"
                  />
                )
              }}
            >
              {preprocessText(line)}
            </ReactMarkdown>
          </span>
        ))}
      </span>
    );
  }

  const processedText = React.useMemo(() => {
    return preprocessText(children);
  }, [children, preprocessText]);

  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => inline ? <span>{children}</span> : <p>{children}</p>,
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt} 
              className="max-w-full md:max-w-lg h-auto rounded-2xl shadow-md my-4 border border-gray-100 block transition-transform duration-300 hover:scale-[1.01]"
              loading="lazy"
            />
          )
        }}
      >
        {processedText}
      </ReactMarkdown>
    </span>
  );
};

export default MathText;
