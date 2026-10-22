"use client";

import { Button } from "./ui";

export function PrintButton() {
  return (
    <Button type="button" variant="dark" onClick={() => window.print()}>
      Print or Save as PDF
    </Button>
  );
}
