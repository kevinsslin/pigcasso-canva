import { ArrowRight } from "lucide-react";

export const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  return (
    <details className="group rounded-2xl border border-white/50 bg-white/70 backdrop-blur px-5 py-4 shadow-soft">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
        <span className="font-semibold">{question}</span>
        <span className="text-muted-foreground transition group-open:rotate-180">
          <ArrowRight className="size-4 rotate-90" />
        </span>
      </summary>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{answer}</p>
    </details>
  );
};

