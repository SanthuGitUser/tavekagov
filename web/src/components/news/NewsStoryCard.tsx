import {
  Calendar,
  ChevronRight,
  ExternalLink,
  Globe,
  Hash,
} from "lucide-react";
import { useState } from "react";

import { ArticleDetailsDialog } from "@/components/news/ArticleDetailsDialog";
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
import { formatArticlePubDateInIst } from "@/lib/newsDateUtils";
import type { NewsStoryGroup } from "@/types/news";
import { cn } from "@/lib/utils";

type NewsStoryCardProps = {
  group: NewsStoryGroup;
};

export function NewsStoryCard({ group }: NewsStoryCardProps) {
  const { primary, sources } = group;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState(primary.article_id);

  const selectedSource =
    sources.find((source) => source.article_id === selectedSourceId) ?? primary;
  const hasMultipleSources = sources.length > 1;

  function openSelectedArticle() {
    window.open(selectedSource.link, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="flex min-w-0 flex-col">
            <CardHeader className="space-y-1.5 p-3 pb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {hasMultipleSources ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {sources.slice(0, 3).map((source) =>
                        source.source_icon ? (
                          <img
                            key={source.article_id}
                            src={source.source_icon}
                            alt=""
                            className="h-5 w-5 rounded-sm border border-background object-contain"
                            loading="lazy"
                          />
                        ) : null,
                      )}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {sources.length} sources
                    </span>
                  </div>
                ) : (
                  <>
                    {primary.source_icon ? (
                      <img
                        src={primary.source_icon}
                        alt=""
                        className="h-5 w-5 rounded-sm object-contain"
                        loading="lazy"
                      />
                    ) : null}
                    <a
                      href={primary.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                    >
                      {primary.source_name}
                    </a>
                  </>
                )}
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-2.5 w-2.5" />
                  {formatArticlePubDateInIst(primary)}
                </span>
                {primary.duplicate ? (
                  <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
                    Duplicate
                  </Badge>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => (hasMultipleSources ? setSourcePickerOpen(true) : openSelectedArticle())}
                className="group block text-left"
              >
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                  {primary.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                </h3>
              </button>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-2 p-3 pt-0">
              {primary.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {primary.description}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1">
                {[...new Set(sources.flatMap((source) => source.category))].map((category) => (
                  <Badge key={category} variant="default" className="px-1.5 py-0 text-[10px] capitalize">
                    {category}
                  </Badge>
                ))}
              </div>

              {primary.keywords && primary.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-0.5">
                  {primary.keywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
                    >
                      <Hash className="h-2 w-2" />
                      {keyword}
                    </span>
                  ))}
                  {primary.keywords.length > 3 ? (
                    <span className="px-1 text-[9px] text-muted-foreground">
                      +{primary.keywords.length - 3} more
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => setDetailsOpen(true)}
                >
                  All details
                </Button>
                {hasMultipleSources ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSourcePickerOpen(true)}
                  >
                    Choose source
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  <Button type="button" size="sm" className="h-7 px-2 text-xs" asChild>
                    <a href={primary.link} target="_blank" rel="noreferrer">
                      Read article
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
        </div>
      </Card>

      <Dialog open={sourcePickerOpen} onOpenChange={setSourcePickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="pr-8 text-left leading-snug">Choose a source</DialogTitle>
            <DialogDescription className="text-left">
              This story is covered by {sources.length} outlets. Pick one to read.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {sources.map((source) => {
              const isSelected = source.article_id === selectedSourceId;
              return (
                <button
                  key={source.article_id}
                  type="button"
                  onClick={() => setSelectedSourceId(source.article_id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-accent/40",
                  )}
                >
                  {source.source_icon ? (
                    <img
                      src={source.source_icon}
                      alt=""
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-sm object-contain"
                    />
                  ) : (
                    <Globe className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {source.source_name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatArticlePubDateInIst(source)}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {source.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSourcePickerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                openSelectedArticle();
                setSourcePickerOpen(false);
              }}
            >
              Read article
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ArticleDetailsDialog
        article={primary}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        relatedSources={hasMultipleSources ? sources : undefined}
      />
    </>
  );
}
