import React, { useState } from "react";
import {
  Sparkles,
  User,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Search,
  ShieldCheck,
  FileText,
  Calendar,
  CreditCard,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PackageCarouselCard,
  DateAvailabilityCard,
  PaymentSummaryCard,
  InquiryConfirmationCard,
} from "./ZelleCards";
import { Badge } from "../ui/badge";

/**
 * Parses markdown text into blocks (paragraphs, lists, tables, headers)
 */
function parseMarkdownBlocks(text) {
  if (!text) return [];

  const lines = text.split("\n");
  const blocks = [];
  let currentTable = null;
  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Markdown Table Row: | col 1 | col 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Check if it's a separator line (e.g. |---|---|)
      const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(trimmed);
      if (!currentTable) {
        currentTable = { type: "table", headers: [], rows: [] };
        // First row is headers
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        currentTable.headers = cells;
      } else if (!isSeparator) {
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      blocks.push(currentTable);
      currentTable = null;
    }

    // 2. Unordered Bullet List (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[-*•]\s+/, "");
      if (!currentList || currentList.type !== "ul") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(content);
      continue;
    }

    // 3. Ordered List (1. 2. 3.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s+/, "");
      if (!currentList || currentList.type !== "ol") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(content);
      continue;
    }

    // Flush any open list if this line is not a list item
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    // 4. Headers
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.replace(/^###\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.replace(/^##\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.replace(/^#\s+/, "") });
      continue;
    }

    // 5. Empty spacer line
    if (!trimmed) {
      blocks.push({ type: "space" });
      continue;
    }

    // 6. Normal Paragraph
    blocks.push({ type: "p", text: line });
  }

  if (currentTable) blocks.push(currentTable);
  if (currentList) blocks.push(currentList);

  return blocks;
}

/**
 * Formats inline bold (**text**), code (`code`), and italic (*text*)
 */
function formatInline(str) {
  if (typeof str !== "string") return str;

  // Split by bold (**...**) and code (`...`)
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[11px] text-primary font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Rich Markdown View Component
 */
export function RichMarkdownRenderer({ text }) {
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-2 text-xs leading-relaxed break-words">
      {blocks.map((block, idx) => {
        if (block.type === "h1") {
          return (
            <h3 key={idx} className="font-serif font-bold text-sm text-foreground pt-1 pb-0.5 border-b border-border/40">
              {formatInline(block.text)}
            </h3>
          );
        }
        if (block.type === "h2") {
          return (
            <h4 key={idx} className="font-serif font-bold text-xs text-foreground pt-1 text-primary">
              {formatInline(block.text)}
            </h4>
          );
        }
        if (block.type === "h3") {
          return (
            <h5 key={idx} className="font-semibold text-xs text-foreground pt-0.5">
              {formatInline(block.text)}
            </h5>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={idx} className="space-y-1 my-1.5 pl-3">
              {block.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-foreground/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span className="leading-snug">{formatInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={idx} className="space-y-1.5 my-1.5 pl-3">
              {block.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-foreground/90">
                  <span className="font-mono font-bold text-primary shrink-0">{iIdx + 1}.</span>
                  <span className="leading-snug">{formatInline(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "table") {
          return (
            <div key={idx} className="my-2.5 overflow-x-auto rounded-2xl border border-border/80 shadow-2xs bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border/60">
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="p-2.5 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                        {formatInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-foreground/90 leading-snug">
                          {formatInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === "space") {
          return <div key={idx} className="h-1" />;
        }
        return (
          <p key={idx} className="text-foreground/90 leading-relaxed">
            {formatInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Multi-Step Execution Stepper Timeline (Photos 4 & 5 Style)
 */
export function ToolExecutionStepper({ toolExecutions, isExpandedDefault = false }) {
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);

  if (!toolExecutions || toolExecutions.length === 0) return null;

  const toolLabels = {
    search_inquiries: { title: "Searching inquiry queue", desc: "Filtered pending customer inquiries" },
    get_inquiry: { title: "Retrieving inquiry details", desc: "Loaded customer contact, guest count, and date" },
    get_packages: { title: "Checking catering catalog", desc: "Retrieved package pricing and inclusions" },
    check_date_availability: { title: "Verifying calendar schedule", desc: "Checked booked dates and capacity" },
    get_my_payment_status: { title: "Reviewing payment records", desc: "Loaded balances, receipts, and deposits" },
    draft_quotation: { title: "Analyzing quotation options", desc: "Computed package and add-on pricing" },
  };

  return (
    <div className="my-2 p-3 rounded-md bg-slate-50 border border-slate-200 shadow-2xs transition-all max-w-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-amber-400 border-r-blue-500 border-b-[#2C4B8A] flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="font-semibold text-xs text-slate-800 truncate">
            Completed {toolExecutions.length} {toolExecutions.length === 1 ? "step" : "steps"} across catering database
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
          <span>{isExpanded ? "Hide" : "Details"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Vertical Stepper */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
          {toolExecutions.map((tool, idx) => {
            const meta = toolLabels[tool] || { title: `Executed ${tool}`, desc: "Retrieved system records" };
            return (
              <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-5 h-5 rounded bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 text-[11px] block truncate">
                      {meta.title}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {meta.desc}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Main Message Component
 */
export default function ZelleMessage({
  message,
  onSelectPackage,
  onStartInquiry,
  isCopilot = false,
}) {
  const isMe = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200 font-sans",
        isMe ? "justify-end" : "justify-start"
      )}
    >
      {!isMe && (
        <div className="w-7 h-7 rounded-md bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-[#2C4B8A]" />
        </div>
      )}

      <div className={cn("flex flex-col max-w-[88%]", isMe ? "items-end" : "items-start")}>
        {/* User Bubble */}
        {isMe ? (
          <div className="px-3.5 py-2 rounded-md bg-[#2C4B8A] text-white text-xs font-medium shadow-2xs leading-relaxed">
            {message.text}
          </div>
        ) : (
          /* AI Response Container */
          <div className="w-full space-y-2">
            {/* Multi-step execution stepper */}
            {message.tool_executions?.length > 0 && (
              <ToolExecutionStepper toolExecutions={message.tool_executions} />
            )}

            {/* Markdown Body */}
            <div className="p-3.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs w-full text-xs leading-relaxed">
              <RichMarkdownRenderer text={message.text} />

              {/* Generative UI Cards */}
              {Array.isArray(message.ui_cards) && message.ui_cards.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  {message.ui_cards.map((card, cIdx) => {
                    if (card.type === "package_carousel") {
                      return (
                        <PackageCarouselCard
                          key={cIdx}
                          data={card.data}
                          onSelectPackage={onSelectPackage}
                        />
                      );
                    }
                    if (card.type === "date_availability") {
                      return (
                        <DateAvailabilityCard
                          key={cIdx}
                          data={card.data}
                          onStartInquiry={onStartInquiry}
                        />
                      );
                    }
                    if (card.type === "payment_summary") {
                      return <PaymentSummaryCard key={cIdx} data={card.data} />;
                    }
                    if (card.type === "inquiry_confirmation") {
                      return <InquiryConfirmationCard key={cIdx} data={card.data} />;
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <span className="text-[9px] text-slate-400 mt-1 px-1">
          {message.timestamp
            ? new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Just now"}
        </span>
      </div>
    </div>
  );
}
