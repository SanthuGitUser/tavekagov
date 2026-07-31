import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Hash,
  Lock,
  User,
  Video,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export function NewsArticleCard({ article }: { article: NewsArticle }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="grid gap-0 md:grid-cols-[180px_1fr]">
          <div className="relative aspect-[16/10] bg-muted md:aspect-auto md:min-h-[160px]">
            {article.image_url && !imageError ? (
              <img
                src={article.image_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full min-h-[140px] items-center justify-center bg-muted/80 text-muted-foreground">
                <Globe className="h-8 w-8 opacity-40" />
              </div>
            )}
            {article.duplicate ? (
              <Badge className="absolute left-2 top-2" variant="secondary">
                Duplicate
              </Badge>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col">
            <CardHeader className="space-y-3 p-4 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {article.source_icon ? (
                  <img
                    src={article.source_icon}
                    alt=""
                    className="h-5 w-5 rounded-sm object-contain"
                    loading="lazy"
                  />
                ) : null}
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                >
                  {article.source_name}
                </a>
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatPubDate(article.pubDate)}
                </span>
              </div>

              <a
                href={article.link}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary">
                  {article.title}
                  <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                </h3>
              </a>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
              {article.description ? (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {article.description}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {article.category.map((cat) => (
                  <Badge key={cat} variant="default" className="capitalize">
                    {cat}
                  </Badge>
                ))}
              </div>

              {article.keywords && article.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {article.keywords.slice(0, 5).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      <Hash className="h-2.5 w-2.5" />
                      {keyword}
                    </span>
                  ))}
                  {article.keywords.length > 5 ? (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{article.keywords.length - 5} more
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>
                  All details
                </Button>
                <Button type="button" size="sm" asChild>
                  <a href={article.link} target="_blank" rel="noreferrer">
                    Read article
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
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
              value={
                article.keywords?.length ? <BadgeList items={article.keywords} /> : "—"
              }
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
    </>
  );
}
