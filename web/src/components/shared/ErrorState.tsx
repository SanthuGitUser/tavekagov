import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-start gap-3 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Failed to load data</p>
          <p className="mt-1 text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
