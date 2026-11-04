export function Words({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className} data-split>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, index) => (
          <span key={`${word}-${index}`}>
            {index > 0 ? ' ' : ''}
            <span className="word-mask"><span data-motion-word>{word}</span></span>
          </span>
        ))}
      </span>
    </span>
  );
}
