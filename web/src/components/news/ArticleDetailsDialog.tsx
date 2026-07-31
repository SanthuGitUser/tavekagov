import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  User,
  Video,
} from "lucide-react";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NewsArticle } from "@/types/news";
import { cn } from "@/lib/utils";

function isPaidOnly(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("ONLY AVAILABLE IN");
}

function formatPubDate(value: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return format(parseISO(normalized), "MMM d, yyyy · h:mm a");
}

function DetailRow({
  label,
  value,
  locked,
}: {
  label: string;
  value: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2.5 last:border-0 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm",
          locked ? "italic text-muted-foreground/70" : "text-foreground",
        )}
      >
        {locked ? (
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            {value}
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function BadgeList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="capitalize">
          {item}
        </Badge>
      ))}
    </div>
  );
}

type ArticleDetailsDialogProps = {
  article: NewsArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageError?: boolean;
  relatedSources?: NewsArticle[];
};

export function ArticleDetailsDialog({
  article,
  open,
  onOpenChange,
  imageError = false,
  relatedSources,
}: ArticleDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left leading-snug">{article.title}</DialogTitle>
          <DialogDescription className="text-left">
            Full article metadata from the news feed JSON.
          </DialogDescription>
        </DialogHeader>

        {article.image_url && !imageError ? (
          <img
            src={article.image_url}
            alt=""
            className="w-full rounded-lg border border-border object-cover"
          />
        ) : null}

        {relatedSources && relatedSources.length > 1 ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Also reported by
            </p>
            <ul className="mt-2 space-y-1.5">
              {relatedSources.map((source) => (
                <li key={source.article_id}>
                  <a
                    href={source.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    {source.source_name}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <dl className="divide-y divide-border/60">
          <DetailRow label="Article ID" value={article.article_id} />
          <DetailRow
            label="Link"
            value={
              <a
                href={article.link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-primary hover:underline"
              >
                {article.link}
              </a>
            }
          />
          <DetailRow label="Description" value={article.description ?? "—"} />
          <DetailRow
            label="Content"
            value={article.content ?? "—"}
            locked={isPaidOnly(article.content)}
          />
          <DetailRow
            label="Keywords"
            value={article.keywords?.length ? <BadgeList items={article.keywords} /> : "—"}
          />
          <DetailRow
            label="Creator"
            value={
              article.creator?.length ? (
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <User className="h-3.5 w-3.5" />
                  {article.creator.join(", ")}
                </span>
              ) : (
                "—"
              )
            }
          />
          <DetailRow label="Language" value={article.language} />
          <DetailRow
            label="Country"
            value={article.country.length ? <BadgeList items={article.country} /> : "—"}
          />
          <DetailRow
            label="Category"
            value={article.category.length ? <BadgeList items={article.category} /> : "—"}
          />
          <DetailRow label="Datatype" value={article.datatype} />
          <DetailRow
            label="Published"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatPubDate(article.pubDate)} ({article.pubDateTZ})
              </span>
            }
          />
          <DetailRow
            label="Fetched at"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatPubDate(article.fetched_at)}
              </span>
            }
          />
          <DetailRow
            label="Image URL"
            value={
              article.image_url ? (
                <a
                  href={article.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {article.image_url}
                </a>
              ) : (
                "—"
              )
            }
          />
          <DetailRow
            label="Video URL"
            value={
              article.video_url ? (
                <a
                  href={article.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-primary hover:underline"
                >
                  <Video className="h-3.5 w-3.5 shrink-0" />
                  {article.video_url}
                </a>
              ) : (
                "—"
              )
            }
          />
          <DetailRow label="Source ID" value={article.source_id} />
          <DetailRow label="Source name" value={article.source_name} />
          <DetailRow label="Source priority" value={String(article.source_priority)} />
          <DetailRow
            label="Source URL"
            value={
              <a
                href={article.source_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-primary hover:underline"
              >
                {article.source_url}
              </a>
            }
          />
          <DetailRow
            label="Source icon"
            value={
              article.source_icon ? (
                <img
                  src={article.source_icon}
                  alt=""
                  className="h-6 w-6 rounded-sm object-contain"
                />
              ) : (
                "—"
              )
            }
          />
          <DetailRow
            label="Sentiment"
            value={article.sentiment ?? "—"}
            locked={isPaidOnly(article.sentiment)}
          />
          <DetailRow
            label="Sentiment stats"
            value={article.sentiment_stats ?? "—"}
            locked={isPaidOnly(article.sentiment_stats)}
          />
          <DetailRow
            label="AI tag"
            value={article.ai_tag ?? "—"}
            locked={isPaidOnly(article.ai_tag)}
          />
          <DetailRow
            label="AI region"
            value={article.ai_region ?? "—"}
            locked={isPaidOnly(article.ai_region)}
          />
          <DetailRow
            label="AI org"
            value={article.ai_org ?? "—"}
            locked={isPaidOnly(article.ai_org)}
          />
          <DetailRow
            label="AI summary"
            value={article.ai_summary ?? "—"}
            locked={isPaidOnly(article.ai_summary)}
          />
          <DetailRow
            label="Duplicate"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                {article.duplicate ? "Yes" : "No"}
              </span>
            }
          />
        </dl>
      </DialogContent>
    </Dialog>
  );
}
