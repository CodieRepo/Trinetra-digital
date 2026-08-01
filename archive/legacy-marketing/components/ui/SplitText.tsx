import { ForwardedRef, forwardRef } from "react";

interface SplitTextProps {
  children: string;
  className?: string;
  wordClassName?: string;
  charClassName?: string;
  mode?: "words" | "chars" | "both";
}

export const SplitText = forwardRef(function SplitText(
  { children, className = "", wordClassName = "", charClassName = "", mode = "both" }: SplitTextProps,
  ref: ForwardedRef<HTMLSpanElement>
) {
  if (typeof children !== "string") {
    return <span ref={ref} className={className}>{children}</span>;
  }

  const words = children.split(" ");

  return (
    <span
      ref={ref}
      className={`inline-block ${className}`}
      aria-label={children}
      role="text"
    >
      {words.map((word, wordIndex) => {
        const letters = word.split("");
        
        return (
          <span
            key={wordIndex}
            className={`inline-block whitespace-nowrap ${wordClassName}`}
            style={{ display: "inline-block" }}
            aria-hidden="true"
          >
            {mode === "words" ? (
              word
            ) : (
              letters.map((char, charIndex) => (
                <span
                  key={charIndex}
                  className={`inline-block origin-bottom ${charClassName}`}
                  style={{ display: "inline-block" }}
                >
                  {char}
                </span>
              ))
            )}
            {/* Add space after word if it's not the last word */}
            {wordIndex < words.length - 1 && (
              <span className="inline-block" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
});

export default SplitText;
