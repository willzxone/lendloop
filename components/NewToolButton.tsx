"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { PackageIcon, PlusIcon } from "./icons";
import { ToolForm } from "./ToolForm";
import { Button, Modal } from "./ui";

/** "List a tool" button that opens the create form in a modal. */
export function NewToolButton({
  variant = "primary",
  label = "List a tool",
}: {
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const createTool = useMutation(api.tools.create);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        icon={<PackageIcon />}
        title="List a tool"
        description="Neighbours can request it as soon as you publish."
      >
        <ToolForm
          idPrefix="new-tool"
          submitLabel="Publish listing"
          onSubmit={async (values) => {
            await createTool(values);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
