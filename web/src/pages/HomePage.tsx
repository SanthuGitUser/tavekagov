import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Tamil Nadu</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse government open data, districts, departments, and releases
              across the portal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/dashboard">
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/districts">Districts</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
