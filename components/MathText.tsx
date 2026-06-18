
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
  // Preprocess text to convert \( ... \) to $ ... $ and \[ ... \] to $$ ... $$
  const processedText = React.useMemo(() => {
    if (!children) return '';
    let text = children;
    // Replace \[ and \] with $$
    text = text.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
    // Replace \( and \) with $
    text = text.replace(/\\\(/g, '$$').replace(/\\\)/g, '$$');
    // Escape markdown blockquote syntax if a line starts with >
    text = text.replace(/^(>)/gm, '\\>');
    return text;
  }, [children]);

  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => inline ? <span>{children}</span> : <p>{children}</p>,
        }}
      >
        {processedText}
      </ReactMarkdown>
    </span>
  );
};

export default MathText;
